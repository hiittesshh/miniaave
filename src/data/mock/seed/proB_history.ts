/**
 * Builder B seed: SIMULATED rate and volume history for the Pro token and insights charts.
 *
 * The live charts read history from Aave's API; the clone has no history, so this module makes a
 * deterministic series per key (reserve id + range) that ENDS at today's figure from the shared
 * seed (seed/proLive.ts via the data hooks), so the last point of every chart agrees with the
 * tables. Everything else about the series is illustrative.
 *
 * Sampling matches what the live charts plot (measured 2026-10-14, tools/a3-ranges.mjs):
 *   1D  24 points, hourly          1W  84 points, every 2 h      1M 120 points, every 6 h
 *   6M 181 points, daily           1Y / All  weekly points from Monday 23 Mar 2026 (V4 launch)
 * Points sit on whole UTC hours, so tooltips show local times such as "1:30 PM" in UTC+5:30.
 */

export type HistoryRange = '1D' | '1W' | '1M' | '6M' | '1Y' | 'All';
export const HISTORY_RANGES: HistoryRange[] = ['1D', '1W', '1M', '6M', '1Y', 'All'];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** First weekly sample of the live 1Y / All charts. */
export const HISTORY_START = Date.UTC(2026, 2, 23);

/** The instant the page loaded (module scope keeps renders pure); series end here. */
export const HISTORY_NOW = Date.now();

export function rangeTimestamps(range: HistoryRange, now = HISTORY_NOW): number[] {
  const floorTo = (t: number, step: number) => Math.floor(t / step) * step;
  if (range === '1Y' || range === 'All') {
    const out: number[] = [];
    for (let t = HISTORY_START; t <= now; t += 7 * DAY) out.push(t);
    return out;
  }
  const [count, step] = range === '1D' ? [24, HOUR] : range === '1W' ? [84, 2 * HOUR] : range === '1M' ? [120, 6 * HOUR] : [181, DAY];
  const end = floorTo(now, step);
  return Array.from({ length: count }, (_, i) => end - (count - 1 - i) * step);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h || 1;
}

function rng(seed: string) {
  let x = hash(seed);
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

export interface RateHistoryOptions {
  /** 0 (flat, step-like, e.g. capped stablecoin markets) … 1 (spiky, high-utilisation markets). */
  spikiness?: number;
}

/**
 * A rate series (fractions, e.g. 0.05 = 5%) for `key` over `range`, ending at `current`.
 * Shape: long flat stretches with occasional level steps, plus — for spiky keys — short bursts
 * that rise sharply and decay, the pattern the live APY charts show for busy markets.
 */
const CACHE = new Map<string, number[]>();
/** Module-level memo (cheap per render and per request; bounded). */
function memo(id: string, make: () => number[]) {
  const hit = CACHE.get(id);
  if (hit) return hit;
  if (CACHE.size > 2000) CACHE.clear();
  const v = make();
  CACHE.set(id, v);
  return v;
}

export function rateHistory(key: string, range: HistoryRange, current: number, opts: RateHistoryOptions = {}): number[] {
  return memo(`r|${key}|${range}|${current}|${opts.spikiness ?? 0.3}`, () => rateHistoryRaw(key, range, current, opts));
}

function rateHistoryRaw(key: string, range: HistoryRange, current: number, opts: RateHistoryOptions): number[] {
  const ts = rangeTimestamps(range);
  const n = ts.length;
  const r = rng(`${key}|${range}`);
  const spiky = opts.spikiness ?? 0.3;
  const out = new Array<number>(n);
  let level = current;
  let burst = 0;
  out[n - 1] = current;
  for (let i = n - 2; i >= 0; i--) {
    // Occasional level steps (walking backwards in time).
    if (r() < 0.02 + spiky * 0.05) level = Math.max(0, level * (1 + (r() - 0.55) * (0.25 + spiky * 0.6)));
    // Bursts: a sharp rise that decays over a few samples.
    if (burst < 0.02 && r() < spiky * spiky * 0.16) burst = current * (0.4 + r() * (1.2 + spiky * 1.6));
    burst *= 0.55 + r() * 0.2;
    const jitter = level * (r() - 0.5) * (0.002 + spiky * spiky * 0.08);
    out[i] = Math.max(0, level + burst + jitter);
  }
  return out;
}

/**
 * A protocol-volume USD series (insights) ending at `current`. V4 launched on 23 Mar 2026, so the
 * live totals ramp up from launch: value(t) ≈ current · ((t − launch) / (now − launch))^k, which
 * gives the live month-on-month growth (+50% to +60% over 1 Month) with k ≈ 2.6–3. Small,
 * non-cumulative wiggles and a few step changes are added so the line looks like real data.
 */
export function volumeHistory(key: string, range: HistoryRange, current: number, k = 2.6): number[] {
  return memo(`v|${key}|${range}|${current}|${k}`, () => volumeHistoryRaw(key, range, current, k));
}

function volumeHistoryRaw(key: string, range: HistoryRange, current: number, k: number): number[] {
  const ts = rangeTimestamps(range);
  const n = ts.length;
  const r = rng(`${key}|vol|${range}`);
  const span = Math.max(1, HISTORY_NOW - HISTORY_START);
  const out = new Array<number>(n);
  let step = 1;
  for (let i = n - 1; i >= 0; i--) {
    const f = Math.max(0, (ts[i] - HISTORY_START) / span);
    if (i < n - 1 && r() < 0.035) step *= 1 - r() * 0.035; // occasional step changes
    const wiggle = 1 + (r() - 0.5) * 0.008;
    out[i] = i === n - 1 ? current : Math.max(0, current * Math.pow(f, k) * step * wiggle);
  }
  return out;
}
