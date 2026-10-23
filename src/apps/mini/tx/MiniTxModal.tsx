'use client';

/**
 * Mini-Aave transaction modals in the Pro modal style (same paper, steps list and result view):
 * Supply · Withdraw · Borrow · Repay · Faucet · Liquidate · Set price.
 * - Max: Withdraw/Repay Max send MAX_UINT256 (shown amount = supplied / borrowed); Repay Max
 *   approves debt + 0.1% (§8)
 * - Health factor after the action (§7); warn below 1.1, block Withdraw/Borrow below 1
 * - the §8 steps via runTx(); every failure shows the §9 message
 */
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { BasicModal } from '@/shared/ui/BasicModal';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { surfaceShadow, tv } from '@/shared/theme/tokens';
import { ProButton, Tag } from '@/apps/pro/ui';
import { Arrow, ResultView, Row, StepsList, TX_MODAL_PAPER_SX, type TxStep } from '@/apps/pro/transactions/ProTxModal';
import { FAUCET_BY_SYMBOL, TOKENS, explorerTxUrl, roleOf } from '../data/config';
import { useToasts } from '../ui/toasts';
import { useAccountData, useAtRisk, useMarkets, useOracleOwner, type MarketRow, type UserRow } from '../data/hooks';
import { miniSource } from '../data/source';
import { useSourceMode } from '../data/settings';
import type { Address, UserAccountData } from '../data/types';
import { useWallet } from '../data/useWallet';
import { aprToApyPercent, fmtHealth, fmtPercent, fmtToken, fmtUsd, healthBand, shortAddr } from '../lib/format';
import { healthAfter, liquidationPreview, maxBorrow, repayMaxApproval, toUsd } from '../lib/preview';
import { MAX_UINT256, formatUnits, parseUnits, sanitizeDecimalInput } from '../lib/units';
import { HealthValue, TxHashNote, useReadChainName } from '../ui/parts';
import { buildAmountTx, buildLiquidateTx } from './build';
import { runTx, type RunTxResult } from './runTx';
import { useMiniTx, type MiniTxRequest } from './store';

const WAD = 10n ** 18n;
const TITLE: Record<string, string> = { supply: 'Supply', withdraw: 'Withdraw', borrow: 'Borrow', repay: 'Repay', faucet: 'Faucet', liquidate: 'Liquidate', setPrice: 'Set price' };

type Phase = { kind: 'form' } | { kind: 'running' } | { kind: 'done'; res: Extract<RunTxResult, { ok: true }> } | { kind: 'error'; message: string };

function useRunner() {
  const [phase, setPhase] = React.useState<Phase>({ kind: 'form' });
  const [steps, setSteps] = React.useState<TxStep[]>([]);
  const push = useToasts((s) => s.push);
  const start = async (input: Omit<Parameters<typeof runTx>[0], 'onSteps'>) => {
    setPhase({ kind: 'running' });
    const res = await runTx({ ...input, onSteps: setSteps });
    setPhase(res.ok ? { kind: 'done', res } : { kind: 'error', message: res.message });
    // Toast too, so the result stays visible after the modal is closed (Pro-style, bottom-left).
    const name = input.label.replace(/^faucet\(\) on (\w+)$/, '$1 faucet').replace('liquidate()', 'Liquidation').replace('oracle.setPrice()', 'Price update');
    if (res.ok) push({ tone: 'success', title: `${name} confirmed`, body: miniSource.kind === 'mock' ? 'Simulated transaction (mock data).' : undefined, href: miniSource.kind === 'chain' ? (explorerTxUrl(miniSource.chainId, res.hash) ?? undefined) : undefined });
    else push({ tone: 'error', title: `${name} failed`, body: res.message });
  };
  return { phase, steps, start, back: () => setPhase({ kind: 'form' }) };
}

function Running({ steps }: { steps: TxStep[] }) {
  const mode = useSourceMode();
  // The mock wallet has no window to reject in, so the modal offers it; MetaMask has its own.
  const signing = mode === 'mock' && steps.some((s) => s.state === 'active' && /wallet/i.test(s.detail ?? ''));
  return (
    <>
      <StepsList steps={steps} />
      {signing && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <ProButton variant="text" size="sm" onClick={() => miniSource.rejectPendingSignature()}>
            Reject in wallet (mock)
          </ProButton>
        </Box>
      )}
    </>
  );
}

