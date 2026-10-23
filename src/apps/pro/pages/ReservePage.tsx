'use client';

/**
 * Reserve page, rebuilt from the live layout (captured 2026-10-13, not connected):
 * header ("Ether ETH", "Main on Core ⟠ Ethereum", Deposit / Borrow / ⋯) → 5 stats with rules →
 * Interest Rates (APYs + chart) → Protocol Parameters (capacity rings + 3×3 parameter card) →
 * Interest Rate Model (curve with Optimal/Current markers) → Available Liquidity (flows + chart) →
 * Supported Collateral → Assets You Can Borrow → Top Addresses (Deposits/Borrows).
 * History, flows and holder addresses are SIMULATED (deterministic) and labelled as such.
 * With a demo wallet connected, the position panel (YourPositions) appears under the header; the
 * live connected layout could not be observed (logged in PRO_DISCREPANCY_LOG).
 * Mobile (390px, re-measured 2026-10-14): the stats become a 2-column grid (19px values) and the
 * Deposit / Borrow / ⋯ row sits 32px under it; parameter rows are label-left / value-right; the
 * collateral and borrowable lists are header-only cards with one full-width button (5, then "Show N
 * more"); Top Addresses become cards with a share bar and "Copy Address".
 */
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Link from 'next/link';
import * as React from 'react';
import type { ProHubAsset, ProReserve } from '@/data/types';
import { variableBorrowRate } from '@/lib/aave-math';
import { formatLowerCompact, formatPercent } from '@/shared/format';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { DARK, tv } from '@/shared/theme/tokens';
import { ChartCard, EntityHeader, SectionDivider, SectionHeading, SERIES, StatBlock, StatGroup, StatLine, StatSummary, simulatedSeries } from '../components/Entity';
import { RewardsBadge } from '../components/Apy';
import { ScrollTable, type ScrollColumn } from '../components/ScrollTable';
import { ChainIcon, ProButton, USD } from '../ui';
import { NotFoundView } from './notfound/NotFoundView';
import { proRoutes, useProContext, useProModal } from '../state';
import { PIBorrow, PIDeposit, PIInfo, PIMore } from '../icons';
import { useRequireWallet } from './Dashboard';
import { SegmentedToggle } from './preferences/controls';
import { BIPlus } from './token/icons';
import { Dropdown, InfoHint } from './token/popovers';
import { formatPrefDate, usePrefs } from './preferences/prefs';
import { useNotice } from '@/shared/state/notice';
import { YourPositions } from './Reserve';

// ---------------------------------------------------------------------------------------------

