'use client';

import * as React from 'react';
import { effectiveParams } from '@/data/derive';
import { useSubmitAction } from '@/data/hooks';
import type { SubmitOptions } from '@/data/source';
import type { LendingAction, MarketSnapshot, Reserve, TxPhase, TxReceipt, UserMarketState } from '@/data/types';
import { SimulatedTxError } from '@/data/types';
import type { PositionLine } from '@/lib/aave-math';

/**
 * State machine for one modal's transaction(s):
 *   idle → approving(signature → pending) → idle (approved) → executing(signature → pending)
 *        → success | failed
 * Validation errors (like a failed gas estimate) don't open the error view; they show inline
 * and leave the user on the form. Simulated failures show the full "Transaction Failed" view.
 */
export type FlowStatus =
  | { kind: 'idle' }
  | { kind: 'approving'; phase: TxPhase }
  | { kind: 'executing'; phase: TxPhase }
  | { kind: 'success'; receipt: TxReceipt }
  | { kind: 'failed'; message: string; step: 'approve' | 'main' };

export function useTxFlow() {
  const submit = useSubmitAction();
  const [status, setStatus] = React.useState<FlowStatus>({ kind: 'idle' });
  const [inlineError, setInlineError] = React.useState<string | null>(null);
  const [approvedNow, setApprovedNow] = React.useState(false);

  const run = React.useCallback(
    async (step: 'approve' | 'main', action: LendingAction, opts: Omit<SubmitOptions, 'onPhase'> = {}) => {
      setInlineError(null);
      const k = step === 'approve' ? 'approving' : 'executing';
      setStatus({ kind: k, phase: 'awaiting-signature' });
      try {
        const receipt = await submit.mutateAsync({ action, options: { ...opts, onPhase: (phase) => setStatus({ kind: k, phase }) } });
        if (step === 'approve') {
          setApprovedNow(true);
          setStatus({ kind: 'idle' });
        } else {
          setStatus({ kind: 'success', receipt });
        }
      } catch (e) {
        const err = e instanceof SimulatedTxError ? e : new SimulatedTxError(String((e as Error)?.message ?? e), 'simulated-failure');
        if (err.code === 'validation') {
          setInlineError(err.message);
          setStatus({ kind: 'idle' });
        } else {
          setStatus({ kind: 'failed', message: err.message, step });
        }
      }
    },
    [submit]
  );

  const busy = status.kind === 'approving' || status.kind === 'executing';
  return { status, inlineError, approvedNow, busy, run, reset: () => setStatus({ kind: 'idle' }) };
}

/** Position lines for previews, with an optional E-Mode override. */
export function userLines(snap: MarketSnapshot, user: UserMarketState, eModeId = user.eModeCategoryId): PositionLine[] {
  return snap.reserves.map((r, i) => {
    const ur = user.reserves[i];
    const eff = effectiveParams(r, eModeId, snap.eModes);
    return {
      suppliedUSD: ur.suppliedUSD,
      borrowedUSD: ur.borrowedUSD,
      collateralEnabled: ur.collateralEnabled,
      ltv: eff.ltv,
      liquidationThreshold: eff.liquidationThreshold,
      supplyAPY: r.supplyAPY,
      borrowAPY: r.variableBorrowAPY,
    };
  });
}

export type CollateralType = 'enabled' | 'disabled' | 'unavailable' | 'isolated-enabled' | 'isolated-disabled';

/** What happens to collateral usage when this asset is supplied (mirrors the engine rule). */
export function collateralOnSupply(snap: MarketSnapshot, user: UserMarketState, reserve: Reserve): CollateralType {
  const idx = snap.reserves.findIndex((r) => r.id === reserve.id);
  const ur = user.reserves[idx];
  if (!reserve.usageAsCollateralEnabled || reserve.ltv === 0) return 'unavailable';
  if (ur.supplied > 0) {
    if (reserve.isIsolated) return ur.collateralEnabled ? 'isolated-enabled' : 'isolated-disabled';
    return ur.collateralEnabled ? 'enabled' : 'disabled';
  }
  const otherCollateral = user.reserves.some((u, i) => i !== idx && u.collateralEnabled && u.supplied > 0);
  if (reserve.isIsolated) return otherCollateral ? 'isolated-disabled' : 'isolated-enabled';
  return user.summary.isInIsolationMode ? 'disabled' : 'enabled';
}

export const isCollateralOn = (t: CollateralType) => t === 'enabled' || t === 'isolated-enabled';

/** Simulated network cost in USD (gas units × 2.4 gwei × ETH price). Display only. */
export function simulatedGasUSD(kind: string, ethPrice = 3250) {
  const gas: Record<string, number> = { approve: 52_000, supply: 210_000, withdraw: 240_000, borrow: 290_000, repay: 230_000, collateral: 110_000, emode: 120_000, faucet: 90_000 };
  return ((gas[kind] ?? 150_000) * 2.4e-9) * ethPrice;
}
