import { describe, expect, it } from 'vitest';
import {
  aprToApy,
  applyLineChange,
  BORROW_SAFETY_MARGIN,
  capacityFilled,
  closeFactor,
  effectiveBorrowRate,
  healthFactor,
  healthFactorAfter,
  isLiquidatable,
  liquidationPrice,
  maxBorrow,
  maxRepay,
  maxSupply,
  maxWithdraw,
  rateCurve,
  requiresRiskAcknowledgement,
  reserveRates,
  riskPremium,
  summarizePosition,
  supplyRate,
  truncate,
  utilization,
  variableBorrowRate,
  type PositionLine,
  type RateStrategy,
} from '..';

const usdcStrategy: RateStrategy = { baseRate: 0, slope1: 0.06, slope2: 0.6, optimalUsage: 0.9 };

describe('utilization', () => {
  it('is borrowed / supplied', () => {
    expect(utilization(45, 100)).toBeCloseTo(0.45);
  });
  it('is 0 for an empty pool and caps at 1', () => {
    expect(utilization(0, 0)).toBe(0);
    expect(utilization(10, 0)).toBe(0);
    expect(utilization(150, 100)).toBe(1);
  });
});

describe('variableBorrowRate (two-slope model)', () => {
  it('is the base rate at 0% utilization', () => {
    expect(variableBorrowRate(0, { ...usdcStrategy, baseRate: 0.01 })).toBeCloseTo(0.01);
  });
  it('rises linearly with slope1 up to the kink', () => {
    expect(variableBorrowRate(0.45, usdcStrategy)).toBeCloseTo(0.03); // half of slope1
    expect(variableBorrowRate(0.9, usdcStrategy)).toBeCloseTo(0.06); // base + slope1
  });
  it('adds slope2 above the kink', () => {
    // 95% is halfway between 90% and 100% → base + slope1 + slope2/2
    expect(variableBorrowRate(0.95, usdcStrategy)).toBeCloseTo(0.06 + 0.3);
    expect(variableBorrowRate(1, usdcStrategy)).toBeCloseTo(0.66);
  });
  it('is continuous at the kink', () => {
    const below = variableBorrowRate(0.8999999, usdcStrategy);
    const above = variableBorrowRate(0.9000001, usdcStrategy);
    expect(Math.abs(above - below)).toBeLessThan(1e-5);
  });
  it('produces a 201-point curve for the chart', () => {
    const curve = rateCurve(usdcStrategy);
    expect(curve).toHaveLength(201);
    expect(curve[0].borrowRate).toBe(0);
    expect(curve[200].borrowRate).toBeCloseTo(0.66);
  });
});

describe('supply rate and APY', () => {
  it('supplyRate = borrowRate × U × (1 − reserveFactor)', () => {
    expect(supplyRate(0.05, 0.8, 0.1)).toBeCloseTo(0.036);
  });
  it('aprToApy compounds per second', () => {
    expect(aprToApy(0)).toBe(0);
    // 5% APR ≈ 5.127% APY with continuous-ish compounding
    expect(aprToApy(0.05)).toBeCloseTo(Math.exp(0.05) - 1, 6);
  });
  it('reserveRates bundles everything consistently', () => {
    const r = reserveRates(80, 100, usdcStrategy, 0.1);
    expect(r.utilization).toBeCloseTo(0.8);
    expect(r.variableBorrowAPR).toBeCloseTo(0.06 * (0.8 / 0.9));
    expect(r.supplyAPR).toBeCloseTo(r.variableBorrowAPR * 0.8 * 0.9);
    expect(r.supplyAPY).toBeGreaterThan(r.supplyAPR);
    expect(r.supplyAPY).toBeLessThan(r.variableBorrowAPY);
  });
});

const demoLines: PositionLine[] = [
  // WETH collateral: $13,000 at LTV 80.5%, LT 83%
  { suppliedUSD: 13_000, borrowedUSD: 0, collateralEnabled: true, ltv: 0.805, liquidationThreshold: 0.83, supplyAPY: 0.02 },
  // USDC: supplied but NOT collateral, and borrowed $9,000
  { suppliedUSD: 5_000, borrowedUSD: 9_000, collateralEnabled: false, ltv: 0.75, liquidationThreshold: 0.78, supplyAPY: 0.04, borrowAPY: 0.05 },
];

