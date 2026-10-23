'use client';

/**
 * Multi-series history chart for the Pro token page (and insights), rebuilt from the live chart
 * (pro.aave.com/explore/token/USDC, measured 2026-10-14 with tools/a3-chart.mjs, a3-motion2.mjs,
 * a3-tip.mjs, a3-ranges.mjs). Live uses visx; so does this (no other chart library).
 *
 * Why a page-specific chart instead of Builder A's ChartCard (logged in PRO_DISCREPANCY_LOG_A3):
 * the live token chart has one series per market (up to 15), at most 7 shown by default, a
 * horizontally scrolling legend with chain icons, an optional title ("Base APY"), x labels that only
 * appear while hovering, and a loading placeholder that replaces the whole card body.
 *
 * Measured spec (dark):
 * - card bg-2, 10px radius, `0 2px 4px #00000026` + 1px border-1 ring; 32px range row
 *   (pad 8px 5.6px 0; with a title: 8px 12px 0, title 12/16.2 fg-2), 282px plot, 38px legend
 * - range tabs 12px/400, pad 4px 8px, fg-4 → selected fg-1; color transition 200ms settle
 * - lines: straight segments (no curve), 1.25px, round caps, miter joins, data-* palette cycling
 *   purple, pink, blue, green, teal, yellow, orange, red; first 7 series selected by default
 * - the line group is masked by a 96px left fade (stops 0 → 0, 62% → 0.3, 100% → 1)
 * - y domain = raw data extent mapped to [270, 12] (12px padding top/bottom); ticks are d3 ticks
 *   with count 3, minus any tick on the bottom edge; dashed gridlines (1.5/4, round caps,
 *   border-2) with 12px fg-4 labels at x=12 vertically centred on the line
 * - motion: on load and on every range change the card body is replaced by a faint wave
 *   (fg-1 at 6%, 1px) while data loads; the chart then mounts with lines drawn at once and the
 *   gridlines + labels fade in over 300ms cubic-bezier(.4,0,.2,1) ("settle"); toggling a series
 *   re-fits the axis and gridlines glide to their new positions over the same 300ms
 * - hover: crosshair at the pointer (fg-2, 1.25px, round caps, full height), one 5px dot per shown
 *   series (series colour, 2px bg-3 stroke) at the nearest sample, x labels ("7 Oct" … "Now") fade
 *   in over 200ms; a fixed tooltip whose bottom edge sits 10px below the plot top, centred on the
 *   pointer and clamped to the card (header date + time, divider, one row per shown series)
 * - legend: 14px, pad 6px, gap 6px, radius 6px, an 8px dot; hidden series: opacity .4, fg-2 text,
 *   hollow dot (1.5px fg-3 ring); hover opacity .8; edge fade mask; 1px border-0 rule on top
 * The real wave artwork is not copied: ours is our own smooth curve of similar proportions.
 */
import Box from '@mui/material/Box';
import GlobalStyles from '@mui/material/GlobalStyles';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import * as React from 'react';
import { createPortal } from 'react-dom';
import type { ChainInfo } from '@/data/types';
import { tv } from '@/shared/theme/tokens';
import { HISTORY_RANGES, rangeTimestamps, type HistoryRange } from '@/data/mock/seed/proB_history';
import { formatChartTime, usePrefs } from '../preferences/prefs';

export const SETTLE = 'cubic-bezier(0.4, 0, 0.2, 1)';
export const DATA_PALETTE = ['data-purple', 'data-pink', 'data-blue', 'data-green', 'data-teal', 'data-yellow', 'data-orange', 'data-red'] as const;
export const paletteColor = (i: number) => tv(DATA_PALETTE[i % DATA_PALETTE.length]);

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  chain?: ChainInfo;
  /** Values aligned with rangeTimestamps(range). */
  values: (range: HistoryRange) => number[];
}


