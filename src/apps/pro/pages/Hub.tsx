'use client';

/**
 * Hub page, rebuilt from the live layout (captured 2026-10-13):
 * header (Back, hub tile, "Hub on ⟠ Chain", Deposit/Borrow) → stats column (308px) + chart card
 * (four series) → Deposit Opportunities → Borrow Opportunities → Hub Activity.
 * Opportunity tables use the live "fits" table layout; amount cells show USD over token amount.
 * Chart history and activity are simulated (deterministic) and labelled as such.
 */
import Box from '@mui/material/Box';
import * as React from 'react';
import type { ProHubAsset, ProReserve } from '@/data/types';
import { formatLowerCompact, formatPercent } from '@/shared/format';
import { ActivityList, ChartCard, EntityHeader, HubTile, OnChain, SectionDivider, SectionHeading, SERIES, StatGroup, StatLine, StatSummary, simulatedActivity } from '../components/Entity';
import { ScrollTable, type ScrollColumn } from '../components/ScrollTable';
import { AssetDisplay } from './Explore';
import { ProButton, USD } from '../ui';
import { NotFoundView } from './notfound/NotFoundView';
import { fromSlugId, proRoutes, useProContext, useProModal } from '../state';
import { ApyCell, depositApyOf } from '../components/Apy';
import { useRequireWallet } from './Dashboard';
import { PIBorrow, PIDeposit } from '../icons';

/** Live hub mobile card value: USD first, then the muted token amount. */
const UsdInline = ({ usd, amount, symbol }: { usd: number; amount: number; symbol: string }) => (
  <Box component="span" sx={{ fontWeight: 500, lineHeight: '18px', textAlign: 'right' }}>
    <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{formatLowerCompact(usd, { usd: true })}</Box>{' '}
    <Box component="span" sx={{ color: 'fg-3', fontWeight: 400, whiteSpace: 'nowrap' }}>{formatLowerCompact(amount)}{'  '}{symbol}</Box>
  </Box>
);

const UsdOverAmount = ({ usd, amount, symbol }: { usd: number; amount: number; symbol: string }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '16.8px' }}>
    <Box component="span" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{formatLowerCompact(usd, { usd: true })}</Box>
    <Box component="span" sx={{ color: 'fg-3', whiteSpace: 'nowrap', lineHeight: '14px' }}>
      {formatLowerCompact(amount)}{'  '}{symbol}
    </Box>
  </Box>
);

/** Live hub mobile card footer: one full-width Deposit/Borrow pill (no ⋯); opens the first market for the asset. */
function HubAction({ reserve, side }: { reserve?: ProReserve; side: 'supply' | 'borrow' }) {
  const open = useProModal((s) => s.open);
  const requireWallet = useRequireWallet();
  return (
    <ProButton variant="tertiary" sx={{ flex: 1 }} disabled={!reserve} onClick={() => reserve && requireWallet(() => open({ type: side === 'supply' ? 'deposit' : 'borrow', reserveId: reserve.id }))}>
      {side === 'supply' ? 'Deposit' : 'Borrow'}
    </ProButton>
  );
}

