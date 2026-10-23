import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction, initialChainState, marketSnapshot, proSnapshot, type ChainState } from '../engine';
import { deriveProUser, deriveUserMarketState } from '../../derive';
import { DEMO_ACCOUNT, FRESH_ACCOUNT, demoUserMarkets, freshUserMarkets } from '../seed/standard';
import { demoProUser, freshProUser } from '../seed/pro';
import { SimulatedTxError } from '../../types';
import { MockLendingDataSource } from '../mockSource';
import { chainStore } from '../chainStore';

function seeded(): ChainState {
  const s = initialChainState();
  s.standard.users[DEMO_ACCOUNT] = demoUserMarkets();
  s.standard.users[FRESH_ACCOUNT] = freshUserMarkets();
  s.pro.users[DEMO_ACCOUNT] = demoProUser();
  s.pro.users[FRESH_ACCOUNT] = freshProUser();
  return s;
}

const userView = (s: ChainState, account = DEMO_ACCOUNT, market = 'core') =>
  deriveUserMarketState(marketSnapshot(s, market), account, s.standard.users[account][market]);

describe('seed sanity', () => {
  it('demo user starts at HF ≈ 1.88 on Core', () => {
    const u = userView(seeded());
    expect(u.summary.healthFactor).toBeGreaterThan(1.85);
    expect(u.summary.healthFactor).toBeLessThan(1.92);
    expect(u.summary.totalBorrowedUSD).toBe(12_000);
  });
  it('fresh user has no positions', () => {
    const u = userView(seeded(), FRESH_ACCOUNT);
    expect(u.summary.totalSuppliedUSD).toBe(0);
    expect(u.summary.healthFactor).toBe(Infinity);
  });
});

