/**
 * §7 maths for the screens, all in BigInt, from the same shapes the contracts return.
 */
import type { ReserveView, UserAccountData } from '../data/types';
import { MAX_UINT256, minBig, pow10 } from './units';

const WAD = 10n ** 18n;

/** Token amount → USD (8 decimals): X·price = X * price / 10^decimals. */
export const toUsd = (amount: bigint, price: bigint, decimals: number) => (amount * price) / pow10(decimals);

/** liquidationLimit ÷ debt as WAD; MAX_UINT256 with no debt (like the contract). */
export const healthFrom = (liquidationLimitUsd: bigint, debtUsd: bigint) => (debtUsd <= 0n ? MAX_UINT256 : (liquidationLimitUsd * WAD) / debtUsd);

export type PreviewAction = 'supply' | 'withdraw' | 'borrow' | 'repay';

/**
 * Health factor after an action (§7 table):
 * - Supply X:   (liquidationLimit + X·price·threshold) ÷ debt
 * - Withdraw X: (liquidationLimit − X·price·threshold) ÷ debt
 * - Borrow Y:   liquidationLimit ÷ (debt + Y·price)
 * - Repay Y:    liquidationLimit ÷ (debt − Y·price)
 */
export function healthAfter(action: PreviewAction, amount: bigint, account: Pick<UserAccountData, 'liquidationLimitUsd' | 'totalDebtUsd'>, reserve: Pick<ReserveView, 'price' | 'decimals' | 'liquidationThreshold'>): bigint {
  const usd = toUsd(amount, reserve.price, reserve.decimals);
  const weighted = (usd * BigInt(reserve.liquidationThreshold)) / 10000n;
  const { liquidationLimitUsd: limit, totalDebtUsd: debt } = account;
  if (action === 'supply') return healthFrom(limit + weighted, debt);
  if (action === 'withdraw') return healthFrom(limit > weighted ? limit - weighted : 0n, debt);
  if (action === 'borrow') return healthFrom(limit, debt + usd);
  return healthFrom(limit, debt > usd ? debt - usd : 0n);
}

/**
 * Max you can borrow, in tokens (§7): availableBorrowsUsd → token units, minus a 1% margin
 * (interest moves), capped at the pool's cash.
 */
export function maxBorrow(account: Pick<UserAccountData, 'availableBorrowsUsd'>, reserve: Pick<ReserveView, 'price' | 'decimals' | 'availableLiquidity'>): bigint {
  if (reserve.price <= 0n) return 0n;
  const maxByLimit = (account.availableBorrowsUsd * pow10(reserve.decimals)) / reserve.price;
  const withMargin = (maxByLimit * 99n) / 100n;
  return minBig(withMargin, reserve.availableLiquidity);
}

/** Repay Max approves a little more than the debt, because it grows while the user signs (§8). */
export const repayMaxApproval = (borrowed: bigint) => borrowed + borrowed / 1000n + 1n;

/**
 * Liquidation preview (§5/§11): at most 50% of the debt per call; collateral seized is worth the
 * covered debt + the liquidation bonus, capped at what the borrower has.
 */
export function liquidationPreview(debtToCover: bigint, userDebt: bigint, userCollateral: bigint, debt: Pick<ReserveView, 'price' | 'decimals'>, collateral: Pick<ReserveView, 'price' | 'decimals' | 'liquidationBonus'>) {
  const maxCover = userDebt / 2n;
  let covered = minBig(debtToCover, maxCover);
  const coveredUsd = toUsd(covered, debt.price, debt.decimals);
  const seizedUsd = (coveredUsd * BigInt(10000 + collateral.liquidationBonus)) / 10000n;
  let seized = collateral.price > 0n ? (seizedUsd * pow10(collateral.decimals)) / collateral.price : 0n;
  if (seized > userCollateral) {
    seized = userCollateral;
    const seizedValue = toUsd(seized, collateral.price, collateral.decimals);
    const coverUsd = (seizedValue * 10000n) / BigInt(10000 + collateral.liquidationBonus);
    covered = (coverUsd * pow10(debt.decimals)) / debt.price;
  }
  return { maxCover, covered, seized, seizedUsd: toUsd(seized, collateral.price, collateral.decimals) };
}
