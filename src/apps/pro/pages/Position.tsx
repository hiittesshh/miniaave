'use client';

import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import * as React from 'react';
import { liquidationPrice } from '@/lib/aave-math';
import { formatLowerCompact, formatNumber, formatPercent, formatUSD } from '@/shared/format';
import { useWallet } from '@/shared/state/wallet';
import { tv } from '@/shared/theme/tokens';
import { AssetCell, ChainIcon, HealthBar, HealthFactor, HubMarketIcon, PageTitle, Pct, ProButton, ProCard, ProEmpty, ProTable, Section, Stat, StatsRow, Tag, USD } from '../ui';
import { proRoutes, useProContext, useProModal } from '../state';

export function PositionPage({ positionId }: { positionId: string }) {
  const { protocol, user, account, hydrated } = useProContext();
  const openConnect = useWallet((s) => s.openConnect);
  const open = useProModal((s) => s.open);
  const snap = protocol.data;
  const pos = user.data?.positions.find((p) => p.id === positionId);
  const spoke = snap?.spokes.find((s) => s.id === pos?.spokeId);
  const chain = snap?.chains.find((c) => c.id === spoke?.chainId);

  if (hydrated && !account)
    return <ProEmpty title="Connect wallet" description="Connect a demo wallet to view this position." action={<ProButton onClick={openConnect}>Connect Wallet</ProButton>} />;
  if (user.data && snap && !pos)
    return <ProEmpty title="No Positions" description="This position is closed or belongs to another demo account." action={<ProButton href={proRoutes.home}>Back to Dashboard</ProButton>} />;

  const s = pos?.summary;
  const deposits = pos?.lines.filter((l) => l.supplied > 0) ?? [];
  const loans = pos?.lines.filter((l) => l.borrowed > 0) ?? [];
  const collateral = deposits.filter((l) => l.collateralEnabled);
  const single = collateral.length === 1 ? collateral[0] : null;
  const liq = single && s ? liquidationPrice(s.totalBorrowedUSD, single.supplied, single.collateralFactor) : 0;
  const reserve = (id: string) => snap!.reserves.find((r) => r.id === id)!;

  return (
    <>
      <PageTitle
        title={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <HubMarketIcon kind="market" label={spoke?.name ?? 'P'} size={40} /> {spoke ? `${spoke.name} Market Position` : 'Position'}
          </Box>
        }
        subtitle={
          spoke && (
            <>
              <ChainIcon chain={chain} size={14} /> {chain?.name} · Your balances, collateral, and debt on this market ·{' '}
              <Box component={Link} href={proRoutes.market(spoke.id)} sx={{ textDecoration: 'underline' }}>
                {spoke.name} Market
              </Box>
            </>
          )
        }
      />
      <StatsRow>
        <Stat label="Balance" tooltip="Net value of your position in USD (deposits minus borrows)" loading={!s} size="lg">{s && <USD value={s.netWorthUSD} />}</Stat>
        <Stat label="Collateral" tooltip="The value of your deposits that counts as collateral for borrowing" loading={!s} size="lg">{s && <USD value={s.totalCollateralUSD} />}</Stat>
        <Stat label="Borrowed" loading={!s} size="lg">{s && <USD value={s.totalBorrowedUSD} />}</Stat>
        <Stat label="Position APY" tooltip="Your net annualised return for this position after combining deposit yield and borrow costs" loading={!s} size="lg">{s && (s.netWorthUSD > 0 ? <Pct value={s.netAPY} /> : '—')}</Stat>
        <Stat label="Risk Premium" tooltip="An additional cost on your borrow rate based on the riskiness of your collateral" loading={!s} size="lg">{s && <Pct value={s.riskPremium} />}</Stat>
      </StatsRow>

      {s && (
        <ProCard sx={{ p: '1.25rem', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 5, animation: 'clone-fade-up 300ms ease both' }}>
          <Box>
            <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem', mb: 1 }}>Health Factor</Typography>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 500, mb: 3 }}>
              <HealthFactor value={s.healthFactor} />
            </Box>
            <HealthBar value={s.healthFactor} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, fontSize: '0.6875rem', color: 'fg-3' }}>
              <span>1.0 · Liquidation</span>
              <span>3.0+</span>
            </Box>
          </Box>
          <Box>
            <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem', mb: 1 }}>Borrowing Power</Typography>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 500 }}>{formatUSD(s.availableBorrowsUSD)}</Typography>
            <Box sx={{ mt: 3, height: 6, borderRadius: 3, bgcolor: 'bg-6', overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${Math.min(s.borrowPowerUsed, 1) * 100}%`, bgcolor: s.borrowPowerUsed > 0.9 ? 'health-1' : 'purple-1', transition: 'width 700ms cubic-bezier(0.19,1,0.22,1)' }} />
            </Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'fg-3', mt: 1 }}>{formatPercent(s.borrowPowerUsed)} of borrowing power used</Typography>
          </Box>
          <Box>
            <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem', mb: 1 }}>Liquidation Price</Typography>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 500 }}>{single && s.totalBorrowedUSD > 0 ? formatUSD(liq) : '—'}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'fg-3', mt: 1 }}>
              {single && s.totalBorrowedUSD > 0 ? `${reserve(single.reserveId).symbol} price at which this position may be liquidated (now ${formatUSD(reserve(single.reserveId).priceUSD)})` : 'Shown for single-collateral positions with debt'}
            </Typography>
          </Box>
        </ProCard>
      )}

      <Section title="Deposits">
        {deposits.length === 0 && pos ? (
          <ProEmpty title="No Deposits" description="Deposit an asset from your wallet to get started" />
        ) : (
          <ProTable
            rows={deposits}
            loading={!pos}
            rowKey={(l) => l.reserveId}
            columns={[
              { key: 'a', label: 'Asset', render: (l) => <AssetCell symbol={l.symbol} sub={`${reserve(l.reserveId).hubName} Hub`} />, sortValue: (l) => l.symbol },
              { key: 'v', label: 'Deposited', render: (l) => <Box><Box>{formatLowerCompact(l.suppliedUSD, { usd: true, compact: true })}</Box><Box sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>{formatNumber(l.supplied)} {l.symbol}</Box></Box>, sortValue: (l) => l.suppliedUSD },
              { key: 'apy', label: 'APY', render: (l) => <Box component="span" sx={{ color: 'data-green' }}>{formatPercent(l.supplyAPY)}</Box>, sortValue: (l) => l.supplyAPY },
              { key: 'cf', label: 'Collateral Factor', render: (l) => (reserve(l.reserveId).collateral ? formatPercent(l.collateralFactor, 1) : '—'), sortValue: (l) => l.collateralFactor },
              {
                key: 'c',
                label: 'Use as Collateral',
                render: (l) => (reserve(l.reserveId).collateral ? <Switch checked={l.collateralEnabled} onChange={() => open({ type: 'collateral', reserveId: l.reserveId })} slotProps={{ input: { 'aria-label': `Use ${l.symbol} as collateral` } }} /> : <Box component="span" sx={{ color: 'fg-4', fontSize: '0.8125rem' }}>Not eligible as collateral</Box>),
              },
            ]}
            actions={(l) => (
              <>
                <ProButton size="sm" variant="secondary" onClick={() => open({ type: 'withdraw', reserveId: l.reserveId })}>Withdraw</ProButton>
                <ProButton size="sm" variant="primary" onClick={() => open({ type: 'deposit', reserveId: l.reserveId })}>Deposit</ProButton>
              </>
            )}
          />
        )}
      </Section>

      <Section title="Loans" id="loans">
        {loans.length === 0 && pos ? (
          <ProEmpty title="No Borrows" description="Borrow an asset to see it listed here" action={spoke && <ProButton variant="secondary" href={proRoutes.market(spoke.id)}>Borrow from {spoke.name}</ProButton>} />
        ) : (
          <ProTable
            rows={loans}
            loading={!pos}
            rowKey={(l) => l.reserveId}
            columns={[
              { key: 'a', label: 'Asset', render: (l) => <AssetCell symbol={l.symbol} sub={`${reserve(l.reserveId).hubName} Hub`} />, sortValue: (l) => l.symbol },
              { key: 'v', label: 'Borrowed', render: (l) => <Box><Box>{formatLowerCompact(l.borrowedUSD, { usd: true, compact: true })}</Box><Box sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>{formatNumber(l.borrowed)} {l.symbol}</Box></Box>, sortValue: (l) => l.borrowedUSD },
              { key: 'base', label: 'Base APY', render: (l) => formatPercent(reserve(l.reserveId).borrowAPY) },
              { key: 'apy', label: 'Your APY', tooltip: 'Your effective borrow rate, combining the base rate for this asset and your risk premium', render: (l) => <Box component="button" type="button" onClick={() => open({ type: 'rate', reserveId: l.reserveId })} sx={{ border: 0, background: 'none', p: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', color: 'fg-1', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>{formatPercent(l.effectiveBorrowAPY)}</Box>, sortValue: (l) => l.effectiveBorrowAPY },
            ]}
            actions={(l) => (
              <>
                <ProButton size="sm" variant="secondary" onClick={() => open({ type: 'repay', reserveId: l.reserveId })}>Repay</ProButton>
                <ProButton size="sm" variant="primary" onClick={() => open({ type: 'borrow', reserveId: l.reserveId })}>Borrow</ProButton>
              </>
            )}
          />
        )}
      </Section>
      {s && s.riskPremium > 0 && (
        <Typography sx={{ fontSize: '0.75rem', color: 'fg-3' }}>
          <Tag tone="warning">Risk Premium {formatPercent(s.riskPremium)}</Tag> Borrowers pay an extra rate based on the riskiness of the collateral needed to cover their debt (simplified V4 model).{' '}
          <Box component="span" sx={{ color: tv('fg-2') }}>Safer collateral lowers it.</Box>
        </Typography>
      )}
    </>
  );
}