describe('standard: a successful supply updates everything together', () => {
  it('approve then supply USDC', () => {
    const s0 = seeded();
    const before = userView(s0);
    const reserveBefore = marketSnapshot(s0, 'core').reserves.find((r) => r.symbol === 'USDC')!;

    const { state: s1 } = applyAction(s0, { app: 'standard', kind: 'approve', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDC', amount: 1000 });
    const { state: s2, record } = applyAction(s1, { app: 'standard', kind: 'supply', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDC', amount: 1000 });

    const after = userView(s2);
    const reserveAfter = marketSnapshot(s2, 'core').reserves.find((r) => r.symbol === 'USDC')!;
    const usdcBefore = before.reserves.find((r) => r.symbol === 'USDC')!;
    const usdcAfter = after.reserves.find((r) => r.symbol === 'USDC')!;

    // wallet ↓, position ↑, reserve totals ↑, allowance consumed
    expect(after.wallet.USDC).toBe(before.wallet.USDC - 1000);
    expect(usdcAfter.supplied).toBe(usdcBefore.supplied + 1000);
    expect(reserveAfter.totalSupplied).toBe(reserveBefore.totalSupplied + 1000);
    expect(after.allowances.USDC).toBe(0);
    // utilization ↓ → supply APY ↓ (more supply, same borrows)
    expect(reserveAfter.utilization).toBeLessThan(reserveBefore.utilization);
    expect(reserveAfter.supplyAPY).toBeLessThan(reserveBefore.supplyAPY);
    // collateral already enabled → HF ↑, net worth ↑ by exactly $1,000
    expect(after.summary.healthFactor).toBeGreaterThan(before.summary.healthFactor);
    expect(after.summary.netWorthUSD).toBeCloseTo(before.summary.netWorthUSD + 1000);
    // history
    expect(record.kind).toBe('supply');
    expect(record.hash.startsWith('0xdemo')).toBe(true);
    expect(s2.txLog[0]).toEqual(record);
  });

  it('native ETH supply needs no approval and lands in the WETH reserve', () => {
    const s0 = seeded();
    const { state } = applyAction(s0, { app: 'standard', kind: 'supply', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'WETH', amount: 1, native: true });
    const u = userView(state);
    expect(u.wallet.ETH).toBeCloseTo(0.25);
    expect(u.reserves.find((r) => r.symbol === 'WETH')!.supplied).toBe(5);
  });
});

describe('standard: failures change nothing', () => {
  let s0: ChainState;
  beforeEach(() => {
    s0 = seeded();
  });

  const expectUnchanged = (fn: () => unknown) => {
    const snapshot = structuredClone(s0);
    expect(fn).toThrow(SimulatedTxError);
    expect(s0).toEqual(snapshot);
  };

  it('supply without approval', () => {
    expectUnchanged(() => applyAction(s0, { app: 'standard', kind: 'supply', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDC', amount: 10 }));
  });
  it('supply more than the wallet holds', () => {
    const { state } = applyAction(s0, { app: 'standard', kind: 'approve', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDC', amount: 1e9 });
    s0 = state;
    expectUnchanged(() => applyAction(s0, { app: 'standard', kind: 'supply', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDC', amount: 1e7 }));
  });
  it('borrow beyond borrowing power', () => {
    expectUnchanged(() => applyAction(s0, { app: 'standard', kind: 'borrow', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDT', amount: 50_000 }));
  });
  it('withdraw that would make HF < 1', () => {
    expectUnchanged(() => applyAction(s0, { app: 'standard', kind: 'withdraw', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'WETH', amount: 4 }));
  });
  it('disabling collateral that would make HF ≤ 1', () => {
    expectUnchanged(() => applyAction(s0, { app: 'standard', kind: 'collateral', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'WETH', enabled: false }));
  });
  it('supplying a frozen asset', () => {
    expectUnchanged(() => applyAction(s0, { app: 'standard', kind: 'supply', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'BAL', amount: 1, native: false }));
  });
  it('E-Mode switch with an incompatible borrow', () => {
    // GHO debt is not borrowable in the ETH-correlated category.
    expectUnchanged(() => applyAction(s0, { app: 'standard', kind: 'emode', marketId: 'core', account: DEMO_ACCOUNT, categoryId: 1 }));
  });
  it('faucet on a mainnet market', () => {
    expectUnchanged(() => applyAction(s0, { app: 'standard', kind: 'faucet', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDC' }));
  });
});

describe('standard: borrow / repay / withdraw / collateral / emode / faucet', () => {
  it('borrow raises debt, reserve borrows, wallet, and lowers HF; repay reverses it', () => {
    const s0 = seeded();
    const b0 = userView(s0);
    const r0 = marketSnapshot(s0, 'core').reserves.find((r) => r.symbol === 'USDT')!;
    const { state: s1 } = applyAction(s0, { app: 'standard', kind: 'borrow', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDT', amount: 500 });
    const b1 = userView(s1);
    const r1 = marketSnapshot(s1, 'core').reserves.find((r) => r.symbol === 'USDT')!;
    expect(b1.wallet.USDT).toBe(b0.wallet.USDT + 500);
    expect(r1.totalBorrowed).toBe(r0.totalBorrowed + 500);
    // $500 on a multi-billion pool barely moves the APY, but utilization must rise.
    expect(r1.utilization).toBeGreaterThan(r0.utilization);
    expect(r1.variableBorrowAPY).toBeGreaterThanOrEqual(r0.variableBorrowAPY);
    expect(b1.summary.healthFactor).toBeLessThan(b0.summary.healthFactor);

    const { state: s2 } = applyAction(s1, { app: 'standard', kind: 'approve', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDT', amount: 500 });
    const { state: s3 } = applyAction(s2, { app: 'standard', kind: 'repay', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDT', amount: 500, source: 'wallet' });
    const b3 = userView(s3);
    expect(b3.reserves.find((r) => r.symbol === 'USDT')!.borrowed).toBe(0);
    expect(b3.summary.healthFactor).toBeCloseTo(b0.summary.healthFactor);
    expect(marketSnapshot(s3, 'core').reserves.find((r) => r.symbol === 'USDT')!.totalBorrowed).toBe(r0.totalBorrowed);
  });

  it('repay with aTokens burns supply and debt together', () => {
    const s0 = seeded();
    const { state } = applyAction(s0, { app: 'standard', kind: 'repay', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDC', amount: 1000, source: 'aToken' });
    const u = userView(state);
    const usdc = u.reserves.find((r) => r.symbol === 'USDC')!;
    expect(usdc.supplied).toBe(4000);
    expect(usdc.borrowed).toBe(8000);
  });

  it('withdraw within limits succeeds and HF stays ≥ 1', () => {
    const s0 = seeded();
    const { state } = applyAction(s0, { app: 'standard', kind: 'withdraw', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'WETH', amount: 1, unwrap: true });
    const u = userView(state);
    expect(u.wallet.ETH).toBeCloseTo(2.25);
    expect(u.summary.healthFactor).toBeGreaterThanOrEqual(1);
  });

  it('E-Mode can be enabled once incompatible borrows are gone, and raises HF for in-category collateral', () => {
    const s0 = seeded();
    // Fresh user supplies ETH then enables ETH E-Mode.
    let { state } = applyAction(s0, { app: 'standard', kind: 'supply', marketId: 'core', account: FRESH_ACCOUNT, symbol: 'WETH', amount: 1, native: true });
    ({ state } = applyAction(state, { app: 'standard', kind: 'emode', marketId: 'core', account: FRESH_ACCOUNT, categoryId: 1 }));
    const u = userView(state, FRESH_ACCOUNT);
    expect(u.eModeCategoryId).toBe(1);
    expect(u.reserves.find((r) => r.symbol === 'WETH')!.effectiveLTV).toBe(0.93);
  });

  it('faucet mints on testnet', () => {
    const s0 = seeded();
    const { state } = applyAction(s0, { app: 'standard', kind: 'faucet', marketId: 'base_sepolia', account: DEMO_ACCOUNT, symbol: 'USDC' });
    expect(userView(state, DEMO_ACCOUNT, 'base_sepolia').wallet.USDC).toBe(10_000);
  });
});

describe('pro: deposit / borrow / repay / collateral', () => {
  const RES = 'base:coinbase-stocks:coinbase-stocks:TSLAc';
  const USDC = 'base:coinbase-stocks:coinbase-stocks:USDC';
  const SPOKE = 'base:coinbase-stocks';
  const HUB = 'base:coinbase-stocks';

  it('deposit updates wallet, position, reserve, hub totals and HF together', () => {
    const s0 = seeded();
    const before = deriveProUser(proSnapshot(s0), DEMO_ACCOUNT, s0.pro.users[DEMO_ACCOUNT]);
    const hubBefore = proSnapshot(s0).hubs.find((h) => h.id === HUB)!;
    const price = proSnapshot(s0).reserves.find((r) => r.id === RES)!.priceUSD;
    let { state } = applyAction(s0, { app: 'pro', kind: 'approve', account: DEMO_ACCOUNT, reserveId: RES, amount: 5 });
    ({ state } = applyAction(state, { app: 'pro', kind: 'deposit', account: DEMO_ACCOUNT, reserveId: RES, amount: 5 }));
    const after = deriveProUser(proSnapshot(state), DEMO_ACCOUNT, state.pro.users[DEMO_ACCOUNT]);
    const hubAfter = proSnapshot(state).hubs.find((h) => h.id === HUB)!;
    const mag7 = (u: typeof before) => u.positions.find((p) => p.spokeId === SPOKE)!;

    expect(after.wallet[8453].TSLAc).toBe(5);
    expect(state.pro.reserves[RES].supplied).toBe(s0.pro.reserves[RES].supplied + 5);
    expect(hubAfter.totalSuppliedUSD).toBeCloseTo(hubBefore.totalSuppliedUSD + 5 * price);
    expect(mag7(after).summary.healthFactor).toBeGreaterThan(mag7(before).summary.healthFactor);
    expect(after.summary.depositedUSD).toBeCloseTo(before.summary.depositedUSD + 5 * price);
  });

  it('borrow raises the user risk premium only through riskier collateral being needed', () => {
    const s0 = seeded();
    const p0 = deriveProUser(proSnapshot(s0), DEMO_ACCOUNT, s0.pro.users[DEMO_ACCOUNT]).positions.find((p) => p.spokeId === SPOKE)!;
    const { state } = applyAction(s0, { app: 'pro', kind: 'borrow', account: DEMO_ACCOUNT, reserveId: USDC, amount: 3000 });
    const p1 = deriveProUser(proSnapshot(state), DEMO_ACCOUNT, state.pro.users[DEMO_ACCOUNT]).positions.find((p) => p.spokeId === SPOKE)!;
    // Enough that the safest collateral (AAPLc) no longer covers the debt on its own.
    expect(p1.summary.totalBorrowedUSD).toBe(p0.summary.totalBorrowedUSD + 3000);
    expect(p1.summary.riskPremium).toBeGreaterThan(p0.summary.riskPremium);
    expect(p1.summary.healthFactor).toBeLessThan(p0.summary.healthFactor);
  });

  it('pro failures change nothing', () => {
    const s0 = seeded();
    const snap = structuredClone(s0);
    expect(() => applyAction(s0, { app: 'pro', kind: 'borrow', account: DEMO_ACCOUNT, reserveId: USDC, amount: 1_000_000 })).toThrow(SimulatedTxError);
    expect(() => applyAction(s0, { app: 'pro', kind: 'collateral', account: DEMO_ACCOUNT, reserveId: 'base:coinbase-stocks:coinbase-stocks:NVDAc', enabled: false })).toThrow(SimulatedTxError);
    expect(() => applyAction(s0, { app: 'pro', kind: 'deposit', account: DEMO_ACCOUNT, reserveId: RES, amount: 1 })).toThrow(SimulatedTxError);
    expect(s0).toEqual(snap);
  });
});

describe('mock source: simulated failure injection commits nothing', () => {
  it('rejects at the pending step and leaves the store untouched', async () => {
    chainStore.getState().reset();
    const src = new MockLendingDataSource({ latencyMs: 0, signatureMs: 0, pendingMs: 0, shouldFail: () => true });
    await src.getUserMarketState('core', DEMO_ACCOUNT); // initialises the account
    const before = structuredClone(chainStore.getState().chain);
    const phases: string[] = [];
    await expect(
      src.submitAction(
        { app: 'standard', kind: 'borrow', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDT', amount: 10 },
        { onPhase: (p) => phases.push(p) }
      )
    ).rejects.toMatchObject({ code: 'simulated-failure' });
    expect(phases).toEqual(['awaiting-signature', 'pending']);
    expect(chainStore.getState().chain).toEqual(before);
  });

  it('succeeds when the toggle is off and commits atomically', async () => {
    chainStore.getState().reset();
    const src = new MockLendingDataSource({ latencyMs: 0, signatureMs: 0, pendingMs: 0, shouldFail: () => false });
    const u0 = await src.getUserMarketState('core', DEMO_ACCOUNT);
    const receipt = await src.submitAction({ app: 'standard', kind: 'borrow', marketId: 'core', account: DEMO_ACCOUNT, symbol: 'USDT', amount: 10 });
    const u1 = await src.getUserMarketState('core', DEMO_ACCOUNT);
    expect(u1.wallet.USDT).toBe(u0.wallet.USDT + 10);
    const history = await src.getTransactions({ app: 'standard', account: DEMO_ACCOUNT });
    expect(history[0].hash).toBe(receipt.hash);
  });
});
