'use client';

import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import type { ProProtocolSnapshot, ProReserve } from '@/data/types';
import { useProtocolTotals } from '@/data/hooks';
import { formatLowerCompact } from '@/shared/format';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useWallet } from '@/shared/state/wallet';
import { tv } from '@/shared/theme/tokens';
import { ChainIcon, PageTitle, ProButton, ProEmpty, USD } from '../ui';
import { ScrollTable, type ScrollColumn } from '../components/ScrollTable';
import { FilterLinesIcon, PillMenu } from '../components/PillMenu';
import { ApyCell } from '../components/Apy';
import { DisplayPrefs } from '../components/DisplayPrefs';
import { proRoutes, useProContext, useProFilter } from '../state';
import { PIBorrow, PIDeposit, PIInfo, PIMore, PISearch, PISliders } from '../icons';
import { useRouter } from 'next/navigation';
import { useRequireWallet } from './Dashboard';
import { useProModal } from '../state';
import Link from 'next/link';

export { PillMenu } from '../components/PillMenu';

export function SearchField({ value, onChange, placeholder, fullOnPhone = false, full = false }: { value: string; onChange: (v: string) => void; placeholder: string; /** Take a whole toolbar row below 600px so the input is not squeezed. */ fullOnPhone?: boolean; /** Take the whole row at every size. */ full?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', height: 36, pl: '14px', pr: '12px', borderRadius: '160px', bgcolor: 'transparent', boxShadow: `0 0 0 1px ${tv('border-1')}`, flex: full ? '1 1 100%' : { xs: fullOnPhone ? '1 1 100%' : 1, sm: 1, md: '0 1 251px' }, transition: 'background 100ms, box-shadow 100ms', '&:focus-within': { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } }}>
      <Box component="span" sx={{ display: 'flex', color: 'fg-4' }}>
        <PISearch />
      </Box>
      <InputBase value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputProps={{ 'aria-label': placeholder }} sx={{ flex: 1, fontSize: '0.875rem', '& input': { p: 0 }, '& input::placeholder': { color: 'fg-4', opacity: 1 } }} />
    </Box>
  );
}

/** Live app: small circular ring plus an integer percentage ("<0.01%" for dust). */
/** Live row action: a 32px round text button in fg-2, fg-1 + plate on hover. */
export const rowIconSx = { width: 32, height: 32, p: 0, border: 0, borderRadius: '50%', background: 'none', color: 'fg-2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 100ms, background-color 100ms', '&:hover': { color: 'fg-1', bgcolor: 'rgba(255,255,255,0.06)' } } as const;

export function CapacityRing({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 1);
  const r = 6.5;
  const c = 2 * Math.PI * r;
  const label = pct === 0 ? '0%' : pct * 100 < 0.01 ? '<0.01%' : pct * 100 < 1 ? `${(pct * 100).toFixed(2)}%` : `${Math.round(pct * 100)}%`;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: 18 }}>
      <Box component="svg" viewBox="0 0 16 16" sx={{ width: 16, height: 16, transform: 'rotate(-90deg)', flexShrink: 0 }} aria-hidden>
        <circle cx="8" cy="8" r={r} fill="none" strokeWidth="1.5" style={{ stroke: tv('border-2') }} />
        <circle cx="8" cy="8" r={r} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(pct, 0.001))} style={{ stroke: pct > 0.98 ? tv('red-1') : tv('purple-1'), transition: 'stroke-dashoffset 700ms cubic-bezier(0.19,1,0.22,1)' }} />
      </Box>
      <span className="hover-underline">{label}</span>
    </Box>
  );
}

// Live cell typography: value 14/500 (16.8px line), muted 14/400 fg-3 eight pixels below.
export const TwoLine = ({ top, bottom }: { top: React.ReactNode; bottom: React.ReactNode }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '16.8px' }}>
    <Box sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{top}</Box>
    <Box sx={{ color: 'fg-3', whiteSpace: 'nowrap', fontWeight: 400, lineHeight: '14px' }}>{bottom}</Box>
  </Box>
);

/** Live mobile field value: "43.59K ETH" then the muted USD figure on the same line. */
const Inline = ({ top, bottom }: { top: React.ReactNode; bottom: React.ReactNode }) => (
  // Live: the USD part wraps under the amount when the row is too narrow (right-aligned).
  <Box component="span" sx={{ lineHeight: '18px', textAlign: 'right' }}>
    <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{top}</Box>{' '}
    <Box component="span" sx={{ color: 'fg-3', fontWeight: 400, whiteSpace: 'nowrap' }}>
      {bottom}
    </Box>
  </Box>
);

