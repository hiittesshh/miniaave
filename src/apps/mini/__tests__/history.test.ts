/**
 * Series-building logic behind the Mini-Aave charts (lib/history.ts): the rate curve, the event
 * replays, the mock noise, sampling and Top Addresses. Checked against the mock engine and the
 * guide's §11 story, so the chart numbers agree with the contract maths.
 */
import { describe, expect, it } from 'vitest';
import { ADDR, accountByRole } from '../data/config';
import { applyWrite, borrowRateFor, demoState, getReserveConfig, getReserveData, getUserAccountData, type MiniState } from '../data/engine';
import { makeHistoryReads } from '../data/historyReads';
import { timedDemoState } from '../data/source';
import type { Address, WriteCall } from '../data/types';
import { aprToApy, borrowAprAt, buildPriceHistory, buildReserveHistory, buildUserHistory, marketNoise, rangeWindow, rateModelOf, replayReserve, sampleSteps, supplyAprAt, topHolders } from '../lib/history';
import { parseUnits } from '../lib/units';

const owner = accountByRole('Owner');
const borrower = accountByRole('Borrower');
const liquidator = accountByRole('Liquidator');
const run = (s: MiniState, from: Address, call: WriteCall) => applyWrite(s, from, call).state;
const num = (v: bigint, d: number) => Number(v) / 10 ** d;

/** §11: price → $1,700, then the liquidator repays 750 USDC of the borrower's debt. */
function afterLiquidation(): MiniState {
  // The timed demo (what the app loads): same state, real-looking times, deploy PriceSet events.
  let s = timedDemoState(Date.UTC(2026, 9, 19, 12));
  s = run(s, owner, { contract: 'oracle', functionName: 'setPrice', args: [ADDR.weth, parseUnits('1700', 8)] });
  s = run(s, liquidator, { contract: 'token', address: ADDR.usdc, functionName: 'faucet', args: [] });
  s = run(s, liquidator, { contract: 'token', address: ADDR.usdc, functionName: 'approve', args: [ADDR.pool, 750_000_000n] });
  return run(s, liquidator, { contract: 'pool', functionName: 'liquidate', args: [ADDR.weth, ADDR.usdc, borrower, 750_000_000n] });
}

describe('rate curve (float) = the contract curve', () => {
  it('matches the engine at several utilizations, both sides of the kink', () => {
    for (const asset of [ADDR.usdc, ADDR.weth]) {
      const c = getReserveConfig(asset);
      const m = rateModelOf(c);
      for (const u of [0.1, 0.5, 0.8, 0.9, 0.95, 1]) expect(borrowAprAt(u, m)).toBeCloseTo(num(borrowRateFor(parseUnits(String(u), 18), c), 18), 9);
    }
  });

  it('§12: USDC at 50% → 2.22% borrow APR, 1.00% supply APR', () => {
    const m = rateModelOf(getReserveConfig(ADDR.usdc));
    expect(borrowAprAt(0.5, m)).toBeCloseTo(0.022222, 5);
    expect(supplyAprAt(0.5, m)).toBeCloseTo(0.01, 6);
    expect(aprToApy(0.01)).toBeCloseTo(Math.expm1(0.01), 8);
  });
});

describe('event replays', () => {
  it('replaying the §12 demo log gives the §12 totals', () => {
    const s = demoState();
    const usdc = replayReserve(s.events, ADDR.usdc, 6).at(-1)!;
    const weth = replayReserve(s.events, ADDR.weth, 18).at(-1)!;
    expect([usdc.supplied, usdc.borrowed]).toEqual([100_000, 50_000]);
    expect([weth.supplied, weth.borrowed]).toEqual([10, 0]);
  });

  it('a liquidation lowers the debt token’s borrows and the collateral token’s supply', () => {
    const s = afterLiquidation();
    const usdc = replayReserve(s.events, ADDR.usdc, 6).at(-1)!;
    const weth = replayReserve(s.events, ADDR.weth, 18).at(-1)!;
    expect(usdc.borrowed).toBeCloseTo(49_250, 6);
    expect(weth.supplied).toBeCloseTo(num(getReserveData(s, ADDR.weth).totalSupplied, 18), 12);
    expect(10 - weth.supplied).toBeCloseTo(0.4632, 4); // the seized WETH
  });
});