function ActionButton({ disabled, running, label, onClick }: { disabled: boolean; running: boolean; label: string; onClick: () => void }) {
  const wallet = useWallet();
  if (wallet.wrongChain)
    return (
      <ProButton variant="primary" size="lg" wide sx={{ mt: 5 }} disabled={wallet.switching} onClick={wallet.switchNetwork}>
        Switch network
      </ProButton>
    );
  return (
    <ProButton variant="primary" size="lg" wide sx={{ mt: 5 }} disabled={disabled || running} loading={running} onClick={onClick}>
      {label}
    </ProButton>
  );
}

function Footnote() {
  const mode = useSourceMode();
  const network = useReadChainName();
  return <Typography sx={{ mt: 2, textAlign: 'center', fontSize: '0.75rem', color: 'fg-4' }}>{mode === 'mock' ? 'Mock data · simulated transaction · no chain, no real funds' : `Real transaction on ${network} · MetaMask asks you to sign`}</Typography>;
}

/** Pro's success view, with Mini's own hash line (fake in mock mode; real, + Basescan link on chain). */
function Done({ title, body, hash, onClose }: { title: string; body: React.ReactNode; hash: `0x${string}`; onClose: () => void }) {
  return (
    <ResultView
      tone="success"
      title={title}
      body={
        <>
          {body}
          <TxHashNote hash={hash} />
        </>
      }
      onClose={onClose}
    />
  );
}

function AmountBox({ symbol, decimals, value, onChange, usd, hint, onMax, maxDisabled, disabled }: { symbol: string; decimals: number; value: string; onChange: (v: string) => void; usd: bigint; hint: React.ReactNode; onMax: () => void; maxDisabled: boolean; disabled: boolean }) {
  return (
    <Box sx={{ borderRadius: '1rem', bgcolor: 'bg-2', boxShadow: surfaceShadow('shadow-stroke-1'), p: '1rem', '&:focus-within': { boxShadow: `0 0 0 1px ${tv('fg-4')}` } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <InputBase
          autoFocus
          value={value}
          disabled={disabled}
          placeholder="0"
          onChange={(e) => onChange(sanitizeDecimalInput(e.target.value, decimals))}
          inputProps={{ 'aria-label': 'amount input', inputMode: 'decimal' }}
          sx={{ flex: 1, fontSize: '2rem', fontWeight: 500, '& input': { p: 0 }, '& input::placeholder': { color: 'fg-4', opacity: 1 } }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '0.375rem', pl: '0.375rem', pr: '0.75rem', borderRadius: '10rem', bgcolor: 'bg-3', boxShadow: surfaceShadow() }}>
          <TokenIcon symbol={symbol} size={24} />
          <Typography sx={{ fontWeight: 500 }}>{symbol}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, fontSize: '0.8125rem', color: 'fg-3' }}>
        <span>{fmtUsd(usd)}</span>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>{hint}</span>
          <ProButton size="sm" variant="tertiary" disabled={maxDisabled || disabled} onClick={onMax} sx={{ height: 22, px: '0.5rem', fontSize: '0.75rem' }}>
            Max
          </ProButton>
        </Box>
      </Box>
    </Box>
  );
}

const safeParse = (v: string, d: number) => {
  try {
    return v ? parseUnits(v, d) : 0n;
  } catch {
    return 0n;
  }
};

// ---------------------------------------------------------------------------------------------
// Supply / Withdraw / Borrow / Repay
// ---------------------------------------------------------------------------------------------

