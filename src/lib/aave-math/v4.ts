/**
 * Aave V4 additions used by the Pro app.
 *
 * V4 splits a market into Hubs (where liquidity lives and interest rates are set) and Spokes
 * (where users hold positions). Two ideas matter for the UI:
 *
 * 1. A single "collateral factor" (CF) per reserve plays the role of both V3's LTV and
 *    liquidation threshold, so health factor = Σ(collateral × CF) / debt.
 * 2. "Risk premium": borrowers pay extra interest depending on how risky their collateral is.
 *    Each collateral asset has a governance-set `collateralRisk`. The user's premium is the
 *    weighted average risk of the collateral needed to cover their debt, taking the safest
 *    collateral first. The effective borrow rate is baseRate × (1 + premium).
 *
 * This is a simplified model of the V4 design, good enough for a demo. Real V4 tracks premium
 * shares and offsets on-chain.
 */

export interface CollateralRiskInput {
  valueUSD: number;
  /** Fraction, e.g. 0.2 = 20%. */
  collateralRisk: number;
}

export function riskPremium(collaterals: CollateralRiskInput[], debtUSD: number): number {
  if (debtUSD <= 0) return 0;
  const sorted = [...collaterals]
    .filter((c) => c.valueUSD > 0)
    .sort((a, b) => a.collateralRisk - b.collateralRisk);
  let remaining = debtUSD;
  let weighted = 0;
  for (const c of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(c.valueUSD, remaining);
    weighted += take * c.collateralRisk;
    remaining -= take;
  }
  const covered = debtUSD - Math.max(remaining, 0);
  return covered > 0 ? weighted / covered : 0;
}

/** Effective borrow APY once the user's risk premium is applied. */
export function effectiveBorrowRate(baseBorrowRate: number, premium: number): number {
  return baseBorrowRate * (1 + premium);
}

/** The extra APY a user pays because of their risk premium ("Risk Premium Impact"). */
export function riskPremiumImpact(baseBorrowRate: number, premium: number): number {
  return baseBorrowRate * premium;
}

/** Capacity filled = supplied / cap. Returns 0 when there is no cap. */
export function capacityFilled(supplied: number, cap: number): number {
  if (cap <= 0) return 0;
  return Math.min(supplied / cap, 1);
}
