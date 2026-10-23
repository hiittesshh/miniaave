/**
 * "How much can I …?" maths and "what happens if I …?" previews.
 *
 * Buffers mirror the reference interface (verified in its source):
 * - Withdraw keeps HF ≥ 1.01 (WITHDRAW_HF_FLOOR).
 * - Max borrow keeps a 1% margin (BORROW_SAFETY_MARGIN = 0.99) when borrowing power is the binding
 *   constraint, so rounding and interest accrued before the tx lands can't push HF below 1.
 * - Exiting E-Mode is blocked below HF 1.01.
 * - The risk-acknowledgement checkbox appears when the resulting HF < 1.5.
 */
import { HF_INFINITE, summarizePosition, type PositionLine } from './health';

export const WITHDRAW_HF_FLOOR = 1.01;
export const EMODE_EXIT_HF_FLOOR = 1.01;
export const BORROW_SAFETY_MARGIN = 0.99;
export const RISK_ACK_HF_THRESHOLD = 1.5;
/** Native gas token kept back so the user can still pay fees (simulated). */
export const NATIVE_GAS_RESERVE = 0.001;

/** Truncate (not round) to `decimals` places so a max never exceeds the true maximum. */
export function truncate(value: number, decimals: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const f = Math.pow(10, Math.min(decimals, 12));
  return Math.floor(value * f + 1e-9) / f;
}

export interface MaxSupplyInput {
  walletBalance: number;
  isNative?: boolean;
  /** Supply cap in tokens; 0 = no cap. */
  supplyCap: number;
  totalSupplied: number;
  isFrozen?: boolean;
  isPaused?: boolean;
  decimals?: number;
}

export function maxSupply(i: MaxSupplyInput): number {
  if (i.isFrozen || i.isPaused) return 0;
  let max = i.walletBalance;
  if (i.isNative && max > 0) max = Math.max(max - NATIVE_GAS_RESERVE, 0);
  if (i.supplyCap > 0) max = Math.min(max, Math.max(i.supplyCap - i.totalSupplied, 0));
  return truncate(max, i.decimals ?? 18);
}

export interface MaxWithdrawInput {
  supplied: number;
  availableLiquidity: number;
  priceUSD: number;
  collateralEnabled: boolean;
  /** Liquidation threshold that applies to this asset for this user (E-Mode aware). */
  liquidationThreshold: number;
  healthFactor: number;
  totalBorrowedUSD: number;
  decimals?: number;
}

/** Withdraw max that keeps HF ≥ 1.01 (reference: Withdraw/utils.ts). */
export function maxWithdraw(i: MaxWithdrawInput): number {
  let max = Math.min(i.supplied, Math.max(i.availableLiquidity, 0));
  const countsForHF = i.collateralEnabled && i.liquidationThreshold > 0 && i.totalBorrowedUSD > 0;
  if (countsForHF) {
    const excessHF = i.healthFactor - WITHDRAW_HF_FLOOR;
    if (excessHF <= 0) return 0;
    const maxCollateralUSD = (excessHF * i.totalBorrowedUSD) / i.liquidationThreshold;
    max = Math.min(max, maxCollateralUSD / i.priceUSD);
  }
  // A full withdrawal must stay exact so the position can be closed to zero.
  if (max >= i.supplied) return i.supplied;
  return truncate(max, i.decimals ?? 18);
}

export interface MaxBorrowInput {
  availableBorrowsUSD: number;
  priceUSD: number;
  availableLiquidity: number;
  /** Borrow cap in tokens; 0 = no cap. */
  borrowCap: number;
  totalBorrowed: number;
  decimals?: number;
}

/** Borrow max = min(borrowing power / price, liquidity, cap room), with a 1% margin. */
export function maxBorrow(i: MaxBorrowInput): number {
  const capRoom = i.borrowCap > 0 ? Math.max(i.borrowCap - i.totalBorrowed, 0) : Number.POSITIVE_INFINITY;
  const liquidity = Math.max(Math.min(i.availableLiquidity, capRoom), 0);
  const userLimit = i.priceUSD > 0 ? i.availableBorrowsUSD / i.priceUSD : 0;
  let max = Math.min(userLimit, liquidity);
  if (max >= userLimit) max *= BORROW_SAFETY_MARGIN;
  return truncate(max, i.decimals ?? 18);
}

export interface MaxRepayInput {
  debt: number;
  walletBalance: number;
  isNative?: boolean;
  decimals?: number;
}

export function maxRepay(i: MaxRepayInput): number {
  let bal = i.walletBalance;
  if (i.isNative && bal > 0) bal = Math.max(bal - NATIVE_GAS_RESERVE, 0);
  const max = Math.min(bal, i.debt);
  // Repaying the whole debt must be exact, so don't truncate the debt itself.
  if (max === i.debt) return i.debt;
  return truncate(max, i.decimals ?? 18);
}

// ---------------------------------------------------------------------------------------------
// Previews. Each one returns a new set of position lines so the caller can re-summarize. This is
// exact (it recomputes the weighted thresholds) rather than the reference's shortcut formulas.
// ---------------------------------------------------------------------------------------------

export type LineChange =
  | { type: 'supply'; index: number; usd: number; enableCollateral?: boolean }
  | { type: 'withdraw'; index: number; usd: number }
  | { type: 'borrow'; index: number; usd: number }
  | { type: 'repay'; index: number; usd: number; fromSupplied?: boolean }
  | { type: 'collateral'; index: number; enabled: boolean };

export function applyLineChange(lines: PositionLine[], change: LineChange): PositionLine[] {
  return lines.map((l, i) => {
    if (i !== change.index) return l;
    switch (change.type) {
      case 'supply':
        return {
          ...l,
          suppliedUSD: l.suppliedUSD + change.usd,
          collateralEnabled: change.enableCollateral ?? l.collateralEnabled,
        };
      case 'withdraw':
        return { ...l, suppliedUSD: Math.max(l.suppliedUSD - change.usd, 0) };
      case 'borrow':
        return { ...l, borrowedUSD: l.borrowedUSD + change.usd };
      case 'repay':
        return {
          ...l,
          borrowedUSD: Math.max(l.borrowedUSD - change.usd, 0),
          suppliedUSD: change.fromSupplied ? Math.max(l.suppliedUSD - change.usd, 0) : l.suppliedUSD,
        };
      case 'collateral':
        return { ...l, collateralEnabled: change.enabled };
    }
  });
}

/** Health factor after a hypothetical change. */
export function healthFactorAfter(lines: PositionLine[], change: LineChange): number {
  return summarizePosition(applyLineChange(lines, change)).healthFactor;
}

/** Whether the risk checkbox ("I acknowledge the risks involved.") must be ticked. */
export function requiresRiskAcknowledgement(hfAfter: number): boolean {
  return hfAfter !== HF_INFINITE && hfAfter < RISK_ACK_HF_THRESHOLD;
}
