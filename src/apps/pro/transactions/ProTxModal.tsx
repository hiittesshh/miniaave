'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import * as React from 'react';
import { useSubmitAction } from '@/data/hooks';
import type { ProAction, ProProtocolSnapshot, ProReserve, ProUserState, TxPhase } from '@/data/types';
import { SimulatedTxError } from '@/data/types';
import {
  WITHDRAW_HF_FLOOR,
  effectiveBorrowRate,
  maxBorrow,
  maxRepay,
  riskPremium,
  riskPremiumImpact,
  summarizePosition,
  truncate,
  type PositionLine,
} from '@/lib/aave-math';
import { formatNumber, formatPercent, formatUSD, parseAmount, sanitizeAmountInput } from '@/shared/format';
import { BasicModal } from '@/shared/ui/BasicModal';
import { ArrowRightIcon, CheckIcon, CloseIcon, GasIcon, WarningIcon } from '@/shared/ui/Icons';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { surfaceShadow, tv } from '@/shared/theme/tokens';
import { motion } from '@/shared/theme/motion';
import { HealthFactor, ProButton, Tag, healthToken } from '../ui';
import { proRoutes, useProContext, useProModal } from '../state';

// ---------------------------------------------------------------------------------------------
// Position maths for previews (V4: one collateral factor per reserve; risk premium on debt)
// ---------------------------------------------------------------------------------------------

export interface SpokeLine {
  reserve: ProReserve;
  supplied: number;
  borrowed: number;
  collateralEnabled: boolean;
}

export function spokeLines(snap: ProProtocolSnapshot, user: ProUserState | undefined, spokeId: string): SpokeLine[] {
  const pos = user?.positions.find((p) => p.spokeId === spokeId);
  return snap.reserves
    .filter((r) => r.spokeId === spokeId)
    .map((r) => {
      const l = pos?.lines.find((x) => x.reserveId === r.id);
      return { reserve: r, supplied: l?.supplied ?? 0, borrowed: l?.borrowed ?? 0, collateralEnabled: l?.collateralEnabled ?? false };
    });
}

export function previewSpoke(lines: SpokeLine[]) {
  const debt = lines.reduce((s, l) => s + l.borrowed * l.reserve.priceUSD, 0);
  const premium = riskPremium(
    lines.filter((l) => l.collateralEnabled && l.reserve.collateral).map((l) => ({ valueUSD: l.supplied * l.reserve.priceUSD, collateralRisk: l.reserve.collateralRisk })),
    debt
  );
  const pl: PositionLine[] = lines.map((l) => ({
    suppliedUSD: l.supplied * l.reserve.priceUSD,
    borrowedUSD: l.borrowed * l.reserve.priceUSD,
    collateralEnabled: l.collateralEnabled && l.reserve.collateral,
    ltv: l.reserve.collateralFactor,
    liquidationThreshold: l.reserve.collateralFactor,
    supplyAPY: l.reserve.supplyAPY + l.reserve.underlyingYieldAPY,
    borrowAPY: effectiveBorrowRate(l.reserve.borrowAPY, premium),
  }));
  return { ...summarizePosition(pl), riskPremium: premium };
}

const mutate = (lines: SpokeLine[], reserveId: string, f: (l: SpokeLine) => SpokeLine) => lines.map((l) => (l.reserve.id === reserveId ? f(l) : l));

// ---------------------------------------------------------------------------------------------

/** A transaction step. Exported (with StepsList / ResultView / TxRow) so other demo modes reuse the step UI. */
export type TxStep = { key: string; label: string; state: 'idle' | 'active' | 'done'; phase?: TxPhase; /** Overrides the default status line. */ detail?: string };
type Step = TxStep;
type Status = { kind: 'form' } | { kind: 'running' } | { kind: 'done'; hash: string; amount: number } | { kind: 'error'; message: string };

const VERB: Record<string, string> = { deposit: 'Deposit', withdraw: 'Withdraw', borrow: 'Borrow', repay: 'Repay' };
const PAST: Record<string, string> = { deposit: 'deposited', withdraw: 'withdrew', borrow: 'borrowed', repay: 'repaid' };

