'use client';

/**
 * Pro Insights (/insights), rebuilt from the live page (captured 2026-10-14,
 * reference/pro-capture/real-a3/insights-*; measured with tools/a3-*.mjs):
 * - title "Insights" + "Overview of protocol activity and performance", protocol totals on the right
 *   (Builder A's ProtocolTotalsHeader, the same Aave-wide figures as Deposit/Borrow)
 * - "Protocol": chain multi-select ("Search chains", FILTER BY / CLEAR) and a time-window select
 *   (1 Day … All Time, default 1 Month); two 542px chart cards (label ⓘ, 24px value, green/red
 *   change since the start of the window; 220px plot, labels at x=20, x labels on hover)
 * - rule, then "All Assets": Filter Assets, Group By (Asset | Asset Category) and a column menu
 *   (PROPERTIES / RESET, one switch per column); the table's first column sizes to the widest
 *   asset name, the four value columns share the rest; rows link to the token page
 * - mobile: stacked charts with x labels shown, cards (5, then "Show N more")
 * Chart history is simulated (seed/proB_history.ts) and ends at today's seed totals.
 */
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import NumberFlow from '@number-flow/react';
import Link from 'next/link';
import * as React from 'react';
import { volumeHistory, type HistoryRange } from '@/data/mock/seed/proB_history';
import type { ChainInfo, ProProtocolSnapshot } from '@/data/types';
import { formatLowerCompact, formatPercent } from '@/shared/format';
import { DARK, tv, onAccent } from '@/shared/theme/tokens';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { PageTitle, ProButton } from '../../ui';
import { proRoutes, useProContext } from '../../state';
import { PISearch } from '../../icons';
import { PillMenu } from '../../components/PillMenu';
import { ProtocolTotalsHeader } from '../Explore';
import { BICheck, BIUpDown, RewardBadge } from '../token/icons';
import { A3_KEYFRAMES, LoadingWave, Plot, type ChartSeries, type PlotGeom } from '../token/MultiLineChart';
import { CardBody, CardTitle, Dropdown, HoverCard, InfoHint } from '../token/popovers';
import { ChainCluster } from '../token/TokenPage';
import { ChainLogo } from '../token/MarketsTable';
import { assetRows, CATEGORY_LABEL, CATEGORY_ORDER, depositApyOf, insightsTotals, type AssetRow } from './model';

const INSIGHTS_GEOM: PlotGeom = { height: 220, top: 22, bottom: 200, labelX: 20 };
const WINDOWS: { value: HistoryRange; label: string }[] = [
  { value: '1D', label: '1 Day' },
  { value: '1W', label: '1 Week' },
  { value: '1M', label: '1 Month' },
  { value: '6M', label: '6 Months' },
  { value: '1Y', label: '1 Year' },
  { value: 'All', label: 'All Time' },
];

const fmtUsd = (n: number) => formatLowerCompact(n, { usd: true });
/** Live axis: "$1B", "$1.2B", "$350M". */
const fmtAxisUsd = (v: number) => {
  const tiers: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [d, s] of tiers) if (Math.abs(v) >= d) return `$${Number((v / d).toFixed(2))}${s}`;
  return `$${Number(v.toFixed(2))}`;
};
const pct = (v: number) => (v === 0 ? '0%' : formatPercent(v));
const range = (a: number, b: number) => (Math.abs(b - a) < 5e-5 ? pct(b) : `${pct(a)} - ${pct(b)}`);

// ---------------------------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------------------------

const pillSx = (prefix: boolean) => ({ pl: prefix ? '12px' : '14px', pr: '7px', [DARK]: { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } });

function ChainFilter({ chains, value, onChange }: { chains: ChainInfo[]; value: number[]; onChange: (v: number[]) => void }) {
  const [q, setQ] = React.useState('');
  const shown = chains.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const label = value.length === 0 ? 'All Chains' : value.length === 1 ? chains.find((c) => c.id === value[0])?.name : `${value.length} Chains`;
  const icon = value.length === 1 ? <ChainLogo chain={chains.find((c) => c.id === value[0])} /> : <ChainCluster chains={chains} size={20} />;
  return (
    <Dropdown
      placement="bottom-end"
      width={298}
      separators="none"
      header={
        <Box onKeyDown={(e) => e.stopPropagation()}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', height: 36, px: '8px', color: 'fg-4' }}>
            <PISearch size={16} />
            <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chains" inputProps={{ 'aria-label': 'Search chains' }} sx={{ flex: 1, fontSize: 14, color: 'fg-1', '& input::placeholder': { color: 'fg-4', opacity: 1 } }} />
          </Box>
          <Box sx={{ height: '1px', bgcolor: 'border-1', mx: '-5px', mb: '5px' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '6px 6px 4px', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: 'fg-3' }}>
            <span>Filter by</span>
            <Box component="button" type="button" onClick={() => onChange([])} disabled={!value.length} sx={{ p: 0, border: 0, background: 'none', font: 'inherit', textTransform: 'uppercase', color: value.length ? 'fg-2' : 'fg-5', cursor: value.length ? 'pointer' : 'default', '&:hover:not(:disabled)': { color: 'fg-1' } }}>
              Clear
            </Box>
          </Box>
        </Box>
      }
      entries={shown.map((c) => ({
        label: c.name,
        icon: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mr: '-0px' }}>
            <Box component="span" sx={{ width: 18, height: 18, borderRadius: '50%', boxShadow: value.includes(c.id) ? 'none' : `inset 0 0 0 1.5px ${tv('border-2')}`, bgcolor: value.includes(c.id) ? 'purple-1' : 'transparent', color: onAccent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {value.includes(c.id) && <BICheck size={11} strokeWidth={2.2} />}
            </Box>
            <ChainLogo chain={c} />
          </Box>
        ),
        keepOpen: true,
        onClick: () => onChange(value.includes(c.id) ? value.filter((x) => x !== c.id) : [...value, c.id]),
      }))}
      trigger={(p) => (
        <ProButton variant="secondary" prefixIcon={icon} suffixIcon={<BIUpDown size={20} />} {...p} sx={pillSx(true)}>
          {label}
        </ProButton>
      )}
    />
  );
}

function WindowSelect({ value, onChange }: { value: HistoryRange; onChange: (v: HistoryRange) => void }) {
  return (
    <Dropdown
      placement="bottom-end"
      width={248}
      separators="none"
      entries={WINDOWS.map((w) => ({ label: w.label, selected: w.value === value, sub: w.value === value ? <BICheck size={16} /> : undefined, onClick: () => onChange(w.value) }))}
      trigger={(p) => (
        <ProButton variant="secondary" suffixIcon={<BIUpDown size={20} />} {...p} sx={pillSx(false)}>
          {WINDOWS.find((w) => w.value === value)?.label}
        </ProButton>
      )}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------------------------

function useLoaded(key: string, ms = 450) {
  const [loaded, setLoaded] = React.useState<string | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => setLoaded(key), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return loaded === key;
}

function useWidth() {
  const [w, setW] = React.useState(0);
  const ro = React.useRef<ResizeObserver | null>(null);
  const ref = React.useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    setW(Math.round(el.getBoundingClientRect().width));
    ro.current = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.current.observe(el);
  }, []);
  return [ref, w] as const;
}