/** Live asset cell: 44px logo, 16px gap, name 14/500 over symbol 14/400 fg-3. */
export function AssetDisplay({ symbol, name }: { symbol: string; name: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
      <TokenIcon symbol={symbol} size={44} />
      <TwoLine top={name} bottom={symbol} />
    </Box>
  );
}

export function IconStack({ symbols }: { symbols: string[] }) {
  const shown = symbols.slice(0, 4);
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
        {shown.map((s, i) => (
          <Box key={s} sx={{ ml: i ? '-4px' : 0, borderRadius: '50%', bgcolor: 'bg-2', display: 'flex', zIndex: shown.length - i }}>
            <TokenIcon symbol={s} size={20} />
          </Box>
        ))}
      </Box>
      {symbols.length > shown.length && (
        <Box component="span" sx={{ color: 'fg-3', fontWeight: 500 }}>
          +{symbols.length - shown.length}
        </Box>
      )}
    </Box>
  );
}

export function HeaderStat({ label, tooltip, value }: { label: string; tooltip: string; value: number }) {
  return (
    <Box>
      <Typography component="div" sx={{ color: 'fg-3', fontSize: '0.875rem', lineHeight: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {label}
        <Tooltip title={tooltip}>
          <Box component="span" tabIndex={0} aria-label={label} sx={{ display: 'inline-flex', color: 'fg-4' }}>
            <PIInfo size={16} />
          </Box>
        </Tooltip>
      </Typography>
      <Typography component="div" sx={{ fontSize: '1.5rem', fontWeight: 500, lineHeight: '28.8px', mt: '9px' }}>
        <USD value={value} />
      </Typography>
    </Box>
  );
}

export function ProtocolTotalsHeader() {
  // Live: these are Aave-wide figures (V3 + V4), not just the V4 hubs listed below.
  const totals = useProtocolTotals().data;
  if (!totals) return null;
  return (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'flex-start', gap: '32px', textAlign: 'left', pt: '4px' }}>
      <HeaderStat label="Protocol Deposits" tooltip="Total value deposited across Aave (demo V3 markets plus V4 hubs; simulated)" value={totals.depositsUSD} />
      <Box sx={{ width: '1px', height: 65, borderRadius: '2px', bgcolor: 'border-0' }} />
      <HeaderStat label="Total Protocol Loans" tooltip="Total value borrowed across Aave (demo V3 markets plus V4 hubs; simulated)" value={totals.loansUSD} />
    </Box>
  );
}

type GroupBy = 'hub' | 'market' | 'asset' | 'category';
const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'asset', label: 'Asset' },
  { value: 'category', label: 'Asset Category' },
  { value: 'hub', label: 'Hub' },
  { value: 'market', label: 'Market' },
];
const CATEGORY_LABEL: Record<string, string> = { stablecoin: 'Stablecoins', 'eth-correlated': 'ETH Correlated', 'btc-correlated': 'BTC Correlated', stock: 'Tokenised Stocks', other: 'Other' };

