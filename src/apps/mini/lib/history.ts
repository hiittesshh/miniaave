/**
 * Time series for the Mini-Aave charts, rebuilt from the pool's event log (§10). Pure functions, the
 * same for both data sources:
 *
 *   chain mode   the real events with their block timestamps (chainSource.getEvents)
 *   mock mode    the mock engine's events, plus a deterministic "market noise" layer (marketNoise)
 *                that is exactly 0 at `now`, so the simulated history always ends at the current state
 *
 * What a replay can and can't know:
 *  - totals move only at events (Supply / Withdraw / Borrow / Repay / Liquidation); prices only at
 *    PriceSet. Interest accrued between events is NOT in the log, so every series ends with one
 *    extra point at `now` holding the live values read from the contracts.
 *  - APY at each point comes from that point's utilization through the reserve's real two-slope
 *    curve (getReserveConfig), the same formula as the contract (§6).
 */
import type { Address, MiniEvent, ReserveConfig } from '../data/types';

const DAY = 86_400_000;
const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const toNum = (v: bigint, decimals: number) => Number(v) / 10 ** decimals;

// ---------------------------------------------------------------------------------------------
// Rate curve (float version of the contract's two-slope model)
// ---------------------------------------------------------------------------------------------

export interface RateModel {
  base: number;
  slope1: number;
  slope2: number;
  optimal: number;
  /** share of interest the pool keeps, 0..1 */
  reserveFactor: number;
}

export const rateModelOf = (c: ReserveConfig): RateModel => ({
  base: toNum(c.baseRate, 18),
  slope1: toNum(c.slope1, 18),
  slope2: toNum(c.slope2, 18),
  optimal: toNum(c.optimalUtilization, 18),
  reserveFactor: c.reserveFactor / 10_000,
});

/** Borrow APR at utilization u (0..1): base + slope1·u/optimal, then + slope2 above the kink. */
export function borrowAprAt(u: number, m: RateModel): number {
  const x = Math.min(Math.max(u, 0), 1);
  if (x <= m.optimal) return m.base + (m.optimal > 0 ? (m.slope1 * x) / m.optimal : 0);
  return m.base + m.slope1 + (m.slope2 * (x - m.optimal)) / (1 - m.optimal || 1);
}

/** Supply APR = borrow APR × utilization × (1 − reserve factor). */
export const supplyAprAt = (u: number, m: RateModel) => borrowAprAt(u, m) * Math.min(Math.max(u, 0), 1) * (1 - m.reserveFactor);

/** APR → APY, per-second compounding (§4 aprToApyPercent), as a fraction (0.0222 = 2.22%). */
export const aprToApy = (apr: number) => Math.pow(1 + apr / 31_536_000, 31_536_000) - 1;

// ---------------------------------------------------------------------------------------------
// Deterministic market noise (mock mode only)
// ---------------------------------------------------------------------------------------------

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  let x = h || 1;
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * A smooth, deterministic wiggle around 0 built from five sine waves (5 hours to 17 days), shifted so
 * that it is exactly 0 at `now`. A function of absolute time, so the 1D chart is a zoom of the 1M one.
 */
export function marketNoise(seed: string, amp: number) {
  const rnd = seeded(seed);
  const waves = [5 / 24, 19 / 24, 2.3, 6.1, 17].map((days, i) => ({ period: days * DAY, phase: rnd() * Math.PI * 2, weight: [0.15, 0.2, 0.25, 0.25, 0.3][i] }));
  const raw = (t: number) => waves.reduce((s, w) => s + w.weight * Math.sin((2 * Math.PI * t) / w.period + w.phase), 0);
  return (t: number, now: number) => (amp ? amp * (raw(t) - raw(now)) : 0);
}

// ---------------------------------------------------------------------------------------------
// Replays
// ---------------------------------------------------------------------------------------------

const byChainOrder = (a: MiniEvent, b: MiniEvent) => a.timestamp - b.timestamp || (a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1);

export interface TotalsPoint {
  t: number;
  supplied: number;
  borrowed: number;
}

