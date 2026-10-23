/**
 * Interest-rate maths for Aave-style lending pools.
 *
 * Every rate here is a FRACTION (0.05 = 5%), not a percentage, and not a "ray". The on-chain
 * protocol uses 27-decimal fixed point; a UI only needs float precision for display and previews.
 */

export const SECONDS_PER_YEAR = 31_536_000;

/** Parameters of a two-slope ("kinked") interest rate strategy. */
export interface RateStrategy {
  /** Borrow rate at 0% utilization. */
  baseRate: number;
  /** Extra borrow rate added between 0% and the optimal utilization. */
  slope1: number;
  /** Extra borrow rate added between the optimal utilization and 100%. Usually steep. */
  slope2: number;
  /** The "kink" point, e.g. 0.9 = 90%. Must be strictly between 0 and 1. */
  optimalUsage: number;
}

/** U = totalBorrowed / totalSupplied. Returns 0 for an empty pool and caps at 1. */
export function utilization(totalBorrowed: number, totalSupplied: number): number {
  if (totalSupplied <= 0 || totalBorrowed <= 0) return 0;
  return Math.min(totalBorrowed / totalSupplied, 1);
}

/**
 * Variable borrow APR for a given utilization.
 *   U ≤ optimal:  base + slope1 × U / optimal
 *   U > optimal:  base + slope1 + slope2 × (U − optimal) / (1 − optimal)
 */
export function variableBorrowRate(u: number, s: RateStrategy): number {
  const U = clamp01(u);
  if (U <= s.optimalUsage) {
    return s.baseRate + (s.slope1 * U) / s.optimalUsage;
  }
  const excess = (U - s.optimalUsage) / (1 - s.optimalUsage);
  return s.baseRate + s.slope1 + s.slope2 * excess;
}

/**
 * Supply APR: what borrowers pay, spread across all suppliers, minus the protocol's cut.
 *   supplyRate = borrowRate × U × (1 − reserveFactor)
 * In Aave V4 the protocol cut is called the hub's "liquidity fee" — same formula.
 */
export function supplyRate(borrowRate: number, u: number, reserveFactor: number): number {
  return borrowRate * clamp01(u) * (1 - reserveFactor);
}

/** Converts an APR to an APY with per-second compounding: (1 + APR/secs)^secs − 1. */
export function aprToApy(apr: number): number {
  if (apr === 0) return 0;
  return Math.pow(1 + apr / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;
}

/** Convenience bundle used by the data layer to derive a reserve's live rates. */
export function reserveRates(
  totalBorrowed: number,
  totalSupplied: number,
  strategy: RateStrategy,
  reserveFactor: number
) {
  const u = utilization(totalBorrowed, totalSupplied);
  const borrowApr = variableBorrowRate(u, strategy);
  const supplyApr = supplyRate(borrowApr, u, reserveFactor);
  return {
    utilization: u,
    variableBorrowAPR: borrowApr,
    supplyAPR: supplyApr,
    variableBorrowAPY: aprToApy(borrowApr),
    supplyAPY: aprToApy(supplyApr),
  };
}

/**
 * Points for drawing the interest-rate-model chart (borrow APR against utilization).
 * `steps` = 200 gives 0.5% resolution, matching the reference chart's 201 points.
 */
export function rateCurve(strategy: RateStrategy, steps = 200) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    return { utilization: u, borrowRate: variableBorrowRate(u, strategy) };
  });
}

function clamp01(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n > 1 ? 1 : n;
}