/** Global keyframes used by B's charts (prefixed so they never clash with Builder A's). */
export const A3_KEYFRAMES = (
  <GlobalStyles styles={{ '@keyframes a3-settle-in': { from: { opacity: 0 }, to: { opacity: 1 } }, '@keyframes a3-settle-out': { from: { opacity: 1 }, to: { opacity: 0 } }, '@keyframes a3-pop-in': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } } }} />
);
/** Live plot geometry: token chart 282px tall, data mapped to [270, 12], labels at x=12; insights 220px, [200, 22], x=20. */
export interface PlotGeom { height: number; top: number; bottom: number; labelX: number }
export const TOKEN_GEOM: PlotGeom = { height: 282, top: 12, bottom: 270, labelX: 12 };
const FADE_W = 96;

/** d3-style "nice" tick step (same thresholds as d3-array's tickIncrement). */
function tickStep(start: number, stop: number, count: number) {
  const step0 = Math.abs(stop - start) / Math.max(1, count);
  if (!(step0 > 0)) return 0;
  const power = Math.floor(Math.log10(step0));
  const error = step0 / 10 ** power;
  const factor = error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;
  return factor * 10 ** power;
}

export function niceTicks(lo: number, hi: number, count = 3) {
  const step = tickStep(lo, hi, count);
  if (!step) return [];
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) out.push(Number(t.toPrecision(12)));
  return out;
}

const trimPct = (pct: number, digits: number) => `${Number(pct.toFixed(digits))}%`;
/** Live tooltip values: "5.59%", "4.6%", "0.3637%" (four decimals below 1%). */
export const formatRateTooltip = (v: number) => trimPct(v * 100, v * 100 < 1 ? 4 : 2);
/** Live axis labels: "5%", "10%", "0.5%". */
export const formatRateTick = (v: number) => trimPct(v * 100, 2);

const startLabel = (range: HistoryRange, t: number) => (range === '1D' ? 'Yesterday' : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));

/** Our own loading wave (not the live artwork): one smooth curve across the card. */
export function LoadingWave() {
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="100%" viewBox="0 0 610 78" preserveAspectRatio="none" style={{ display: 'block', height: 'auto' }}>
        <path
          d="M0 52 C 60 52, 92 70, 150 70 C 212 70, 236 40, 300 30 C 360 20, 392 58, 450 60 C 506 62, 540 8, 610 6"
          fill="none"
          stroke={tv('fg-1')}
          strokeOpacity={0.06}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Box>
  );
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

function ChainGlyph({ chain, size = 16 }: { chain?: ChainInfo; size?: number }) {
  if (!chain) return null;
  // Same open-licensed network logos as the shared ChainIcon (docs/ICONS.md), without its tooltip.
  return <Box component="img" src={`/chain-icons/${chain.slug}.svg`} alt="" sx={{ width: size, height: size, borderRadius: '50%', display: 'block', flexShrink: 0 }} />;
}

export interface PlotProps {
  geom?: PlotGeom;
  series: ChartSeries[];
  selected: Set<string>;
  range: HistoryRange;
  width: number;
  valueFormat: (v: number) => string;
  tickFormat: (v: number) => string;
}

