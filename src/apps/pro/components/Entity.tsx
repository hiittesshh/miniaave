'use client';

/**
 * Building blocks shared by the Pro entity pages (hub, market, reserve, token), rebuilt from
 * computed-style measurements of the live pages (1440×900):
 * - EntityHeader: Back link (14px fg-3), 56px icon tile (16.8px radius, bg-3), title 30/500,
 *   sub-line 14px ("Hub on" fg-3 + chain), action pills on the right
 * - StatBlock: 14px fg-3 label over a 24/500 value, separated by 1px rules; StatLine: label/value row
 * - ChartCard: see the measurements above the component (live charts are visx; this is plain SVG)
 * - SectionHeading: h2 24/500 with an optional 14px fg-3 description
 * - ActivityList: bg-2 card, 48px rows, 120px date column, 24px token logo, amount on the right
 * Chart history and activity are SIMULATED (deterministic from the entity id), labelled as such.
 */
import Box from '@mui/material/Box';
import GlobalStyles from '@mui/material/GlobalStyles';
import { keyframes } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { ChainInfo } from '@/data/types';
import { formatLowerCompact } from '@/shared/format';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { tv } from '@/shared/theme/tokens';
import { ChainIcon } from '../ui';
import { PIBack, PIInfo } from '../icons';

// --------------------------------------------------------------------------------------------
// Header
// --------------------------------------------------------------------------------------------

export function HubTile({ size = 56 }: { size?: number }) {
  const d = size * 0.18;
  return (
    <Box sx={{ width: size, height: size, borderRadius: `${size * 0.3}px`, bgcolor: 'bg-3', position: 'relative', flexShrink: 0 }} aria-hidden>
      {[
        [0.3, 0.3],
        [0.58, 0.3],
        [0.3, 0.58],
      ].map(([x, y], i) => (
        <Box key={i} sx={{ position: 'absolute', left: size * x - d / 2 + d / 2, top: size * y - d / 2 + d / 2, width: d * 1.25, height: d * 1.25, borderRadius: '50%', bgcolor: 'fg-3' }} />
      ))}
    </Box>
  );
}

export function MarketTile({ size = 56 }: { size?: number }) {
  return (
    <Box sx={{ width: size, height: size, borderRadius: `${size * 0.3}px`, bgcolor: 'bg-3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden>
      <Box sx={{ width: size * 0.36, height: size * 0.36, bgcolor: 'fg-3', borderRadius: `${size * 0.05}px`, transform: 'rotate(45deg)' }} />
    </Box>
  );
}

export function BackLink() {
  const router = useRouter();
  return (
    <Box
      component="button"
      type="button"
      onClick={() => router.back()}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: 16, p: 0, border: 0, background: 'none', color: 'fg-3', fontFamily: 'inherit', fontSize: 14, lineHeight: '14px', cursor: 'pointer', transition: 'color 100ms ease', '&:hover': { color: 'fg-1' } }}
    >
      <PIBack size={16} />
      Back
    </Box>
  );
}