function MetricChart({ label, hint, series, window: win, current, loadKey }: { label: string; hint: string; series: ChartSeries; window: HistoryRange; current: number; loadKey: string }) {
  const [ref, width] = useWidth();
  const loaded = useLoaded(loadKey);
  const ready = loaded;
  const values = series.values(win);
  const first = values[0] || 0;
  const change = first > 0 ? (current - first) / first : 0;
  const selected = React.useMemo(() => new Set([series.key]), [series.key]);
  return (
    <Box sx={{ borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px ${tv('shadow-low')}, 0 0 0 1px ${tv('border-1')}`, pt: '20px', minWidth: 0 }}>
      <Box sx={{ p: '0 20px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', height: 18, fontSize: 14, lineHeight: '14px', color: 'fg-3' }}>
          {label}
          <InfoHint label={label} text={hint} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', height: { xs: 23, md: 29 } }}>
          <Box component="h2" sx={{ m: 0, fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: { xs: '22.8px', md: '28.8px' }, display: 'flex', alignItems: 'center', height: { xs: 23, md: 29 }, '& number-flow-react': { lineHeight: 'inherit' } }}>
            <NumberFlow value={current} locales="en-US" format={{ style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2, minimumFractionDigits: 2 }} />
          </Box>
          <Box component="span" sx={{ pt: '3px', fontSize: 14, fontWeight: 500, lineHeight: '14px', color: change >= 0 ? 'data-green' : 'data-red', display: 'inline-flex', alignItems: 'center' }}>
            {change >= 0 ? '+' : '−'}
            <NumberFlow value={Math.abs(change)} locales="en-US" format={{ style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
          </Box>
        </Box>
      </Box>
      <Box ref={ref} sx={{ position: 'relative', height: 220 }}>
        {!ready || width === 0 ? <LoadingWave /> : <Plot geom={INSIGHTS_GEOM} series={[series]} selected={selected} range={win} width={width} valueFormat={fmtUsd} tickFormat={fmtAxisUsd} />}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------------------------

type ColKey = 'dep' | 'depApy' | 'bor' | 'borApy';
const COLUMNS: { key: ColKey; label: string; hint: string }[] = [
  { key: 'dep', label: 'Total Deposits', hint: 'Total amount deposited for this asset across all markets' },
  { key: 'depApy', label: 'Deposit APY', hint: 'Range of deposit APYs across markets' },
  { key: 'bor', label: 'Total Borrowed', hint: 'Total amount borrowed for this asset across all markets' },
  { key: 'borApy', label: 'Borrow APY', hint: 'Range of borrow APYs across markets' },
];

function AssetIcon({ row }: { row: AssetRow }) {
  return (
    <Box sx={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
      <TokenIcon symbol={row.symbol} size={44} />
      {row.badgeChain && (
        <Box sx={{ position: 'absolute', right: -2, bottom: -2, borderRadius: '50%', p: '2px', bgcolor: 'var(--a3-row-bg, var(--mui-palette-bg-2))', display: 'flex' }}>
          <ChainLogo chain={row.badgeChain} size={14} />
        </Box>
      )}
    </Box>
  );
}

function RatesList({ title, rows }: { title: string; rows: { id: string; chain?: ChainInfo; market: string; hub: string; apy: number; rewards: boolean }[] }) {
  return (
    <>
      <CardTitle>{title}</CardTitle>
      <CardBody>
        {[...rows].sort((a, b) => b.apy - a.apy).map((x) => (
          <Box key={x.id} component={Link} href={proRoutes.reserve(x.id)} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '8px 4px', color: 'fg-1', textDecoration: 'none', borderRadius: '6px', '&:hover': { bgcolor: 'bg-5' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, fontSize: 14, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <Box sx={{ mr: '6px', display: 'flex' }}>
                <ChainLogo chain={x.chain} />
              </Box>
              <Box component="span" sx={{ fontWeight: 500 }}>{x.market}</Box>
              <Box component="span" sx={{ color: 'fg-3', mx: '6px' }}>·</Box>
              <Box component="span" sx={{ color: 'fg-3', overflow: 'hidden', maskImage: 'linear-gradient(90deg, #000 80%, transparent)' }}>{x.hub}</Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 14, fontWeight: 500 }}>
              {x.rewards && <RewardBadge />}
              {pct(x.apy)}
            </Box>
          </Box>
        ))}
      </CardBody>
    </>
  );
}

function ApyCell({ row, side, snap, mobile }: { row: AssetRow; side: 'dep' | 'bor'; snap: ProProtocolSnapshot; mobile?: boolean }) {
  const isDep = side === 'dep';
  if (!isDep && !row.hasBorrow) return <Box component="span" sx={{ color: 'fg-4', fontWeight: 400, lineHeight: '17px' }}>–</Box>;
  const list = (isDep ? row.depositRows : row.borrowRows).map((r) => ({ id: r.id, chain: snap.chains.find((c) => c.id === r.chainId), market: r.spokeName, hub: r.hubName, apy: isDep ? depositApyOf(r) : r.borrowAPY, rewards: isDep && r.incentiveAPY > 0 }));
  const text = isDep ? range(row.depMin, row.depMax) : range(row.borMin, row.borMax);
  const badge = isDep && row.depRewards;
  const content = (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
      {mobile && badge && <RewardBadge />}
      {text}
      {isDep && row.underlying && !badge && <Box component="span" sx={{ color: 'fg-3', fontSize: 11, fontWeight: 400, alignSelf: 'flex-start', lineHeight: '11px' }}>*</Box>}
      {!mobile && badge && <RewardBadge />}
    </Box>
  );
  if (list.length < 2 || mobile) return content;
  return (
    <HoverCard width={278} placement="top-start" card={<RatesList title={isDep ? 'Deposit Rates' : 'Borrow Rates'} rows={list} />} sx={{ textDecoration: 'underline dotted', textDecorationColor: 'transparent', textUnderlineOffset: '4px', transition: 'text-decoration-color 30ms', '&:hover': { textDecorationColor: tv('fg-3') } }}>
      {content}
    </HoverCard>
  );
}

function TwoLine({ top, bottom }: { top: React.ReactNode; bottom: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
      <Box sx={{ fontWeight: 500, whiteSpace: 'nowrap', lineHeight: '16.8px' }}>{top}</Box>
      <Box sx={{ color: 'fg-3', whiteSpace: 'nowrap', lineHeight: '14px' }}>{bottom}</Box>
    </Box>
  );
}

function SortIcon({ active, desc }: { active: boolean; desc: boolean }) {
  return (
    <Box component="svg" viewBox="0 0 7 10" aria-hidden className="sort-icon" sx={{ width: 7, height: 10, flexShrink: 0, opacity: active ? 1 : 0, transition: 'opacity 70ms' }}>
      <path d="M1 3.5L3.5 1L6 3.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity={active && desc ? 0.45 : 1} />
      <path d="M1 6.5L3.5 9L6 6.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity={active && !desc ? 0.45 : 1} />
    </Box>
  );
}

type SortKey = 'asset' | ColKey;
const sortValue = (r: AssetRow, k: SortKey) => (k === 'asset' ? r.name.toLowerCase() : k === 'dep' ? r.depositsUSD : k === 'depApy' ? r.depMax : k === 'bor' ? r.borrowsUSD : r.hasBorrow ? r.borMax : -1);

function AssetsTable({ rows, snap, visible, sort, onSort }: { rows: AssetRow[]; snap: ProProtocolSnapshot; visible: ColKey[]; sort: { key: SortKey; desc: boolean }; onSort: (k: SortKey) => void }) {
  const [shown, setShown] = React.useState(5);
  const cols = COLUMNS.filter((c) => visible.includes(c.key));
  const sorted = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      const d = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x as number) - (y as number);
      return sort.desc ? -d : d;
    });
  }, [rows, sort]);
  const cell = (r: AssetRow, k: ColKey, mobile = false) => {
    if (k === 'dep') return mobile ? <Inline a={`${formatLowerCompact(r.deposits)} ${r.symbol}`} b={fmtUsd(r.depositsUSD)} /> : <TwoLine top={`${formatLowerCompact(r.deposits)} ${r.symbol}`} bottom={fmtUsd(r.depositsUSD)} />;
    if (k === 'bor') return !r.hasBorrow ? <Box component="span" sx={{ color: 'fg-4', fontWeight: 400, lineHeight: '17px' }}>–</Box> : mobile ? <Inline a={`${formatLowerCompact(r.borrows)} ${r.symbol}`} b={fmtUsd(r.borrowsUSD)} /> : <TwoLine top={`${formatLowerCompact(r.borrows)} ${r.symbol}`} bottom={fmtUsd(r.borrowsUSD)} />;
    return <ApyCell row={r} side={k === 'depApy' ? 'dep' : 'bor'} snap={snap} mobile={mobile} />;
  };
  const head = (key: SortKey, label: string) => {
    const active = sort.key === key;
    return (
      <Box key={key} component="button" type="button" role="columnheader" aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : undefined} onClick={() => onSort(key)} sx={{ display: 'flex', alignItems: 'center', gap: '5.5px', height: 11, p: 0, border: 0, background: 'none', fontFamily: 'inherit', fontSize: 11, fontWeight: 500, lineHeight: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'left', color: active ? 'fg-1' : 'fg-3', cursor: 'pointer', transition: 'color 70ms', '&:hover': { color: 'fg-1', '& .sort-icon': { opacity: 1 } }, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2 } }}>
        {label}
        <SortIcon active={active} desc={active ? sort.desc : true} />
      </Box>
    );
  };
  const template = `max-content repeat(${cols.length}, minmax(0, 1fr))`;
  return (
    <>
      <Box sx={{ '--a3-row-hover': '#f4f4f4', [DARK]: { '--a3-row-hover': '#282727' }, display: { xs: 'none', md: 'block' }, p: '20px 20px 12px', borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px ${tv('shadow-low')}, 0 0 0 1px ${tv('border-1')}` }}>
        <Box role="table" sx={{ display: 'grid', gridTemplateColumns: template, columnGap: '8px' }}>
          <Box role="row" sx={{ display: 'grid', gridColumn: '1 / -1', gridTemplateColumns: 'subgrid', alignItems: 'start', height: 27, pb: '16px', boxSizing: 'border-box', transform: 'translateY(-1px)' }}>
            {head('asset', 'Asset')}
            {cols.map((c) => head(c.key, c.label))}
          </Box>
          {sorted.map((r, i) => (
            <Box
              key={r.symbol}
              component={Link}
              href={proRoutes.token(r.symbol.toUpperCase())}
              role="row"
              sx={{
                display: 'grid',
                gridColumn: '1 / -1',
                gridTemplateColumns: 'subgrid',
                alignItems: 'center',
                position: 'relative',
                height: 73,
                color: 'fg-1',
                textDecoration: 'none',
                fontSize: 14,
                lineHeight: '16.8px',
                '--a3-row-bg': tv('bg-2'),
                '& > *': { position: 'relative', zIndex: 1 },
                '&::before': { content: '""', position: 'absolute', inset: '1.5px -8.5px', borderRadius: '8px', bgcolor: 'var(--a3-row-hover)', opacity: 0, transition: 'opacity 30ms, inset 30ms', zIndex: 0 },
                '&::after': { content: '""', position: 'absolute', left: 0, right: 0, top: 72, height: '1px', bgcolor: 'border-0', opacity: i === sorted.length - 1 ? 0 : 1 },
                '&:hover': { '--a3-row-bg': 'var(--a3-row-hover)' },
                '&:hover::before, &:focus-visible::before': { inset: '0 -10px', opacity: 1 },
                '&:hover::after, &:has(+ [role=row]:hover)::after': { opacity: 0 },
                '&:focus-visible': { outline: 'none' },
              }}
            >
              <Box role="cell" sx={{ display: 'flex', alignItems: 'center', gap: '16px', pr: '16px', minWidth: 0 }}>
                <AssetIcon row={r} />
                <TwoLine top={r.name} bottom={r.symbol} />
              </Box>
              {cols.map((c) => (
                <Box key={c.key} role="cell" sx={{ display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden', maskImage: 'linear-gradient(90deg, #000 85%, transparent 100%)' }}>
                  {cell(r, c.key)}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: '16px' }}>
        {sorted.slice(0, shown).map((r) => (
          <Box key={r.symbol} component={Link} href={proRoutes.token(r.symbol.toUpperCase())} sx={{ display: 'block', p: '16px', borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px ${tv('shadow-low')}, 0 0 0 1px ${tv('border-1')}`, color: 'fg-1', textDecoration: 'none', '--a3-row-bg': tv('bg-2') }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: 14 }}>
              <AssetIcon row={r} />
              <TwoLine top={r.name} bottom={r.symbol} />
            </Box>
            <Box sx={{ height: '1px', bgcolor: 'border-1', my: '16px' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cols.map((c) => (
                <Box key={c.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, fontSize: 14, lineHeight: '14px', minHeight: 18 }}>
                  <Box component="span" sx={{ color: 'fg-3' }}>{c.label}</Box>
                  <Box component="span" sx={{ fontWeight: 500, textAlign: 'right' }}>{cell(r, c.key, true)}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
        {sorted.length > shown && (
          <Box component="button" type="button" onClick={() => setShown(Infinity)} sx={{ height: 38, border: 0, borderRadius: '160px', bgcolor: 'bg-2', boxShadow: `0 0 0 1px ${tv('border-1')}`, color: 'fg-1', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', '&:hover': { bgcolor: 'bg-3' } }}>
            Show {sorted.length - shown} more
          </Box>
        )}
      </Box>
    </>
  );
}

const Inline = ({ a, b }: { a: string; b: string }) => (
  <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
    {a}{' '}
    <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{b}</Box>
  </Box>
);

function ColumnsMenu({ visible, onChange }: { visible: ColKey[]; onChange: (v: ColKey[]) => void }) {
  const all = COLUMNS.map((c) => c.key);
  const dirty = visible.length !== all.length;
  return (
    <Dropdown
      placement="top-end"
      width={268}
      separators="none"
      header={
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '6px 6px 4px', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: 'fg-3' }}>
          <span>Properties</span>
          <Box component="button" type="button" disabled={!dirty} onClick={() => onChange(all)} sx={{ p: 0, border: 0, background: 'none', font: 'inherit', textTransform: 'uppercase', color: dirty ? 'fg-2' : 'fg-5', cursor: dirty ? 'pointer' : 'default', '&:hover:not(:disabled)': { color: 'fg-1' } }}>
            Reset
          </Box>
        </Box>
      }
      entries={COLUMNS.map((c) => ({
        label: c.label,
        keepOpen: true,
        sub: (
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px', ml: '-8px' }}>
            <Switch size="small" checked={visible.includes(c.key)} tabIndex={-1} slotProps={{ input: { 'aria-hidden': true } }} />
          </Box>
        ),
        onClick: () => onChange(visible.includes(c.key) ? (visible.length > 1 ? visible.filter((k) => k !== c.key) : visible) : all.filter((k) => visible.includes(k) || k === c.key)),
      }))}
      trigger={(p) => (
        <ProButton variant="secondary" size="square" aria-label="Display" {...p} sx={{ [DARK]: { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } }}>
          <Box component="svg" viewBox="0 0 20 20" sx={{ width: 18, height: 18 }} aria-hidden>
            <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M3.5 6.5h7M14.5 6.5h2M3.5 13.5h2M9.5 13.5h7" />
              <circle cx="12.5" cy="6.5" r="2" />
              <circle cx="7.5" cy="13.5" r="2" />
            </g>
          </Box>
        </ProButton>
      )}
    />
  );
}

function FilterField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', height: { xs: 36, md: 38 }, pl: '14px', pr: '12px', borderRadius: '160px', boxShadow: `0 0 0 1px ${tv('border-1')}`, flex: { xs: '1 1 100%', md: '0 1 242px' }, transition: 'box-shadow 100ms', '&:focus-within': { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } }}>
      <Box component="span" sx={{ display: 'flex', color: 'fg-4' }}>
        <PISearch />
      </Box>
      <InputBase value={value} onChange={(e) => onChange(e.target.value)} placeholder="Filter Assets" inputProps={{ 'aria-label': 'Filter Assets' }} sx={{ flex: 1, fontSize: 14, '& input': { p: 0 }, '& input::placeholder': { color: 'fg-4', opacity: 1 } }} />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------

export function InsightsPage() {
  const { protocol } = useProContext();
  const snap = protocol.data;
  const [chainIds, setChainIds] = React.useState<number[]>([]);
  const [win, setWin] = React.useState<HistoryRange>('1M');
  const [query, setQuery] = React.useState('');
  const [groupBy, setGroupBy] = React.useState<'asset' | 'category'>('asset');
  const [visible, setVisible] = React.useState<ColKey[]>(['dep', 'depApy', 'bor', 'borApy']);
  const [sort, setSort] = React.useState<{ key: SortKey; desc: boolean }>({ key: 'dep', desc: true });
  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }));

  const totals = snap ? insightsTotals(snap, chainIds) : { depositsUSD: 0, borrowsUSD: 0 };
  const chainKey = chainIds.join(',') || 'all';
  const depSeries: ChartSeries = React.useMemo(() => ({ key: 'dep', label: 'Total Deposits', color: tv('data-green'), values: (r) => volumeHistory(`insights:dep:${chainKey}`, r, totals.depositsUSD, 2.6) }), [chainKey, totals.depositsUSD]);
  const borSeries: ChartSeries = React.useMemo(() => ({ key: 'bor', label: 'Active Loans', color: tv('data-orange'), values: (r) => volumeHistory(`insights:bor:${chainKey}`, r, totals.borrowsUSD, 3) }), [chainKey, totals.borrowsUSD]);
  const rows = React.useMemo(() => (snap ? assetRows(snap, chainIds) : []), [snap, chainIds]);
  const filtered = rows.filter((r) => !query || `${r.name} ${r.symbol}`.toLowerCase().includes(query.toLowerCase()));
  const loadKey = snap ? 'ready' : 'waiting';

  return (
    <>
      {A3_KEYFRAMES}
      <PageTitle size={28} title="Insights" subtitle="Overview of protocol activity and performance" right={<ProtocolTotalsHeader />} />
      <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: '32px', mt: { md: '-4px' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <Typography component="h2" sx={{ fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: { xs: '22.8px', md: '28.8px' }, letterSpacing: 'normal' }}>
            Protocol
          </Typography>
          <Box sx={{ display: 'flex', gap: '8px' }}>
            {snap && <ChainFilter chains={snap.chains} value={chainIds} onChange={setChainIds} />}
            <WindowSelect value={win} onChange={setWin} />
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '32px' }}>
          <MetricChart label="Total deposits" hint="Total value deposited across the protocol's hubs" series={depSeries} window={win} current={totals.depositsUSD} loadKey={loadKey} />
          <MetricChart label="Active loans" hint="Total value currently borrowed across the protocol's hubs" series={borSeries} window={win} current={totals.borrowsUSD} loadKey={loadKey} />
        </Box>
      </Box>
      <Box component="hr" sx={{ m: 0, border: 0, height: '1px', bgcolor: 'border-0' }} />
      <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', columnGap: '8px', rowGap: '15px', flexWrap: 'wrap' }}>
          <Typography component="h2" sx={{ fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: { xs: '22.8px', md: '28.8px' }, letterSpacing: 'normal', flex: { xs: '1 1 100%', md: 'none' } }}>
            All Assets
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', columnGap: '8px', rowGap: '12px', flexWrap: 'wrap', flex: { xs: '1 1 100%', md: '0 1 auto' }, justifyContent: 'flex-end' }}>
            <FilterField value={query} onChange={setQuery} />
            <Box sx={{ width: '1px', height: 10, borderRadius: '2px', bgcolor: 'border-1', display: { xs: 'none', md: 'block' } }} />
            <PillMenu label="Group By" prefix={<Box component="span" sx={{ color: 'fg-2' }}>Group By:</Box>} single stayNeutral chevron="updown" selected={[groupBy]} onChange={(v) => setGroupBy((v[0] as 'asset' | 'category') ?? 'asset')} options={[{ value: 'asset', label: 'Asset' }, { value: 'category', label: 'Asset Category' }]} align="right" />
            <Box sx={{ flex: { xs: 1, md: 'none' } }} />
            <ColumnsMenu visible={visible} onChange={setVisible} />
          </Box>
        </Box>
        {!snap ? (
          <Box sx={{ height: 400, borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px ${tv('shadow-low')}, 0 0 0 1px ${tv('border-1')}` }} />
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 10, textAlign: 'center', borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 0 0 1px ${tv('border-1')}` }}>
            <Box sx={{ fontWeight: 500, fontSize: 14 }}>No Results Found</Box>
            <Box sx={{ mt: 1, fontSize: 14, color: 'fg-3' }}>Try adjusting your search or filters</Box>
            <ProButton variant="secondary" sx={{ mt: 3 }} onClick={() => setQuery('')}>Clear Filters</ProButton>
          </Box>
        ) : groupBy === 'asset' ? (
          <AssetsTable rows={filtered} snap={snap} visible={visible} sort={sort} onSort={onSort} />
        ) : (
          CATEGORY_ORDER.filter((k) => filtered.some((r) => r.category === k)).map((k) => (
            <Box key={k} sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <Typography component="h3" sx={{ fontSize: 24, fontWeight: 500, lineHeight: '28.8px', letterSpacing: 'normal' }}>
                {CATEGORY_LABEL[k]}
              </Typography>
              <AssetsTable rows={filtered.filter((r) => r.category === k)} snap={snap} visible={visible} sort={sort} onSort={onSort} />
            </Box>
          ))
        )}
      </Box>
    </>
  );
}