export function InfoLabel({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'fg-3', fontSize: 14, lineHeight: '14px' }}>
      {label}
      {tooltip && (
        <Tooltip title={tooltip}>
          <Box component="span" tabIndex={0} aria-label={label} sx={{ display: 'inline-flex', color: 'fg-4' }}>
            <PIInfo size={16} />
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

/** Live: five stats separated by full-height rules. */
export function TopStat({ label, tooltip, value, sub, first }: { label: string; tooltip: string; value: React.ReactNode; sub?: React.ReactNode; first?: boolean }) {
  return (
    <Box sx={{ pl: { xs: 0, md: first ? 0 : '32px' }, pr: { xs: 0, md: '32px' }, borderLeft: { xs: 'none', md: first ? 'none' : `1px solid ${tv('border-1')}` }, minWidth: 0 }}>
      <Box sx={{ height: { xs: 18, md: 'auto' }, display: 'flex', alignItems: 'center' }}>
        <InfoLabel label={label} tooltip={tooltip} />
      </Box>
      <Box sx={{ mt: { xs: '8px', md: '9px' }, height: { xs: 23, md: 29 }, display: 'flex', alignItems: 'center', gap: '8px', fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: { xs: '22.8px', md: '28.8px' }, whiteSpace: 'nowrap' }}>{value}</Box>
      {sub && <Box sx={{ mt: { xs: '4px', md: '8px' }, fontSize: 14, lineHeight: { xs: '24px', md: '17px' }, color: 'fg-3', whiteSpace: 'nowrap' }}>{sub}</Box>}
    </Box>
  );
}

/** Live: 56px ring with the integer % inside (12/500). */
export function BigRing({ value, color }: { value: number; color: string }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(value, 0), 1);
  return (
    <Box sx={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <Box component="svg" viewBox="0 0 56 56" sx={{ width: 56, height: 56, transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" style={{ stroke: tv('border-2') }} />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(p, 0.005))} style={{ stroke: color, transition: 'stroke-dashoffset 700ms cubic-bezier(0.19,1,0.22,1)' }} />
      </Box>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500 }}>{Math.round(p * 100)}%</Box>
    </Box>
  );
}

function CapacityStat({ label, used, cap, symbol, price, color }: { label: string; used: number; cap: number; symbol: string; price: number; color: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <InfoLabel label={label} tooltip={`${label} against the cap set for this reserve`} />
      <Box sx={{ mt: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <BigRing value={cap > 0 ? used / cap : 0} color={color} />
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: { xs: '22.8px', md: '28.8px' }, whiteSpace: 'nowrap' }}>
            {formatLowerCompact(used * price, { usd: true })}
            <Box component="span" sx={{ fontSize: 18, color: 'fg-3' }}>of</Box>
            {cap > 0 ? formatLowerCompact(cap * price, { usd: true }) : '∞'}
          </Box>
          <Box sx={{ mt: '9px', fontSize: 14, lineHeight: '17px', color: 'fg-3', whiteSpace: 'nowrap' }}>
            {formatLowerCompact(used)} of {cap > 0 ? formatLowerCompact(cap) : '∞'} {symbol}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function Param({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    // Live mobile: one row per parameter, label left and value right (16px rows, 24px apart).
    <Box component="div" sx={{ minWidth: 0, display: { xs: 'flex', md: 'block' }, alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
      <Box component="dt" sx={{ m: 0 }}>
        <InfoLabel label={label} tooltip={tooltip} />
      </Box>
      <Box component="dd" sx={{ m: 0, mt: { xs: 0, md: '10px' }, fontSize: 14, fontWeight: 500, lineHeight: '14px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
        {children}
      </Box>
    </Box>
  );
}

/** Live: 20px ring before a 24/500 percentage (Utilisation). */
export function PctRing({ value }: { value: number }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(value, 0), 1);
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <Box component="svg" viewBox="0 0 20 20" sx={{ width: 20, height: 20, transform: 'rotate(-90deg)', flexShrink: 0 }} aria-hidden>
        <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2" style={{ stroke: tv('border-2') }} />
        <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(p, 0.005))} style={{ stroke: tv('purple-1') }} />
      </Box>
      {formatPercent(value)}
    </Box>
  );
}

const card = { borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}` } as const;
/** The Pro reserve-page card surface (bg-2, 10px radius, shadow + 1px ring), for reuse. */
export const reserveCard = card;

/**
 * Interest-rate-model curve, live geometry (re-measured 2026-10-14, desktop and 390px): a 320px card;
 * y domain 0 → d3-style nice(max rate, 5) (0–12% for ETH), 0% on y 300 and the top at y 0; dashed
 * gridlines (white 12%, 1.5/4) at the 5% steps with 12px fg-4 labels 20px in; x labels 0% / 50% /
 * 100% along the bottom; a 1.5px orange curve; "Optimal" (fg-4 dashed line, fg-3 label at y 39) and
 * "Current n%" (white dashed line and label at y 119) markers whose lines break around their labels.
 */
function IrmChart({ asset, height = 320 }: { asset: ProHubAsset; height?: number }) {
  return <IrmCurve rateAt={(u) => variableBorrowRate(u, asset.rateStrategy)} optimal={asset.rateStrategy.optimalUsage} current={asset.utilization} height={height} />;
}

/**
 * The interest-rate-model card for any rate function (Pro passes the hub asset's strategy; Mini-Aave
 * passes the pool's two-slope curve from getReserveConfig). Optional second curve (e.g. supply).
 */
export function IrmCurve({ rateAt, optimal, current, height = 320, second, drawIn = false }: { rateAt: (u: number) => number; optimal: number; current: number; height?: number; second?: { rateAt: (u: number) => number; color: string }; drawIn?: boolean }) {
  const [width, setWidth] = React.useState(0);
  const ro = React.useRef<ResizeObserver | null>(null);
  const measure = React.useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    setWidth(Math.round(el.getBoundingClientRect().width));
    ro.current = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.current.observe(el);
  }, []);
  const pts = 201;
  const rates = Array.from({ length: pts }, (_, i) => rateAt(i / (pts - 1)));
  const max = Math.max(...rates) || 0.1;
  // d3 nice() for a count of 5 on [0, max]: step = 1/2/5 × 10^k closest to max / 5.
  const raw = max / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const err = raw / pow;
  const step = (err >= 7.07 ? 10 : err >= 3.16 ? 5 : err >= 1.41 ? 2 : 1) * pow;
  const hi = Math.ceil(max / step) * step;
  const base = height - 20;
  const x = (u: number) => u * width;
  const y = (v: number) => base - (v / hi) * base;
  const d = rates.map((v, i) => `${i ? 'L' : 'M'}${x(i / (pts - 1)).toFixed(2)},${y(v).toFixed(2)}`).join('');
  const gridStep = hi > 0.3 ? 0.1 : 0.05;
  const ticks: number[] = [];
  for (let t = gridStep; t < hi - 1e-9; t += gridStep) ticks.push(t);
  const u = current;
  const opt = optimal;
  const d2 = second ? Array.from({ length: pts }, (_, i) => `${i ? 'L' : 'M'}${x(i / (pts - 1)).toFixed(2)},${y(second.rateAt(i / (pts - 1))).toFixed(2)}`).join('') : '';
  const draw = drawIn ? ({ pathLength: 1, strokeDasharray: 1, style: { animation: 'clone-draw 900ms cubic-bezier(0.4, 0, 0.2, 1) both' } } as const) : {};
  const marker = (v: number, label: string, top: number, stroke: string, fill: string) => (
    <g key={label}>
      <line x1={x(v)} x2={x(v)} y1={0} y2={top - 1} stroke={stroke} strokeDasharray="2 2" />
      <line x1={x(v)} x2={x(v)} y1={top + 19} y2={height} stroke={stroke} strokeDasharray="2 2" />
      {/* Labels stay inside the card at 0% / 100% utilization. */}
      <text x={Math.min(Math.max(x(v), 48), width - 48)} y={top + 12} fontSize={12} fill={fill} textAnchor="middle">
        {label}
      </text>
    </g>
  );
  return (
    <Box sx={{ ...card, overflow: 'hidden' }}>
      <Box ref={measure} sx={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Interest rate model">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={width} y1={y(t)} y2={y(t)} stroke="rgba(255, 255, 255, 0.12)" strokeDasharray="1.5 4" />
                <text x={20} y={y(t) + 4} fontSize={12} fill={tv('fg-4')}>
                  {`${+(t * 100).toFixed(0)}%`}
                </text>
              </g>
            ))}
            <text x={20} y={height - 20} fontSize={12} fill={tv('fg-4')}>0%</text>
            <text x={width / 2} y={height - 20} fontSize={12} fill={tv('fg-4')} textAnchor="middle">50%</text>
            <text x={width - 20} y={height - 20} fontSize={12} fill={tv('fg-4')} textAnchor="end">100%</text>
            {second && <path d={d2} fill="none" stroke={second.color} strokeWidth={1.5} strokeLinejoin="round" {...draw} />}
            <path d={d} fill="none" stroke={SERIES.orange} strokeWidth={1.5} strokeLinejoin="round" {...draw} />
            {marker(u, `Current ${(u * 100).toFixed(1)}%`, 119, tv('fg-1'), tv('fg-1'))}
            {marker(opt, 'Optimal', 39, tv('fg-4'), tv('fg-3'))}
          </svg>
        )}
      </Box>
    </Box>
  );
}

// Live renders addresses as "0×C1Cd…48b6" (multiplication sign).
const shortAddr = (a: string) => `0×${a.slice(2, 6)}…${a.slice(-4)}`;

function seededHolders(seed: string, total: number, price: number, symbol: string) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (Math.imul(x, 31) + seed.charCodeAt(i)) >>> 0;
  const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const hex = () => Array.from({ length: 36 }, () => Math.floor(rnd() * 16).toString(16)).join('');
  let left = 0.55 + rnd() * 0.2;
  return Array.from({ length: 20 }, (_, i) => {
    const share = i === 19 ? left : left * (0.18 + rnd() * 0.22);
    left -= share;
    // Demo-only addresses: every one starts with 0xde00 so it cannot be mistaken for a real holder.
    return { id: `${seed}-${i}`, address: `0xde00${hex()}`, share, amount: total * share, usd: total * share * price, symbol, ago: `${1 + Math.floor(rnd() * 29)}d ago` };
  }).sort((a, b) => b.share - a.share);
}

/** One timestamp per page load (same pattern as Entity.tsx). */
const PAGE_LOADED_AT = Date.now();

/**
 * Live "Reward Campaigns" (reserves with rewards, e.g. USDG; measured 2026-10-14): heading with a
 * subheading, then a table card (Reward Asset 172px with a 44px logo and name over symbol, Reward APY
 * with an info glyph, Status "Active" over "Ends <date>", Available to Claim "–", and a 28px "Claim"
 * pill), 73px rows, 8px column gaps. Mobile: one card (header, rule, Status and Available to Claim rows,
 * full-width Claim). The live campaign comes from an external rewards program; here the rate is the
 * seed's illustrative incentive and the end date is simulated (labelled in the subheading).
 */
function RewardCampaigns({ r, onClaim }: { r: ProReserve; onClaim: () => void }) {
  const prefs = usePrefs();
  let x = 0;
  for (let i = 0; i < r.id.length; i++) x = (Math.imul(x, 31) + r.id.charCodeAt(i)) >>> 0;
  const ends = PAGE_LOADED_AT + (1 + (x % 20)) * 86_400_000;
  const endText = `Ends ${formatPrefDate(ends, prefs.hydrated ? prefs.dateFormat : 'mdy')}`;
  const apy = (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
      {formatPercent(r.incentiveAPY)}
      <InfoHint label="Reward APY" text="Illustrative reward rate from the demo seed; no real campaign is running." />
    </Box>
  );
  const status = (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: { xs: '6px', md: '8px' }, lineHeight: '14px' }}>
      <Box component="span" sx={{ fontWeight: 500 }}>Active</Box>
      <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{endText}</Box>
    </Box>
  );
  const claim = (wide: boolean) => (
    <ProButton variant="tertiary" size={wide ? 'md' : 'sm'} wide={wide} onClick={onClaim} sx={wide ? undefined : { [DARK]: { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } }}>
      Claim
    </ProButton>
  );
  const asset = (big: boolean) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: big ? '16px' : '14px', minWidth: 0 }}>
      <TokenIcon symbol={r.symbol} size={44} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
        <Box component="span" sx={{ fontSize: 14, fontWeight: 500, lineHeight: '16.8px', whiteSpace: 'nowrap' }}>{r.name}</Box>
        <Box component="span" sx={{ fontSize: 14, lineHeight: '14px', color: 'fg-3' }}>{r.symbol}</Box>
      </Box>
    </Box>
  );
  return (
    <>
      <SectionHeading title="Reward Campaigns" description="Simulated reward campaigns (demo)" />
      <ScrollTable
        rows={[r]}
        first={{ key: 'asset', label: 'Reward Asset', render: () => asset(true), mobile: () => asset(false), sortValue: () => r.name }}
        columns={[
          { key: 'apy', label: 'Reward APY', render: () => apy, sortValue: () => r.incentiveAPY, hideOnMobile: true },
          { key: 'status', label: 'Status', render: () => status },
          { key: 'claimable', label: 'Available to Claim', render: () => <Box component="span" sx={{ color: 'fg-4', fontWeight: 400 }}>–</Box> },
          { key: 'claim', label: '', render: () => <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>{claim(false)}</Box>, hideOnMobile: true },
        ]}
        rowKey={() => r.id}
        defaultSort={{ key: 'apy', desc: true }}
        firstWidth={172}
        gapped
        mobileAside={() => apy}
        mobileActions={() => claim(true)}
      />
    </>
  );
}

/** Live share bar: 10px track (bg-4, pill), purple fill, 10px gap, 14/500 percentage. */
export function ShareBar({ share, width }: { share: number; width?: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', width: width ? 'auto' : '100%', minWidth: 0 }}>
      <Box sx={{ width, flex: width ? 'none' : 1, height: 10, borderRadius: '100px', bgcolor: 'bg-4', overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.max(share, 0.005) * 100}%`, height: '100%', borderRadius: '100px', bgcolor: 'purple-1' }} />
      </Box>
      <Box component="span" sx={{ fontSize: 14, fontWeight: 500, lineHeight: '14px', whiteSpace: 'nowrap' }}>{formatPercent(share)}</Box>
    </Box>
  );
}