export function Plot({ geom = TOKEN_GEOM, series, selected, range, width, valueFormat, tickFormat }: PlotProps) {
  const PLOT_H = geom.height;
  const maskId = React.useId().replace(/:/g, '');
  const ts = React.useMemo(() => rangeTimestamps(range), [range]);
  const data = React.useMemo(() => series.map((s) => s.values(range)), [series, range]);
  const shown = series.map((s, i) => ({ s, d: data[i], i })).filter(({ s }) => selected.has(s.key));
  const all = shown.flatMap(({ d }) => d);
  const lo = all.length ? Math.min(...all) : 0;
  const hi = all.length ? Math.max(...all) : 1;
  const y = scaleLinear<number>({ domain: [lo, hi === lo ? lo + (lo || 1) * 0.1 : hi], range: [geom.bottom, geom.top] });
  const n = ts.length;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * width : 0);
  const ticks = niceTicks(lo, hi === lo ? lo + (lo || 1) * 0.1 : hi, 3).filter((t) => y(t) < geom.bottom - 20);
  // Live: when the axis changes, ticks that disappear fade out (300ms settle) while new ones fade in.
  const tickKey = ticks.join(',');
  const placed = ticks.map((t) => ({ t, y: y(t) }));
  const [tickState, setTickState] = React.useState({ key: tickKey, cur: placed, leaving: [] as { t: number; y: number }[] });
  if (tickState.key !== tickKey) setTickState({ key: tickKey, cur: placed, leaving: tickState.cur.filter((o) => !ticks.includes(o.t)) });
  const [hover, setHover] = React.useState<{ mx: number; i: number } | null>(null);
  const [hostEl, setHostEl] = React.useState<HTMLDivElement | null>(null);
  const prefs = usePrefs();

  const onMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = Math.max(0, Math.min(width, e.clientX - r.left));
    // Nearest sample; ties go to the earlier one (as a bisector does on live).
    setHover({ mx, i: Math.max(0, Math.ceil((mx / Math.max(1, width)) * (n - 1) - 0.5)) });
  };

  return (
    <Box
      ref={setHostEl}
      data-a3-host
      className="chart host"
      sx={{ position: 'relative', height: PLOT_H, '--xl': hover ? 1 : 0, '@media (hover: none)': { '--xl': 1 }, touchAction: 'pan-y' }}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg width={width} height={PLOT_H} viewBox={`0 0 ${width} ${PLOT_H}`} style={{ display: 'block', overflow: 'hidden' }} role="img" aria-label="Simulated rate history chart">
        <defs>
          <linearGradient id={`${maskId}-g`} gradientUnits="userSpaceOnUse" x1={0} x2={FADE_W} y1={0} y2={0}>
            <stop offset="0" stopColor="white" stopOpacity={0} />
            <stop offset="0.62" stopColor="white" stopOpacity={0.3} />
            <stop offset="1" stopColor="white" stopOpacity={1} />
          </linearGradient>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={PLOT_H}>
            <rect x={0} y={0} width={FADE_W} height={PLOT_H} fill={`url(#${maskId}-g)`} />
            <rect x={FADE_W} y={0} width={Math.max(0, width - FADE_W)} height={PLOT_H} fill="white" />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          {series.map((s, i) => (
            <LinePath
              key={s.key}
              data={data[i]}
              x={(_, j) => x(j)}
              y={(v) => y(v)}
              stroke={s.color}
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="miter"
              fill="none"
              data-a3-line
              opacity={selected.has(s.key) ? 1 : 0}
            />
          ))}
        </g>
        {hover && <line className="visx-line" data-a3-cross x1={hover.mx} x2={hover.mx} y1={0} y2={PLOT_H} stroke={tv('fg-2')} strokeWidth={1.25} strokeLinecap="round" shapeRendering="crispEdges" pointerEvents="none" />}
        {hover &&
          shown.map(({ s, d }) => (
            <circle className="visx-circle" key={s.key} cx={x(hover.i)} cy={y(d[hover.i])} r={5} fill={s.color} stroke={tv('bg-3')} strokeWidth={2} pointerEvents="none" />
          ))}
      </svg>
      {/* Overlay: gridlines and labels (fade in on mount, glide when the axis re-fits). */}
      <svg width={width} height={PLOT_H} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden>
        {tickState.leaving.map(({ t, y: ty }) => (
          <g key={`out-${t}`} style={{ transform: `translateY(${ty}px)`, animation: `a3-settle-out 300ms ${SETTLE} both` }}>
            <line x1={0} x2={width} y1={0} y2={0} stroke={tv('border-2')} strokeDasharray="1.5 4" strokeLinecap="round" />
            <text x={geom.labelX} y={0} dominantBaseline="middle" fontSize={12} fill={tv('fg-4')} style={{ fontFamily: 'inherit' }}>
              {tickFormat(t)}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <g key={t} style={{ transform: `translateY(${y(t)}px)`, transition: `transform 300ms ${SETTLE}`, animation: `a3-settle-in 300ms ${SETTLE} both` }}>
            <line className="gridline" x1={0} x2={width} y1={0} y2={0} stroke={tv('border-2')} strokeDasharray="1.5 4" strokeLinecap="round" />
            <text x={geom.labelX} y={0} dominantBaseline="middle" fontSize={12} fill={tv('fg-4')} style={{ fontFamily: 'inherit' }}>
              {tickFormat(t)}
            </text>
          </g>
        ))}
        <g data-a3-xlabels className="xLabels" style={{ opacity: 'var(--xl)' as unknown as number, transition: `opacity 200ms ${SETTLE}` }}>
          <text x={geom.labelX} y={geom.bottom} fontSize={12} fill={tv('fg-4')}>
            {startLabel(range, ts[0])}
          </text>
          <text x={width - geom.labelX} y={geom.bottom} fontSize={12} fill={tv('fg-4')} textAnchor="end">
            Now
          </text>
        </g>
      </svg>
      {hover && hostEl && <Tooltip host={hostEl} mx={hover.mx} ts={ts[hover.i]} rows={shown.map(({ s, d }) => ({ s, v: d[hover.i] }))} valueFormat={valueFormat} hour12={prefs.timeFormat === '12h'} />}
    </Box>
  );
}