export function EntityHeader({ icon, title, sub, actions, titleSize = 30, mobileActions = true }: { icon: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; /** Live: hub/market 30px, reserve/token 28px. */ titleSize?: 28 | 30; /** false: the page places its own mobile action row (live reserve: below the stats). */ mobileActions?: boolean }) {
  const p = useCompactProgress();
  return (
    // display: contents so the sticky part's containing block is the page (it can stick all the way down).
    <Box data-entity-header="" style={{ '--p': p } as React.CSSProperties} sx={{ display: 'contents' }}>
      {/*
        The compaction shrinks the header's layout height; with scroll anchoring on, Chrome then scrolls
        back by the same amount, so the title lagged live by ~3px of scroll (measured 2026-10-14). Live
        keeps its header height constant, so anchoring never kicks in there. Entity pages only.
      */}
      <GlobalStyles styles={{ 'html:has([data-entity-header]), html:has([data-entity-header]) body': { overflowAnchor: 'none' } }} />
      {/*
        Live (desktop and 390px): the Back link and title row stick under the top bar (Back at y 80 on
        desktop; title at y 80 on mobile) and compact over the first 72px of scroll (title and tile
        scale 1 → 0.764, tile 56 → 42.8px, title row 58 → 47px). Their own bg-1 (+ a 32px fade below) hides
        content scrolling underneath. The mobile action row is not part of it and scrolls away.
      */}
      <Box
        className="entity-sticky"
        sx={{
          position: 'sticky',
          top: { xs: 76, md: 80 },
          zIndex: 6,
          bgcolor: 'bg-1',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          pt: { xs: '4px', md: 0 },
          '&::before': { content: '""', position: 'absolute', left: { xs: '-16px', md: '-32px' }, right: { xs: '-16px', md: '-32px' }, top: { xs: '-20px', md: '-8px' }, bottom: 0, bgcolor: 'bg-1', zIndex: -1 },
          '&::after': { content: '""', position: 'absolute', left: { xs: '-16px', md: '-32px' }, right: { xs: '-16px', md: '-32px' }, top: '100%', height: 32, pointerEvents: 'none', background: `linear-gradient(${tv('bg-1')}, transparent)` },
          // Live (hub/market/reserve, re-measured 2026-10-14): the tile scales with the title (56 → 42.8px) and
          // stays 2px below the title top; the title block ends 19.2px further left (gap 16 → 10px).
          '& .entity-tile': { width: 'calc(56px * (1 - var(--p) * 0.2358))', height: 'calc(56px * (1 - var(--p) * 0.2358))', mt: '2px' },
          '& .entity-tile > *': { transform: 'scale(calc(1 - var(--p) * 0.2358))' },
          '& .entity-titlerow': { gap: 'calc(16px - var(--p) * 6px)' },
          '& h1': { transform: 'scale(calc(1 - var(--p) * 0.2358))', mb: 'calc(var(--p) * -8px)' },
          '& .entity-sub': { transform: 'translateY(calc(var(--p) * -3px))', mb: 'calc(var(--p) * -3px)' },
        }}
      >
        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          <BackLink />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, flexWrap: 'wrap' }}>
          <Box className="entity-titlerow" sx={{ display: 'flex', alignItems: 'flex-start', gap: '16px', minWidth: 0 }}>
            <Box className="entity-tile" sx={{ flexShrink: 0, display: 'flex', '& > *': { transformOrigin: 'left top' } }}>{icon}</Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h1" sx={{ fontSize: titleSize, fontWeight: 500, lineHeight: titleSize === 30 ? '33.9px' : '33.6px', color: 'fg-1', transformOrigin: 'left top' }}>
                {title}
              </Typography>
              {sub && (
                <Box className="entity-sub" sx={{ mt: titleSize === 28 ? '7px' : '6px' /* live reserve: 7px under the 28px title */, display: 'flex', alignItems: 'center', gap: '4px', fontSize: 14, lineHeight: '18px', color: 'fg-3', flexWrap: 'wrap' }}>
                  {sub}
                </Box>
              )}
            </Box>
          </Box>
          {actions && <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: '8px', alignSelf: 'flex-start' }}>{actions}</Box>}
        </Box>
      </Box>
      {/*
        Live keeps the header's layout height constant while it compacts (the page height does not change
        on scroll); the title row loses 11px here, so a spacer gives it back. A margin would collapse into
        the next section's top margin.
      */}
      <Box aria-hidden sx={{ height: 'calc(var(--p) * 11px)' }} />
      {/* Live mobile: the actions become a full-width row of equal buttons 32px under the title. */}
      {actions && mobileActions && <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: '8px', mt: '32px', '& > *': { flex: 1, pl: '12px !important', pr: '14px !important' } }}>{actions}</Box>}
    </Box>
  );
}

/**
 * Scroll progress 0 → 1 (rAF-throttled) that drives the compact entity header. Live ranges: 72px on
 * desktop, 48px below 900px (per-pixel samples: scale 1 → 0.7642 linearly).
 */
function useCompactProgress() {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const range = window.innerWidth < 900 ? 48 : 72;
        setP(Math.round(Math.min(1, Math.max(0, window.scrollY / range)) * 100) / 100);
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
    };
  }, []);
  return p;
}

export function OnChain({ prefix, chain }: { prefix: string; chain?: ChainInfo }) {
  return (
    <>
      <span>{prefix}</span>
      {/* Live: 16px round chain badge, 4px gaps, chain name in fg-1. */}
      <ChainIcon chain={chain} size={16} />
      <Box component="span" sx={{ color: 'fg-1' }}>
        {chain?.name}
      </Box>
    </>
  );
}

// --------------------------------------------------------------------------------------------
// Stats
// --------------------------------------------------------------------------------------------

export function StatBlock({ label, tooltip, children, sub, divider = true, space = 16 }: { label: string; tooltip?: string; children: React.ReactNode; sub?: React.ReactNode; divider?: boolean; /** Padding above and below the rule (hub 16, market 19 on live). */ space?: number }) {
  return (
    <Box sx={{ pb: `${space}px`, mb: `${space}px`, borderBottom: divider ? `1px solid ${tv('border-1')}` : 'none' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'fg-3', fontSize: 14, lineHeight: '14px' }}>
        {label}
        {tooltip && (
          <Tooltip title={tooltip}>
            <Box component="span" tabIndex={0} aria-label={label} sx={{ display: 'inline-flex', color: 'fg-4' }}>
              <PIInfo size={14} />
            </Box>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ mt: '9px', height: 29, display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 500, lineHeight: '28.8px', color: 'fg-1' }}>{children}</Box>
      {sub && <Box sx={{ mt: '6px', fontSize: 14, color: 'fg-3', lineHeight: '18px' }}>{sub}</Box>}
    </Box>
  );
}

const InfoTip = ({ label, tooltip }: { label: string; tooltip?: string }) =>
  tooltip ? (
    <Tooltip title={tooltip}>
      <Box component="span" tabIndex={0} aria-label={label} sx={{ display: 'inline-flex', color: 'fg-4' }}>
        <PIInfo size={14} />
      </Box>
    </Tooltip>
  ) : null;