/** Live mobile holder card: address | amount (+ fiat), share bar, full-width "Copy Address". */
function HolderCard({ h }: { h: { address: string; share: number; amount: number; usd: number; symbol: string } }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Box sx={{ ...card, p: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: 14 }}>
      <Box sx={{ minHeight: 33, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
        <Box component="span" sx={{ lineHeight: '16.8px' }}>{shortAddr(h.address)}</Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', pt: '1px' }}>
          <Box component="span" sx={{ fontWeight: 500, lineHeight: '14px', whiteSpace: 'nowrap' }}>{formatLowerCompact(h.amount)} {h.symbol}</Box>
          <Box component="span" sx={{ color: 'fg-3', lineHeight: '14px' }}>{formatLowerCompact(h.usd, { usd: true })}</Box>
        </Box>
      </Box>
      <ShareBar share={h.share} />
      <Box sx={{ pt: '10px' }}>
        <ProButton
          variant="tertiary"
          wide
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(h.address);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          {copied ? 'Copied' : 'Copy Address'}
        </ProButton>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------

export function ReservePage({ reserveId }: { reserveId: string }) {
  const { protocol, user, account } = useProContext();
  const open = useProModal((s) => s.open);
  const requireWallet = useRequireWallet();
  const notice = useNotice();
  const [menu, setMenu] = React.useState<HTMLElement | null>(null);
  const [holders, setHolders] = React.useState<'deposits' | 'borrows'>('deposits');
  // Live: 10 holders, then "See more" (desktop) / "Show More" (mobile) adds the next page.
  const [holderPage, setHolderPage] = React.useState(10);
  const snap = protocol.data;
  const r = snap?.reserves.find((x) => x.id.toLowerCase() === reserveId.toLowerCase());
  const asset = snap?.hubAssets.find((a) => r && a.hubId === r.hubId && a.symbol === r.symbol);
  const chain = snap?.chains.find((c) => c.id === r?.chainId);
  // Live lists ETH holders' positions in WETH (the underlying token).
  const holderSymbol = r?.symbol === 'ETH' ? 'WETH' : (r?.symbol ?? '');
  const allHolders = r ? seededHolders(`${r.id}:${holders}`, holders === 'deposits' ? r.supplied : r.borrowed, r.priceUSD, holderSymbol) : [];
  const topList = allHolders.slice(0, holderPage);
  if (snap && !r) return <NotFoundView />;

  const sym = r?.symbol ?? '';
  const price = r?.priceUSD ?? 0;
  const util = asset?.utilization ?? 0;
  const depositAPY = r ? r.supplyAPY + r.underlyingYieldAPY + r.incentiveAPY : 0;
  const liqSeries = r ? simulatedSeries(`reserve:${r.id}:liq:1W`, r.availableLiquidity, 28, 0.03) : [];
  const flow7 = r ? r.availableLiquidity - liqSeries[0] : 0;
  const flow1m = r ? r.availableLiquidity - simulatedSeries(`reserve:${r.id}:liq:1M`, r.availableLiquidity, 120, 0.03)[0] : 0;
  const signed = (v: number, usd?: boolean) => `${v >= 0 ? '+' : '−'}${formatLowerCompact(Math.abs(v), { usd })}`;

  const collateral = (snap?.reserves ?? []).filter((x) => r && x.spokeId === r.spokeId && x.collateral && x.suppliable);
  const borrowable = (snap?.reserves ?? []).filter((x) => r && x.spokeId === r.spokeId && x.borrowable);
  const inline = (x: ProReserve) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
      <TokenIcon symbol={x.symbol} size={24} />
      <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
        <Box component="span" sx={{ fontWeight: 500 }}>{x.name}</Box> <Box component="span" sx={{ color: 'fg-3' }}>{x.symbol}</Box>
      </Box>
    </Box>
  );
  const inlineMobile = (x: ProReserve) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
      <TokenIcon symbol={x.symbol} size={24} />
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', whiteSpace: 'nowrap', minWidth: 0 }}>
        <Box component="span" sx={{ fontSize: 14, fontWeight: 500, lineHeight: '16.8px' }}>{x.name}</Box>
        <Box component="span" sx={{ fontSize: 14, lineHeight: '14px', color: 'fg-3' }}>{x.symbol}</Box>
      </Box>
    </Box>
  );
  const assetFirst: ScrollColumn<ProReserve> = { key: 'asset', label: 'Asset', render: inline, mobile: inlineMobile, sortValue: (x) => x.name };
  /** Live mobile card footer on the reserve lists: one full-width tertiary button. */
  const cardButton = (x: ProReserve, side: 'deposit' | 'borrow') => (
    <ProButton variant="tertiary" wide onClick={() => requireWallet(() => open({ type: side, reserveId: x.id }))}>
      {side === 'deposit' ? 'Deposit' : 'Borrow'}
    </ProButton>
  );
  type Holder = (typeof topList)[number];
  const holderFirst: ScrollColumn<Holder> = { key: 'holder', label: 'Holder', render: (h) => <Box component="span" sx={{ fontFamily: 'inherit' }}>{shortAddr(h.address)}</Box> };
  const holderCols: ScrollColumn<Holder>[] = [
    {
      key: 'share',
      label: holders === 'deposits' ? 'Share of Deposits' : 'Share of Borrows',
      render: (h) => (
        <ShareBar share={h.share} width={164} />
      ),
      sortValue: (h) => h.share,
    },
    {
      key: 'amount',
      label: holders === 'deposits' ? 'Deposited' : 'Borrowed',
      render: (h) => (
        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
          <Box component="span" sx={{ fontWeight: 500 }}>{formatLowerCompact(h.amount)} {h.symbol}</Box>{' '}
          <Box component="span" sx={{ color: 'fg-3' }}>{formatLowerCompact(h.usd, { usd: true })}</Box>
        </Box>
      ),
      sortValue: (h) => h.amount,
    },
    { key: 'ago', label: 'Latest Activity', render: (h) => <Box component="span" sx={{ color: 'fg-2' }}>{h.ago}</Box> },
  ];

  const moreButton = (
    <ProButton variant="secondary" size="square" aria-label="More options" aria-haspopup="menu" aria-expanded={menu ? 'true' : undefined} onClick={(e) => setMenu(e.currentTarget)}>
      <PIMore />
    </ProButton>
  );
  return (
    <Box>
      <EntityHeader
        titleSize={28}
        mobileActions={false}
        icon={r ? <TokenIcon symbol={r.symbol} size={56} /> : <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'bg-3' }} />}
        title={
          <>
            {r?.name}{' '}
            <Box component="span" sx={{ color: 'fg-3' }}>
              {sym}
            </Box>
          </>
        }
        sub={
          r && (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'fg-2', fontSize: 14, lineHeight: '17px' }}>
              <Box component={Link} href={proRoutes.market(r.spokeId)} sx={{ color: 'fg-1', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>
                {r.spokeName}
              </Box>
              on
              <Box component={Link} href={proRoutes.hub(r.hubId)} sx={{ color: 'fg-1', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>
                {r.hubName}
              </Box>
              <ChainIcon chain={chain} size={14} /> {chain?.name}
            </Box>
          )
        }
        actions={
          <>
            <ProButton variant="secondary" prefixIcon={<PIDeposit />} disabled={r && !r.suppliable} onClick={() => r && requireWallet(() => open({ type: 'deposit', reserveId: r.id }))}>
              Deposit
            </ProButton>
            <ProButton variant="secondary" prefixIcon={<PIBorrow />} disabled={r && !r.borrowable} onClick={() => r && requireWallet(() => open({ type: 'borrow', reserveId: r.id }))}>
              Borrow
            </ProButton>
            {moreButton}
          </>
        }
      />
      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ backdrop: { sx: { bgcolor: 'transparent' } } }}>
              <MenuItem
                onClick={() => {
                  setMenu(null);
                  void navigator.clipboard?.writeText(window.location.href);
                }}
              >
                Copy link
              </MenuItem>
              <MenuItem component={Link} href={r ? proRoutes.token(r.symbol) : proRoutes.deposit} onClick={() => setMenu(null)}>
                View {sym} across markets
              </MenuItem>
      </Menu>

      {account && r && snap && <Box sx={{ mt: '32px' }}><YourPositions reserve={r} snap={snap} user={user.data} /></Box>}

      <Box sx={{ mt: { xs: '28px', md: '52px' }, display: { xs: 'grid', md: 'flex' }, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: { xs: '32px', md: 0 }, rowGap: { xs: '25.6px', md: 3 }, flexWrap: 'wrap' }}>
        <TopStat first label="Total Deposits" tooltip="Total amount deposited in this reserve" value={r ? <USD value={r.suppliedUSD} /> : '—'} sub={r && `${formatLowerCompact(r.supplied)} ${sym}`} />
        <TopStat label="Total Borrows" tooltip="Total amount borrowed from this reserve" value={r ? <USD value={r.borrowedUSD} /> : '—'} sub={r && `${formatLowerCompact(r.borrowed)} ${sym}`} />
        <TopStat label="Available Liquidity" tooltip="Liquidity available to withdraw or borrow" value={r ? <USD value={r.availableLiquidityUSD} /> : '—'} sub={r && `${formatLowerCompact(r.availableLiquidity)} ${sym}`} />
        <TopStat label="Utilisation" tooltip="Share of the hub's deposits that is borrowed" value={<PctRing value={util} />} />
        <TopStat label="Liquidity Fee" tooltip="Share of borrower interest kept by the hub" value={formatPercent(asset?.liquidityFee ?? 0)} />
      </Box>
      {/* Live mobile: Deposit / Borrow / ⋯ sit 32px under the stats (not under the title). */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: '8px', mt: '32px' }}>
        <ProButton variant="secondary" prefixIcon={<PIDeposit />} disabled={r && !r.suppliable} onClick={() => r && requireWallet(() => open({ type: 'deposit', reserveId: r.id }))} sx={{ flex: 1, pl: '12px', pr: '14px' }}>
          Deposit
        </ProButton>
        <ProButton variant="secondary" prefixIcon={<PIBorrow />} disabled={r && !r.borrowable} onClick={() => r && requireWallet(() => open({ type: 'borrow', reserveId: r.id }))} sx={{ flex: 1, pl: '12px', pr: '14px' }}>
          Borrow
        </ProButton>
        {moreButton}
      </Box>

      <SectionDivider />
      <SectionHeading title="Interest Rates" description={`Current deposit and borrow interest rates for ${sym} in this reserve.`} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: 0 }}>
        {/* Live 390px: the chart starts 28px under the Borrow APY value. */}
        <Box sx={{ pt: '5px', mb: { xs: '-3px', lg: 0 } }}>
          <StatBlock label="Deposit APY" tooltip="Deposit APY, including any estimated underlying yield" space={17}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {formatPercent(depositAPY)}
              {r && r.incentiveAPY > 0 && <RewardsBadge size={20} title={`Includes ${formatPercent(r.incentiveAPY)} illustrative rewards (Incentives and APY Boosts)`} />}
            </Box>
          </StatBlock>
          <StatBlock label="Borrow APY" tooltip="Base borrow APY before any risk premium" divider={false}>
            {r?.borrowable ? (
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {formatPercent(r.borrowAPY)}
                {r.borrowMerit && <RewardsBadge size={20} title="Eligible for borrow rewards (Incentives and APY Boosts); amounts not simulated" />}
              </Box>
            ) : (
              '—'
            )}
          </StatBlock>
        </Box>
        {r && (
          <ChartCard
            seed={`reserve:${r.id}:rates`}
            series={[
              { key: 'dep', label: 'Deposit', color: SERIES.green, current: depositAPY, kind: 'pct', volatility: 0.05 },
              { key: 'bor', label: 'Borrow', color: SERIES.orange, current: r.borrowAPY, kind: 'pct', volatility: 0.05 },
            ]}
          />
        )}
      </Box>

      <SectionDivider />
      <SectionHeading title="Protocol Parameters" description="Market parameters come from two protocol layers: the hub and the market." />
      {r && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, columnGap: '32px', rowGap: { xs: '25.6px', md: 4 } }}>
            <CapacityStat label="Total Deposits" used={r.supplied} cap={r.supplyCap} symbol={sym} price={price} color={SERIES.green} />
            <Box sx={{ borderLeft: { md: `1px solid ${tv('border-1')}` }, pl: { md: '32px' } }}>
              <CapacityStat label="Total Borrows" used={r.borrowed} cap={r.borrowCap} symbol={sym} price={price} color={SERIES.orange} />
            </Box>
          </Box>
          <Box component="dl" sx={{ ...card, m: 0, mt: '40px', p: '24px 20px', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gridAutoFlow: { md: 'column' }, gridTemplateRows: { md: 'repeat(3, auto)' }, columnGap: '32px', rowGap: '24px' }}>
            <Param label="Hub" tooltip="The hub that holds this asset's liquidity">
              <Box component={Link} href={proRoutes.hub(r.hubId)} sx={{ color: 'fg-1', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>{r.hubName}</Box>
            </Param>
            <Param label="Market" tooltip="The market (spoke) where positions are held">
              <Box component={Link} href={proRoutes.market(r.spokeId)} sx={{ color: 'fg-1', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>{r.spokeName}</Box>
            </Param>
            <Param label="Deposit capacity" tooltip="Maximum amount that can be deposited">
              {r.supplyCap > 0 ? `${formatLowerCompact(r.supplyCap)} ${sym}` : 'Unlimited'} <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{r.supplyCap > 0 ? formatLowerCompact(r.supplyCap * price, { usd: true }) : ''}</Box>
            </Param>
            <Param label="Borrow capacity" tooltip="Maximum amount that can be borrowed">
              {r.borrowable ? <>{formatLowerCompact(r.borrowCap)} {sym} <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{formatLowerCompact(r.borrowCap * price, { usd: true })}</Box></> : '–'}
            </Param>
            <Param label="Liquidation penalty" tooltip="Bonus paid to liquidators, from the base to the maximum">
              {r.collateral ? `${formatPercent(r.maxLiquidationBonus)} - ${formatPercent(r.maxLiquidationBonus * 1.11)}` : '–'}
            </Param>
            <Param label="Use as collateral" tooltip="Whether this asset can back borrows in this market">
              {r.collateral ? (
                <>
                  <Box component="svg" viewBox="0 0 16 16" sx={{ width: 16, height: 16 }} aria-hidden>
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </Box>
                  Supported
                </>
              ) : (
                'Not supported'
              )}
            </Param>
            <Param label="Collateral factor" tooltip="Share of this collateral's value that counts towards borrowing">{r.collateral ? formatPercent(r.collateralFactor) : '–'}</Param>
            <Param label="Collateral risk" tooltip="Risk score used for the borrower's risk premium">{r.collateral ? formatPercent(r.collateralRisk) : '–'}</Param>
            <Param label="Target health factor" tooltip="Health factor a liquidation restores a position to">{(snap?.spokes.find((s) => s.id === r.spokeId)?.liquidationTargetHF ?? 1).toFixed(2)}</Param>
          </Box>
        </>
      )}

      <SectionDivider />
      <SectionHeading title="Interest Rate Model" description="Borrow rates adjust automatically based on market utilisation." />
      {asset && (
        // Live aside (desktop and 390px): a summary (label, 24px value) then a rule-topped group of rows,
        // the same pattern as the hub/market asides; the chart sits 24px below it on mobile.
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: '24px' }}>
          <StatSummary label="Utilisation Rate" tooltip="Share of the hub's deposits that is borrowed" value={<PctRing value={util} />}>
            <StatGroup>
              <StatLine label="Optimal utilisation" tooltip="Above this utilisation the steeper slope applies">{formatPercent(asset.rateStrategy.optimalUsage)}</StatLine>
              <StatLine label="Slope below optimal">{formatPercent(asset.rateStrategy.slope1)}</StatLine>
              <StatLine label="Slope above optimal">{formatPercent(asset.rateStrategy.slope2)}</StatLine>
              <StatLine label="Base borrow rate">{formatPercent(asset.rateStrategy.baseRate)}</StatLine>
            </StatGroup>
          </StatSummary>
          <IrmChart asset={asset} />
        </Box>
      )}

      <SectionDivider />
      <SectionHeading title="Available Liquidity" description="Remaining liquidity available to borrow from this reserve." />
      {r && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: '24px' }}>
          {/* Live: summary (label, 24px value, token amount 8px below) then the rule-topped flow rows (two lines each, 10px apart). */}
          <StatSummary label="Available Liquidity" tooltip="Liquidity available to withdraw or borrow" value={<USD value={r.availableLiquidityUSD} />} sub={`${formatLowerCompact(r.availableLiquidity)} ${sym}`}>
            <StatGroup>
              {[
                { label: '7D liquidity flow', v: flow7, tip: 'Simulated change in available liquidity over 7 days' },
                { label: '1M liquidity flow', v: flow1m, tip: 'Simulated change in available liquidity over 1 month' },
              ].map((x) => (
                <Box key={x.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, fontSize: 14, lineHeight: '14px' }}>
                  <InfoLabel label={x.label} tooltip={x.tip} />
                  <Box sx={{ textAlign: 'right' }}>
                    <Box sx={{ fontWeight: 500 }}>{signed(x.v * price, true)}</Box>
                    <Box sx={{ mt: '10px', color: 'fg-3' }}>
                      {signed(x.v)} {sym}
                    </Box>
                  </Box>
                </Box>
              ))}
            </StatGroup>
          </StatSummary>
          <ChartCard height={320} legend={false} seed={`reserve:${r.id}:liq`} series={[{ key: 'liq', label: 'Available liquidity', color: SERIES.purple, current: r.availableLiquidity, kind: 'num', volatility: 0.03 }]} />
        </Box>
      )}

      <SectionDivider />
      <SectionHeading title="Supported Collateral" description={`Assets that can be used as collateral to borrow ${sym} from this market.`} />
      <ScrollTable rows={collateral} first={assetFirst} columns={[{ key: 'cf', label: 'Collateral Factor', render: (x) => <Box component="span" sx={{ fontWeight: 500 }}>{formatPercent(x.collateralFactor)}</Box>, sortValue: (x) => x.collateralFactor, hideOnMobile: true }]} rowKey={(x) => x.id} defaultSort={{ key: 'cf', desc: true }} rowHref={(x) => proRoutes.reserve(x.id)} firstWidth={623} dense loading={!snap} mobileAside={(x) => formatPercent(x.collateralFactor)} mobileActions={(x) => cardButton(x, 'deposit')} mobileLimit={5} />

      <SectionDivider />
      <SectionHeading title="Assets You Can Borrow" description={`What assets can be borrowed with ${sym} as collateral.`} />
      {/* Live: the list shows every borrowable asset in the market; when this asset is not collateral the Base APY cells stay empty. */}
      <ScrollTable rows={borrowable} first={assetFirst} columns={[{ key: 'apy', label: 'Base APY', render: (x) => (r?.collateral ? <Box component="span" sx={{ fontWeight: 500 }}>{formatPercent(x.borrowAPY)}</Box> : null), sortValue: (x) => x.borrowAPY, hideOnMobile: true }]} rowKey={(x) => x.id} defaultSort={{ key: 'asset', desc: false }} rowHref={(x) => proRoutes.reserve(x.id)} firstWidth={623} dense loading={!snap} mobileAside={(x) => (r?.collateral ? formatPercent(x.borrowAPY) : null)} mobileActions={(x) => cardButton(x, 'borrow')} mobileLimit={5} />

      {r && r.incentiveAPY > 0 && (
        <>
          <SectionDivider />
          <RewardCampaigns r={r} onClaim={() => requireWallet(() => notice.show('Nothing to claim', 'Reward campaigns are simulated in this demo; there are no rewards to claim.'))} />
        </>
      )}

      <SectionDivider />
      <SectionHeading
        title="Top Addresses"
        description="Breakdown of the largest positions by address (simulated demo addresses)."
        right={
          // Live: a segmented Deposits / Borrows toggle (surface track), centred on the heading block.
          <Box sx={{ alignSelf: 'center', mt: { xs: '7px', md: 0 } }}>
            <SegmentedToggle
              label="Top addresses by"
              track="surface"
              value={holders}
              options={[
                { value: 'deposits', label: 'Deposits' },
                { value: 'borrows', label: 'Borrows' },
              ]}
              onChange={(v) => {
                setHolders(v);
                setHolderPage(10);
              }}
            />
          </Box>
        }
      />
      <ScrollTable
        rows={topList}
        first={holderFirst}
        columns={holderCols}
        rowKey={(h) => h.id}
        defaultSort={{ key: 'share', desc: true }}
        firstWidth={172}
        loading={!snap}
        dense
        // Live: hovering a holder row shows a 32px "Actions" button; its menu has one item, Copy Address.
        rowActions={(h) => (
          <Dropdown
            entries={[{ label: 'Copy Address', onClick: () => void navigator.clipboard?.writeText(h.address) }]}
            trigger={(t) => (
              <Box component="button" type="button" aria-label="Actions" {...t} sx={{ width: 32, height: 32, p: 0, border: 0, borderRadius: '6px', background: 'none', color: 'fg-3', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.18s, background 0.18s', '&:hover': { color: 'fg-1', bgcolor: 'button-hover-tertiary' } }}>
                <PIMore size={16} />
              </Box>
            )}
          />
        )}
        footer={
          holderPage < allHolders.length && (
            // Live: a 36px "See more" row (14/500, 20px fg-3 glyph on the right) closing the card.
            <Box component="button" type="button" onClick={() => setHolderPage((n) => n + 10)} sx={{ width: '100%', mb: '-9px', p: '23px 0 2px', border: 0, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'fg-1', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, lineHeight: '14px', cursor: 'pointer', '& svg': { color: 'fg-3', transition: 'color 100ms' }, '&:hover svg': { color: 'fg-1' } }}>
              See more
              <BIPlus size={20} />
            </Box>
          )
        }
        mobileList={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topList.map((h) => (
                <HolderCard key={h.id} h={h} />
              ))}
            </Box>
            {holderPage < allHolders.length && (
              <ProButton variant="secondary" wide onClick={() => setHolderPage((n) => n + 10)} sx={{ [DARK]: { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } }}>
                Show More
              </ProButton>
            )}
          </Box>
        }
      />
    </Box>
  );
}
