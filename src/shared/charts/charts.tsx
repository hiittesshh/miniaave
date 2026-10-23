'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { curveMonotoneX } from '@visx/curve';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import * as React from 'react';
import { rateCurve, type RateStrategy } from '@/lib/aave-math';
import { formatPercent, formatUSD } from '@/shared/format';
import { tv } from '@/shared/theme/tokens';

/**
 * Charts used by both clones, drawn with visx primitives (scales, line paths, responsive
 * container). Axes and grids are plain SVG so we don't pull in extra packages.
 */

const MARGIN = { top: 20, right: 10, bottom: 22, left: 40 };
const BORROW_COLOR = '#B6509E';
const UTIL_COLOR = '#0062D2';

/** A key that changes with the data set, so lines re-mount and replay their draw-in animation. */
function useDrawIn(deps: unknown[]) {
  return deps.map(String).join('|');
}

// ---------------------------------------------------------------------------------------------
// Interest rate model
// ---------------------------------------------------------------------------------------------

export function InterestRateModelChart({
  strategy,
  utilization,
  totalSuppliedUSD,
  totalBorrowedUSD,
  height = 155,
  color = BORROW_COLOR,
}: {
  strategy: RateStrategy;
  utilization: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  height?: number;
  color?: string;
}) {
  return (
    <Box sx={{ width: '100%', height, position: 'relative' }}>
      <ParentSize debounceTime={50}>
        {({ width }) => (width > 10 ? <IRM width={width} height={height} strategy={strategy} utilization={utilization} supplied={totalSuppliedUSD} borrowed={totalBorrowedUSD} color={color} /> : null)}
      </ParentSize>
    </Box>
  );
}

