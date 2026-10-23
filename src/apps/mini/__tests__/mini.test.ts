/**
 * Mini-Aave acceptance test: replays the guide's §11 demo on the mock engine and checks the guide's
 * numbers, plus the §4 format examples, the §12 mock shapes and the §7 preview formulas.
 */
import { describe, expect, it } from 'vitest';
import { ADDR, accountByRole } from '../data/config';
import { applyWrite, borrowersFromEvents, demoState, deployState, getReserveData, getUserAccountData, getUserReserveData, type MiniState } from '../data/engine';
import type { Address, WriteCall } from '../data/types';
import { MiniContractError, messageFor, UserRejectedError } from '../lib/errors';
import { aprToApyPercent, fmtHealth, fmtToken, fmtUsd } from '../lib/format';
import { healthAfter, liquidationPreview, maxBorrow, repayMaxApproval } from '../lib/preview';
import { MAX_UINT256, formatUnits, parseUnits } from '../lib/units';

const owner = accountByRole('Owner');
const borrower = accountByRole('Borrower');
const liquidator = accountByRole('Liquidator');
const usdc = (s: string) => parseUnits(s, 6);
const weth = (s: string) => parseUnits(s, 18);
const num = (v: bigint, d: number) => Number(formatUnits(v, d));

function run(s: MiniState, from: Address, call: WriteCall) {
  return applyWrite(s, from, call);
}
const errName = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof MiniContractError ? e.errorName : String(e);
  }
  return 'no error';
};

describe('§4 units and formatting', () => {
  it('formats the guide examples', () => {
    expect(fmtToken(12500000n, 6)).toBe('12.5');
    expect(fmtToken(1000000000000000000n, 18)).toBe('1');
    expect(fmtUsd(200000000000n)).toBe('$2,000.00');
    expect(Number(8000) / 100).toBe(80);
    expect(Number(formatUnits(22222222222222222n, 16)).toFixed(2)).toBe('2.22');
    expect(fmtHealth(1133333333333333333n)).toBe('1.13');
    expect(fmtHealth(MAX_UINT256)).toBe('∞');
    expect(MAX_UINT256.toString()).toBe('115792089237316195423570985008687907853269984665640564039457584007913129639935');
  });
  it('parses user input with the token decimals', () => {
    expect(parseUnits('12.5', 6)).toBe(12500000n);
    expect(parseUnits('100', 6)).toBe(100000000n);
    expect(parseUnits('1', 18)).toBe(10n ** 18n);
    expect(parseUnits('0.4632', 18)).toBe(463200000000000000n);
    expect(formatUnits(463235294117647058n, 18)).toBe('0.463235294117647058');
  });
  it('turns APR into APY', () => {
    expect(aprToApyPercent(0n)).toBe(0);
    expect(aprToApyPercent(22222222222222222n)).toBeCloseTo(2.2471, 3);
  });
});

describe('§12 mock data shapes', () => {
  const s = demoState();
  it('matches getReserveData(USDC) and (WETH)', () => {
    expect(getReserveData(s, ADDR.usdc)).toEqual({
      asset: ADDR.usdc, decimals: 6, price: 100000000n, totalSupplied: 100000000000n, totalBorrowed: 50000000000n, availableLiquidity: 50000000000n,
      utilization: 500000000000000000n, supplyRate: 10000000000000000n, borrowRate: 22222222222222222n, ltv: 8000, liquidationThreshold: 8500, liquidationBonus: 500,
    });
    expect(getReserveData(s, ADDR.weth)).toEqual({
      asset: ADDR.weth, decimals: 18, price: 200000000000n, totalSupplied: 10000000000000000000n, totalBorrowed: 0n, availableLiquidity: 10000000000000000000n,
      utilization: 0n, supplyRate: 0n, borrowRate: 0n, ltv: 8000, liquidationThreshold: 8500, liquidationBonus: 500,
    });
  });
  it('matches getUserAccountData and getUserReserveData for the borrower', () => {
    expect(getUserAccountData(s, borrower)).toEqual({
      totalCollateralUsd: 200000000000n, totalDebtUsd: 150000000000n, borrowLimitUsd: 160000000000n, availableBorrowsUsd: 10000000000n, liquidationLimitUsd: 170000000000n, healthFactor: 1133333333333333333n,
    });
    expect(getUserReserveData(s, ADDR.weth, borrower)).toEqual([1000000000000000000n, 0n]);
    expect(getUserReserveData(s, ADDR.usdc, borrower)).toEqual([0n, 1500000000n]);
  });
  it('returns the no-loans shape for an empty account', () => {
    expect(getUserAccountData(s, liquidator)).toEqual({ totalCollateralUsd: 0n, totalDebtUsd: 0n, borrowLimitUsd: 0n, availableBorrowsUsd: 0n, liquidationLimitUsd: 0n, healthFactor: MAX_UINT256 });
  });
});

