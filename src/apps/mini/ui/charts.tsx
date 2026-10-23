'use client';

/**
 * Mini-Aave charts = Pro's ChartCard (same card, axis, crosshair, tooltip, legend toggles and range
 * tabs) fed with REAL series from the data layer instead of Pro's seeded simulation:
 *   History (lib/history.ts) → sampleSteps over the chosen range → ChartCard `history` prop.
 * Lines draw in on mount and on every range change; the tooltip footer says where the data comes
 * from ("Simulated history" in mock mode, "From on-chain events" on a chain).
 */
import * as React from 'react';
import { CHART_POINTS, ChartCard, type ChartData, type Range, type Series } from '@/apps/pro/components/Entity';
import { rangeWindow, sampleSteps, type ChartRange, type History } from '../lib/history';

export const MINI_RANGES: Range[] = ['1D', '1W', '1M', 'All'];

export interface MiniSeries<P> extends Omit<Series, 'current' | 'volatility'> {
  value: (p: P) => number;
  /** value before the first point (default 0; NaN draws nothing) */
  before?: number;
}

export function toChartData<P extends { t: number }>(h: History<P>, series: MiniSeries<P>[], range: Range): ChartData {
  const { start, end } = rangeWindow((MINI_RANGES.includes(range) ? range : 'All') as ChartRange, h);
  return { start, end, values: series.map((s) => sampleSteps(h.points, s.value, start, end, CHART_POINTS, s.before ?? 0)) };
}

export function MiniChart<P extends { t: number }>({ history, series, height = 282, defaultRange = '1W', legend = true, ariaLabel }: { history: History<P> | undefined; series: MiniSeries<P>[]; height?: number; defaultRange?: Range; legend?: boolean; ariaLabel: string }) {
  const chartSeries: Series[] = series.map((s) => ({ key: s.key, label: s.label, color: s.color, kind: s.kind, current: 0, format: s.format }));
  return (
    <ChartCard
      seed={ariaLabel}
      series={chartSeries}
      height={height}
      legend={legend}
      defaultRange={defaultRange}
      ranges={MINI_RANGES}
      history={(range) => (history ? toChartData(history, series, range) : null)}
      note={history ? (history.simulated ? 'Simulated history (mock data)' : 'From on-chain events') : null}
      drawIn
      ariaLabel={ariaLabel}
    />
  );
}
