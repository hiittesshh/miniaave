'use client';

/**
 * Market (spoke) page, rebuilt from the live layout (captured 2026-10-13):
 * header (market tile, "Market on ⟠ Chain", Deposit/Borrow) → stats + 2-series chart →
 * Deposit Markets → Borrow Markets → Connected Hubs → Risk Parameters → Supported Assets.
 * Column splits follow the live tables (≈194px first column on the market tables, equal
 * columns on Connected Hubs, a dense horizontally scrolling Supported Assets table).
 * Chart history is simulated; credit lines are illustrative (45% of the hub's deposits here).
 * (Server bundle refresh marker 3.)
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { ProReserve } from '@/data/types';
import { formatLowerCompact, formatPercent } from '@/shared/format';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { tv } from '@/shared/theme/tokens';
import { BalanceStat, ChartCard, EntityHeader, MarketTile, OnChain, SectionDivider, SectionHeading, SERIES, StatGroup, StatLine, StatSummary } from '../components/Entity';
import { ScrollTable, type ScrollColumn } from '../components/ScrollTable';
import { ApyCell, depositApyOf } from '../components/Apy';
import { ReserveMobileActions } from '../components/ReserveActions';
import { AssetDisplay, CapacityRing } from './Explore';
import { ProButton, USD } from '../ui';
import { NotFoundView } from './notfound/NotFoundView';
import { fromSlugId, proRoutes, useProContext } from '../state';
import { PIBorrow, PIDeposit } from '../icons';

/** Live mobile card value: amount, then the muted USD figure on the same line. */
const AmountInline = ({ amount, symbol, usd }: { amount: number; symbol: string; usd: number }) => (
  <Box component="span" sx={{ fontWeight: 500, lineHeight: '18px', textAlign: 'right' }}>
    <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{formatLowerCompact(amount)}{'  '}{symbol}</Box>{' '}
    <Box component="span" sx={{ color: 'fg-3', fontWeight: 400, whiteSpace: 'nowrap' }}>{formatLowerCompact(usd, { usd: true })}</Box>
  </Box>
);

const AmountOverUsd = ({ amount, symbol, usd }: { amount: number; symbol: string; usd: number }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '7px', lineHeight: '16.8px' }}>
    <Box component="span" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
      {formatLowerCompact(amount)}{'  '}{symbol}
    </Box>
    <Box component="span" sx={{ color: 'fg-3', whiteSpace: 'nowrap' }}>{formatLowerCompact(usd, { usd: true })}</Box>
  </Box>
);

/** Live: a button inside the row link (no nested anchors). */
function HubLink({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <Box
      component="button"
      type="button"
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(proRoutes.hub(id));
      }}
      sx={{ p: 0, border: 0, background: 'none', color: 'fg-1', fontFamily: 'inherit', fontSize: 14, lineHeight: '17px', cursor: 'pointer', '&:hover': { textDecoration: 'underline', textUnderlineOffset: 3 } }}
    >
      {name}
    </Box>
  );
}

