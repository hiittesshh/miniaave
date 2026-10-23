/**
 * What each modal sends (§8 "The other actions" + "Max buttons"). Pure, unit-tested, and the same
 * for the mock and the chain:
 *   Supply    approve `amount`, supply(asset, amount)
 *   Withdraw  no approve,       withdraw(asset, amount)   Max → withdraw(asset, maxUint256)
 *   Borrow    no approve,       borrow(asset, amount)
 *   Repay     approve `amount`, repay(asset, amount)      Max → repay(asset, maxUint256),
 *                                                          approving debt + 0.1% (debt grows while signing)
 *   Liquidate approve `debtToCover` of the debt token, liquidate(coll, debt, user, debtToCover)
 */
import type { Address, WriteCall } from '../data/types';
import { repayMaxApproval } from '../lib/preview';
import { MAX_UINT256 } from '../lib/units';

export type AmountKind = 'supply' | 'withdraw' | 'borrow' | 'repay';

export interface BuiltTx {
  call: WriteCall;
  /** Token + amount the pool will pull (supply / repay / liquidate only). */
  approval?: { token: Address; amount: bigint };
}

export function buildAmountTx(kind: AmountKind, asset: Address, amount: bigint, useMax: boolean, borrowed: bigint): BuiltTx {
  const max = useMax && (kind === 'withdraw' || kind === 'repay');
  const sendAmount = max ? MAX_UINT256 : amount;
  const call = { contract: 'pool', functionName: kind, args: [asset, sendAmount] } as const satisfies WriteCall;
  if (kind === 'supply') return { call, approval: { token: asset, amount } };
  if (kind === 'repay') return { call, approval: { token: asset, amount: max ? repayMaxApproval(borrowed) : amount } };
  return { call };
}

/**
 * The pool takes at most `debtToCover` (less if the 50% cap or the collateral binds), so approving
 * exactly `debtToCover` is always enough, even if the debt grows between preview and mining.
 */
export function buildLiquidateTx(collateralAsset: Address, debtAsset: Address, user: Address, debtToCover: bigint): BuiltTx {
  return {
    call: { contract: 'pool', functionName: 'liquidate', args: [collateralAsset, debtAsset, user, debtToCover] },
    approval: { token: debtAsset, amount: debtToCover },
  };
}