describe('§11 demo: crash the price and liquidate', () => {
  it('replays the script with the guide numbers', () => {
    let s = deployState();
    // 1. Borrower: faucet WETH, supply 1 WETH → collateral $2,000, borrow limit $1,600
    s = run(s, borrower, { contract: 'token', address: ADDR.weth, functionName: 'faucet', args: [] }).state;
    s = run(s, borrower, { contract: 'token', address: ADDR.weth, functionName: 'approve', args: [ADDR.pool, weth('1')] }).state;
    s = run(s, borrower, { contract: 'pool', functionName: 'supply', args: [ADDR.weth, weth('1')] }).state;
    let a = getUserAccountData(s, borrower);
    expect(fmtUsd(a.totalCollateralUsd)).toBe('$2,000.00');
    expect(fmtUsd(a.borrowLimitUsd)).toBe('$1,600.00');

    // 2. Borrow 1,500 USDC → health factor 1.13
    s = run(s, borrower, { contract: 'pool', functionName: 'borrow', args: [ADDR.usdc, usdc('1500')] }).state;
    a = getUserAccountData(s, borrower);
    expect(fmtHealth(a.healthFactor)).toBe('1.13');

    // 3. Owner: setPrice(WETH, $1,700) → HF 0.96, can be liquidated. Anyone else: OwnableUnauthorizedAccount.
    expect(errName(() => run(s, borrower, { contract: 'oracle', functionName: 'setPrice', args: [ADDR.weth, 170000000000n] }))).toBe('OwnableUnauthorizedAccount');
    s = run(s, owner, { contract: 'oracle', functionName: 'setPrice', args: [ADDR.weth, parseUnits('1700', 8)] }).state;
    a = getUserAccountData(s, borrower);
    expect(num(a.healthFactor, 18)).toBeCloseTo(0.9633, 3);
    expect(fmtHealth(a.healthFactor)).toBe('0.96');
    expect(a.healthFactor < 10n ** 18n).toBe(true);
    expect(borrowersFromEvents(s).map((x) => x.toLowerCase())).toContain(borrower.toLowerCase());

    // 4. Liquidator: faucet USDC, approve 750, liquidate(WETH, USDC, borrower, 750 USDC) → ≈ 0.4632 WETH ($787.50)
    s = run(s, liquidator, { contract: 'token', address: ADDR.usdc, functionName: 'faucet', args: [] }).state;
    expect(errName(() => run(s, liquidator, { contract: 'pool', functionName: 'liquidate', args: [ADDR.weth, ADDR.usdc, borrower, usdc('750')] }))).toBe('ERC20InsufficientAllowance');
    s = run(s, liquidator, { contract: 'token', address: ADDR.usdc, functionName: 'approve', args: [ADDR.pool, usdc('750')] }).state;
    const wethBefore = s.balances[ADDR.weth.toLowerCase()]?.[liquidator.toLowerCase()] ?? 0n;
    const liq = run(s, liquidator, { contract: 'pool', functionName: 'liquidate', args: [ADDR.weth, ADDR.usdc, borrower, usdc('750')] });
    s = liq.state;
    const [covered, seized] = liq.result as readonly [bigint, bigint];
    expect(covered).toBe(usdc('750'));
    expect(fmtToken(seized, 18)).toBe('0.4632');
    expect(seized).toBe(463235294117647058n);
    const seizedUsd = (seized * 170000000000n) / 10n ** 18n;
    expect(Number(formatUnits(seizedUsd, 8))).toBeCloseTo(787.5, 1);
    expect((s.balances[ADDR.weth.toLowerCase()]?.[liquidator.toLowerCase()] ?? 0n) - wethBefore).toBe(seized);
    const lastEvent = s.events.at(-1)!;
    expect(lastEvent.eventName).toBe('Liquidation');

    // 5. Refresh the borrower → 0.5368 WETH left, 750 USDC debt, health 1.03
    const [wethLeft] = getUserReserveData(s, ADDR.weth, borrower);
    const [, usdcDebt] = getUserReserveData(s, ADDR.usdc, borrower);
    expect(fmtToken(wethLeft, 18)).toBe('0.5368');
    expect(fmtToken(usdcDebt, 6)).toBe('750');
    a = getUserAccountData(s, borrower);
    expect(fmtHealth(a.healthFactor)).toBe('1.03');

    // A healthy position can't be liquidated again.
    s = run(s, liquidator, { contract: 'token', address: ADDR.usdc, functionName: 'approve', args: [ADDR.pool, usdc('100')] }).state;
    expect(errName(() => run(s, liquidator, { contract: 'pool', functionName: 'liquidate', args: [ADDR.weth, ADDR.usdc, borrower, usdc('100')] }))).toBe('PositionHealthy');
  });

  it('caps a liquidation at 50% of the debt', () => {
    let s = demoState();
    s = run(s, owner, { contract: 'oracle', functionName: 'setPrice', args: [ADDR.weth, parseUnits('1700', 8)] }).state;
    s = run(s, liquidator, { contract: 'token', address: ADDR.usdc, functionName: 'faucet', args: [] }).state;
    s = run(s, liquidator, { contract: 'token', address: ADDR.usdc, functionName: 'approve', args: [ADDR.pool, usdc('5000')] }).state;
    const out = run(s, liquidator, { contract: 'pool', functionName: 'liquidate', args: [ADDR.weth, ADDR.usdc, borrower, usdc('5000')] });
    expect((out.result as readonly [bigint, bigint])[0]).toBe(usdc('750'));
  });
});