function IRM({ width, height, strategy, utilization, supplied, borrowed, color }: { width: number; height: number; strategy: RateStrategy; utilization: number; supplied: number; borrowed: number; color: string }) {
  const data = React.useMemo(() => rateCurve(strategy), [strategy]);
  const [hover, setHover] = React.useState<{ u: number; r: number } | null>(null);
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const maxRate = Math.max(...data.map((d) => d.borrowRate)) * 1.1 || 0.01;
  const x = scaleLinear({ domain: [0, 1], range: [0, innerW] });
  const y = scaleLinear({ domain: [0, maxRate], range: [innerH, 0] });
  const drawKey = useDrawIn([strategy]);

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const p = localPoint(e);
    if (!p) return;
    const u = Math.min(Math.max(x.invert(p.x - MARGIN.left), 0), 1);
    const idx = Math.round(u * 200);
    setHover({ u: data[idx].utilization, r: data[idx].borrowRate });
  };

  const amountTo = hover ? hover.u * supplied - borrowed : 0;

  return (
    <>
      <svg width={width} height={height} role="img" aria-label="Interest rate model: borrow APR against utilization">
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {[0, 0.5, 1].map((t) => (
            <line key={t} x1={0} x2={innerW} y1={innerH * t} y2={innerH * t} style={{ stroke: tv('border-1') }} strokeDasharray="3,3" />
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text key={t} x={x(t)} y={innerH + 16} textAnchor="middle" style={{ fill: tv('fg-3'), fontSize: 10 }}>
              {Math.round(t * 100)}%
            </text>
          ))}
          {[0, maxRate].map((t) => (
            <text key={t} x={-8} y={y(t) + 3} textAnchor="end" style={{ fill: tv('fg-3'), fontSize: 9 }}>
              {Math.round(t * 100)}%
            </text>
          ))}
          <LinePath
            key={drawKey}
            data={data}
            x={(d) => x(d.utilization)}
            y={(d) => y(d.borrowRate)}
            stroke={color}
            strokeWidth={2}
            curve={curveMonotoneX}
            pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: 0, animation: 'clone-draw 900ms cubic-bezier(0.19, 1, 0.22, 1) both' }}
          />
          {/* Optimal and current markers */}
          <line x1={x(strategy.optimalUsage)} x2={x(strategy.optimalUsage)} y1={8} y2={innerH} stroke={UTIL_COLOR} strokeWidth={1} strokeDasharray="5,2" />
          <text x={x(strategy.optimalUsage)} y={0} textAnchor="middle" style={{ fill: tv('fg-3'), fontSize: 10 }}>
            Optimal {Math.round(strategy.optimalUsage * 100)}%
          </text>
          <line x1={x(utilization)} x2={x(utilization)} y1={24} y2={innerH} stroke={UTIL_COLOR} strokeWidth={1} strokeDasharray="5,2" style={{ transition: 'all 600ms cubic-bezier(0.19,1,0.22,1)' }} />
          <text x={Math.min(Math.max(x(utilization), 30), innerW - 30)} y={18} textAnchor="middle" style={{ fill: tv('fg-3'), fontSize: 10 }}>
            Current {formatPercent(utilization)}
          </text>
          {hover && (
            <g pointerEvents="none">
              <line x1={x(hover.u)} x2={x(hover.u)} y1={0} y2={innerH} style={{ stroke: tv('fg-4') }} strokeDasharray="5,2" />
              <circle cx={x(hover.u) + 1} cy={y(hover.r) + 1} r={4} fill="black" fillOpacity={0.1} />
              <circle cx={x(hover.u)} cy={y(hover.r)} r={4} fill={color} stroke="white" strokeWidth={2} />
            </g>
          )}
          <rect width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </g>
      </svg>
      {hover && (
        <ChartTooltip left={Math.min(MARGIN.left + x(hover.u) + 16, width - 200)} top={10}>
          <TooltipRow label="Utilization Rate" value={formatPercent(hover.u)} />
          <TooltipRow
            label={amountTo >= 0 ? `Borrow amount to reach ${formatPercent(hover.u, 0)} utilization` : `Repayment amount to reach ${formatPercent(hover.u, 0)} utilization`}
            value={formatUSD(Math.abs(amountTo), { compact: true })}
          />
          <TooltipRow label="Borrow APR, variable" value={formatPercent(hover.r)} />
        </ChartTooltip>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Rate history (simulated)
// ---------------------------------------------------------------------------------------------

export type TimeRange = '1w' | '1m' | '6m' | '1y';

/** Deterministic pseudo-random walk that ends exactly at the current value. Illustrative only. */
export function simulatedHistory(seed: string, current: number, range: TimeRange, now = Date.now()) {
  const points = { '1w': 42, '1m': 60, '6m': 52, '1y': 72 }[range];
  const spanMs = { '1w': 7, '1m': 30, '6m': 182, '1y': 365 }[range] * 86_400_000;
  let h = 2166136261;
  for (const c of seed + range) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const vals: number[] = [];
  let v = current * (0.85 + rand() * 0.3);
  for (let i = 0; i < points; i++) {
    v = Math.max(v + (rand() - 0.5) * current * 0.12, current * 0.3);
    vals.push(v);
  }
  // Blend toward the current value at the end so the series meets the live figure.
  const out = vals.map((val, i) => {
    const t = i / (points - 1);
    const w = t * t;
    return { date: now - spanMs * (1 - t), value: val * (1 - w) + current * w };
  });
  return out;
}

export function RateHistoryChart({ seed, current, range, color, label, height = 155 }: { seed: string; current: number; range: TimeRange; color: string; label: string; height?: number }) {
  const data = React.useMemo(() => simulatedHistory(seed, current, range), [seed, current, range]);
  return (
    <Box sx={{ width: '100%', height, position: 'relative' }}>
      <ParentSize debounceTime={50}>{({ width }) => (width > 10 ? <History width={width} height={height} data={data} color={color} label={label} range={range} /> : null)}</ParentSize>
    </Box>
  );
}

function History({ width, height, data, color, label, range }: { width: number; height: number; data: { date: number; value: number }[]; color: string; label: string; range: TimeRange }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const max = Math.max(...data.map((d) => d.value)) * 1.15 || 0.01;
  const x = scaleLinear({ domain: [data[0].date, data[data.length - 1].date], range: [0, innerW] });
  const y = scaleLinear({ domain: [0, max], range: [innerH, 0] });
  const avg = data.reduce((s, d) => s + d.value, 0) / data.length;
  const drawKey = useDrawIn([range, data[data.length - 1].value]);
  const ticks = [0, 0.5, 1].map((t) => data[0].date + (data[data.length - 1].date - data[0].date) * t);
  const fmtDate = (d: number) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(range === '1y' ? { year: '2-digit' } : {}) });
  const gradId = React.useId().replace(/:/g, '');

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const p = localPoint(e);
    if (!p) return;
    const t = x.invert(p.x - MARGIN.left);
    let best = 0;
    data.forEach((d, i) => {
      if (Math.abs(d.date - t) < Math.abs(data[best].date - t)) best = i;
    });
    setHover(best);
  };
  const hp = hover !== null ? data[hover] : null;

  return (
    <>
      <svg width={width} height={height} role="img" aria-label={`${label} history (simulated)`}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {[0, 0.5, 1].map((t) => (
            <line key={t} x1={0} x2={innerW} y1={innerH * t} y2={innerH * t} style={{ stroke: tv('border-1') }} strokeDasharray="3,3" />
          ))}
          {[0, max / 2, max].map((t) => (
            <text key={t} x={-8} y={y(t) + 3} textAnchor="end" style={{ fill: tv('fg-3'), fontSize: 10 }}>
              {(t * 100).toFixed(t * 100 < 1 ? 2 : 1)}%
            </text>
          ))}
          {ticks.map((t, i) => (
            <text key={t} x={x(t)} y={innerH + 16} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} style={{ fill: tv('fg-3'), fontSize: 10 }}>
              {fmtDate(t)}
            </text>
          ))}
          <AreaClosed data={data} x={(d) => x(d.date)} y={(d) => y(d.value)} yScale={y} curve={curveMonotoneX} fill={`url(#${gradId})`} style={{ animation: 'clone-fade-in 700ms ease both' }} />
          <LinePath
            key={drawKey}
            data={data}
            x={(d) => x(d.date)}
            y={(d) => y(d.value)}
            stroke={color}
            strokeWidth={2}
            curve={curveMonotoneX}
            pathLength={1}
            style={{ strokeDasharray: 1, animation: 'clone-draw 900ms cubic-bezier(0.19, 1, 0.22, 1) both' }}
          />
          <line x1={0} x2={innerW} y1={y(avg)} y2={y(avg)} stroke="#D2D4DC" strokeWidth={2} strokeDasharray="3,5" />
          <g transform={`translate(${8},${Math.max(y(avg) - 18, 0)})`}>
            <rect width={74} height={16} rx={8} style={{ fill: tv('bg-5') }} />
            <text x={37} y={11.5} textAnchor="middle" style={{ fill: tv('fg-2'), fontSize: 10, fontWeight: 500 }}>
              Avg {formatPercent(avg)}
            </text>
          </g>
          {hp && (
            <g pointerEvents="none">
              <line x1={x(hp.date)} x2={x(hp.date)} y1={0} y2={innerH} style={{ stroke: tv('fg-4') }} strokeDasharray="5,2" />
              <circle cx={x(hp.date)} cy={y(hp.value)} r={4} fill={color} stroke="white" strokeWidth={2} />
            </g>
          )}
          <rect width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </g>
      </svg>
      {hp && (
        <ChartTooltip left={Math.min(MARGIN.left + x(hp.date) + 16, width - 180)} top={10}>
          <Typography variant="subheader2" color="fg-2" sx={{ fontWeight: 400, mb: 1 }}>
            {new Date(hp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
          <TooltipRow label={label} value={formatPercent(hp.value)} />
        </ChartTooltip>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Protocol totals (two USD series, simulated history)
// ---------------------------------------------------------------------------------------------

export function TotalsChart({ deposits, loans, days, height = 240 }: { deposits: number; loans: number; days: number; height?: number }) {
  const data = React.useMemo(() => {
    const range: TimeRange = days <= 7 ? '1w' : days <= 31 ? '1m' : days <= 190 ? '6m' : '1y';
    const d = simulatedHistory('totals-dep', deposits, range);
    const l = simulatedHistory('totals-loan', loans, range);
    const span = days * 86_400_000;
    const end = d[d.length - 1].date;
    return d.map((p, i) => ({ date: end - span * (1 - i / (d.length - 1)), dep: p.value, loan: l[i].value }));
  }, [deposits, loans, days]);
  return (
    <Box sx={{ width: '100%', height, position: 'relative' }}>
      <ParentSize debounceTime={50}>{({ width }) => (width > 10 ? <Totals width={width} height={height} data={data} /> : null)}</ParentSize>
    </Box>
  );
}

function Totals({ width, height, data }: { width: number; height: number; data: { date: number; dep: number; loan: number }[] }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const m = { top: 10, right: 10, bottom: 24, left: 56 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const max = Math.max(...data.map((d) => d.dep)) * 1.1;
  const x = scaleLinear({ domain: [data[0].date, data[data.length - 1].date], range: [0, innerW] });
  const y = scaleLinear({ domain: [0, max], range: [innerH, 0] });
  const drawKey = useDrawIn([data.length, data[data.length - 1].dep]);
  const green = tv('data-green');
  const orange = tv('data-orange');
  const id = React.useId().replace(/:/g, '');
  const hp = hover !== null ? data[hover] : null;
  return (
    <>
      <svg width={width} height={height} role="img" aria-label="Protocol deposits and loans over time (simulated)">
        <defs>
          <linearGradient id={`${id}g`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={green} stopOpacity={0.22} />
            <stop offset="100%" stopColor={green} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${id}o`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={orange} stopOpacity={0.18} />
            <stop offset="100%" stopColor={orange} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g transform={`translate(${m.left},${m.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={0} x2={innerW} y1={innerH * t} y2={innerH * t} style={{ stroke: tv('border-1') }} strokeDasharray="3,3" />
              <text x={-8} y={innerH * t + 3} textAnchor="end" style={{ fill: tv('fg-3'), fontSize: 10 }}>
                {formatUSD(max * (1 - t), { compact: true })}
              </text>
            </g>
          ))}
          {[0, 0.5, 1].map((t, i) => {
            const d = data[0].date + (data[data.length - 1].date - data[0].date) * t;
            return (
              <text key={t} x={x(d)} y={innerH + 18} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} style={{ fill: tv('fg-3'), fontSize: 10 }}>
                {new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          })}
          <AreaClosed data={data} x={(d) => x(d.date)} y={(d) => y(d.dep)} yScale={y} curve={curveMonotoneX} fill={`url(#${id}g)`} style={{ animation: 'clone-fade-in 700ms ease both' }} />
          <AreaClosed data={data} x={(d) => x(d.date)} y={(d) => y(d.loan)} yScale={y} curve={curveMonotoneX} fill={`url(#${id}o)`} style={{ animation: 'clone-fade-in 700ms ease both' }} />
          <LinePath key={`d${drawKey}`} data={data} x={(d) => x(d.date)} y={(d) => y(d.dep)} stroke={green} strokeWidth={2} curve={curveMonotoneX} pathLength={1} style={{ strokeDasharray: 1, animation: 'clone-draw 1000ms cubic-bezier(0.19,1,0.22,1) both' }} />
          <LinePath key={`l${drawKey}`} data={data} x={(d) => x(d.date)} y={(d) => y(d.loan)} stroke={orange} strokeWidth={2} curve={curveMonotoneX} pathLength={1} style={{ strokeDasharray: 1, animation: 'clone-draw 1000ms 80ms cubic-bezier(0.19,1,0.22,1) both' }} />
          {hp && (
            <g pointerEvents="none">
              <line x1={x(hp.date)} x2={x(hp.date)} y1={0} y2={innerH} style={{ stroke: tv('fg-4') }} strokeDasharray="5,2" />
              <circle cx={x(hp.date)} cy={y(hp.dep)} r={4} fill={green} stroke="white" strokeWidth={2} />
              <circle cx={x(hp.date)} cy={y(hp.loan)} r={4} fill={orange} stroke="white" strokeWidth={2} />
            </g>
          )}
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={(e) => {
              const p = localPoint(e);
              if (!p) return;
              const t = x.invert(p.x - m.left);
              let best = 0;
              data.forEach((d, i) => {
                if (Math.abs(d.date - t) < Math.abs(data[best].date - t)) best = i;
              });
              setHover(best);
            }}
            onMouseLeave={() => setHover(null)}
          />
        </g>
      </svg>
      {hp && (
        <ChartTooltip left={Math.min(m.left + x(hp.date) + 16, width - 200)} top={10}>
          <Typography variant="subheader2" color="fg-2" sx={{ fontWeight: 400, mb: 1 }}>
            {new Date(hp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
          <TooltipRow label="Deposits" value={formatUSD(hp.dep, { compact: true })} />
          <TooltipRow label="Loans" value={formatUSD(hp.loan, { compact: true })} />
        </ChartTooltip>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------

export function ChartTooltip({ left, top, children }: { left: number; top: number; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left,
        top,
        pointerEvents: 'none',
        px: 3,
        py: 2,
        borderRadius: '4px',
        bgcolor: 'surface-elevated',
        boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.2), 0px 2px 10px rgba(0, 0, 0, 0.1)',
        minWidth: 160,
        maxWidth: 220,
        zIndex: 3,
        transition: 'left 80ms linear',
        animation: 'clone-fade-in 120ms ease both',
      }}
    >
      {children}
    </Box>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, '& + &': { mt: 1 } }}>
      <Typography variant="caption" color="fg-2">
        {label}
      </Typography>
      <Typography variant="main12" color="fg-1" sx={{ whiteSpace: 'nowrap' }}>
        {value}
      </Typography>
    </Box>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((i) => (
        <Box key={i.label} sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: i.color, mr: '11px' }} />
          <Typography variant="description" color="fg-2">
            {i.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export const CHART_COLORS = { borrow: BORROW_COLOR, utilization: UTIL_COLOR };