function Tooltip({ host, mx, ts, rows, valueFormat, hour12 }: { host: HTMLElement; mx: number; ts: number; rows: { s: ChartSeries; v: number }[]; valueFormat: (v: number) => string; hour12: boolean }) {
  const [w, setW] = React.useState(215);
  const ref = React.useCallback((el: HTMLDivElement | null) => {
    if (el && el.offsetWidth !== w) setW(el.offsetWidth);
  }, [w]);
  const r = host.getBoundingClientRect();
  const left = r.left + mx;
  // Centre on the pointer, clamped to the card (live clamps ~8px past the plot edges).
  const tx = Math.min(Math.max(-w / 2, r.left - 8 - left), r.right + 8 - left - w);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <Box
      ref={ref}
      data-a3-tooltip
      className="visx-tooltip"
      sx={{ position: 'fixed', left, bottom: window.innerHeight - r.top - 10, transform: `translateX(${tx}px)`, zIndex: 1000, pointerEvents: 'none', minWidth: 200, p: '6.08px 8px 4px', borderRadius: '8px', bgcolor: 'bg-3', boxShadow: `0 8px 24px rgba(0, 0, 0, 0.25), 0 0 0 1px ${tv('shadow-stroke-2')}`, fontSize: 14, lineHeight: '14px', color: 'fg-1', whiteSpace: 'nowrap' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: 12, lineHeight: '16.2px' }}>
        <span>{new Date(ts).toLocaleDateString('en-US')}</span>
        <Box component="span" sx={{ color: 'fg-2' }}>{formatChartTime(ts, hour12)}</Box>
      </Box>
      <Box sx={{ height: '1px', bgcolor: 'border-0', mx: '-8px', mt: '7px', mb: '4px' }} />
      {rows.map(({ s, v }) => (
        <Box key={s.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', p: '4px 0', fontSize: 12, lineHeight: '16.2px' }}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: s.color }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
            <ChainGlyph chain={s.chain} />
            {s.label}
          </Box>
          <span>{valueFormat(v)}</span>
        </Box>
      ))}
    </Box>,
    document.body,
  );
}