function AmountModal({ kind, market, user, account, onClose }: { kind: 'supply' | 'withdraw' | 'borrow' | 'repay'; market: MarketRow; user: { account: UserAccountData; rows: UserRow[] }; account: Address; onClose: () => void }) {
  const { phase, steps, start, back } = useRunner();
  const [value, setValue] = React.useState('');
  const [useMax, setUseMax] = React.useState(false);
  const t = market.token;
  const row = user.rows.find((r) => r.asset === market.asset)!;
  const [supplied, borrowed] = row.data;
  const amount = safeParse(value, t.decimals);
  const max = kind === 'supply' ? row.balance : kind === 'withdraw' ? supplied : kind === 'borrow' ? maxBorrow(user.account, market) : borrowed;
  const hintLabel = kind === 'supply' ? 'Wallet balance' : kind === 'withdraw' ? 'Supplied' : kind === 'borrow' ? 'Max you can borrow' : 'Debt';
  const before = user.account.healthFactor;
  const after = amount > 0n ? healthAfter(kind, amount, user.account, market) : before;
  const hasDebt = user.account.totalDebtUsd > 0n || kind === 'borrow';
  const below1 = (kind === 'withdraw' || kind === 'borrow') && amount > 0n && after < WAD;
  const below11 = amount > 0n && after !== MAX_UINT256 && after < 11n * 10n ** 17n && !below1;
  const apy = aprToApyPercent(kind === 'supply' || kind === 'withdraw' ? market.supplyRate : market.borrowRate);
  const { call, approval } = buildAmountTx(kind, market.asset, amount, useMax, borrowed);
  const network = useReadChainName();

  if (phase.kind === 'done') {
    const got = typeof phase.res.result === 'bigint' ? phase.res.result : amount;
    return <Done title={`${TITLE[kind]} confirmed`} body={<>You {kind === 'supply' ? 'supplied' : kind === 'withdraw' ? 'withdrew' : kind === 'borrow' ? 'borrowed' : 'repaid'} <b>{fmtToken(got, t.decimals)} {t.symbol}</b>.</>} hash={phase.res.hash} onClose={onClose} />;
  }
  if (phase.kind === 'error') return <ResultView tone="error" title="Transaction failed" body={<>{phase.message} Nothing changed.</>} onClose={onClose} onRetry={back} />;
  const running = phase.kind === 'running';

  return (
    <Box>
      <Typography id="tx-modal-title" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500, pr: '2rem' }}>
        {TITLE[kind]} {t.symbol}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 5 }}>
        <Tag>Mini-Aave pool</Tag>
        <Tag tone="purple">{network}</Tag>
      </Box>
      <AmountBox
        symbol={t.symbol}
        decimals={t.decimals}
        value={value}
        disabled={running}
        onChange={(v) => {
          setUseMax(false);
          setValue(v);
        }}
        usd={toUsd(amount, market.price, t.decimals)}
        hint={`${hintLabel} ${fmtToken(max, t.decimals)}`}
        maxDisabled={max <= 0n}
        onMax={() => {
          setValue(formatUnits(max, t.decimals));
          setUseMax(kind === 'withdraw' || kind === 'repay');
        }}
      />
      <Box sx={{ mt: 4, p: '1rem', borderRadius: '1rem', boxShadow: surfaceShadow('shadow-stroke-1'), display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Row label={kind === 'supply' || kind === 'withdraw' ? 'Supply APY' : 'Borrow APY'}>{fmtPercent(apy)}</Row>
        {useMax && <Row label="Sends">all of it (maxUint256)</Row>}
        {kind === 'repay' && useMax && <Row label="Approves">{fmtToken(repayMaxApproval(borrowed), t.decimals)} {t.symbol} (debt + 0.1%)</Row>}
        {hasDebt && (
          <Row label="Health factor">
            <HealthValue hf={before} />
            {amount > 0n && (
              <>
                <Arrow />
                <HealthValue hf={after} />
              </>
            )}
          </Row>
        )}
        <Row label="Available to borrow">{fmtUsd(user.account.availableBorrowsUsd)}</Row>
      </Box>
      {(below1 || below11) && (
        <Box sx={{ mt: 4, p: '0.875rem 1rem', borderRadius: '0.875rem', bgcolor: `color-mix(in srgb, ${tv(below1 ? 'health-1' : 'health-3')} 10%, transparent)` }}>
          <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{below1 ? 'This would make your loan liquidatable' : 'Health factor below 1.1'}</Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'fg-2' }}>
            {below1 ? `Health factor would drop to ${fmtHealth(after)}. Enter a smaller amount.` : `Health factor would be ${fmtHealth(after)}. A small price move could make this loan liquidatable.`}
          </Typography>
        </Box>
      )}
      {running && <Running steps={steps} />}
      <ActionButton
        running={running}
        disabled={amount <= 0n || below1}
        label={amount <= 0n ? 'Enter an amount' : approval && row.allowance < approval.amount ? `Approve & ${TITLE[kind]}` : TITLE[kind]}
        onClick={() => void start({ account, label: `${TITLE[kind]} ${t.symbol}`, approval, call })}
      />
      <Footnote />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Faucet