const Check = ({ on }: { on: boolean }) => (
  <Box component="svg" viewBox="0 0 16 16" aria-label={on ? 'Yes' : 'No'} sx={{ width: 16, height: 16, color: on ? 'fg-1' : 'fg-4' }}>
    {on ? <path d="M2.5 8.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M3.5 3.5l9 9m0-9l-9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
  </Box>
);

const InlineAsset = ({ symbol, name }: { symbol: string; name: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
    <TokenIcon symbol={symbol} size={24} />
    <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
      <Box component="span" sx={{ fontWeight: 500 }}>{name}</Box>{' '}
      <Box component="span" sx={{ color: 'fg-3' }}>{symbol}</Box>
    </Box>
  </Box>
);

export function MarketPage({ slug }: { slug: string }) {
  const { protocol } = useProContext();
  const snap = protocol.data;
  const id = fromSlugId(slug);
  const spoke = snap?.spokes.find((s) => s.id === id);
  const chain = snap?.chains.find((c) => c.id === spoke?.chainId);
  const reserves = React.useMemo(() => snap?.reserves.filter((r) => r.spokeId === id) ?? [], [snap, id]);
  if (snap && !spoke) return <NotFoundView />;

  // Live default order, with no active sort indicator: deposits by token amount, borrows by USD.
  const deposits = reserves.filter((r) => r.suppliable).sort((a, b) => b.supplied - a.supplied);
  const borrows = reserves.filter((r) => r.borrowable).sort((a, b) => b.borrowedUSD - a.borrowedUSD);
  const totalDep = reserves.reduce((s, r) => s + r.suppliedUSD, 0);
  const totalBor = reserves.reduce((s, r) => s + r.borrowedUSD, 0);
  const hubIds = [...new Set(reserves.map((r) => r.hubId))];
  const hubRows = hubIds.map((hid) => {
    const rs = reserves.filter((r) => r.hubId === hid);
    const dep = rs.reduce((s, r) => s + r.suppliedUSD, 0);
    const bor = rs.reduce((s, r) => s + r.borrowedUSD, 0);
    const credit = Math.max(dep * 0.4462, bor * 1.2); // illustrative: live Main ≈ 44.6% of deposits
    return { id: hid, name: snap?.hubs.find((h) => h.id === hid)?.name ?? hid, dep, bor, credit, used: credit > 0 ? bor / credit : 0, symbols: [...new Map([...rs].sort((a, b) => a.name.localeCompare(b.name)).map((r) => [r.symbol, r])).keys()] }; // live: asset name order
  });
  const bonuses = reserves.filter((r) => r.collateral).map((r) => r.maxLiquidationBonus);
  const penalty = bonuses.length ? `${Math.round(Math.min(...bonuses) * 100)}-${Math.round(Math.max(...bonuses) * 100)}%` : '–';

  const first: ScrollColumn<ProReserve> = { key: 'asset', label: 'Asset', render: (r) => <AssetDisplay symbol={r.symbol} name={r.name} />, sortValue: (r) => r.name };
  const hubCol: ScrollColumn<ProReserve> = { key: 'hub', label: 'Hub', render: (r) => <HubLink id={r.hubId} name={r.hubName} />, sortValue: (r) => r.hubName };
  const depositCols: ScrollColumn<ProReserve>[] = [
    hubCol,
    { key: 'apy', label: 'APY', render: (r) => <ApyCell r={r} />, sortValue: depositApyOf, hideOnMobile: true },
    { key: 'dep', label: 'Total Deposits', render: (r) => <AmountOverUsd amount={r.supplied} symbol={r.symbol} usd={r.suppliedUSD} />, mobile: (r) => <AmountInline amount={r.supplied} symbol={r.symbol} usd={r.suppliedUSD} />, sortValue: (r) => r.suppliedUSD },
    { key: 'liq', label: 'Available Liquidity', render: (r) => (r.borrowable ? <AmountOverUsd amount={r.spokeLiquidity} symbol={r.symbol} usd={r.spokeLiquidityUSD} /> : <Box component="span" sx={{ color: 'fg-4' }}>–</Box>), mobile: (r) => (r.borrowable ? <AmountInline amount={r.spokeLiquidity} symbol={r.symbol} usd={r.spokeLiquidityUSD} /> : <Box component="span" sx={{ color: 'fg-4' }}>–</Box>), sortValue: (r) => r.spokeLiquidityUSD },
    {
      key: 'coll',
      label: 'Use as Collateral',
      render: (r) =>
        r.collateral ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '7px', lineHeight: '16.8px' }}>
            <Box component="span" sx={{ fontWeight: 500 }}>Supported</Box>
            <Box component="span" sx={{ color: 'fg-3' }}>CF {formatPercent(r.collateralFactor)}</Box>
          </Box>
        ) : (
          <Box component="span" sx={{ color: 'fg-4' }}>Not eligible</Box>
        ),
      sortValue: (r) => r.collateralFactor,
    },
  ];
  const borrowCols: ScrollColumn<ProReserve>[] = [
    hubCol,
    { key: 'apy', label: 'APY', render: (r) => <ApyCell r={r} side="borrow" />, sortValue: (r) => r.borrowAPY, hideOnMobile: true },
    { key: 'bor', label: 'Total Borrows', render: (r) => <AmountOverUsd amount={r.borrowed} symbol={r.symbol} usd={r.borrowedUSD} />, mobile: (r) => <AmountInline amount={r.borrowed} symbol={r.symbol} usd={r.borrowedUSD} />, sortValue: (r) => r.borrowedUSD },
    { key: 'liq', label: 'Available Liquidity', render: (r) => <AmountOverUsd amount={r.spokeLiquidity} symbol={r.symbol} usd={r.spokeLiquidityUSD} />, mobile: (r) => <AmountInline amount={r.spokeLiquidity} symbol={r.symbol} usd={r.spokeLiquidityUSD} />, sortValue: (r) => r.spokeLiquidityUSD },
  ];
  type HubRow = (typeof hubRows)[number];
  // Live: the hub name cell carries 15px vertical padding (76px rows).
  const hubFirst: ScrollColumn<HubRow> = { key: 'hub', label: 'Hub', render: (h) => <Box component="span" sx={{ fontWeight: 500, py: { md: '15px' } }}>{h.name}</Box>, sortValue: (h) => h.name };
  const hubCols: ScrollColumn<HubRow>[] = [
    { key: 'dep', label: 'Deposits', render: (h) => <Box component="span" sx={{ fontWeight: 500 }}>{formatLowerCompact(h.dep, { usd: true })}</Box>, sortValue: (h) => h.dep, hideOnMobile: true },
    { key: 'bor', label: 'Borrows', render: (h) => <Box component="span" sx={{ fontWeight: 500 }}>{formatLowerCompact(h.bor, { usd: true })}</Box>, sortValue: (h) => h.bor },
    { key: 'credit', label: 'Credit Line', render: (h) => <Box component="span" sx={{ fontWeight: 500 }}>{formatLowerCompact(h.credit, { usd: true })}</Box>, sortValue: (h) => h.credit },
    { key: 'used', label: 'Credit Used', render: (h) => <Box sx={{ fontWeight: 500 }}><CapacityRing value={h.used} /></Box>, sortValue: (h) => h.used },
    {
      key: 'assets',
      label: 'Assets',
      render: (h) => (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Box sx={{ display: 'inline-flex' }}>
            {h.symbols.slice(0, 4).map((s, i) => (
              <Box key={s} sx={{ ml: i ? '-4.8px' : 0, borderRadius: '50%', boxShadow: `0 0 0 2.4px ${tv('bg-2')}`, display: 'flex', zIndex: 4 - i }}>
                <TokenIcon symbol={s} size={24} />
              </Box>
            ))}
          </Box>
          {h.symbols.length > 4 && <Box component="span" sx={{ color: 'fg-3', fontWeight: 500, fontSize: 14 }}>+{h.symbols.length - 4}</Box>}
        </Box>
      ),
    },
  ];
  const supportFirst: ScrollColumn<ProReserve> = { key: 'asset', label: 'Asset', render: (r) => <InlineAsset symbol={r.symbol} name={r.name} />, sortValue: (r) => r.name };
  const supportCols: ScrollColumn<ProReserve>[] = [
    { ...hubCol, hideOnMobile: true },
    { key: 'deposit', label: 'Deposit', render: (r) => <Check on={r.suppliable} /> },
    { key: 'borrow', label: 'Borrow', render: (r) => <Check on={r.borrowable} /> },
    { key: 'collateral', label: 'Collateral', render: (r) => <Check on={r.collateral} /> },
    { key: 'cf', label: 'Col. Factor', render: (r) => (r.collateral ? <Box component="span" sx={{ fontWeight: 500 }}>{formatPercent(r.collateralFactor)}</Box> : <Box component="span" sx={{ color: 'fg-4' }}>–</Box>), sortValue: (r) => r.collateralFactor },
    { key: 'risk', label: 'Col. Risk', render: (r) => (r.collateral && r.collateralRisk > 0 ? <Box component="span" sx={{ fontWeight: 500 }}>{formatPercent(r.collateralRisk)}</Box> : <Box component="span" sx={{ color: 'fg-4' }}>–</Box>), sortValue: (r) => r.collateralRisk },
  ];

  return (
    <Box>
      <EntityHeader
        icon={<MarketTile />}
        title={spoke?.name ?? ''}
        sub={<OnChain prefix="Market on" chain={chain} />}
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

      <Box sx={{ mt: { xs: '24px', md: '48px' }, display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: '24px' }}>
        <StatSummary label="Total Deposits" value={spoke ? <USD value={totalDep} /> : '—'}>
          <StatGroup>
            <BalanceStat label="Total Borrows">{spoke ? <USD value={totalBor} /> : '—'}</BalanceStat>
          </StatGroup>
          <StatGroup>
            <StatLine label="Assets">{new Set(reserves.map((r) => r.symbol)).size}</StatLine>
            <StatLine label="Connected Hubs">{hubIds.length}</StatLine>
          </StatGroup>
        </StatSummary>
        {spoke && (
          <ChartCard
            seed={`market:${spoke.id}`}
            series={[
              { key: 'dep', label: 'Total Deposits', color: SERIES.green, current: totalDep, kind: 'usd' },
              { key: 'bor', label: 'Total Borrows', color: SERIES.orange, current: totalBor, kind: 'usd' },
            ]}
          />
        )}
      </Box>

      <SectionDivider />
      <SectionHeading title="Deposit Markets" description="Assets available to deposit in this market" />
      <ScrollTable rows={deposits} first={first} columns={depositCols} rowKey={(r) => r.id} rowHref={(r) => proRoutes.reserve(r.id)} mobileAside={(r) => <ApyCell r={r} mobile />} mobileLimit={2} mobileActions={(r) => <ReserveMobileActions r={r} side="supply" />} firstWidth={187} loading={!snap} />

      <SectionDivider />
      <SectionHeading title="Borrow Markets" description="Assets available to borrow in this market" />
      <ScrollTable rows={borrows} first={first} columns={borrowCols} rowKey={(r) => r.id} rowHref={(r) => proRoutes.reserve(r.id)} mobileAside={(r) => <ApyCell r={r} side="borrow" mobile />} mobileLimit={2} mobileActions={(r) => <ReserveMobileActions r={r} side="borrow" />} firstWidth={185} loading={!snap} />

      <SectionDivider />
      <SectionHeading title="Connected Hubs" description="Liquidity provided by connected hubs" />
      <ScrollTable rows={hubRows} first={hubFirst} columns={hubCols} rowKey={(h) => h.id} defaultSort={{ key: 'dep', desc: true }} rowHref={(h) => proRoutes.hub(h.id)} equal loading={!snap} mobileAside={(h) => formatLowerCompact(h.dep, { usd: true })} />

      <SectionDivider />
      <SectionHeading title="Risk Parameters" description="Liquidation rules for positions in this market" />
      <Box sx={{ borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}`, p: '20px', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, columnGap: '64px', rowGap: { xs: '16px', md: '20px' }, '& > *': { mt: '0 !important' }, '& > * + *': { pt: { xs: '16px', md: 0 }, borderTop: { xs: `1px solid ${tv('border-1')}`, md: 'none' } } }}>
        <StatLine label="Liquidation Penalty" tooltip="Bonus paid to liquidators from the seized collateral (range across this market's collateral)">
          {penalty}
        </StatLine>
        <StatLine label="Target Health Factor" tooltip="Health factor a liquidation restores a position to">
          {spoke?.liquidationTargetHF.toFixed(2) ?? '–'}
        </StatLine>
      </Box>

      <SectionDivider />
      <SectionHeading title="Supported Assets" description="What each asset supports in this market" />
      <ScrollTable rows={reserves} first={supportFirst} columns={supportCols} rowKey={(r) => r.id} defaultSort={{ key: 'asset', desc: false }} rowHref={(r) => proRoutes.reserve(r.id)} dense loading={!snap} mobileAside={(r) => <Box component="span" sx={{ fontWeight: 400 }}>{r.hubName}</Box>} mobileLimit={2} />
      <Typography sx={{ mt: 2, fontSize: 12, color: 'fg-4' }}>Credit lines and collateral parameters are illustrative demo values.</Typography>
    </Box>
  );
}