describe('health factor', () => {
  it('is Σ(collateral × LT) / debt', () => {
    expect(healthFactor(10_790, 9_000)).toBeCloseTo(1.19889, 4);
  });
  it('is Infinity with no debt', () => {
    expect(healthFactor(1000, 0)).toBe(Infinity);
    expect(isLiquidatable(Infinity)).toBe(false);
  });
  it('flags positions below 1 as liquidatable', () => {
    expect(isLiquidatable(0.99)).toBe(true);
    expect(isLiquidatable(1)).toBe(false);
  });
  it('summarizePosition ignores non-collateral supply for HF but counts it for net worth', () => {
    const s = summarizePosition(demoLines);
    expect(s.totalCollateralUSD).toBe(13_000);
    expect(s.totalSuppliedUSD).toBe(18_000);
    expect(s.netWorthUSD).toBe(9_000);
    expect(s.healthFactor).toBeCloseTo((13_000 * 0.83) / 9_000);
    expect(s.maxBorrowUSD).toBeCloseTo(13_000 * 0.805);
    expect(s.availableBorrowsUSD).toBeCloseTo(13_000 * 0.805 - 9_000);
    expect(s.borrowPowerUsed).toBeCloseTo(9_000 / (13_000 * 0.805));
  });
  it('net APY = (earned − paid) / net worth', () => {
    const s = summarizePosition(demoLines);
    const earned = 13_000 * 0.02 + 5_000 * 0.04;
    const paid = 9_000 * 0.05;
    expect(s.netAPY).toBeCloseTo((earned - paid) / 9_000);
  });
});

describe('liquidation helpers', () => {
  it('liquidation price = debt / (amount × LT)', () => {
    // 4 ETH collateral, LT 83%, $9,000 debt → ETH must fall to $2,710.84
    expect(liquidationPrice(9_000, 4, 0.83)).toBeCloseTo(2710.84, 1);
  });
  it('close factor: 0 when healthy, 50% normally, 100% when HF ≤ 0.95 or dust', () => {
    expect(closeFactor(1.2, 50_000, 30_000)).toBe(0);
    expect(closeFactor(0.98, 50_000, 30_000)).toBe(0.5);
    expect(closeFactor(0.95, 50_000, 30_000)).toBe(1);
    expect(closeFactor(0.98, 1_500, 30_000)).toBe(1);
    expect(closeFactor(0.98, 50_000, 1_999)).toBe(1);
  });
});