/** Pool totals of one asset after every event that touches it (token units, as numbers). */
export function replayReserve(events: readonly MiniEvent[], asset: Address, decimals: number): TotalsPoint[] {
  let supplied = 0;
  let borrowed = 0;
  const out: TotalsPoint[] = [];
  for (const e of [...events].sort(byChainOrder)) {
    let touched = false;
    if (e.eventName === 'Liquidation') {
      if (eq(e.args.debtAsset, asset)) {
        borrowed -= toNum(e.args.debtCovered, decimals);
        touched = true;
      }
      if (eq(e.args.collateralAsset, asset)) {
        supplied -= toNum(e.args.collateralSeized, decimals);
        touched = true;
      }
    } else if (e.eventName !== 'PriceSet' && eq(e.args.asset, asset)) {
      const v = toNum(e.args.amount, decimals);
      if (e.eventName === 'Supply') supplied += v;
      else if (e.eventName === 'Withdraw') supplied -= v;
      else if (e.eventName === 'Borrow') borrowed += v;
      else borrowed -= v;
      touched = true;
    }
    if (touched) out.push({ t: e.timestamp, supplied: Math.max(0, supplied), borrowed: Math.max(0, borrowed) });
  }
  return out;
}

export interface PricePoint {
  t: number;
  price: number;
}

/** Oracle prices of one asset from its PriceSet events (USD). */
export const replayPrice = (events: readonly MiniEvent[], asset: Address): PricePoint[] =>
  [...events]
    .sort(byChainOrder)
    .filter((e): e is Extract<MiniEvent, { eventName: 'PriceSet' }> => e.eventName === 'PriceSet' && eq(e.args.asset, asset))
    .map((e) => ({ t: e.timestamp, price: toNum(e.args.price, 8) }));