describe('pool rules and §9 errors', () => {
  it('throws the guide error names', () => {
    const s = demoState();
    expect(errName(() => run(s, borrower, { contract: 'pool', functionName: 'supply', args: [ADDR.usdc, 0n] }))).toBe('ZeroAmount');
    expect(errName(() => run(s, borrower, { contract: 'pool', functionName: 'supply', args: ['0x0000000000000000000000000000000000000001', 1n] }))).toBe('AssetNotListed');
    expect(errName(() => run(s, borrower, { contract: 'pool', functionName: 'borrow', args: [ADDR.usdc, usdc('200')] }))).toBe('BorrowLimitExceeded');
    expect(errName(() => run(s, borrower, { contract: 'pool', functionName: 'withdraw', args: [ADDR.weth, weth('2')] }))).toBe('InsufficientBalance');
    expect(errName(() => run(s, borrower, { contract: 'pool', functionName: 'withdraw', args: [ADDR.weth, weth('0.5')] }))).toBe('HealthFactorTooLow');
    expect(errName(() => run(s, borrower, { contract: 'pool', functionName: 'borrow', args: [ADDR.weth, weth('20')] }))).toBe('InsufficientLiquidity');
    expect(errName(() => run(s, liquidator, { contract: 'pool', functionName: 'repay', args: [ADDR.usdc, usdc('1')] }))).toBe('NoDebt');
    expect(errName(() => run(s, borrower, { contract: 'pool', functionName: 'repay', args: [ADDR.usdc, usdc('1')] }))).toBe('ERC20InsufficientAllowance');
    expect(errName(() => run(s, liquidator, { contract: 'pool', functionName: 'liquidate', args: [ADDR.weth, ADDR.usdc, borrower, usdc('1')] }))).toBe('PositionHealthy');
    expect(errName(() => run(s, owner, { contract: 'oracle', functionName: 'setPrice', args: [ADDR.weth, 0n] }))).toBe('ZeroPrice');
  });
  it('withdraw and repay accept MAX_UINT256 as "all of it"', () => {
    let s = demoState();
    s = run(s, borrower, { contract: 'token', address: ADDR.usdc, functionName: 'approve', args: [ADDR.pool, repayMaxApproval(usdc('1500'))] }).state;
    const repaid = run(s, borrower, { contract: 'pool', functionName: 'repay', args: [ADDR.usdc, MAX_UINT256] });
    expect(repaid.result).toBe(usdc('1500'));
    s = repaid.state;
    expect(getUserAccountData(s, borrower).healthFactor).toBe(MAX_UINT256);
    const w = run(s, borrower, { contract: 'pool', functionName: 'withdraw', args: [ADDR.weth, MAX_UINT256] });
    expect(w.result).toBe(weth('1'));
  });
  it('maps errors to the §9 messages', () => {
    expect(messageFor(new MiniContractError('HealthFactorTooLow'))).toBe('This withdrawal would put your loan at risk of liquidation.');
    expect(messageFor(new MiniContractError('OwnableUnauthorizedAccount'))).toBe('Only the admin can do this.');
    expect(messageFor(new UserRejectedError())).toBe('Transaction cancelled.');
    expect(messageFor(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});

describe('§7 previews', () => {
  const s = demoState();
  const account = getUserAccountData(s, borrower);
  const usdcR = getReserveData(s, ADDR.usdc);
  const wethR = getReserveData(s, ADDR.weth);
  it('matches the engine after each action', () => {
    expect(fmtHealth(healthAfter('borrow', usdc('50'), account, usdcR))).toBe(fmtHealth(getUserAccountData(run(s, borrower, { contract: 'pool', functionName: 'borrow', args: [ADDR.usdc, usdc('50')] }).state, borrower).healthFactor));
    expect(healthAfter('supply', weth('1'), account, wethR)).toBe((340000000000n * 10n ** 18n) / 150000000000n);
    expect(fmtHealth(healthAfter('withdraw', weth('0.1'), account, wethR))).toBe('1.02');
    expect(fmtHealth(healthAfter('repay', usdc('1500'), account, usdcR))).toBe('∞');
  });
  it('computes max borrow with the 1% margin and the liquidity cap', () => {
    // $100 available → 100 USDC → 99 USDC after the 1% margin
    expect(maxBorrow(account, usdcR)).toBe(usdc('99'));
    expect(maxBorrow({ availableBorrowsUsd: parseUnits('1000000', 8) }, usdcR)).toBe(usdcR.availableLiquidity);
  });
  it('previews a liquidation like the engine', () => {
    const p = liquidationPreview(usdc('750'), usdc('1500'), weth('1'), usdcR, { ...wethR, price: parseUnits('1700', 8) });
    expect(p.covered).toBe(usdc('750'));
    expect(p.seized).toBe(463235294117647058n);
    expect(fmtUsd(p.seizedUsd)).toBe('$787.50');
  });
});