/**
 * Live entity aside (market/hub, computed styles): a 4px-padded column with the headline figure
 * (14/14 fg-3 label, 10px gap, 24/500 value), then 16px below it rule-topped StatGroups.
 */
export function StatSummary({ label, tooltip, value, sub, children, part = 'single' }: { label: string; tooltip?: string; value: React.ReactNode; /** Live reserve Available Liquidity: token amount 8px under the value. */ sub?: React.ReactNode; children?: React.ReactNode; /** Live hub page stacks two summaries: 'first' (4px/16px padding) then 'next' (rule on top, 16px/4px). */ part?: 'single' | 'first' | 'next' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', p: part === 'first' ? '4px 0 16px' : part === 'next' ? '16px 0 4px' : '4px 0', boxShadow: part === 'next' ? `inset 0 1px 0 0 ${tv('border-1')}` : 'none' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'fg-3', fontSize: 14, lineHeight: '14px' }}>
          {label}
          <InfoTip label={label} tooltip={tooltip} />
        </Box>
        <Box sx={{ height: 29, display: 'flex', alignItems: 'center', gap: '6px', fontSize: 24, fontWeight: 500, lineHeight: '28.8px', color: 'fg-1' }}>{value}</Box>
        {sub && <Box sx={{ mt: '-2px', pb: '5px', fontSize: 14, lineHeight: '17px', color: 'fg-3' }}>{sub}</Box>}
      </Box>
      {children && <Box sx={{ display: 'flex', flexDirection: 'column' }}>{children}</Box>}
    </Box>
  );
}

/** Live: 1px inset rule on top, 20px/18px vertical padding, 24px between items. */
export function StatGroup({ children }: { children: React.ReactNode }) {
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', p: '20px 0 18px', boxShadow: `inset 0 1px 0 0 ${tv('border-1')}`, '& > *': { mt: '0 !important' } }}>{children}</Box>;
}

/** Live "balance" stat inside a StatGroup: 18px label row, 8px gap, 24/500 figure. */
export function BalanceStat({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Box sx={{ height: 18, display: 'flex', alignItems: 'center', gap: '4px', color: 'fg-3', fontSize: 14, lineHeight: '14px' }}>
        {label}
        <InfoTip label={label} tooltip={tooltip} />
      </Box>
      <Box sx={{ height: { xs: 23, md: 29 }, display: 'flex', alignItems: 'center', fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: 1.2, color: 'fg-1' }}>{children}</Box>
    </Box>
  );
}

export function StatLine({ label, children, tooltip }: { label: string; children: React.ReactNode; tooltip?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, fontSize: 14, lineHeight: '14px', '& + &': { mt: '27px' } }}>
      <Box component="span" sx={{ color: 'fg-3', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label}
        {tooltip && (
          <Tooltip title={tooltip}>
            <Box component="span" tabIndex={0} aria-label={label} sx={{ display: 'inline-flex', color: 'fg-4' }}>
              <PIInfo size={14} />
            </Box>
          </Tooltip>
        )}
      </Box>
      <Box component="span" sx={{ fontWeight: 500, color: 'fg-1' }}>
        {children}
      </Box>
    </Box>
  );
}

// --------------------------------------------------------------------------------------------
// Section heading + divider
// --------------------------------------------------------------------------------------------

export function SectionDivider() {
  return <Box sx={{ height: '1px', bgcolor: 'border-1', my: { xs: '32px', md: '48px' } }} />;
}

export function SectionHeading({ title, description, right }: { title: string; description?: string; right?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, mb: description ? '31px' : '40px', flexWrap: 'wrap' }}>
      <Box>
        <Typography component="h2" sx={{ fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: 1.2, color: 'fg-1' }}>
          {title}
        </Typography>
        {description && <Typography sx={{ mt: '8px', fontSize: 14, lineHeight: '18.9px', color: 'fg-3' }}>{description}</Typography>}
      </Box>
      {right}
    </Box>
  );
}

// --------------------------------------------------------------------------------------------
// Chart card
// --------------------------------------------------------------------------------------------
//
// Measured on the live market/hub/reserve pages (1440×900, the live chart is built with visx):
// - card: bg-2, 10px radius, shadow + 1px ring, overflow visible; a 32px range row (12px buttons,
//   4px 8px padding, fg-4 → fg-1 when selected, color 0.2s) over a full-width plot (282px; the
//   lines run edge to edge) and a 38px legend footer with a 1px border-0 rule on top.
// - axis: domain = d3-style nice([min, max], 10); range [h − 12, 12]; ticks = nice ticks for a
//   count of 3, dropping the one at the domain floor. Reproduces every captured live axis
//   (market $100M…$400M, hub $300M…$600M, reserve 2%/2.5%/3%, liquidity 3,500…4,500).
// - grid: 1px rgba(255,255,255,.12) dashes (1.5 4) across the full width; 12px fg-4 labels at
//   x = 12, vertically centred on their gridline. Lines (1.25px, round caps) are masked by a
//   left fade (0 → 0.3 at 62% → 1 over the first 96px), so they appear to start after the label.
// - x labels (start date / "Now") only show while the plot is hovered (opacity 0.2s).
// - hover: 1.25px fg-2 crosshair, r4 dots (series colour, bg-3 2px ring), a 200px tooltip
//   (bg-3, 8px radius, date + time header, divider, 24px rows with an 8px dot, the label in the
//   series colour and the value in fg-1).
// - legend: 14px buttons in the series colour with an 8px dot; hover opacity .8; off = fg-2 at
//   opacity .4 with a hollow fg-3 ring dot, the line fades out and the axis re-fits.
// History is SIMULATED (deterministic from the entity id) and the tooltip says so.