/** Last point at or before t (binary search); undefined before the first point. */
export function at<P extends { t: number }>(points: readonly P[], t: number): P | undefined {
  let lo = 0;
  let hi = points.length - 1;
  let found: P | undefined;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) {
      found = points[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/** Price at t: the last PriceSet at or before t, else the first one ever, else the fallback. */
export const priceAt = (points: readonly PricePoint[], t: number, fallback: number) => at(points, t)?.price ?? points[0]?.price ?? fallback;

/** Event times plus (mock) a regular grid, sorted and de-duplicated. */
function timeline(times: number[], grid?: { start: number; now: number; step: number }) {
  const all = [...times];
  if (grid) for (let t = grid.start; t < grid.now; t += grid.step) all.push(t);
  return [...new Set(all)].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------------------------
// Series builders
// ---------------------------------------------------------------------------------------------

export interface ReserveHistoryPoint {
  t: number;
  supplied: number;
  borrowed: number;
  price: number;
  utilization: number;
  supplyApy: number;
  borrowApy: number;
  suppliedUsd: number;
  borrowedUsd: number;
  available: number;
}

export interface History<P> {
  /** true in mock mode: the tooltip says "Simulated history". */
  simulated: boolean;
  /** first event time (or now − 1 day when there is none) */
  start: number;
  now: number;
  points: P[];
}

export interface NoiseOptions {
  seed: string;
  /** relative wiggle of the totals (0.04 = ±4%) */
  totals: number;
  /** relative wiggle of the price (0 for a stablecoin) */
  price: number;
  /** grid step of the simulated points */
  stepMs?: number;
}

function reservePoint(t: number, supplied: number, borrowed: number, price: number, model: RateModel): ReserveHistoryPoint {
  const b = Math.min(borrowed, supplied);
  const u = supplied > 0 ? b / supplied : 0;
  const borrowApr = b > 0 ? borrowAprAt(u, model) : 0; // the contract: no borrows → rate 0
  return { t, supplied, borrowed: b, price, utilization: u, supplyApy: aprToApy(borrowApr * u * (1 - model.reserveFactor)), borrowApy: aprToApy(borrowApr), suppliedUsd: supplied * price, borrowedUsd: b * price, available: supplied - b };
}

/**
 * One reserve over time: totals after each event, prices after each PriceSet, APYs from the rate
 * curve, and a final point at `now` with the live values (`current`).
 */
export function buildReserveHistory(input: {
  events: readonly MiniEvent[];
  asset: Address;
  decimals: number;
  config: ReserveConfig;
  now: number;
  current: { supplied: number; borrowed: number; price: number };
  noise?: NoiseOptions;
}): History<ReserveHistoryPoint> {
  const { events, asset, decimals, now, current, noise } = input;
  const model = rateModelOf(input.config);
  const totals = replayReserve(events, asset, decimals);
  const prices = replayPrice(events, asset);
  const first = Math.min(totals[0]?.t ?? now, prices[0]?.t ?? now);
  const start = Math.min(first, now - DAY);
  const nTot = noise ? marketNoise(`${noise.seed}:totals`, noise.totals) : null;
  const nBor = noise ? marketNoise(`${noise.seed}:borrows`, noise.totals * 1.4) : null;
  const nPx = noise ? marketNoise(`${noise.seed}:price`, noise.price) : null;
  const times = timeline([...totals.map((p) => p.t), ...prices.map((p) => p.t)], noise ? { start: first, now, step: noise.stepMs ?? 2 * 3_600_000 } : undefined).filter((t) => t < now);
  const points = times.map((t) => {
    const s = at(totals, t);
    const k = (n: typeof nTot) => (n ? 1 + n(t, now) : 1);
    return reservePoint(t, (s?.supplied ?? 0) * k(nTot), (s?.borrowed ?? 0) * k(nBor), priceAt(prices, t, current.price) * k(nPx), model);
  });
  points.push(reservePoint(now, current.supplied, current.borrowed, current.price, model));
  return { simulated: Boolean(noise), start, now, points };
}

/** Oracle price over time (Admin chart), ending at the live price. */
export function buildPriceHistory(input: { events: readonly MiniEvent[]; asset: Address; now: number; currentPrice: number; noise?: Pick<NoiseOptions, 'seed' | 'price' | 'stepMs'> }): History<PricePoint> {
  const { events, asset, now, currentPrice, noise } = input;
  const prices = replayPrice(events, asset);
  const first = prices[0]?.t ?? Math.min(...events.map((e) => e.timestamp), now);
  const nPx = noise ? marketNoise(`${noise.seed}:price`, noise.price) : null;
  const times = timeline(
    prices.map((p) => p.t),
    noise ? { start: first, now, step: noise.stepMs ?? 2 * 3_600_000 } : undefined,
  ).filter((t) => t < now);
  const points = times.map((t) => ({ t, price: priceAt(prices, t, currentPrice) * (nPx ? 1 + nPx(t, now) : 1) }));
  points.push({ t: now, price: currentPrice });
  return { simulated: Boolean(noise), start: Math.min(first, now - DAY), now, points };
}

export interface UserHistoryPoint {
  t: number;
  collateralUsd: number;
  debtUsd: number;
  netWorthUsd: number;
  /** liquidation limit ÷ debt; Infinity with no debt (§6) */
  healthFactor: number;
}

export interface UserReserveInput {
  asset: Address;
  decimals: number;
  /** liquidation threshold, 0..1 */
  threshold: number;
  prices: History<PricePoint>;
}

/**
 * One user's position over time: their own events (and liquidations of them) replayed per asset,
 * valued at the price of that moment. Ends at `now` with the live account data.
 */
export function buildUserHistory(input: {
  events: readonly MiniEvent[];
  user: Address;
  reserves: readonly UserReserveInput[];
  now: number;
  current: { collateralUsd: number; debtUsd: number; healthFactor: number };
  simulated: boolean;
}): History<UserHistoryPoint> {
  const { events, user, reserves, now, current } = input;
  const mine = [...events].sort(byChainOrder).filter((e) => e.eventName !== 'PriceSet' && eq(e.args.user, user));
  const pos = new Map<string, { s: number; b: number }>(reserves.map((r) => [r.asset.toLowerCase(), { s: 0, b: 0 }]));
  const dec = new Map(reserves.map((r) => [r.asset.toLowerCase(), r.decimals]));
  const steps: { t: number; snap: Map<string, { s: number; b: number }> }[] = [];
  for (const e of mine) {
    if (e.eventName === 'Liquidation') {
      const d = pos.get(e.args.debtAsset.toLowerCase());
      const c = pos.get(e.args.collateralAsset.toLowerCase());
      if (d) d.b = Math.max(0, d.b - toNum(e.args.debtCovered, dec.get(e.args.debtAsset.toLowerCase()) ?? 18));
      if (c) c.s = Math.max(0, c.s - toNum(e.args.collateralSeized, dec.get(e.args.collateralAsset.toLowerCase()) ?? 18));
    } else if (e.eventName !== 'PriceSet') {
      const p = pos.get(e.args.asset.toLowerCase());
      if (!p) continue;
      const v = toNum(e.args.amount, dec.get(e.args.asset.toLowerCase()) ?? 18);
      if (e.eventName === 'Supply') p.s += v;
      else if (e.eventName === 'Withdraw') p.s = Math.max(0, p.s - v);
      else if (e.eventName === 'Borrow') p.b += v;
      else p.b = Math.max(0, p.b - v);
    }
    steps.push({ t: e.timestamp, snap: new Map([...pos].map(([k, v]) => [k, { ...v }])) });
  }
  const first = steps[0]?.t ?? now;
  const priceTimes = reserves.flatMap((r) => r.prices.points.map((p) => p.t)).filter((t) => t >= first);
  const times = timeline([...steps.map((s) => s.t), ...priceTimes]).filter((t) => t < now);
  const points: UserHistoryPoint[] = times.map((t) => {
    const snap = at(steps, t)?.snap;
    let coll = 0;
    let limit = 0;
    let debt = 0;
    for (const r of reserves) {
      const p = snap?.get(r.asset.toLowerCase());
      if (!p) continue;
      const px = at(r.prices.points, t)?.price ?? r.prices.points[0]?.price ?? 0;
      coll += p.s * px;
      limit += p.s * px * r.threshold;
      debt += p.b * px;
    }
    return { t, collateralUsd: coll, debtUsd: debt, netWorthUsd: coll - debt, healthFactor: debt > 0 ? limit / debt : Infinity };
  });
  points.push({ t: now, collateralUsd: current.collateralUsd, debtUsd: current.debtUsd, netWorthUsd: current.collateralUsd - current.debtUsd, healthFactor: current.healthFactor });
  return { simulated: input.simulated, start: Math.min(first, now - DAY), now, points };
}

// ---------------------------------------------------------------------------------------------
// Chart sampling and the Top Addresses list
// ---------------------------------------------------------------------------------------------

export type ChartRange = '1D' | '1W' | '1M' | 'All';
const RANGE_MS: Record<Exclude<ChartRange, 'All'>, number> = { '1D': DAY, '1W': 7 * DAY, '1M': 30 * DAY };

export function rangeWindow(range: ChartRange, h: Pick<History<unknown>, 'start' | 'now'>): { start: number; end: number } {
  return { start: range === 'All' ? h.start : h.now - RANGE_MS[range], end: h.now };
}

/**
 * n evenly spaced samples of a step series over [start, end]: each sample is the last point at or
 * before it (`before` when there is none yet). The last sample is always the latest point.
 */
export function sampleSteps<P extends { t: number }>(points: readonly P[], value: (p: P) => number, start: number, end: number, n: number, before = 0): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const t = i === n - 1 ? end : start + ((end - start) * i) / (n - 1);
    const p = at(points, t);
    out[i] = p ? value(p) : before;
  }
  return out;
}

export interface Holder {
  address: Address;
  amount: number;
  share: number;
  /** last event time of this address on this asset */
  lastT: number;
}

/** Largest positions on one asset from the event log (principal replay), biggest first. */
export function topHolders(events: readonly MiniEvent[], asset: Address, decimals: number, side: 'deposits' | 'borrows'): Holder[] {
  const m = new Map<string, { address: Address; amount: number; lastT: number }>();
  const bump = (who: Address, delta: number, t: number) => {
    const k = who.toLowerCase();
    const cur = m.get(k) ?? { address: who, amount: 0, lastT: 0 };
    cur.amount = Math.max(0, cur.amount + delta);
    cur.lastT = Math.max(cur.lastT, t);
    m.set(k, cur);
  };
  for (const e of [...events].sort(byChainOrder)) {
    if (e.eventName === 'PriceSet') continue;
    if (e.eventName === 'Liquidation') {
      if (side === 'borrows' && eq(e.args.debtAsset, asset)) bump(e.args.user, -toNum(e.args.debtCovered, decimals), e.timestamp);
      if (side === 'deposits' && eq(e.args.collateralAsset, asset)) bump(e.args.user, -toNum(e.args.collateralSeized, decimals), e.timestamp);
      continue;
    }
    if (!eq(e.args.asset, asset)) continue;
    const v = toNum(e.args.amount, decimals);
    if (side === 'deposits' && (e.eventName === 'Supply' || e.eventName === 'Withdraw')) bump(e.args.user, e.eventName === 'Supply' ? v : -v, e.timestamp);
    if (side === 'borrows' && (e.eventName === 'Borrow' || e.eventName === 'Repay')) bump(e.args.user, e.eventName === 'Borrow' ? v : -v, e.timestamp);
  }
  const list = [...m.values()].filter((h) => h.amount > 1e-9);
  const total = list.reduce((s, h) => s + h.amount, 0);
  return list.map((h) => ({ ...h, share: total > 0 ? h.amount / total : 0 })).sort((a, b) => b.amount - a.amount);
}