describe('series builders', () => {
  const s = afterLiquidation();
  const now = s.time + 60_000;
  const reserve = (asset: Address, noise?: { seed: string; totals: number; price: number }) => {
    const r = getReserveData(s, asset);
    return buildReserveHistory({ events: s.events, asset, decimals: r.decimals, config: getReserveConfig(asset), now, current: { supplied: num(r.totalSupplied, r.decimals), borrowed: num(r.totalBorrowed, r.decimals), price: num(r.price, 8) }, noise });
  };

  it('reserve history ends at the live values; APYs follow utilization', () => {
    const h = reserve(ADDR.usdc);
    const last = h.points.at(-1)!;
    expect(last.t).toBe(now);
    expect(last.supplied).toBe(100_000);
    expect(last.borrowed).toBeCloseTo(49_250, 6);
    expect(last.utilization).toBeCloseTo(0.4925, 6);
    expect(last.borrowApy).toBeCloseTo(aprToApy(borrowAprAt(0.4925, rateModelOf(getReserveConfig(ADDR.usdc)))), 12);
    expect(h.simulated).toBe(false);
    // Before any borrow the rate is 0, like the contract.
    expect(h.points[0].borrowApy).toBe(0);
  });

  it('price history: $2,000 before the drop, $1,700 after', () => {
    const h = buildPriceHistory({ events: s.events, asset: ADDR.weth, now, currentPrice: 1700 });
    expect(h.points[0].price).toBe(2000);
    expect(h.points.at(-1)!.price).toBe(1700);
  });

  it('user history: the borrower’s HF goes 1.13 → 0.96 → 1.03, as in §11', () => {
    const reserves = [ADDR.usdc, ADDR.weth].map((asset) => {
      const r = getReserveData(s, asset);
      return { asset, decimals: r.decimals, threshold: r.liquidationThreshold / 10_000, prices: buildPriceHistory({ events: s.events, asset, now, currentPrice: num(r.price, 8) }) };
    });
    const a = getUserAccountData(s, borrower);
    const h = buildUserHistory({ events: s.events, user: borrower, reserves, now, simulated: false, current: { collateralUsd: num(a.totalCollateralUsd, 8), debtUsd: num(a.totalDebtUsd, 8), healthFactor: num(a.healthFactor, 18) } });
    const hfs = h.points.map((p) => +p.healthFactor.toFixed(2)).filter((v) => Number.isFinite(v));
    expect(hfs).toContain(1.13);
    expect(hfs).toContain(0.96);
    expect(hfs.at(-1)).toBe(1.03);
    // No debt yet right after the supply → Infinity (the chart shows a gap).
    expect(h.points[0].healthFactor).toBe(Infinity);
  });

  it('mock noise: deterministic, small, and the series still ends exactly at the live value', () => {
    const a = reserve(ADDR.weth, { seed: 'x', totals: 0.04, price: 0.05 });
    const b = reserve(ADDR.weth, { seed: 'x', totals: 0.04, price: 0.05 });
    expect(a).toEqual(b);
    expect(a.simulated).toBe(true);
    expect(a.points.at(-1)!.price).toBe(1700);
    const n = marketNoise('x:price', 0.05);
    expect(n(now, now)).toBe(0);
    const earlier = a.points.slice(0, -1).map((p) => p.price);
    expect(earlier.some((p) => p !== 2000 && p !== 1700)).toBe(true);
    expect(Math.max(...earlier.map((p) => Math.abs(p / (p > 1850 ? 2000 : 1700) - 1)))).toBeLessThan(0.11);
    // USDC price is a stablecoin: no price noise.
    expect(new Set(reserve(ADDR.usdc, { seed: 'y', totals: 0.04, price: 0 }).points.map((p) => p.price))).toEqual(new Set([1]));
  });
});