export type Range = '1D' | '1W' | '1M' | '6M' | '1Y' | 'All';
/** Page-load time (module scope keeps render pure); simulated series end at this instant. */
const LOADED_AT = Date.now();
export const RANGES: Range[] = ['1D', '1W', '1M', '6M', '1Y', 'All'];
const RANGE_DAYS: Record<Range, number> = { '1D': 1, '1W': 7, '1M': 30, '6M': 182, '1Y': 365, All: 540 };
/** Live 1W series have 84 points (every 2 hours); every range uses 84 so lines can morph. */
const POINTS = 84;
/** Real-data callers (`history` prop) sample their series to exactly this many points. */
export const CHART_POINTS = POINTS;

/** Live series colours (computed styles). */
export const SERIES = { green: '#66c399', orange: '#e68662', purple: '#9391f7', pink: '#e1a4d9' } as const;

export interface Series {
  key: string;
  label: string;
  color: string;
  current: number;
  /** 'usd' series share the left axis; 'pct' series are drawn on their own scale. */
  kind: 'usd' | 'pct' | 'num';
  volatility?: number;
  /** Tooltip value override (e.g. a health factor); NaN points are gaps in the line. */
  format?: (v: number) => string;
}

/** Real data for one range: `values[i]` has CHART_POINTS samples for series i, evenly spaced over [start, end]. */
export interface ChartData {
  start: number;
  end: number;
  values: number[][];
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** Deterministic simulated history ending at `current` (SIMULATED — not real data). */
export function simulatedSeries(seed: string, current: number, points: number, volatility = 0.04) {
  let x = hash(seed) || 1;
  const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const out = new Array<number>(points);
  let v = current;
  out[points - 1] = current;
  for (let i = points - 2; i >= 0; i--) {
    v = Math.max(0, v * (1 + (rnd() - 0.5) * volatility * 2));
    out[i] = v;
  }
  return out;
}

/**
 * Chart history (SIMULATED): a slow mean-reverting drift plus fine point-to-point wiggle and the
 * occasional small step, like the live 2-hourly series. Ends exactly at `current`.
 */
export function simulatedHistory(seed: string, current: number, points: number, volatility: number) {
  let x = hash(seed) || 1;
  const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const out = new Array<number>(points);
  out[points - 1] = current;
  let level = 0;
  for (let i = points - 2; i >= 0; i--) {
    level = level * 0.985 + (rnd() - 0.5) * volatility;
    if (rnd() < 0.04) level += (rnd() - 0.55) * volatility * 4;
    out[i] = Math.max(0, current * (1 + level + (rnd() - 0.5) * volatility * 0.8));
  }
  return out;
}

/**
 * Rate history (SIMULATED): live rate lines are mostly flat and move in steps when utilisation
 * changes (big deposits/borrows), with the odd short spike. Ends exactly at `current`.
 */
export function simulatedSteps(seed: string, current: number, points: number, volatility: number) {
  let x = hash(seed) || 1;
  const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const out = new Array<number>(points);
  let level = current;
  let spike = 0;
  for (let i = points - 1; i >= 0; i--) {
    if (i < points - 1 && rnd() < 0.06) level = Math.max(0, level * (1 + (rnd() - 0.5) * volatility * 6));
    if (spike > 0) spike--;
    else if (rnd() < 0.015) spike = 2 + Math.floor(rnd() * 3);
    out[i] = i === points - 1 ? current : Math.max(0, level * (1 + (spike > 0 ? volatility * 4 : 0) + (rnd() - 0.5) * volatility * 0.08));
  }
  return out;
}

// d3-style tick maths (same algorithm as d3-array tickIncrement / d3-scale nice).
function tickStep(start: number, stop: number, count: number) {
  const step = (stop - start) / Math.max(1, count);
  const power = Math.floor(Math.log10(step));
  const error = step / 10 ** power;
  const f = error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;
  return f * 10 ** power;
}
const clean = (v: number) => +v.toPrecision(12);
function niceDomain(min: number, max: number): [number, number] {
  let lo = min;
  let hi = max;
  if (!(hi > lo)) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  let prev = 0;
  for (let i = 0; i < 10; i++) {
    const step = tickStep(lo, hi, 10);
    if (step === prev) break;
    lo = clean(Math.floor(lo / step) * step);
    hi = clean(Math.ceil(hi / step) * step);
    prev = step;
  }
  return [lo, hi];
}
function axisTicks(lo: number, hi: number) {
  const step = tickStep(lo, hi, 3);
  const out: number[] = [];
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9; k++) out.push(clean(k * step));
  return { step, ticks: out.filter((t) => t > lo + step * 1e-6) };
}