export function MultiLineChart({
  series,
  title,
  defaultRange = '1W',
  maxDefault = 7,
  valueFormat = formatRateTooltip,
  tickFormat = formatRateTick,
  loadMs = 450,
}: {
  series: ChartSeries[];
  title?: string;
  defaultRange?: HistoryRange;
  maxDefault?: number;
  valueFormat?: (v: number) => string;
  tickFormat?: (v: number) => string;
  /** Simulated fetch time; the live chart shows its loading wave while history loads. */
  loadMs?: number;
}) {
  const [range, setRange] = React.useState<HistoryRange>(defaultRange);
  const [ref, width] = useWidth();
  const seriesKey = series.map((s) => s.key).join('|');
  // Selection resets to the first `maxDefault` series whenever the series set changes.
  const [sel, setSel] = React.useState<{ key: string; set: Set<string> } | null>(null);
  const selected = sel && sel.key === seriesKey ? sel.set : new Set(series.slice(0, maxDefault).map((s) => s.key));
  // Simulated fetch: the loading wave shows until this load key has "arrived".
  const loadKey = `${range}|${seriesKey}`;
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  const loading = loadedKey !== loadKey;
  React.useEffect(() => {
    const t = setTimeout(() => setLoadedKey(loadKey), loadMs);
    return () => clearTimeout(t);
  }, [loadKey, loadMs]);

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSel({ key: seriesKey, set: next });
  };

  return (
    <Box className="container" sx={{ position: 'relative', borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px ${tv('shadow-low')}, 0 0 0 1px ${tv('border-1')}`, minWidth: 0 }}>
      {A3_KEYFRAMES}
      <Box ref={ref} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 352, position: 'relative' }}>
        {loading || width === 0 ? (
          <Box sx={{ position: 'relative', height: 352 }}>
            <LoadingWave />
          </Box>
        ) : (
          <>
            <Box data-a3-range className="rangeSelectorRow" sx={{ display: 'flex', alignItems: 'center', justifyContent: title ? 'space-between' : 'flex-end', p: title ? '8px 12px 0' : '8px 5.6px 0', height: 32 }}>
              {title && <Box sx={{ fontSize: 12, lineHeight: '16.2px', color: 'fg-2' }}>{title}</Box>}
              <Box sx={{ display: 'flex' }}>
                {HISTORY_RANGES.map((r) => (
                  <Box
                    key={r}
                    component="button"
                    type="button"
                    className="rangeSelectorButton"
                    data-selected={r === range}
                    aria-pressed={r === range}
                    onClick={() => r !== range && setRange(r)}
                    sx={{ p: '4px 8px', border: 0, background: 'none', borderRadius: '999px', fontFamily: 'inherit', fontSize: 12, lineHeight: '16.2px', fontWeight: 400, color: r === range ? 'fg-1' : 'fg-4', cursor: 'pointer', transition: `color 200ms ${SETTLE}, background-color 200ms ${SETTLE}`, '&:hover': { color: r === range ? 'fg-1' : 'fg-2' }, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '-2px' } }}
                  >
                    {r}
                  </Box>
                ))}
              </Box>
            </Box>
            <Plot geom={TOKEN_GEOM} series={series} selected={selected} range={range} width={width} valueFormat={valueFormat} tickFormat={tickFormat} />
            <Box data-a3-legend className="dataSourceSelectorContainer" sx={{ position: 'relative', '&::after': { content: '""', position: 'absolute', left: 0, right: 0, top: '-1px', height: '1px', bgcolor: 'border-0' } }}>
              <Box
                className="dataSourceSelectorRow"
                sx={{
                  display: 'flex',
                  gap: '4px',
                  p: '0 5.6px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                  maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,.01) 1.6px, rgba(0,0,0,.106) 3.2px, rgba(0,0,0,.26) 4.8px, rgba(0,0,0,.45) 6.4px, rgba(0,0,0,.647) 8px, rgba(0,0,0,.824) 9.6px, rgba(0,0,0,.953) 12.8px, #000 16px, #000 calc(100% - 16px), rgba(0,0,0,.953) calc(100% - 12.8px), rgba(0,0,0,.824) calc(100% - 9.6px), rgba(0,0,0,.647) calc(100% - 8px), rgba(0,0,0,.45) calc(100% - 6.4px), rgba(0,0,0,.26) calc(100% - 4.8px), rgba(0,0,0,.106) calc(100% - 3.2px), rgba(0,0,0,.01) calc(100% - 1.6px), transparent 100%)',
                }}
              >
                {series.map((s) => {
                  const on = selected.has(s.key);
                  return (
                    <Box
                      key={s.key}
                      component="button"
                      type="button"
                      className="dataSourceSelectorButton"
                      data-selected={on}
                      aria-pressed={on}
                      onClick={() => toggle(s.key)}
                      sx={{
                        flexShrink: 0,
                        height: 38,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        p: '6px',
                        border: 0,
                        background: 'none',
                        borderRadius: '6px',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        lineHeight: '14px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        color: on ? s.color : 'fg-2',
                        opacity: on ? 1 : 0.4,
                        transition: `opacity 200ms ${SETTLE}, color 200ms ${SETTLE}`,
                        '&:hover': { opacity: 0.8 },
                        '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '-2px' },
                        '&::before': { content: '""', width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: on ? s.color : 'transparent', boxShadow: on ? 'none' : `inset 0 0 0 1.5px ${tv('fg-3')}`, transition: `background-color 200ms ${SETTLE}, box-shadow 200ms ${SETTLE}` },
                      }}
                    >
                      <ChainGlyph chain={s.chain} />
                      {s.label}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
