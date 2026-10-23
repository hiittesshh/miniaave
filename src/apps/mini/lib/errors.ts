/**
 * Named contract errors (guide §9). The mock engine throws `MiniContractError(name)`, exactly the
 * names viem would decode from the ABIs; the UI only ever shows `messageFor(error)`.
 */

export type MiniErrorName =
  | 'ZeroAmount'
  | 'AssetNotListed'
  | 'InsufficientBalance'
  | 'InsufficientLiquidity'
  | 'BorrowLimitExceeded'
  | 'HealthFactorTooLow'
  | 'PositionHealthy'
  | 'NoDebt'
  | 'NoCollateral'
  | 'OwnableUnauthorizedAccount'
  | 'SafeERC20FailedOperation'
  | 'ReentrancyGuardReentrantCall'
  | 'ERC20InsufficientAllowance'
  | 'ERC20InsufficientBalance'
  | 'ZeroPrice'
  | 'PriceNotSet';

export const MESSAGES: Record<MiniErrorName, string> = {
  ZeroAmount: 'Enter an amount greater than 0 (or the amount is too small).',
  AssetNotListed: "This token isn't supported.",
  InsufficientBalance: "You can't withdraw more than you supplied.",
  InsufficientLiquidity: 'Not enough liquidity in the pool right now. Try a smaller amount or later.',
  BorrowLimitExceeded: 'This would exceed your borrow limit.',
  HealthFactorTooLow: 'This withdrawal would put your loan at risk of liquidation.',
  PositionHealthy: "This position is healthy and can't be liquidated.",
  NoDebt: "There's no debt to repay here.",
  NoCollateral: 'This user has no collateral in that token.',
  OwnableUnauthorizedAccount: 'Only the admin can do this.',
  SafeERC20FailedOperation: 'The token transfer failed.',
  ReentrancyGuardReentrantCall: "Transaction failed. (Shouldn't happen in normal use.)",
  ERC20InsufficientAllowance: 'Please approve the token first.',
  ERC20InsufficientBalance: 'Not enough tokens in your wallet.',
  ZeroPrice: 'Price not available.',
  PriceNotSet: 'Price not available.',
};

/** A decoded revert: the error name from the ABI, like viem's `ContractFunctionRevertedError`. */
export class MiniContractError extends Error {
  readonly errorName: MiniErrorName;
  constructor(errorName: MiniErrorName) {
    super(errorName);
    this.name = 'MiniContractError';
    this.errorName = errorName;
  }
}

/** The wallet's "user rejected the request" (mock wallet: the Reject button in the step list). */
export class UserRejectedError extends Error {
  constructor() {
    super('User rejected the request');
    this.name = 'UserRejectedError';
  }
}

/**
 * A revert we can't name: a receipt with status "reverted", or a revert whose selector isn't in our
 * ABIs (§9 code sample: `MESSAGES[name] ?? "Transaction failed."`). `errorName` / `signature` are
 * kept for console logs only, never shown.
 */
export class TxRevertedError extends Error {
  readonly errorName?: string;
  constructor(errorName?: string) {
    super(errorName ? `Reverted: ${errorName}` : 'Transaction reverted');
    this.name = 'TxRevertedError';
    this.errorName = errorName;
  }
}

/** §9 mapping: named revert → its message; user rejection → "Transaction cancelled."; else generic. */
export function messageFor(err: unknown): string {
  if (err instanceof UserRejectedError) return 'Transaction cancelled.';
  if (err instanceof MiniContractError) return MESSAGES[err.errorName] ?? 'Transaction failed.';
  if (err instanceof TxRevertedError) return 'Transaction failed.';
  return 'Something went wrong. Please try again.';
}

export const isMiniErrorName = (name: unknown): name is MiniErrorName => typeof name === 'string' && Object.prototype.hasOwnProperty.call(MESSAGES, name);