function phaseText(step: Step) {
  if (step.detail) return step.detail;
  if (step.state === 'done') return 'Confirmed';
  if (step.state !== 'active') return '';
  if (step.key === 'approve') return step.phase === 'pending' ? 'Approval pending…' : 'Awaiting approval in your wallet…';
  return step.phase === 'pending' ? 'Transaction processing…' : 'Awaiting wallet confirmation…';
}

export function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, minHeight: 24 }}>
      <Typography component="div" sx={{ color: 'fg-3', fontSize: '0.875rem' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{children}</Box>
    </Box>
  );
}

export const Arrow = () => <ArrowRightIcon sx={{ fontSize: 14, color: 'fg-4' }} />;

function AmountModal({ kind, reserve, snap, user, account, onClose }: { kind: 'deposit' | 'withdraw' | 'borrow' | 'repay'; reserve: ProReserve; snap: ProProtocolSnapshot; user?: ProUserState; account: string; onClose: () => void }) {
  const submit = useSubmitAction();
  const [value, setValue] = React.useState('');
  const [status, setStatus] = React.useState<Status>({ kind: 'form' });
  const [steps, setSteps] = React.useState<Step[]>([]);
  const amount = parseAmount(value);
  const chain = snap.chains.find((c) => c.id === reserve.chainId);
  const wallet = user?.wallet[reserve.chainId]?.[reserve.symbol] ?? 0;
  const lines = spokeLines(snap, user, reserve.spokeId);
  const mine = lines.find((l) => l.reserve.id === reserve.id)!;
  const before = previewSpoke(lines);
  const usd = amount * reserve.priceUSD;

  let max = 0;
  if (kind === 'deposit') max = truncate(Math.min(wallet, reserve.supplyCap > 0 ? Math.max(reserve.supplyCap - reserve.supplied, 0) : Infinity), reserve.decimals);
  if (kind === 'withdraw') {
    max = Math.min(mine.supplied, reserve.availableLiquidity);
    if (mine.collateralEnabled && reserve.collateral && before.totalBorrowedUSD > 0) {
      const excess = before.healthFactor - WITHDRAW_HF_FLOOR;
      max = excess <= 0 ? 0 : Math.min(max, (excess * before.totalBorrowedUSD) / reserve.collateralFactor / reserve.priceUSD);
    }
    max = max >= mine.supplied ? mine.supplied : truncate(max, reserve.decimals);
  }
  if (kind === 'borrow') max = maxBorrow({ availableBorrowsUSD: before.availableBorrowsUSD, priceUSD: reserve.priceUSD, availableLiquidity: reserve.spokeLiquidity, borrowCap: reserve.borrowCap, totalBorrowed: reserve.borrowed, decimals: reserve.decimals });
  if (kind === 'repay') max = maxRepay({ debt: mine.borrowed, walletBalance: wallet, decimals: reserve.decimals });

  const afterLines = mutate(lines, reserve.id, (l) => {
    if (kind === 'deposit') return { ...l, supplied: l.supplied + amount, collateralEnabled: l.supplied > 0 ? l.collateralEnabled : reserve.collateral };
    if (kind === 'withdraw') return { ...l, supplied: Math.max(l.supplied - amount, 0) };
    if (kind === 'borrow') return { ...l, borrowed: l.borrowed + amount };
    return { ...l, borrowed: Math.max(l.borrowed - amount, 0) };
  });
  const after = previewSpoke(afterLines);
  const hfChanged = amount > 0 && (before.totalBorrowedUSD > 0 || after.totalBorrowedUSD > 0);
  const liquidation = amount > 0 && Number.isFinite(after.healthFactor) && after.healthFactor < 1;
  const lowHf = amount > 0 && !liquidation && Number.isFinite(after.healthFactor) && after.healthFactor < 1.5 && (kind === 'withdraw' || kind === 'borrow');
  const needsApproval = (kind === 'deposit' || kind === 'repay') && (user?.allowances[reserve.id] ?? 0) < amount;
  const actionLabel = kind === 'withdraw' ? 'withdrawal' : kind === 'repay' ? 'repayment' : kind;

  const run = async () => {
    const plan: Step[] = [
      ...(needsApproval ? [{ key: 'approve' as const, label: `Approve ${reserve.symbol}`, state: 'idle' as const }] : []),
      { key: 'main', label: `${VERB[kind]} ${reserve.symbol}`, state: 'idle' },
    ];
    setSteps(plan);
    setStatus({ kind: 'running' });
    try {
      for (const st of plan) {
        setSteps((s) => s.map((x) => (x.key === st.key ? { ...x, state: 'active', phase: 'awaiting-signature' } : x)));
        const action: ProAction = st.key === 'approve' ? { app: 'pro', kind: 'approve', account, reserveId: reserve.id, amount } : { app: 'pro', kind, account, reserveId: reserve.id, amount };
        const receipt = await submit.mutateAsync({ action, options: { onPhase: (phase) => setSteps((s) => s.map((x) => (x.key === st.key ? { ...x, phase } : x))) } });
        setSteps((s) => s.map((x) => (x.key === st.key ? { ...x, state: 'done' } : x)));
        if (st.key === 'main') {
          await new Promise((r) => setTimeout(r, 450));
          setStatus({ kind: 'done', hash: receipt.hash, amount: receipt.record.amount ?? amount });
        }
      }
    } catch (e) {
      const msg = e instanceof SimulatedTxError ? e.message : String(e);
      setStatus({ kind: 'error', message: msg });
    }
  };

  if (status.kind === 'done') {
    return (
      <ResultView
        tone="success"
        title={`${VERB[kind]} Confirmed`}
        body={
          <>
            You {PAST[kind]} <b>{formatNumber(status.amount)} {reserve.symbol}</b> {kind === 'deposit' || kind === 'withdraw' ? 'in' : 'from'} the {reserve.spokeName} Market.
          </>
        }
        hash={status.hash}
        onClose={onClose}
        reserveHref={proRoutes.position(`${account.toLowerCase()}~${reserve.spokeId.replace(':', '-')}`)}
      />
    );
  }
  if (status.kind === 'error') {
    return <ResultView tone="error" title="Something went wrong" body={<>{status.message} Nothing changed: no balances or positions moved.</>} onClose={onClose} onRetry={() => setStatus({ kind: 'form' })} />;
  }

  const running = status.kind === 'running';
  return (
    <Box>
      <Typography id="tx-modal-title" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500, pr: '2rem' }}>
        {VERB[kind]} {reserve.symbol}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 5 }}>
        <Tag>{reserve.spokeName} Market</Tag>
        <Tag tone="purple">{reserve.hubName} Hub</Tag>
        {chain && <Tag>{chain.name}</Tag>}
      </Box>

      <Box sx={{ borderRadius: '1rem', bgcolor: 'bg-2', boxShadow: surfaceShadow('shadow-stroke-1'), p: '1rem', transition: 'box-shadow 150ms ease', '&:focus-within': { boxShadow: `0 0 0 1px ${tv('fg-4')}` } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InputBase
            autoFocus
            value={value}
            disabled={running}
            placeholder="0"
            onChange={(e) => {
              const clean = sanitizeAmountInput(e.target.value, reserve.decimals);
              setValue(clean !== '' && Number(clean) > max ? String(max) : clean);
            }}
            inputProps={{ 'aria-label': 'amount input', inputMode: 'decimal' }}
            sx={{ flex: 1, fontSize: '2rem', fontWeight: 500, '& input': { p: 0 }, '& input::placeholder': { color: 'fg-4', opacity: 1 } }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '0.5rem 0.75rem', py: '0.375rem', pl: '0.375rem', pr: '0.75rem', borderRadius: '10rem', bgcolor: 'bg-3', boxShadow: surfaceShadow() }}>
            <TokenIcon symbol={reserve.symbol} size={24} />
            <Typography sx={{ fontWeight: 500 }}>{reserve.symbol}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, fontSize: '0.8125rem', color: 'fg-3' }}>
          <span>{formatUSD(usd, { compact: usd > 99_999 })}</span>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>
              {kind === 'withdraw' ? 'Available' : kind === 'borrow' ? 'Available to Borrow' : 'Wallet Balance'} {formatNumber(max, { compact: max > 99_999 })}
            </span>
            <ProButton size="sm" variant="tertiary" disabled={running || max <= 0 || amount === max} onClick={() => setValue(String(max))} sx={{ height: 22, px: '0.5rem', fontSize: '0.75rem' }}>
              Max
            </ProButton>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 4, p: '1rem', borderRadius: '1rem', boxShadow: surfaceShadow('shadow-stroke-1'), display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {kind === 'deposit' && (
          <>
            <Row label="Deposit APY">{formatPercent(reserve.supplyAPY + reserve.underlyingYieldAPY)}</Row>
            <Row label="Collateral">{reserve.collateral ? <Box component="span" sx={{ color: 'data-green' }}>Enabled · CF {formatPercent(reserve.collateralFactor, 1)}</Box> : <Box component="span" sx={{ color: 'fg-4' }}>Not eligible as collateral</Box>}</Row>
          </>
        )}
        {kind === 'withdraw' && <Row label="Remaining Deposit">{formatNumber(Math.max(mine.supplied - amount, 0))} {reserve.symbol}</Row>}
        {kind === 'borrow' && (
          <>
            <Row label="Borrow Rate">
              {formatPercent(effectiveBorrowRate(reserve.borrowAPY, before.riskPremium))}
              {amount > 0 && (
                <>
                  <Arrow />
                  {formatPercent(effectiveBorrowRate(reserve.borrowAPY, after.riskPremium))}
                </>
              )}
            </Row>
            <Row label="Risk Premium">
              {formatPercent(before.riskPremium)}
              {amount > 0 && (
                <>
                  <Arrow />
                  {formatPercent(after.riskPremium)}
                </>
              )}
            </Row>
          </>
        )}
        {kind === 'repay' && (
          <Row label="Remaining Loan">
            {formatNumber(mine.borrowed)}
            {amount > 0 && (
              <>
                <Arrow />
                {formatNumber(Math.max(mine.borrowed - amount, 0))}
              </>
            )}{' '}
            {reserve.symbol}
          </Row>
        )}
        {(before.totalBorrowedUSD > 0 || after.totalBorrowedUSD > 0) && (
          <Row label="Health Factor">
            <HealthFactor value={before.healthFactor} animate={false} />
            {hfChanged && (
              <>
                <Arrow />
                <HealthFactor value={Math.max(after.healthFactor, 0)} />
              </>
            )}
          </Row>
        )}
        <Row label="Borrowing Power">
          {formatUSD(before.availableBorrowsUSD, { compact: true })}
          {amount > 0 && (
            <>
              <Arrow />
              {formatUSD(after.availableBorrowsUSD, { compact: true })}
            </>
          )}
        </Row>
        <Row label="Network Fee">
          <GasIcon sx={{ fontSize: 14, color: 'fg-3' }} />
          <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>
            {needsApproval ? '$0.31' : '$0.19'} · simulated
          </Box>
        </Row>
      </Box>

      {(liquidation || lowHf) && (
        <Box sx={{ mt: 4, p: '0.875rem 1rem', borderRadius: '0.875rem', display: 'flex', gap: 3, bgcolor: `color-mix(in srgb, ${tv(liquidation ? 'health-1' : 'health-3')} 10%, transparent)`, animation: 'clone-fade-up 200ms ease both' }}>
          <WarningIcon sx={{ fontSize: 20, color: tv(liquidation ? 'health-1' : 'health-2'), mt: '1px' }} />
          <Box>
            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{liquidation ? `This ${actionLabel} would trigger liquidation` : `This ${actionLabel} puts your position at risk`}</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: 'fg-2' }}>
              {liquidation
                ? `This amount would reduce your Health Factor below 1.0, making your position eligible for liquidation. Reduce the ${actionLabel} amount or repay some debt to proceed safely.`
                : `Health Factor will drop to ${Math.floor(after.healthFactor * 100) / 100} after this transaction. You are at risk of liquidation.`}
            </Typography>
          </Box>
        </Box>
      )}

      {running && <StepsList steps={steps} />}

      <ProButton
        variant="primary"
        size="lg"
        wide
        sx={{ mt: 5 }}
        disabled={!(amount > 0) || liquidation || running || max <= 0}
        loading={running}
        onClick={() => void run()}
        data-testid="pro-tx-action"
      >
        {!(amount > 0) ? 'Enter an amount' : needsApproval ? `Approve & ${VERB[kind]}` : VERB[kind]}
      </ProButton>
      <Typography sx={{ mt: 2, textAlign: 'center', fontSize: '0.75rem', color: 'fg-4' }}>Simulated transaction · no real funds move</Typography>
    </Box>
  );
}