describe('sampling and Top Addresses', () => {
  it('sampleSteps: last value at or before each sample; `before` until the first point', () => {
    const pts = [
      { t: 10, v: 1 },
      { t: 20, v: 2 },
      { t: 30, v: 3 },
    ];
    expect(sampleSteps(pts, (p) => p.v, 0, 30, 4, -1)).toEqual([-1, 1, 2, 3]);
    expect(sampleSteps(pts, (p) => p.v, 25, 40, 2)).toEqual([2, 3]);
  });

  it('range windows: fixed spans back from now; All starts at the first event', () => {
    const h = { start: 1_000, now: 100 * 86_400_000 };
    expect(rangeWindow('1W', h)).toEqual({ start: h.now - 7 * 86_400_000, end: h.now });
    expect(rangeWindow('All', h)).toEqual({ start: 1_000, end: h.now });
  });

  it('top holders by deposits and borrows, with shares; liquidations reduce the borrower', () => {
    const s = afterLiquidation();
    const weth = topHolders(s.events, ADDR.weth, 18, 'deposits');
    expect(weth.map((h) => h.address)).toEqual([owner, borrower]);
    expect(weth[1].amount).toBeCloseTo(0.5368, 4);
    expect(weth.reduce((t, h) => t + h.share, 0)).toBeCloseTo(1, 12);
    const debts = topHolders(s.events, ADDR.usdc, 6, 'borrows');
    expect(debts.map((h) => [h.address, h.amount])).toEqual([
      [owner, 48_500],
      [borrower, 750],
    ]);
  });
});

describe('mock timeline and the shared history reads', () => {
  it('timedDemoState spreads the setup from 24 to 10 days before now', () => {
    const now = Date.UTC(2026, 9, 19, 12);
    const s = timedDemoState(now);
    const ts = s.events.map((e) => e.timestamp);
    expect(Math.min(...ts)).toBeGreaterThanOrEqual(now - 24 * 86_400_000 - 60_000); // deploy prices: 1 min before block 1
    expect(Math.max(...ts)).toBe(now - 10 * 86_400_000);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    // Same contract state as the untimed demo.
    expect(getReserveData(s, ADDR.usdc)).toEqual(getReserveData(demoState(), ADDR.usdc));
    // The deploy's PriceSet events come first ($1 USDC, $2,000 WETH).
    const deploy = s.events.filter((e) => e.eventName === 'PriceSet').map((e) => (e.eventName === 'PriceSet' ? [e.args.asset, e.args.price] : []));
    expect(deploy).toEqual([
      [ADDR.usdc, 100_000_000n],
      [ADDR.weth, 200_000_000_000n],
    ]);
  });

  it('makeHistoryReads works over any source shape (here: the engine)', async () => {
    const s = timedDemoState(Date.UTC(2026, 9, 19, 12));
    const reads = makeHistoryReads(
      {
        getEvents: async () => s.events,
        getReserveList: async () => [ADDR.usdc, ADDR.weth],
        getReserveData: async (a) => getReserveData(s, a),
        getReserveConfig: async (a) => getReserveConfig(a),
        tokenInfo: async (a) => ({ address: a, symbol: a === ADDR.usdc ? 'USDC' : 'WETH', name: '', decimals: a === ADDR.usdc ? 6 : 18 }),
        getUserAccountData: async (u) => getUserAccountData(s, u),
      },
      { simulated: false, now: () => Date.UTC(2026, 9, 19, 12) },
    );
    const u = await reads.getUserHistory(borrower);
    expect(+u.points.at(-1)!.healthFactor.toFixed(2)).toBe(1.13);
    const r = await reads.getReserveHistory(ADDR.usdc);
    expect(r.points.at(-1)!.supplyApy).toBeCloseTo(aprToApy(0.01), 10);
  });
});