export function ExplorePage({ side }: { side: 'supply' | 'borrow' }) {
  const { protocol, user } = useProContext();
  const open = useProModal((s) => s.open);
  const requireWallet = useRequireWallet();
  const router = useRouter();
  const account = useWallet((s) => s.account);
  const { chainId, setChain } = useProFilter();
  const [hubs, setHubs] = React.useState<string[]>([]);
  const [markets, setMarkets] = React.useState<string[]>([]);
  const [assets, setAssets] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState('');
  const defaultGroup: GroupBy = side === 'supply' ? 'hub' : 'market';
  const [groupBy, setGroupBy] = React.useState<GroupBy>(defaultGroup);
  // Live Borrow groups by Asset / Asset Category / Market only (no Hub).
  const groupOptions = side === 'supply' ? GROUP_OPTIONS : GROUP_OPTIONS.filter((o) => o.value !== 'hub');
  // One sort for every group table (live: header clicks and the mobile "Sort By" sheet share it).
  const [sort, setSort] = React.useState<{ key: string; desc: boolean }>({ key: 'total', desc: true });
  const [collaterals, setCollaterals] = React.useState<string[]>([]);
  const [showFrozen, setShowFrozen] = React.useState(false);
  const [inWallet, setInWallet] = React.useState(false);
  const [optsAnchor, setOptsAnchor] = React.useState<HTMLElement | null>(null);
  const [collate, setCollate] = React.useState(false);
  const [hiddenCols, setHiddenCols] = React.useState<string[]>([]);
  const snap = protocol.data;
  const isSupply = side === 'supply';

  const walletHas = (r: ProReserve) => (user.data?.wallet[r.chainId]?.[r.symbol] ?? 0) > 0;
  const base = (snap?.reserves ?? []).filter((r) => (isSupply ? r.suppliable : r.borrowable) && !r.paused && (showFrozen || !r.frozen));
  const rows = base.filter(
    (r) =>
      (chainId === null || r.chainId === chainId) &&
      (!hubs.length || hubs.includes(r.hubName)) &&
      (!markets.length || markets.includes(r.spokeName)) &&
      (!assets.length || assets.includes(r.symbol)) &&
      (!inWallet || walletHas(r)) &&
      (!collaterals.length || (snap?.reserves ?? []).some((c) => c.spokeId === r.spokeId && c.collateral && collaterals.includes(c.symbol))) &&
      (!query || [r.symbol, r.name, r.spokeName, r.hubName].some((x) => x.toLowerCase().includes(query.toLowerCase())))
  );
  const clear = () => {
    setHubs([]);
    setMarkets([]);
    setAssets([]);
    setQuery('');
    setChain(null);
    setInWallet(false);
    setCollaterals([]);
  };

  const chainOf = (id: number) => snap?.chains.find((c) => c.id === id);
  const names = (list: string[]) => [...new Set(list)].sort((x, y) => x.localeCompare(y)).map((n) => ({ value: n, label: n, text: n }));
  const hubOptions = names((snap?.hubs ?? []).map((h) => h.name));
  const marketOptions = names((snap?.spokes ?? []).map((sp) => sp.name));
  const assetOptions = [...new Map(base.map((r) => [r.symbol, r])).values()].sort((x, y) => x.symbol.localeCompare(y.symbol)).map((r) => ({ value: r.symbol, text: `${r.symbol} ${r.name}`, label: <><TokenIcon symbol={r.symbol} size={18} /> {r.symbol}</> }));
  type Group = { key: string; title: string; icon: React.ReactNode; description: string; href: string; rows: ProReserve[] };
  const groups: Group[] = [];
  if (snap) {
    const keyOf = (r: ProReserve) => (groupBy === 'hub' ? r.hubId : groupBy === 'market' ? r.spokeId : groupBy === 'category' ? r.category : r.symbol);
    for (const r of rows) {
      const k = keyOf(r);
      let g = groups.find((x) => x.key === k);
      if (!g) {
        if (groupBy === 'hub') {
          const h = snap.hubs.find((x) => x.id === k)!;
          g = { key: k, title: h.name, icon: <ChainIcon chain={chainOf(h.chainId)} size={24} />, description: h.description, href: proRoutes.hub(h.id), rows: [] };
        } else if (groupBy === 'market') {
          const s = snap.spokes.find((x) => x.id === k)!;
          g = { key: k, title: s.name, icon: <ChainIcon chain={chainOf(s.chainId)} size={24} />, description: s.description, href: proRoutes.market(s.id), rows: [] };
        } else if (groupBy === 'category') {
          g = { key: k, title: CATEGORY_LABEL[k] ?? k, icon: <TokenIcon symbol={r.symbol} size={24} />, description: `${CATEGORY_LABEL[k] ?? k} across all hubs and markets`, href: proRoutes.deposit, rows: [] };
        } else {
          g = { key: k, title: r.symbol, icon: <TokenIcon symbol={r.symbol} size={24} />, description: r.name, href: proRoutes.token(r.symbol), rows: [] };
        }
        groups.push(g);
      }
      g.rows.push(r);
    }
    const total = (g: Group) => g.rows.reduce((s, r) => s + (isSupply ? r.suppliedUSD : r.borrowedUSD), 0);
    // Live order: hub/market groups follow the protocol's own listing order (the seed keeps it); asset groups by size.
    const order = (g: Group) => (groupBy === 'hub' ? snap.hubs.findIndex((h) => h.id === g.key) : groupBy === 'market' ? snap.spokes.findIndex((x) => x.id === g.key) : 0);
    groups.sort((a, b) => (groupBy === 'asset' || groupBy === 'category' ? total(b) - total(a) : order(a) - order(b)));
  }

  const amountUSD = (amount: number, symbol: string, price: number) => <TwoLine top={`${formatLowerCompact(amount)}  ${symbol}`} bottom={formatLowerCompact(amount * price, { usd: true })} />;
  const amountInline = (amount: number, symbol: string, price: number) => <Inline top={`${formatLowerCompact(amount)}  ${symbol}`} bottom={formatLowerCompact(amount * price, { usd: true })} />;
  const firstColumn: ScrollColumn<ProReserve> = { key: 'asset', label: 'Asset', render: (r) => <AssetDisplay symbol={r.symbol} name={r.name} />, sortValue: (r) => r.name };
  const apyOf = (r: ProReserve) => (isSupply ? r.supplyAPY + r.underlyingYieldAPY + r.incentiveAPY : r.borrowAPY);
  const apyCell = (r: ProReserve) => <ApyCell r={r} side={isSupply ? 'supply' : 'borrow'} />;
  // Live mobile card header: rewards badge before the APY, '*' after it.
  const mobileApy = (r: ProReserve) => <ApyCell r={r} side={isSupply ? 'supply' : 'borrow'} mobile />;
  const columns: ScrollColumn<ProReserve>[] = [
    {
      key: 'market',
      label: groupBy === 'market' ? 'Hub' : 'Market',
      render: (r) => (
        <Box component="span" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
          {groupBy === 'market' ? r.hubName : r.spokeName}
        </Box>
      ),
      sortValue: (r) => r.spokeName,
    },
    { key: 'apy', label: isSupply ? 'APY' : 'Base APY', render: apyCell, sortValue: apyOf, hideOnMobile: true },
    {
      key: 'total',
      label: isSupply ? 'Total Deposits' : 'Total Borrows',
      render: (r) => amountUSD(isSupply ? r.supplied : r.borrowed, r.symbol, r.priceUSD),
      mobile: (r) => amountInline(isSupply ? r.supplied : r.borrowed, r.symbol, r.priceUSD),
      sortValue: (r) => (isSupply ? r.suppliedUSD : r.borrowedUSD),
    },
    ...(!isSupply
      ? []
      : [
          {
            key: 'capacity',
            label: 'Capacity Filled',
            render: (r: ProReserve) => <CapacityRing value={r.capacityFilled} />,
            sortValue: (r: ProReserve) => r.capacityFilled,
          },
        ]),
    {
      key: 'liq',
      label: isSupply ? 'Available Liquidity' : 'Liquidity',
      // Live: the deposit page shows hub liquidity; the borrow page what this market can still draw.
      render: (r) => amountUSD(isSupply ? r.availableLiquidity : r.spokeLiquidity, r.symbol, r.priceUSD),
      mobile: (r) => amountInline(isSupply ? r.availableLiquidity : r.spokeLiquidity, r.symbol, r.priceUSD),
      sortValue: (r) => (isSupply ? r.availableLiquidityUSD : r.spokeLiquidityUSD),
    },
  ];

  // Display Preferences (live): PROPERTIES hide columns; "Collate Assets" merges one asset's
  // reserves within a group into a single expandable row (and drops the Market column).
  const PROP_TIPS: Record<string, string> = isSupply
    ? { market: 'The market where your assets are deposited', apy: 'Annual percentage yield including incentive rewards', total: 'Total deposits across all users in reference currency', cap: "Percentage of this reserve's deposit cap currently in use", liq: 'Available liquidity in reference currency' }
    : { market: 'The Hub where all liquidity is stored, shared across connected Markets', apy: 'Annual percentage yield including incentive rewards', total: 'Total borrows across all users in reference currency', liq: 'Amount available to borrow in reference currency' };
  const shownColumns = columns.filter((c) => !hiddenCols.includes(c.key) && !(collate && isSupply && c.key === 'market'));
  const collatedKids = new Map<string, ProReserve[]>();
  const collateRows = (list: ProReserve[]) => {
    if (!collate) return list;
    const bySym = new Map<string, ProReserve[]>();
    for (const r of list) bySym.set(r.symbol, [...(bySym.get(r.symbol) ?? []), r]);
    return [...bySym.values()].map((rs) => {
      if (rs.length === 1) return rs[0];
      const sum = (k: 'supplied' | 'suppliedUSD' | 'borrowed' | 'borrowedUSD' | 'supplyCap') => rs.reduce((t, r) => t + r[k], 0);
      const merged: ProReserve = { ...rs[0], id: `collated:${rs[0].hubId}:${rs[0].symbol}:${rs.map((r) => r.spokeId).join(',')}`, supplied: sum('supplied'), suppliedUSD: sum('suppliedUSD'), borrowed: sum('borrowed'), borrowedUSD: sum('borrowedUSD'), supplyCap: sum('supplyCap'), capacityFilled: sum('supplyCap') > 0 ? sum('supplied') / sum('supplyCap') : 0 };
      collatedKids.set(merged.id, rs);
      return merged;
    });
  };

  const chainCluster = (
    // Live: a 20×20 2×2 grid of 9.5px round chain logos.
    <Box sx={{ display: 'grid', gridTemplateColumns: '9.5px 9.5px', gap: '1px', width: 20, height: 20 }}>
      {(snap?.chains ?? []).slice(0, 4).map((c) => (
        <Box key={c.id} component="img" src={`/chain-icons/${c.slug}.svg`} alt="" sx={{ width: 9.5, height: 9.5, borderRadius: '50%', display: 'block' }} />
      ))}
    </Box>
  );

  // Live chains filter: a checkbox list (search, "FILTER BY … CLEAR", 296px panel) that stays open;
  // the clone keeps one chain at a time (the global chain filter), the pill shows its name.
  const chainPill = (
    <PillMenu
      label="Chains"
      allLabel="All Chains"
      heading="Filter by"
      chevron="updown"
      panelWidth={296}
      selected={chainId === null ? [] : [chainId]}
      onChange={(v) => setChain(v.length ? (v[v.length - 1] as number) : null)}
      selectedLabel={(v) => chainOf(v[0] as number)?.name}
      icon={chainId ? <ChainIcon chain={chainOf(chainId)} size={20} /> : chainCluster}
      options={(snap?.chains ?? []).map((c) => ({ value: c.id, text: c.name, label: <><ChainIcon chain={c} size={20} /> {c.name}</> }))}
    />
  );

  return (
    <>
      <PageTitle
        size={28}
        title={isSupply ? 'Deposit' : 'Borrow'}
        subtitle={isSupply ? 'Deposit assets to earn yield and enable borrowing from protocol markets' : 'Borrow assets against your deposited collateral from protocol markets'}
        right={<ProtocolTotalsHeader />}
      />

      {/* Mobile (live): search + sliders, then one horizontally scrolling chip row; not sticky. */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: '16px' }}>
        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <SearchField value={query} onChange={setQuery} placeholder="Filter Assets" full />
          <ProButton variant="secondary" size="square" aria-label="Display Preferences" aria-haspopup="menu" onClick={(e) => setOptsAnchor(e.currentTarget)}>
            <PISliders />
          </ProButton>
        </Box>
        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto', mx: '-16px', px: '16px', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, '& > *': { flexShrink: 0 } }}>
          {chainPill}
          <Box sx={{ width: '1px', height: 10, borderRadius: '2px', bgcolor: 'border-1' }} />
          <PillMenu label="Hubs" icon={<FilterLinesIcon />} selected={hubs} onChange={setHubs} options={hubOptions} />
          <PillMenu label="Markets" icon={<FilterLinesIcon />} selected={markets} onChange={setMarkets} options={marketOptions} />
          <PillMenu label="Assets" icon={<FilterLinesIcon />} selected={assets} onChange={setAssets} options={assetOptions} />
          {/* Live 390px: four chips only; Group By and Sort By live in the Display Preferences sheet. */}
        </Box>
      </Box>

      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexWrap: 'wrap', alignItems: 'center', gap: 2, position: 'sticky', top: { xs: '3.5rem', md: '4.5rem' }, zIndex: 5, py: 2, mx: -2, px: 2, bgcolor: 'bg-1', mt: { md: '-11px' }, mb: { md: '-9px' } }}>
        {!isSupply && <SearchField value={query} onChange={setQuery} placeholder="Filter Assets" full />}
        {chainPill}
        <Box sx={{ width: '1px', height: 10, borderRadius: '2px', bgcolor: 'border-1', display: { xs: 'none', sm: 'block' } }} />
        <PillMenu label="Hubs" icon={<FilterLinesIcon />} selected={hubs} onChange={setHubs} options={hubOptions} />
        <PillMenu label="Markets" icon={<FilterLinesIcon />} selected={markets} onChange={setMarkets} options={marketOptions} />
        <PillMenu label="Assets" icon={<FilterLinesIcon />} selected={assets} onChange={setAssets} options={assetOptions} />
        {!isSupply && (
          <PillMenu
            label="Collateral"
            icon={<FilterLinesIcon />}
            selected={collaterals}
            onChange={setCollaterals}
            options={[...new Set((snap?.reserves ?? []).filter((r) => r.collateral && r.suppliable).map((r) => r.symbol))].sort().map((s) => ({ value: s, label: <><TokenIcon symbol={s} size={18} /> {s}</> }))}
          />
        )}
        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
        {isSupply && <SearchField value={query} onChange={setQuery} placeholder="Filter Assets" fullOnPhone />}
        {isSupply && <Box sx={{ width: '1px', height: 10, borderRadius: '2px', bgcolor: 'border-1', display: { xs: 'none', md: 'block' } }} />}
        <PillMenu
          label="Group By"
          prefix="Group By:"
          single
          stayNeutral
          chevron="updown"
          selected={[groupBy]}
          onChange={(v) => setGroupBy((v[0] as GroupBy) ?? defaultGroup)}
          options={groupOptions}
          align="right"
        />
        <ProButton variant="secondary" size="square" aria-label="Display Preferences" aria-haspopup="menu" aria-expanded={optsAnchor ? 'true' : undefined} onClick={(e) => setOptsAnchor(e.currentTarget)}>
          <Box component="svg" viewBox="0 0 20 20" sx={{ width: 18, height: 18 }} aria-hidden>
            <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M3.5 6.5h7M14.5 6.5h2M3.5 13.5h2M9.5 13.5h7" />
              <circle cx="12.5" cy="6.5" r="2" />
              <circle cx="7.5" cy="13.5" r="2" />
            </g>
          </Box>
        </ProButton>
        <DisplayPrefs
          anchor={optsAnchor}
          onClose={() => setOptsAnchor(null)}
          display={[
            { key: 'collate', label: 'Collate Assets', tip: 'Combine multiple reserves for the same asset into a single row', on: collate },
            { key: 'frozen', label: 'Show Frozen Assets', tip: "Include assets that are frozen. Frozen assets can't accept new deposits but may still have existing liquidity and positions", on: showFrozen },
            // Clone extra (connected demo wallet only): live wallet filters are not observable without a wallet.
            ...(account ? [{ key: 'wallet', label: 'In Wallet', tip: 'Only show assets the demo wallet holds (demo)', on: inWallet }] : []),
          ]}
          properties={columns.map((c) => ({ key: c.key, label: c.label, tip: PROP_TIPS[c.key] ?? c.label, on: !hiddenCols.includes(c.key) }))}
          onToggleDisplay={(k) => (k === 'collate' ? setCollate((v) => !v) : k === 'frozen' ? setShowFrozen((v) => !v) : setInWallet((v) => !v))}
          onToggleProperty={(k) => setHiddenCols((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]))}
          onResetDisplay={() => { setCollate(false); setShowFrozen(false); setInWallet(false); }}
          onResetProperties={() => setHiddenCols([])}
          sheet={{
            groupBy: { value: groupBy, options: groupOptions, defaultValue: defaultGroup, onChange: (v) => setGroupBy(v as GroupBy) },
            sort: { key: sort.key, desc: sort.desc, options: [firstColumn, ...columns].map((c) => ({ key: c.key, label: c.label })), defaultKey: 'total', onChange: setSort },
            isDefault: groupBy === defaultGroup && sort.key === 'total' && sort.desc && !collate && !showFrozen && !inWallet && hiddenCols.length === 0,
            onRestoreDefaults: () => {
              setGroupBy(defaultGroup);
              setSort({ key: 'total', desc: true });
              setCollate(false);
              setShowFrozen(false);
              setInWallet(false);
              setHiddenCols([]);
            },
          }}
        />
      </Box>

      {!snap ? (
        <ScrollTable rows={[]} first={firstColumn} columns={columns} rowKey={(r) => r.id} loading />
      ) : groups.length === 0 ? (
        <ProEmpty title="No Results Found" description="Try adjusting your search or filters" action={<ProButton variant="secondary" onClick={clear}>Clear Filters</ProButton>} />
      ) : (
        groups.map((g, gi) => {
          const total = g.rows.reduce((s, r) => s + (isSupply ? r.suppliedUSD : r.borrowedUSD), 0);
          return (
            <Box key={g.key} sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* Live: a 1px border-0 rule with ~48px either side separates hub groups. */}
              {/* main's own gap is 28px (mobile) / 48px: top margin tops it up to the live 48px. */}
              {/* Live borrow page: no visible rule, and 20px less on mobile. */}
              {gi > 0 && <Box sx={{ height: '1px', bgcolor: isSupply ? 'border-0' : 'transparent', mt: { xs: isSupply ? '20px' : 0, md: 0 }, mb: '48px' }} />}
              <Box sx={{ pb: '32px' }}>
                <Box component={Link} href={g.href} sx={{ display: 'flex', width: 'fit-content', alignItems: 'center', gap: '12px', color: 'fg-1', textDecoration: 'none' } /* live: no hover change */}>
                  {g.icon}
                  <Box component="span" className="group-title" sx={{ fontSize: '1.5rem', fontWeight: 500, lineHeight: '28.8px' }}>
                    {g.title}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', columnGap: '24px', rowGap: 1, flexWrap: 'wrap', mt: '8px' }}>
                  <Typography sx={{ color: 'fg-3', fontSize: '0.875rem', lineHeight: '19.6px' }}>{g.description}</Typography>
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: '8px', fontSize: '0.875rem', lineHeight: '18px', color: 'fg-3' }}>
                    <span>{isSupply ? 'Assets' : 'Supported Collateral'}</span>
                    <IconStack
                      symbols={
                        isSupply
                          ? [...new Set(g.rows.map((r) => r.symbol))]
                          : [...new Set((snap?.reserves ?? []).filter((c) => c.collateral && c.suppliable && (groupBy === 'market' ? c.spokeId === g.key : g.rows.some((r) => r.spokeId === c.spokeId))).map((c) => c.symbol))]
                      }
                    />
                    <Box component="span" sx={{ width: '1px', height: 10, borderRadius: '2px', bgcolor: 'border-1', mx: '2px' }} />
                    <span>{isSupply ? 'Total Deposits' : 'Total Borrowed'}</span>
                    <Box component="b" sx={{ color: 'fg-1', fontWeight: 500 }}>
                      {formatLowerCompact(total, { usd: true })}
                    </Box>
                  </Box>
                </Box>
              </Box>
              <ScrollTable rows={collateRows(g.rows)} first={firstColumn} columns={shownColumns} rowKey={(r) => r.id} sort={sort} onSortChange={setSort} rowHref={(r) => proRoutes.reserve(r.id)}
                expandable={collate ? { childrenOf: (r) => collatedKids.get(r.id) ?? [], childKey: (c) => `child:${c.id}`, childFirst: (c) => <Box component="span" sx={{ fontWeight: 500 }}>{c.spokeName}</Box> } : undefined}
                mobileAside={mobileApy}
                mobileLimit={5}
                rowActions={(r) => (
                  <>
                    <Box component="button" type="button" aria-label={isSupply ? `Deposit ${r.symbol}` : `Borrow ${r.symbol}`} onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); requireWallet(() => open({ type: isSupply ? 'deposit' : 'borrow', reserveId: r.id })); }} sx={rowIconSx}>
                      {isSupply ? <PIDeposit /> : <PIBorrow />}
                    </Box>
                    <Box component="button" type="button" aria-label="More actions" onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); router.push(proRoutes.reserve(r.id)); }} sx={rowIconSx}>
                      <PIMore />
                    </Box>
                  </>
                )}
                mobileActions={(r) => (
                  <>
                    <ProButton variant="tertiary" sx={{ flex: 1 }} onClick={() => requireWallet(() => open({ type: isSupply ? 'deposit' : 'borrow', reserveId: r.id }))}>
                      {isSupply ? 'Deposit' : 'Borrow'}
                    </ProButton>
                    <ProButton variant="tertiary" size="square" aria-label="More actions" href={proRoutes.reserve(r.id)}>
                      <PIMore />
                    </ProButton>
                  </>
                )}
              />
            </Box>
          );
        })
      )}
    </>
  );
}

/** Shared by the token/hub/market pages. */
export function useChainName(snap?: ProProtocolSnapshot) {
  return (id: number) => snap?.chains.find((c) => c.id === id)?.name ?? '';
}
