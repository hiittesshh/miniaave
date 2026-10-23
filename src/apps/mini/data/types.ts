/**
 * Shapes of the Mini-Aave contract return values (guide §6 / §12). Everything here is exactly what
 * viem returns from the real ABIs: bigint for uint256, number for uint8 / uint16 fields.
 */

export type Address = `0x${string}`;

/** `getReserveData(asset)` */
export interface ReserveView {
  asset: Address;
  decimals: number;
  /** USD, 8 decimals */
  price: bigint;
  /** token units */
  totalSupplied: bigint;
  totalBorrowed: bigint;
  availableLiquidity: bigint;
  /** WAD */
  utilization: bigint;
  /** WAD, APR */
  supplyRate: bigint;
  borrowRate: bigint;
  /** BPS */
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
}

/** `getUserAccountData(user)`; all USD fields have 8 decimals, healthFactor is WAD. */
export interface UserAccountData {
  totalCollateralUsd: bigint;
  totalDebtUsd: bigint;
  borrowLimitUsd: bigint;
  availableBorrowsUsd: bigint;
  liquidationLimitUsd: bigint;
  /** MAX_UINT256 when there is no debt */
  healthFactor: bigint;
}

/** `getReserveConfig(asset)` */
export interface ReserveConfig {
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  reserveFactor: number;
  baseRate: bigint;
  slope1: bigint;
  slope2: bigint;
  optimalUtilization: bigint;
}

/** `getUserReserveData(asset, user)` → [supplied, borrowed], token units. */
export type UserReserveData = readonly [supplied: bigint, borrowed: bigint];

/** Token metadata (`symbol()`, `name()`, `decimals()` on the token contract). */
export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
}

/** Decoded pool events (§10) plus the oracle's PriceSet. */
export type MiniEvent = (
  | { eventName: 'Supply' | 'Withdraw' | 'Borrow' | 'Repay'; args: { asset: Address; user: Address; amount: bigint } }
  | { eventName: 'Liquidation'; args: { collateralAsset: Address; debtAsset: Address; user: Address; debtCovered: bigint; collateralSeized: bigint; liquidator: Address } }
  | { eventName: 'PriceSet'; args: { asset: Address; price: bigint } }
) & { blockNumber: bigint; transactionHash: `0x${string}`; logIndex: number; /** mock block time (ms) */ timestamp: number };

/** A contract write, as `{ address, functionName, args }` (what viem's writeContract takes). */
export type WriteCall =
  | { contract: 'pool'; functionName: 'supply' | 'withdraw' | 'borrow' | 'repay'; args: readonly [asset: Address, amount: bigint] }
  | { contract: 'pool'; functionName: 'liquidate'; args: readonly [collateralAsset: Address, debtAsset: Address, user: Address, debtToCover: bigint] }
  | { contract: 'token'; address: Address; functionName: 'approve'; args: readonly [spender: Address, amount: bigint] }
  | { contract: 'token'; address: Address; functionName: 'faucet'; args: readonly [] }
  | { contract: 'oracle'; functionName: 'setPrice'; args: readonly [asset: Address, price: bigint] };

export interface Receipt {
  transactionHash: `0x${string}`;
  status: 'success' | 'reverted';
  blockNumber: bigint;
}