export function HubPage({ slug }: { slug: string }) {
  const { protocol } = useProContext();
  const snap = protocol.data;
  const id = fromSlugId(slug);
  const hub = snap?.hubs.find((h) => h.id === id);
  const chain = snap?.chains.find((c) => c.id === hub?.chainId);
  const assets = React.useMemo(() => snap?.hubAssets.filter((a) => a.hubId === id) ?? [], [snap, id]);
  const activity = React.useMemo(() => (hub ? simulatedActivity(`hub:${hub.id}`, assets.map((a) => ({ symbol: a.symbol, priceUSD: a.priceUSD })), hub.name, chain) : []), [hub, assets, chain]);
  if (snap && !hub) return <NotFoundView />;
  const reserves = snap?.reserves.filter((r) => r.hubId === id) ?? [];
  const depositAssets = assets.filter((a) => reserves.some((r) => r.symbol === a.symbol && r.suppliable));
  const borrowAssets = assets.filter((a) => reserves.some((r) => r.symbol === a.symbol && r.borrowable));
  // Live: a hub asset shows the borrow rewards badge when any of its markets is in the merit programme.
  const meritOf = (a: ProHubAsset) => reserves.some((r) => r.symbol === a.symbol && r.borrowMerit);
  const totalDep = hub?.totalSuppliedUSD ?? 0;
  const totalBor = hub?.totalBorrowedUSD ?? 0;

  const first: ScrollColumn<ProHubAsset> = { key: 'asset', label: 'Asset', render: (a) => <AssetDisplay symbol={a.symbol} name={a.name} />, sortValue: (a) => a.name };
  const depositCols: ScrollColumn<ProHubAsset>[] = [
    { key: 'apy', label: 'APY', render: (a) => <ApyCell r={a} />, sortValue: depositApyOf, hideOnMobile: true },
    { key: 'dep', label: 'Total deposits', render: (a) => <UsdOverAmount usd={a.totalSuppliedUSD} amount={a.totalSupplied} symbol={a.symbol} />, mobile: (a) => <UsdInline usd={a.totalSuppliedUSD} amount={a.totalSupplied} symbol={a.symbol} />, sortValue: (a) => a.totalSuppliedUSD },
    { key: 'liq', label: 'Liquidity', render: (a) => <UsdOverAmount usd={a.availableLiquidity * a.priceUSD} amount={a.availableLiquidity} symbol={a.symbol} />, mobile: (a) => <UsdInline usd={a.availableLiquidity * a.priceUSD} amount={a.availableLiquidity} symbol={a.symbol} />, sortValue: (a) => a.availableLiquidity * a.priceUSD },
  ];
  const borrowCols: ScrollColumn<ProHubAsset>[] = [
    { key: 'apy', label: 'APY', render: (a) => <ApyCell r={{ ...a, borrowMerit: meritOf(a) }} side="borrow" />, sortValue: (a) => a.borrowAPY, hideOnMobile: true },
    { key: 'bor', label: 'Total borrows', render: (a) => <UsdOverAmount usd={a.totalBorrowedUSD} amount={a.totalBorrowed} symbol={a.symbol} />, mobile: (a) => <UsdInline usd={a.totalBorrowedUSD} amount={a.totalBorrowed} symbol={a.symbol} />, sortValue: (a) => a.totalBorrowedUSD },
    { key: 'avail', label: 'Avail borrows', render: (a) => <UsdOverAmount usd={a.availableLiquidity * a.priceUSD} amount={a.availableLiquidity} symbol={a.symbol} />, mobile: (a) => <UsdInline usd={a.availableLiquidity * a.priceUSD} amount={a.availableLiquidity} symbol={a.symbol} />, sortValue: (a) => a.availableLiquidity * a.priceUSD },
  ];

  return (
    <Box>
      <EntityHeader
        icon={<HubTile />}
        title={hub?.name ?? ''}
        sub={<OnChain prefix="Hub on" chain={chain} />}
        actions={
          <>
            <ProButton variant="secondary" prefixIcon={<PIDeposit />} href={proRoutes.deposit}>
              Deposit
            </ProButton>
            <ProButton variant="secondary" prefixIcon={<PIBorrow />} href={proRoutes.borrow}>
              Borrow
            </ProButton>
          </>
        }
      />

      <Box sx={{ mt: { xs: '24px', md: '48px' }, display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: '40px' }}>
        {/* Live hub aside: two stacked summaries; $ figures render 16.6px tall (rows 41px apart). */}
        <Box>
          <StatSummary part="first" label="Total deposits" value={hub ? <USD value={totalDep} /> : '—'} />
          <StatSummary part="next" label="Total borrows" value={hub ? <USD value={totalBor} /> : '—'}>
            <StatGroup>
              <StatLine label="Market size"><Box component="span" sx={{ display: 'block', height: 16.625 }}>{formatLowerCompact(totalDep, { usd: true })}</Box></StatLine>
              <StatLine label="Available liquidity"><Box component="span" sx={{ display: 'block', height: 16.625 }}>{formatLowerCompact(Math.max(0, totalDep - totalBor), { usd: true })}</Box></StatLine>
              <StatLine label="Utilization rate">{formatPercent(totalDep > 0 ? totalBor / totalDep : 0)}</StatLine>
            </StatGroup>
          </StatSummary>
        </Box>
        {hub && (
          <ChartCard
            minHeight={359}
            seed={`hub:${hub.id}`}
            series={[
              { key: 'dep', label: 'Total deposits', color: SERIES.green, current: totalDep, kind: 'usd' },
              { key: 'bor', label: 'Total borrowed', color: SERIES.orange, current: totalBor, kind: 'usd' },
              { key: 'avail', label: 'Available liquidity', color: SERIES.purple, current: Math.max(0, totalDep - totalBor), kind: 'usd' },
              { key: 'util', label: 'Utilization rate', color: SERIES.pink, current: totalDep > 0 ? totalBor / totalDep : 0, kind: 'pct' },
            ]}
          />
        )}
      </Box>

      <SectionDivider />
      <SectionHeading title="Deposit Opportunities" />
      <ScrollTable rows={depositAssets} first={first} columns={depositCols} rowKey={(a) => a.id} defaultSort={{ key: 'apy', desc: true }} rowHref={(a) => proRoutes.token(a.symbol)} loading={!snap} mobileAside={(a) => <ApyCell r={a} mobile />} mobileLimit={2} mobileActions={(a) => <HubAction reserve={reserves.find((r) => r.symbol === a.symbol && r.suppliable)} side="supply" />} />

      <SectionDivider />
      <SectionHeading title="Borrow Opportunities" />
      <ScrollTable rows={borrowAssets} first={first} columns={borrowCols} rowKey={(a) => a.id} defaultSort={{ key: 'apy', desc: true }} rowHref={(a) => proRoutes.token(a.symbol)} loading={!snap} mobileAside={(a) => <ApyCell r={{ ...a, borrowMerit: meritOf(a) }} side="borrow" mobile />} mobileLimit={2} mobileActions={(a) => <HubAction reserve={reserves.find((r) => r.symbol === a.symbol && r.borrowable)} side="borrow" />} />

      <SectionDivider />
      <SectionHeading title="Hub Activity" right={<Box component="span" sx={{ fontSize: 12, color: 'fg-4' }}>Simulated activity (demo)</Box>} />
      <ActivityList items={activity} />
    </Box>
  );
}
