/**
 * Position-level maths: health factor, borrowing power, LTV, net APY.
 *
 * A "position line" is one asset inside a user's position, already converted to USD so the
 * functions stay unit-agnostic. Thresholds are fractions (0.825 = 82.5%).
 */

export interface PositionLine {
  /** USD value supplied (deposited) of this asset. */
  suppliedUSD: number;
  /** USD value borrowed of this asset. */
  borrowedUSD: number;
  /** Whether the supplied amount counts as collateral. */
  collateralEnabled: boolean;
  /** Max loan-to-value: how much borrowing power each $ of collateral gives. (V4: collateral factor.) */
  ltv: number;
  /** Liquidation threshold: the collateral weight used by the health factor. (V4: collateral factor.) */
  liquidationThreshold: number;
  /** Supply APY of the asset (fraction). Only needed for net APY. */
  supplyAPY?: number;
  /** Borrow APY of the asset (fraction). Only needed for net APY. */
  borrowAPY?: number;
}

/** Health factor value meaning "no debt" (shown as ∞ / "—" in the UI). */
export const HF_INFINITE = Number.POSITIVE_INFINITY;

export interface PositionSummary {
  totalSuppliedUSD: number;
  totalCollateralUSD: number;
  totalBorrowedUSD: number;
  netWorthUSD: number;
  /** Σ(collateralUSD × liquidationThreshold). */
  weightedThresholdUSD: number;
  /** Σ(collateralUSD × ltv). */
  maxBorrowUSD: number;
  /** Weighted-average liquidation threshold across collateral (0 if no collateral). */
  liquidationThreshold: number;
  /** Weighted-average max LTV across collateral (0 if no collateral). */
  maxLTV: number;
  /** totalBorrowed / totalCollateral (0 if no collateral). */
  currentLTV: number;
  /** Remaining borrowing power in USD, never negative. */
  availableBorrowsUSD: number;
  /** Share of borrowing power in use, 0..1 (can exceed 1 when underwater). */
  borrowPowerUsed: number;
  healthFactor: number;
  /** Weighted supply APY across all supplied assets. */
  earnedAPY: number;
  /** Weighted borrow APY across all debts. */
  debtAPY: number;
  /** (earned − paid) / net worth. */
  netAPY: number;
}

/** healthFactor = Σ(collateralUSD × LT) / totalDebtUSD. Infinity when there is no debt. */
export function healthFactor(collateralTimesThresholdUSD: number, totalDebtUSD: number): number {
  if (totalDebtUSD <= 0) return HF_INFINITE;
  return collateralTimesThresholdUSD / totalDebtUSD;
}

/** True when a position can be liquidated (HF strictly below 1). */
export function isLiquidatable(hf: number): boolean {
  return Number.isFinite(hf) && hf < 1;
}

export function summarizePosition(lines: PositionLine[]): PositionSummary {
  let totalSuppliedUSD = 0;
  let totalCollateralUSD = 0;
  let totalBorrowedUSD = 0;
  let weightedThresholdUSD = 0;
  let maxBorrowUSD = 0;
  let earned = 0;
  let paid = 0;

  for (const l of lines) {
    totalSuppliedUSD += l.suppliedUSD;
    totalBorrowedUSD += l.borrowedUSD;
    earned += l.suppliedUSD * (l.supplyAPY ?? 0);
    paid += l.borrowedUSD * (l.borrowAPY ?? 0);
    if (l.collateralEnabled && l.suppliedUSD > 0) {
      totalCollateralUSD += l.suppliedUSD;
      weightedThresholdUSD += l.suppliedUSD * l.liquidationThreshold;
      maxBorrowUSD += l.suppliedUSD * l.ltv;
    }
  }

  const netWorthUSD = totalSuppliedUSD - totalBorrowedUSD;
  const availableBorrowsUSD = Math.max(maxBorrowUSD - totalBorrowedUSD, 0);
  const borrowPowerUsed = maxBorrowUSD > 0 ? totalBorrowedUSD / maxBorrowUSD : totalBorrowedUSD > 0 ? 1 : 0;

  return {
    totalSuppliedUSD,
    totalCollateralUSD,
    totalBorrowedUSD,
    netWorthUSD,
    weightedThresholdUSD,
    maxBorrowUSD,
    liquidationThreshold: totalCollateralUSD > 0 ? weightedThresholdUSD / totalCollateralUSD : 0,
    maxLTV: totalCollateralUSD > 0 ? maxBorrowUSD / totalCollateralUSD : 0,
    currentLTV: totalCollateralUSD > 0 ? totalBorrowedUSD / totalCollateralUSD : 0,
    availableBorrowsUSD,
    borrowPowerUsed,
    healthFactor: healthFactor(weightedThresholdUSD, totalBorrowedUSD),
    earnedAPY: totalSuppliedUSD > 0 ? earned / totalSuppliedUSD : 0,
    debtAPY: totalBorrowedUSD > 0 ? paid / totalBorrowedUSD : 0,
    // Matches @aave/math-utils: (earnedAPY × supplied − debtAPY × borrowed) / netWorth.
    netAPY: netWorthUSD > 0 ? (earned - paid) / netWorthUSD : 0,
  };
}

/** Borrowing power in USD: Σ(collateralUSD × LTV) − totalDebtUSD (may be negative). */
export function borrowPowerUSD(lines: PositionLine[]): number {
  const s = summarizePosition(lines);
  return s.maxBorrowUSD - s.totalBorrowedUSD;
}

/**
 * Liquidation price of a single-collateral position: the collateral price at which HF hits 1.
 *   price = debtUSD / (collateralAmount × LT)
 */
export function liquidationPrice(
  debtUSD: number,
  collateralAmount: number,
  liquidationThreshold: number
): number {
  if (collateralAmount <= 0 || liquidationThreshold <= 0) return 0;
  return debtUSD / (collateralAmount * liquidationThreshold);
}

/**
 * Aave V3.2+ close factor: how much of a position's debt a liquidator may repay in one call.
 * 50% normally; 100% when HF ≤ 0.95 or when the collateral or debt is a small dust position
 * (below $2,000).
 */
export const CLOSE_FACTOR_HF_THRESHOLD = 0.95;
export const MIN_BASE_MAX_CLOSE_FACTOR_USD = 2000;

export function closeFactor(hf: number, collateralUSD: number, debtUSD: number): number {
  if (!isLiquidatable(hf)) return 0;
  if (
    hf <= CLOSE_FACTOR_HF_THRESHOLD ||
    collateralUSD < MIN_BASE_MAX_CLOSE_FACTOR_USD ||
    debtUSD < MIN_BASE_MAX_CLOSE_FACTOR_USD
  ) {
    return 1;
  }
  return 0.5;
}