describe('max amounts', () => {
  it('truncates instead of rounding', () => {
    expect(truncate(1.23456789, 4)).toBe(1.2345);
    expect(truncate(-1, 4)).toBe(0);
  });

  it('max supply = wallet balance limited by cap room, minus a gas reserve for native', () => {
    expect(maxSupply({ walletBalance: 100, supplyCap: 0, totalSupplied: 0 })).toBe(100);
    expect(maxSupply({ walletBalance: 100, supplyCap: 1000, totalSupplied: 950 })).toBe(50);
    expect(maxSupply({ walletBalance: 1, isNative: true, supplyCap: 0, totalSupplied: 0 })).toBeCloseTo(0.999);
    expect(maxSupply({ walletBalance: 100, supplyCap: 0, totalSupplied: 0, isFrozen: true })).toBe(0);
  });

  it('max withdraw keeps HF ≥ 1.01', () => {
    const s = summarizePosition(demoLines);
    const max = maxWithdraw({
      supplied: 4, // 4 WETH = $13,000 at $3,250
      availableLiquidity: 1e9,
      priceUSD: 3250,
      collateralEnabled: true,
      liquidationThreshold: 0.83,
      healthFactor: s.healthFactor,
      totalBorrowedUSD: s.totalBorrowedUSD,
    });
    const hfAfter = healthFactorAfter(demoLines, { type: 'withdraw', index: 0, usd: max * 3250 });
    expect(hfAfter).toBeGreaterThanOrEqual(1.01 - 1e-6);
    expect(hfAfter).toBeLessThan(1.02);
  });

  it('max withdraw is the full balance with no debt, and limited by liquidity', () => {
    const base = {
      supplied: 10,
      priceUSD: 1,
      collateralEnabled: true,
      liquidationThreshold: 0.8,
      healthFactor: Infinity,
      totalBorrowedUSD: 0,
    };
    expect(maxWithdraw({ ...base, availableLiquidity: 1e9 })).toBe(10);
    expect(maxWithdraw({ ...base, availableLiquidity: 4 })).toBe(4);
  });

  it('max borrow applies the 1% margin when borrowing power binds', () => {
    const max = maxBorrow({ availableBorrowsUSD: 1000, priceUSD: 1, availableLiquidity: 1e9, borrowCap: 0, totalBorrowed: 0, decimals: 6 });
    expect(max).toBeCloseTo(1000 * BORROW_SAFETY_MARGIN);
  });

  it('max borrow is limited by liquidity and the borrow cap', () => {
    expect(maxBorrow({ availableBorrowsUSD: 1000, priceUSD: 1, availableLiquidity: 300, borrowCap: 0, totalBorrowed: 0 })).toBe(300);
    expect(maxBorrow({ availableBorrowsUSD: 1000, priceUSD: 1, availableLiquidity: 1e9, borrowCap: 500, totalBorrowed: 450 })).toBe(50);
  });

  it('max repay = min(wallet, debt), exact when the whole debt can be repaid', () => {
    expect(maxRepay({ debt: 100.123456, walletBalance: 1000 })).toBe(100.123456);
    expect(maxRepay({ debt: 100, walletBalance: 40 })).toBe(40);
  });
});

describe('previews', () => {
  it('borrowing lowers HF; repaying raises it; disabling collateral can make it liquidatable', () => {
    const hf0 = summarizePosition(demoLines).healthFactor;
    expect(healthFactorAfter(demoLines, { type: 'borrow', index: 1, usd: 1000 })).toBeLessThan(hf0);
    expect(healthFactorAfter(demoLines, { type: 'repay', index: 1, usd: 1000 })).toBeGreaterThan(hf0);
    expect(healthFactorAfter(demoLines, { type: 'collateral', index: 0, enabled: false })).toBe(0);
  });
  it('supplying with collateral enabled raises HF', () => {
    const hf0 = summarizePosition(demoLines).healthFactor;
    const after = applyLineChange(demoLines, { type: 'supply', index: 1, usd: 0, enableCollateral: true });
    expect(summarizePosition(after).healthFactor).toBeGreaterThan(hf0);
  });
  it('risk checkbox threshold is HF < 1.5 (never for ∞)', () => {
    expect(requiresRiskAcknowledgement(1.49)).toBe(true);
    expect(requiresRiskAcknowledgement(1.5)).toBe(false);
    expect(requiresRiskAcknowledgement(Infinity)).toBe(false);
  });
});

describe('V4 risk premium', () => {
  it('weights the safest collateral first, only up to the debt', () => {
    // $10k debt covered by $8k of 0%-risk collateral and $2k of the 20%-risk one.
    const rp = riskPremium(
      [
        { valueUSD: 50_000, collateralRisk: 0.2 },
        { valueUSD: 8_000, collateralRisk: 0 },
      ],
      10_000
    );
    expect(rp).toBeCloseTo((2_000 * 0.2) / 10_000);
  });
  it('is 0 without debt', () => {
    expect(riskPremium([{ valueUSD: 1, collateralRisk: 0.5 }], 0)).toBe(0);
  });
  it('effective rate = base × (1 + premium)', () => {
    expect(effectiveBorrowRate(0.05, 0.1)).toBeCloseTo(0.055);
  });
  it('capacity filled = supplied / cap', () => {
    expect(capacityFilled(50, 200)).toBe(0.25);
    expect(capacityFilled(50, 0)).toBe(0);
  });
});