const stripZeros = (s: string) => (s.includes('.') ? s.replace(/\.?0+$/, '') : s);
// Live axis labels: "$300M" (usd), "2.5%" (pct), "4,500" (token amounts).
function fmtAxis(v: number, kind: Series['kind'], step: number) {
  if (kind === 'pct') return `${stripZeros((v * 100).toFixed(Math.max(0, Math.min(2, Math.ceil(-Math.log10(step * 100) - 1e-9)))))}%`;
  if (kind === 'usd') {
    const [u, s] = ([[1e9, 'B'], [1e6, 'M'], [1e3, 'K']] as const).find(([unit]) => Math.abs(v) >= unit) ?? [1, ''];
    return `$${stripZeros((v / u).toFixed(Math.max(0, Math.min(2, Math.ceil(-Math.log10(step / u) - 1e-9)))))}${s}`;
  }
  return v.toLocaleString('en-US', { maximumFractionDigits: Math.max(0, Math.min(2, Math.ceil(-Math.log10(step) - 1e-9))) });
}
const fmtValue = (v: number, kind: Series['kind']) => (kind === 'pct' ? `${(v * 100).toFixed(2)}%` : kind === 'usd' ? formatLowerCompact(v, { usd: true }) : formatLowerCompact(v));

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const tickIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const tickOut = keyframes`from { opacity: 1; } to { opacity: 0; }`;
/** Live (per-frame samples of a legend toggle): ~300ms on the standard curve; old ticks fade out where they were. */
const DUR = '0.3s';
type TickPos = { t: number; y: number; label: string };