// ---------------------------------------------------------------------------------------------

function FaucetModal({ asset, token, account, onClose }: { asset: Address; token: { symbol: string; decimals: number }; account: Address; onClose: () => void }) {
  const { phase, steps, start, back } = useRunner();
  const t = token;
  const amount = FAUCET_BY_SYMBOL[t.symbol] ?? 0n;
  if (phase.kind === 'done') return <Done title="Tokens received" body={<>You got <b>{fmtToken(amount, t.decimals)} {t.symbol}</b> of free test tokens.</>} hash={phase.res.hash} onClose={onClose} />;
  if (phase.kind === 'error') return <ResultView tone="error" title="Transaction failed" body={<>{phase.message}</>} onClose={onClose} onRetry={back} />;
  return (
    <Box>
      <Typography id="tx-modal-title" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500, pr: '2rem' }}>
        Faucet {t.symbol}
      </Typography>
      <Typography sx={{ mt: 1, mb: 5, color: 'fg-3', fontSize: '0.875rem' }}>Calls faucet() on the test token: {fmtToken(amount, t.decimals)} {t.symbol} per call. No approve needed.</Typography>
      <Box sx={{ p: '1rem', borderRadius: '1rem', boxShadow: surfaceShadow('shadow-stroke-1'), display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Row label="You receive">
          <TokenIcon symbol={t.symbol} size={18} /> {fmtToken(amount, t.decimals)} {t.symbol}
        </Row>
      </Box>
      {phase.kind === 'running' && <Running steps={steps} />}
      <ActionButton running={phase.kind === 'running'} disabled={false} label={`Get ${fmtToken(amount, t.decimals)} ${t.symbol}`} onClick={() => void start({ account, label: `faucet() on ${t.symbol}`, call: { contract: 'token', address: asset, functionName: 'faucet', args: [] } })} />
      <Footnote />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Liquidate (§11)
// ---------------------------------------------------------------------------------------------

function TokenChoice({ label, options, value, onChange, disabled }: { label: string; options: Address[]; value: Address; onChange: (a: Address) => void; disabled: boolean }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: 'fg-3', mb: 1 }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {options.map((a) => (
          <ProButton key={a} size="sm" variant={a === value ? 'primary' : 'secondary'} prefixIcon={<TokenIcon symbol={TOKENS[a].symbol} size={16} />} disabled={disabled} onClick={() => onChange(a)} aria-pressed={a === value}>
            {TOKENS[a].symbol}
          </ProButton>
        ))}
      </Box>
    </Box>
  );
}