export function StepsList({ steps }: { steps: Step[] }) {
  return (
    <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2, animation: 'clone-fade-up 200ms ease both' }} aria-live="polite">
      {steps.map((s, i) => (
        <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 3, p: '0.625rem 0.75rem', borderRadius: '0.75rem', bgcolor: s.state === 'active' ? 'selected' : 'transparent', transition: 'background-color 200ms ease', animation: 'clone-fade-up 220ms ease both' /* rows inserted mid-flow (approve) slide in */ }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 600,
              bgcolor: s.state === 'done' ? 'data-green' : 'bg-5',
              color: s.state === 'done' ? '#fff' : 'fg-2',
              transition: `background-color 200ms ease, transform ${motion.duration.snappy}ms ${motion.easing.snappy}`,
              transform: s.state === 'done' ? 'scale(1.05)' : 'none',
            }}
          >
            {s.state === 'done' ? <CheckIcon sx={{ fontSize: 14 }} /> : s.state === 'active' ? <CircularProgress size={12} sx={{ color: 'fg-2' }} /> : i + 1}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{s.label}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: s.state === 'done' ? 'data-green' : 'fg-3' }}>{phaseText(s) || 'Waiting'}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function ResultView({ tone, title, body, hash, onClose, onRetry, reserveHref }: { tone: 'success' | 'error'; title: string; body: React.ReactNode; hash?: string; onClose: () => void; onRetry?: () => void; reserveHref?: string }) {
  const color = tv(tone === 'success' ? 'data-green' : 'data-red');
  return (
    <Box sx={{ textAlign: 'center', pt: 3 }}>
      <Box sx={{ width: 56, height: 56, mx: 'auto', borderRadius: '50%', bgcolor: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 8px color-mix(in srgb, ${color} 15%, transparent)`, animation: `clone-pop ${motion.duration.smooth}ms ${motion.easing.snappy} both`, '@keyframes clone-pop': { from: { transform: 'scale(0.5)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } } }}>
        {tone === 'success' ? <CheckIcon sx={{ fontSize: 28 }} /> : <CloseIcon sx={{ fontSize: 28 }} />}
      </Box>
      <Typography component="h2" id="tx-modal-title" sx={{ mt: 4, fontSize: '1.25rem', fontWeight: 500, animation: 'clone-fade-up 260ms 60ms ease both' }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 1, color: 'fg-3', fontSize: '0.875rem', animation: 'clone-fade-up 260ms 120ms ease both', '& b': { color: 'fg-1', fontWeight: 500 } }} component="div">
        {body}
      </Typography>
      {hash && (
        <Box sx={{ mt: 4, p: '0.625rem 0.875rem', borderRadius: '0.75rem', bgcolor: 'bg-2', textAlign: 'left' }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>Simulated transaction confirmed</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'fg-3', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-all' }}>
            {hash.slice(0, 18)}…{hash.slice(-6)} (fake hash, no explorer)
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2, mt: 5 }}>
        {onRetry && (
          <ProButton variant="secondary" size="lg" wide onClick={onRetry}>
            Retry
          </ProButton>
        )}
        {reserveHref && (
          <ProButton variant="secondary" size="lg" wide href={reserveHref} onClick={onClose}>
            View Position
          </ProButton>
        )}
        <ProButton variant="primary" size="lg" wide onClick={onClose}>
          {tone === 'success' ? 'Done' : 'Close'}
        </ProButton>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Collateral toggle
// ---------------------------------------------------------------------------------------------

function CollateralModal({ reserve, snap, user, account, onClose }: { reserve: ProReserve; snap: ProProtocolSnapshot; user?: ProUserState; account: string; onClose: () => void }) {
  const submit = useSubmitAction();
  const [status, setStatus] = React.useState<Status>({ kind: 'form' });
  const [steps, setSteps] = React.useState<Step[]>([]);
  const lines = spokeLines(snap, user, reserve.spokeId);
  const mine = lines.find((l) => l.reserve.id === reserve.id)!;
  const enabling = !mine.collateralEnabled;
  const before = previewSpoke(lines);
  const after = previewSpoke(mutate(lines, reserve.id, (l) => ({ ...l, collateralEnabled: enabling })));
  const blocked = !enabling && Number.isFinite(after.healthFactor) && after.healthFactor < 1;

  const run = async () => {
    setSteps([{ key: 'main', label: enabling ? 'Enable as Collateral' : 'Disable as Collateral', state: 'active', phase: 'awaiting-signature' }]);
    setStatus({ kind: 'running' });
    try {
      const receipt = await submit.mutateAsync({
        action: { app: 'pro', kind: 'collateral', account, reserveId: reserve.id, enabled: enabling },
        options: { onPhase: (phase) => setSteps((s) => s.map((x) => ({ ...x, phase }))) },
      });
      setSteps((s) => s.map((x) => ({ ...x, state: 'done' })));
      await new Promise((r) => setTimeout(r, 450));
      setStatus({ kind: 'done', hash: receipt.hash, amount: 0 });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  if (status.kind === 'done') return <ResultView tone="success" title="Collateral updated" body={<>{reserve.symbol} is {enabling ? 'now' : 'no longer'} used as collateral in the {reserve.spokeName} Market.</>} hash={status.hash} onClose={onClose} />;
  if (status.kind === 'error') return <ResultView tone="error" title="Something went wrong" body={<>{status.message} Nothing changed.</>} onClose={onClose} onRetry={() => setStatus({ kind: 'form' })} />;

  return (
    <Box>
      <Typography id="tx-modal-title" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500, pr: '2rem' }}>
        {enabling ? 'Enable as Collateral' : 'Disable as Collateral'}
      </Typography>
      <Typography sx={{ color: 'fg-3', fontSize: '0.875rem', mt: 1, mb: 5 }}>
        {enabling ? `Use your ${formatNumber(mine.supplied)} ${reserve.symbol} deposit to increase your borrowing power in the ${reserve.spokeName} Market.` : `Your ${reserve.symbol} deposit will stop counting towards your borrowing power and Health Factor.`}
      </Typography>
      <Box sx={{ p: '1rem', borderRadius: '1rem', boxShadow: surfaceShadow('shadow-stroke-1'), display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Row label="Collateral Factor">{formatPercent(reserve.collateralFactor, 1)}</Row>
        {(before.totalBorrowedUSD > 0) && (
          <Row label="Health Factor">
            <HealthFactor value={before.healthFactor} animate={false} />
            <Arrow />
            <HealthFactor value={Math.max(after.healthFactor, 0)} />
          </Row>
        )}
        <Row label="Borrowing Power">
          {formatUSD(before.availableBorrowsUSD, { compact: true })}
          <Arrow />
          {formatUSD(after.availableBorrowsUSD, { compact: true })}
        </Row>
        {before.totalBorrowedUSD > 0 && (
          <Row label="Risk Premium">
            {formatPercent(before.riskPremium)}
            <Arrow />
            {formatPercent(after.riskPremium)}
          </Row>
        )}
      </Box>
      {blocked && (
        <Box sx={{ mt: 4, p: '0.875rem 1rem', borderRadius: '0.875rem', display: 'flex', gap: 3, bgcolor: `color-mix(in srgb, ${tv('health-1')} 10%, transparent)` }}>
          <WarningIcon sx={{ fontSize: 20, color: 'health-1' }} />
          <Box>
            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>Collateral cannot be disabled</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: 'fg-2' }}>This action would reduce your Health Factor below 1.0. Repay some debt first.</Typography>
          </Box>
        </Box>
      )}
      {status.kind === 'running' && <StepsList steps={steps} />}
      <ProButton variant="primary" size="lg" wide sx={{ mt: 5 }} disabled={blocked || status.kind === 'running'} loading={status.kind === 'running'} onClick={() => void run()}>
        {enabling ? 'Enable as Collateral' : 'Disable as Collateral'}
      </ProButton>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Rate breakdown ("Borrow Rate" modal)
// ---------------------------------------------------------------------------------------------

function RateModal({ reserve, snap, user }: { reserve: ProReserve; snap: ProProtocolSnapshot; user?: ProUserState }) {
  const lines = spokeLines(snap, user, reserve.spokeId);
  const p = previewSpoke(lines);
  const collateral = lines.filter((l) => l.collateralEnabled && l.reserve.collateral && l.supplied > 0);
  return (
    <Box>
      <Typography id="tx-modal-title" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500, mb: 5 }}>
        Borrow Rate
      </Typography>
      <Box sx={{ p: '1rem', borderRadius: '1rem', bgcolor: 'bg-2', mb: 4 }}>
        <Row label="Your APY">
          <Box component="span" sx={{ fontSize: '1.25rem' }}>
            {formatPercent(effectiveBorrowRate(reserve.borrowAPY, p.riskPremium))}
          </Box>
        </Row>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, px: 1 }}>
        <Row label="Base APY">{formatPercent(reserve.borrowAPY)}</Row>
        <Row label="Risk Premium Impact">+{formatPercent(riskPremiumImpact(reserve.borrowAPY, p.riskPremium))}</Row>
        <Row label="Risk Premium">{formatPercent(p.riskPremium)}</Row>
        {collateral.length > 0 && (
          <Box sx={{ mt: 1, pt: 3, borderTop: `1px solid ${tv('border-0')}` }}>
            <Typography sx={{ color: 'fg-4', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', mb: 2 }}>Collateral risk</Typography>
            {collateral.map((l) => (
              <Row key={l.reserve.id} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TokenIcon symbol={l.reserve.symbol} size={20} />{l.reserve.symbol}</Box>}>
                {formatPercent(l.reserve.collateralRisk)}
              </Row>
            ))}
          </Box>
        )}
        <Typography sx={{ fontSize: '0.75rem', color: 'fg-3', mt: 2 }}>
          Risk premium is the weighted collateral risk of the collateral needed to cover your debt, safest first. Simplified model for this demo. <Box component={Link} href={proRoutes.reserve(reserve.id)} sx={{ textDecoration: 'underline' }}>Reserve details</Box>
        </Typography>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------

/** Paper style of the Pro transaction modal (shared with other demo modes). */
export const TX_MODAL_PAPER_SX = { borderRadius: '1.5rem', p: 6, boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}, 0 6px 32px 0 ${tv('shadow-high')}` };

export function ProTxModalHost() {
  const { modal, close } = useProModal();
  const { account, protocol, user } = useProContext();
  // Keep the last modal while the close animation plays; bump the key when a new one opens.
  const [last, setLast] = React.useState(modal);
  const [key, setKey] = React.useState(0);
  if (modal && modal !== last) {
    setLast(modal);
    setKey((k) => k + 1);
  }
  const m = modal ?? last;
  const snap = protocol.data;
  const reserve = m && snap ? snap.reserves.find((r) => r.id === m.reserveId) : undefined;

  let content: React.ReactNode = (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress size={26} sx={{ color: 'fg-3' }} />
    </Box>
  );
  if (m && snap && reserve && m.type === 'rate') content = <RateModal reserve={reserve} snap={snap} user={user.data} />;
  else if (m && snap && reserve && account && (user.data || !account)) {
    if (m.type === 'collateral') content = <CollateralModal reserve={reserve} snap={snap} user={user.data} account={account} onClose={close} />;
    else if (m.type !== 'rate') content = <AmountModal kind={m.type} reserve={reserve} snap={snap} user={user.data} account={account} onClose={close} />;
  }

  return (
    <BasicModal open={Boolean(modal)} onClose={close} maxWidth={432} labelledBy="tx-modal-title" paperSx={TX_MODAL_PAPER_SX}>
      <React.Fragment key={key}>{content}</React.Fragment>
    </BasicModal>
  );
}

export { healthToken };