export function ChartCard({
  seed,
  series,
  height = 282,
  defaultRange = '1W',
  legend = true,
  minHeight,
  history,
  ranges = RANGES,
  note = 'Simulated history',
  drawIn = false,
  ariaLabel,
}: {
  seed: string;
  series: Series[];
  height?: number;
  defaultRange?: Range;
  /** Live: some charts (available liquidity) have no legend row. */
  legend?: boolean;
  /** Live hub card is 359px: the extra space is spread between the parts (space-between). */
  minHeight?: number;
  /** Real data per range instead of the simulated series (null while loading: a shimmer shows). */
  history?: (range: Range) => ChartData | null;
  /** The range buttons to offer (default: all six). */
  ranges?: Range[];
  /** Tooltip footer; null hides it. */
  note?: string | null;
  /** Lines draw themselves in on mount and on a range change (respects reduced motion). */
  drawIn?: boolean;
  ariaLabel?: string;
}) {
  const [range, setRange] = React.useState<Range>(ranges.includes(defaultRange) ? defaultRange : ranges[0]);
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [hover, setHover] = React.useState<number | null>(null);
  const [width, setWidth] = React.useState(0);
  const maskId = `chart-fade-${React.useId().replace(/:/g, '')}`;
  const ro = React.useRef<ResizeObserver | null>(null);
  const measure = React.useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    ro.current = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.current.observe(el);
  }, []);
  const real = history ? history(range) : undefined;
  const simulated = React.useMemo(() => (history ? null : series.map((s) => (s.kind === 'pct' ? simulatedSteps : simulatedHistory)(`${seed}:${s.key}:${range}`, s.current, POINTS, s.volatility ?? (s.kind === 'pct' ? 0.06 : 0.012)))), [history, series, seed, range]);
  const data = real ? real.values : (simulated ?? series.map(() => new Array<number>(POINTS).fill(NaN)));
  const loadingReal = Boolean(history) && !real;
  const shown = series.map((s, i) => ({ s, d: data[i], on: !hidden.includes(s.key) }));
  const visible = shown.filter((v) => v.on);
  // The axis follows the first visible series' kind; other kinds are drawn on their own scale.
  const axisKind = visible[0]?.s.kind ?? series[0]?.kind ?? 'usd';
  const finite = (d: number[]) => d.filter(Number.isFinite);
  const onAxis = finite((visible.length ? visible : shown).filter(({ s }) => s.kind === axisKind).flatMap(({ d }) => d));
  // A series that is flat at 0 (e.g. no borrows yet → 0% APY) sits on the floor of a small axis
  // instead of the middle of a padded −x…+x one.
  const flatZero = onAxis.length > 0 && onAxis.every((v) => v === 0);
  const [lo, hi] = flatZero ? [0, axisKind === 'pct' ? 0.01 : 1] : onAxis.length ? niceDomain(Math.min(...onAxis), Math.max(...onAxis)) : [0, 1];
  const { step, ticks } = axisTicks(lo, hi);
  const domainOf = (s: Series, d: number[]): [number, number] => {
    if (s.kind === axisKind) return [lo, hi];
    const f = finite(d);
    return f.length ? niceDomain(Math.min(...f), Math.max(...f)) : [0, 1];
  };
  const y = (v: number, [a, b]: [number, number]) => height - 12 - ((v - a) / (b - a || 1)) * (height - 24);
  const x = (i: number) => (i / (POINTS - 1)) * width;
  const rangeMs = RANGE_DAYS[range] * 86_400_000;
  const timeAt = (i: number) => (real ? new Date(real.start + (i / (POINTS - 1)) * (real.end - real.start)) : new Date(Math.round((LOADED_AT - (1 - i / (POINTS - 1)) * rangeMs) / 1_800_000) * 1_800_000));
  const start = new Date(real ? real.start : LOADED_AT - rangeMs);
  const startLabel = range === '1D' ? start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const hoverPts = hover === null ? [] : visible.map(({ s, d }) => ({ s, v: d[hover], cy: Number.isFinite(d[hover]) ? y(d[hover], domainOf(s, d)) : NaN }));
  const dotPts = hoverPts.filter((p) => Number.isFinite(p.cy));
  // Axis ticks with enter/leave: on a rescale (legend toggle) new ticks fade in at their final place,
  // kept ticks slide and dropped ticks fade out in place (live). A range change swaps instantly (live:
  // the new series simply replaces the old one once loaded), so nothing animates then.
  const curTicks: TickPos[] = width && !loadingReal ? ticks.map((t) => ({ t, y: y(t, [lo, hi]), label: fmtAxis(t, axisKind, step) })) : [];
  const sig = `${range}|${lo}|${hi}|${width}|${curTicks.map((c) => c.t).join(',')}`;
  const [prevAxis, setPrevAxis] = React.useState({ sig, ticks: curTicks, range });
  const [leaving, setLeaving] = React.useState<TickPos[]>([]);
  const [instant, setInstant] = React.useState(true);
  if (prevAxis.sig !== sig) {
    const sameRange = prevAxis.range === range && prevAxis.ticks.length > 0;
    setLeaving(sameRange ? prevAxis.ticks.filter((p) => !curTicks.some((c) => c.t === p.t)) : []);
    setInstant(!sameRange);
    setPrevAxis({ sig, ticks: curTicks, range });
  }
  const tipTop = hoverPts.length ? Math.max(4, (dotPts.length ? Math.min(...dotPts.map((p) => p.cy)) : height / 2) - 32 - (31 + hoverPts.length * 24 + 6)) : 0;

  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: { md: minHeight }, borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: '8px 5.6px 0' }}>
        {ranges.map((r) => (
          <Box
            key={r}
            component="button"
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={r === range}
            sx={{ display: 'flex', p: '4px 8px', border: 0, background: 'none', borderRadius: '999px', fontFamily: 'inherit', fontSize: 12, lineHeight: '16.2px', fontWeight: 400, color: r === range ? 'fg-1' : 'fg-4', cursor: 'pointer', transition: `color 0.2s ${EASE}, background-color 0.2s ${EASE}`, '&:hover': { color: r === range ? 'fg-1' : 'fg-2' } }}
          >
            {r}
          </Box>
        ))}
      </Box>
      <Box
        ref={measure}
        sx={{ position: 'relative', height, '--axis-x-labels-opacity': hover === null ? 0 : 1, '@media (hover: none)': { '--axis-x-labels-opacity': 1 } } as never}
        onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
          if (!width) return;
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.max(0, Math.min(POINTS - 1, Math.round(((e.clientX - r.left) / width) * (POINTS - 1)))));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {loadingReal && (
          <Box aria-hidden sx={{ position: 'absolute', inset: '12px', borderRadius: '8px', background: `linear-gradient(90deg, transparent, ${tv('bg-3')}, transparent)`, backgroundSize: '200% 100%', animation: 'clone-shimmer 1.4s ease-in-out infinite', '@keyframes clone-shimmer': { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.5 } }} />
        )}
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={ariaLabel ?? (history ? 'History chart' : 'Simulated history chart')} style={{ display: 'block', position: 'absolute', inset: 0 }}>
            <defs>
              <linearGradient id={`${maskId}-g`} gradientUnits="userSpaceOnUse" x1="0" x2="96" y1="0" y2="0">
                <stop offset="0" stopColor="white" stopOpacity="0" />
                <stop offset="0.62" stopColor="white" stopOpacity="0.3" />
                <stop offset="1" stopColor="white" stopOpacity="1" />
              </linearGradient>
              <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
                <rect x="0" y="0" width={width} height={height} fill={`url(#${maskId}-g)`} />
              </mask>
            </defs>
            <g pointerEvents="none">
              {leaving.map((p) => (
                <Box component="g" key={`out:${p.t}`} sx={{ animation: `${tickOut} 0.15s ease-out forwards` }} style={{ transform: `translateY(${p.y}px)` }} onAnimationEnd={() => setLeaving((l) => l.filter((x) => x.t !== p.t))}>
                  <line x1={0} x2={width} y1={0} y2={0} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="1.5 4" />
                  <text x={12} y={0} dominantBaseline="middle" fontSize={12} fill={tv('fg-4')}>
                    {p.label}
                  </text>
                </Box>
              ))}
              {curTicks.map((p) => (
                <Box component="g" key={`${range}:${p.t}`} sx={{ animation: instant ? 'none' : `${tickIn} ${DUR} ${EASE}` }} style={{ transform: `translateY(${p.y}px)`, transition: `transform ${DUR} ${EASE}` }}>
                  <line x1={0} x2={width} y1={0} y2={0} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="1.5 4" />
                  <text x={12} y={0} dominantBaseline="middle" fontSize={12} fill={tv('fg-4')}>
                    {p.label}
                  </text>
                </Box>
              ))}
            </g>
            <g mask={`url(#${maskId})`}>
              {shown.map(({ s, d, on }) => {
                const dom = domainOf(s, d);
                // NaN samples are gaps (e.g. "no debt" in a health-factor series): the line restarts after them.
                const path = d.map((v, i) => (Number.isFinite(v) ? `${i && Number.isFinite(d[i - 1]) ? 'L' : 'M'}${x(i).toFixed(2)},${y(v, dom).toFixed(2)}` : '')).join('');
                if (!path) return null;
                return (
                  <path
                    key={`${range}:${s.key}`}
                    d={path}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    {...(drawIn ? { pathLength: 1, strokeDasharray: 1 } : {})}
                    style={{ d: `path("${path}")`, opacity: on ? 1 : 0, transition: `d ${DUR} ${EASE}, opacity ${DUR} ${EASE}`, animation: drawIn ? `clone-draw 900ms ${EASE} both` : undefined } as React.CSSProperties}
                  />
                );
              })}
            </g>
            <g pointerEvents="none" style={{ opacity: 'var(--axis-x-labels-opacity)', transition: `opacity 0.2s ${EASE}` } as React.CSSProperties}>
              <text x={12} y={height - 12} fontSize={12} fill={tv('fg-4')}>
                {startLabel}
              </text>
              <text x={width - 12} y={height - 12} fontSize={12} fill={tv('fg-4')} textAnchor="end">
                Now
              </text>
            </g>
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={0} y2={height} stroke={tv('fg-2')} strokeWidth={1.25} shapeRendering="crispEdges" />
                {dotPts.map((p) => (
                  <circle key={p.s.key} cx={x(hover)} cy={p.cy} r={4} fill={p.s.color} stroke={tv('bg-3')} strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>
        )}
        {hover !== null && width > 0 && hoverPts.length > 0 && (
          <Box
            role="tooltip"
            sx={{ position: 'absolute', zIndex: 3, top: tipTop, left: Math.min(Math.max(x(hover) - 100, 0), width - 200), width: 200, p: '6px 8px 4px', borderRadius: '8px', bgcolor: 'bg-3', boxShadow: `0 8px 24px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)`, fontSize: 12, lineHeight: '16.2px', pointerEvents: 'none', transition: 'left 80ms ease-out, top 80ms ease-out' }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'fg-1' }}>
              <span>{timeAt(hover).toLocaleDateString('en-US')}</span>
              <Box component="span" sx={{ color: 'fg-2' }}>{timeAt(hover).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Box>
            </Box>
            <Box sx={{ height: '1px', bgcolor: 'border-0', mx: '-8px', mt: '7px', mb: '4px' }} />
            {hoverPts.map((p) => (
              <Box key={p.s.key} sx={{ display: 'flex', justifyContent: 'space-between', gap: '12px', p: '4px 0' }}>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: p.s.color }}>
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.s.color }} />
                  {p.s.label}
                </Box>
                <Box component="span" sx={{ color: 'fg-1' }}>{p.s.format ? p.s.format(p.v) : Number.isFinite(p.v) ? fmtValue(p.v, p.s.kind) : '–'}</Box>
              </Box>
            ))}
            {note && <Box sx={{ pb: '2px', color: 'fg-4', fontSize: 11 }}>{note}</Box>}
          </Box>
        )}
      </Box>
      {legend && (
        <Box sx={{ position: 'relative', '&::after': { content: '""', position: 'absolute', top: '-1px', left: 0, right: 0, height: '1px', bgcolor: 'border-0' } }}>
          <Box sx={{ display: 'flex', gap: '4px', p: '0 5.6px', height: 38, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {series.map((s) => {
              const off = hidden.includes(s.key);
              return (
                <Box
                  key={s.key}
                  component="button"
                  type="button"
                  aria-pressed={!off}
                  onClick={() => setHidden((h) => (off ? h.filter((k) => k !== s.key) : [...h, s.key]))}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    p: '6px',
                    border: 0,
                    background: 'none',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    lineHeight: '14px',
                    whiteSpace: 'nowrap',
                    color: off ? 'fg-2' : s.color,
                    opacity: off ? 0.4 : 1,
                    cursor: 'pointer',
                    transition: `opacity 0.2s ${EASE}, color 0.2s ${EASE}`,
                    '&:hover': { opacity: off ? 0.4 : 0.8 },
                    '&::before': { content: '""', width: 8, height: 8, flexShrink: 0, borderRadius: '50%', bgcolor: off ? 'transparent' : s.color, boxShadow: off ? `inset 0 0 0 1.5px ${tv('fg-3')}` : 'none', transition: `background-color 0.2s ${EASE}, box-shadow 0.2s ${EASE}` },
                  }}
                >
                  {s.label}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// --------------------------------------------------------------------------------------------
// Activity list (SIMULATED recent activity)
// --------------------------------------------------------------------------------------------

export interface ActivityItem {
  id: string;
  date: string;
  action: 'Deposited' | 'Withdrawn' | 'Borrowed' | 'Repaid';
  symbol: string;
  where: string;
  chain?: ChainInfo;
  amount: number;
  href?: string;
}

const ACTIONS: ActivityItem['action'][] = ['Withdrawn', 'Deposited', 'Borrowed', 'Repaid', 'Repaid', 'Deposited', 'Withdrawn', 'Repaid', 'Repaid', 'Borrowed'];

export function simulatedActivity(seed: string, assets: { symbol: string; priceUSD: number }[], where: string, chain?: ChainInfo, count = 30): ActivityItem[] {
  if (!assets.length) return [];
  let x = hash(seed) || 1;
  const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const out: ActivityItem[] = [];
  const now = LOADED_AT;
  for (let i = 0; i < count; i++) {
    const a = assets[Math.floor(rnd() * assets.length)];
    const usd = 10 ** (1 + rnd() * 5);
    const amount = usd / (a.priceUSD || 1);
    const day = new Date(now - Math.floor(i / 10) * 86_400_000);
    out.push({ id: `${seed}-${i}`, date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), action: ACTIONS[i % ACTIONS.length], symbol: a.symbol, where, chain, amount });
  }
  return out;
}

const fmtActivity = (n: number) => (n >= 1e6 ? formatLowerCompact(n) : n < 1 ? n.toFixed(7) : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export function ActivityList({ items, pageSize = 10 }: { items: ActivityItem[]; pageSize?: number }) {
  const [shown, setShown] = React.useState(pageSize);
  const list = items.slice(0, shown);
  return (
    <Box sx={{ borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}` }}>
      {/* Live mobile: no date column, the action wraps under itself, every row ruled. */}
      <Box sx={{ p: { xs: '8px 16px', md: '8px 20px' } }}>
        {list.map((t, i) => {
          const firstOfDay = i === 0 || list[i - 1].date !== t.date;
          return (
            <Box
              key={t.id}
              component={t.href ? Link : 'div'}
              href={t.href}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                minHeight: { xs: 62, md: 48 },
                py: '12px',
                color: 'fg-1',
                textDecoration: 'none',
                '&::before': i === 0 ? undefined : { content: '""', position: 'absolute', top: 0, left: { xs: 0, md: 120 }, right: 0, height: '1px', bgcolor: 'border-0', display: { xs: 'block', md: firstOfDay ? 'none' : 'block' } },
                '& .hover-bg': { opacity: 0 },
                '&:hover .hover-bg': { opacity: 1 },
              }}
            >
              <Box className="hover-bg" sx={{ position: 'absolute', inset: '1px -3px 1px 17px', borderRadius: '10px', bgcolor: 'bg-4', transition: 'opacity 100ms ease', zIndex: 0 }} />
              <Box sx={{ width: 120, flex: 'none', fontSize: 14, fontWeight: 500, lineHeight: '17px', color: 'fg-3', zIndex: 1, display: { xs: 'none', md: 'block' } }}>{firstOfDay ? t.date : ''}</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: '22px', md: '8px' }, flex: 1, minWidth: 0, overflow: { xs: 'hidden', md: 'visible' }, zIndex: 1 }}>
                <TokenIcon symbol={t.symbol} size={24} />
                <Box component="span" sx={{ fontSize: 14, fontWeight: 500, lineHeight: '17px', whiteSpace: { xs: 'normal', md: 'nowrap' }, width: { xs: 72, md: 'auto' }, flexShrink: 0 }}>
                  {t.action} {t.symbol}
                </Box>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 14, lineHeight: '17px', color: 'fg-2', whiteSpace: 'nowrap' }}>
                  {t.where} <ChainIcon chain={t.chain} size={16} /> {t.chain?.name}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 14, lineHeight: '17px', zIndex: 1, whiteSpace: 'nowrap' }}>
                <TokenIcon symbol={t.symbol} size={16} />
                <Box component="span" sx={{ fontWeight: 500 }}>{fmtActivity(t.amount)}</Box>
                <Box component="span" sx={{ color: 'fg-3' }}>{t.symbol}</Box>
              </Box>
            </Box>
          );
        })}
      </Box>
      {shown < items.length && (
        <Box
          component="button"
          type="button"
          onClick={() => setShown((n) => n + pageSize)}
          sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '12px 16px', border: 0, borderTop: `1px solid ${tv('border-0')}`, background: 'none', color: 'fg-2', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', borderRadius: '0 0 10px 10px', transition: 'color 100ms ease', '&:hover': { color: 'fg-1' } }}
        >
          See more
          <Box component="span" aria-hidden sx={{ fontSize: 18, lineHeight: 1 }}>+</Box>
        </Box>
      )}
    </Box>
  );
}