function LiquidateModal({ target, markets, account, onClose }: { target: Address; markets: MarketRow[]; account: Address; onClose: () => void }) {
  const { phase, steps, start, back } = useRunner();
  const atRisk = useAtRisk();
  const me = useAccountData(account);
  const row = atRisk.data?.all.find((r) => r.user === target);
  const withDebt = row?.positions.filter((p) => p.borrowed > 0n).map((p) => p.asset) ?? [];
  const withColl = row?.positions.filter((p) => p.supplied > 0n).map((p) => p.asset) ?? [];
  const reserves = markets.map((m) => m.asset);
  const [debtAsset, setDebt] = React.useState<Address>(withDebt[0] ?? reserves[0]);
  const [collAsset, setColl] = React.useState<Address>(withColl.find((a) => a !== debtAsset) ?? withColl[0] ?? reserves[1] ?? reserves[0]);
  const [value, setValue] = React.useState('');
  const dm = markets.find((m) => m.asset === debtAsset)!;
  const cm = markets.find((m) => m.asset === collAsset)!;
  const userDebt = row?.positions.find((p) => p.asset === debtAsset)?.borrowed ?? 0n;
  const userColl = row?.positions.find((p) => p.asset === collAsset)?.supplied ?? 0n;
  const amount = safeParse(value, dm.decimals);
  const p = liquidationPreview(amount, userDebt, userColl, dm, cm);
  const wallet = me.data?.rows.find((r) => r.asset === debtAsset)?.balance ?? 0n;

  if (phase.kind === 'done') {
    const [covered, seized] = (phase.res.result as readonly [bigint, bigint]) ?? [amount, p.seized];
    return <Done title="Liquidation confirmed" body={<>You repaid <b>{fmtToken(covered, dm.decimals)} {dm.token.symbol}</b> of {shortAddr(target)}&apos;s debt and received <b>{fmtToken(seized, cm.decimals)} {cm.token.symbol}</b>.</>} hash={phase.res.hash} onClose={onClose} />;
  }
  if (phase.kind === 'error') return <ResultView tone="error" title="Liquidation failed" body={<>{phase.message} Nothing changed.</>} onClose={onClose} onRetry={back} />;
  const running = phase.kind === 'running';
  return (
    <Box>
      <Typography id="tx-modal-title" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500, pr: '2rem' }}>
        Liquidate {shortAddr(target)}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 4 }}>
        <Tag>Health factor {row ? fmtHealth(row.account.healthFactor) : '…'}</Tag>
        <Tag tone="purple">Max 50% of the debt per call</Tag>
      </Box>
      <Box sx={{ display: 'flex', gap: 4, mb: 4, flexWrap: 'wrap' }}>
        <TokenChoice label="Debt to repay" options={withDebt.length ? withDebt : reserves} value={debtAsset} onChange={setDebt} disabled={running} />
        <TokenChoice label="Collateral to receive" options={withColl.length ? withColl : [...reserves].reverse()} value={collAsset} onChange={setColl} disabled={running} />
      </Box>
      <AmountBox symbol={dm.token.symbol} decimals={dm.decimals} value={value} onChange={setValue} usd={toUsd(amount, dm.price, dm.decimals)} hint={`Max (50%) ${fmtToken(p.maxCover, dm.decimals)}`} maxDisabled={p.maxCover <= 0n} onMax={() => setValue(formatUnits(p.maxCover, dm.decimals))} disabled={running} />
      <Box sx={{ mt: 4, p: '1rem', borderRadius: '1rem', boxShadow: surfaceShadow('shadow-stroke-1'), display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Row label="Borrower's debt">{fmtToken(userDebt, dm.decimals)} {dm.token.symbol}</Row>
        <Row label="Debt covered">{fmtToken(p.covered, dm.decimals)} {dm.token.symbol}</Row>
        <Row label={`You receive (+${cm.liquidationBonus / 100}% bonus)`}>
          {fmtToken(p.seized, cm.decimals)} {cm.token.symbol} · {fmtUsd(p.seizedUsd)}
        </Row>
        <Row label="Your wallet">{fmtToken(wallet, dm.decimals)} {dm.token.symbol}</Row>
      </Box>
      {amount > p.maxCover && amount > 0n && (
        <Box sx={{ mt: 3, fontSize: 13, color: 'fg-3' }}>Only {fmtToken(p.maxCover, dm.decimals)} {dm.token.symbol} (50% of the debt) will be covered; the pool takes no more.</Box>
      )}
      {running && <Running steps={steps} />}
      <ActionButton
        running={running}
        disabled={amount <= 0n}
        label={amount <= 0n ? 'Enter an amount' : 'Approve & Liquidate'}
        onClick={() => void start({ account, label: 'liquidate()', ...buildLiquidateTx(collAsset, debtAsset, target, amount) })}
      />
      <Footnote />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Set price (admin box, §11)
// ---------------------------------------------------------------------------------------------

function SetPriceModal({ asset, market, account, isOwner, onClose }: { asset: Address; market: MarketRow; account: Address; isOwner: boolean; onClose: () => void }) {
  const { phase, steps, start, back } = useRunner();
  const [value, setValue] = React.useState('1700');
  const price = safeParse(value, 8);
  if (phase.kind === 'done') return <Done title="Price updated" body={<>The oracle now prices {market.token.symbol} at <b>{fmtUsd(price)}</b>.</>} hash={phase.res.hash} onClose={onClose} />;
  if (phase.kind === 'error') return <ResultView tone="error" title="Transaction failed" body={<>{phase.message}</>} onClose={onClose} onRetry={back} />;
  const running = phase.kind === 'running';
  return (
    <Box>
      <Typography id="tx-modal-title" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500, pr: '2rem' }}>
        Set {market.token.symbol} price
      </Typography>
      <Typography sx={{ mt: 1, mb: 4, color: 'fg-3', fontSize: '0.875rem' }}>oracle.setPrice({market.token.symbol}, parseUnits(value, 8)). Owner only.</Typography>
      <Box sx={{ borderRadius: '1rem', bgcolor: 'bg-2', boxShadow: surfaceShadow('shadow-stroke-1'), p: '1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box component="span" sx={{ fontSize: '2rem', fontWeight: 500, color: 'fg-3' }}>$</Box>
        <InputBase autoFocus value={value} disabled={running} onChange={(e) => setValue(sanitizeDecimalInput(e.target.value, 8))} inputProps={{ 'aria-label': 'price in dollars', inputMode: 'decimal' }} sx={{ flex: 1, fontSize: '2rem', fontWeight: 500, '& input': { p: 0 } }} />
      </Box>
      <Box sx={{ mt: 4, p: '1rem', borderRadius: '1rem', boxShadow: surfaceShadow('shadow-stroke-1'), display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Row label="Current price">{fmtUsd(market.price)}</Row>
        <Row label="Sends">{price.toString()} (8 decimals)</Row>
        {!isOwner && <Row label="Note"><Box component="span" sx={{ color: 'health-1' }}>Not the owner: this will revert</Box></Row>}
      </Box>
      {running && <Running steps={steps} />}
      <ActionButton running={running} disabled={price <= 0n} label="Set price" onClick={() => void start({ account, label: 'oracle.setPrice()', call: { contract: 'oracle', functionName: 'setPrice', args: [asset, price] } })} />
      <Footnote />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------

export function MiniTxModalHost() {
  const { request, close } = useMiniTx();
  const { account } = useWallet();
  const markets = useMarkets();
  const user = useAccountData(account);
  const owner = useOracleOwner();
  const [last, setLast] = React.useState<MiniTxRequest | null>(request);
  const [key, setKey] = React.useState(0);
  if (request && request !== last) {
    setLast(request);
    setKey((k) => k + 1);
  }
  const r = request ?? last;
  let content: React.ReactNode = <Box sx={{ py: 8, textAlign: 'center', color: 'fg-3' }}>Loading…</Box>;
  if (r && !account) content = <Box sx={{ py: 6, textAlign: 'center', color: 'fg-3' }}>Connect a wallet first.</Box>;
  else if (r && account && markets.data) {
    if (r.kind === 'liquidate') content = <LiquidateModal target={r.user} markets={markets.data} account={account} onClose={close} />;
    else if (r.kind === 'faucet') {
      const m = markets.data.find((x) => x.asset === r.asset);
      content = <FaucetModal asset={r.asset} token={m?.token ?? TOKENS[r.asset]} account={account} onClose={close} />;
    }
    else if (r.kind === 'setPrice') {
      const m = markets.data.find((x) => x.asset === r.asset)!;
      content = <SetPriceModal asset={r.asset} market={m} account={account} isOwner={owner.data?.toLowerCase() === account.toLowerCase()} onClose={close} />;
    } else if (user.data) {
      const m = markets.data.find((x) => x.asset === r.asset)!;
      content = <AmountModal kind={r.kind} market={m} user={user.data} account={account} onClose={close} />;
    }
  }
  return (
    <BasicModal open={Boolean(request)} onClose={close} maxWidth={432} labelledBy="tx-modal-title" paperSx={TX_MODAL_PAPER_SX}>
      <React.Fragment key={key}>{content}</React.Fragment>
    </BasicModal>
  );
}

/** Re-exported for screens that need to know the role of the connected account. */
export { roleOf, healthBand };
