'use client';

/**
 * The §8 transaction recipe, step by step, against `miniSource`:
 *   1. check the allowance ─(enough)→ 3
 *   2. approve(pool, amount) → wait for its receipt
 *   3. simulate the call      → a revert stops here with the §9 message
 *   4. send it                → the wallet may reject ("Transaction cancelled.")
 *   5. wait for the receipt   → "reverted" shows an error
 *   6. success (the source notifies; every Mini query refetches)
 * Steps 1–2 only for supply, repay and liquidate.
 */
import type { TxStep } from '@/apps/pro/transactions/ProTxModal';
import { MiniContractError, TxRevertedError, UserRejectedError, messageFor } from '../lib/errors';
import { fmtToken } from '../lib/format';
import { miniSource } from '../data/source';
import { TOKENS } from '../data/config';
import type { Address, WriteCall } from '../data/types';

export interface RunTxInput {
  account: Address;
  call: WriteCall;
  label: string;
  /** For supply / repay / liquidate: the token the pool will pull and how much to approve. */
  approval?: { token: Address; amount: bigint };
  onSteps: (steps: TxStep[]) => void;
}

export type RunTxResult =
  | { ok: true; hash: `0x${string}`; result?: bigint | readonly [bigint, bigint] }
  | { ok: false; message: string; errorName?: string };

export async function runTx({ account, call, label, approval, onSteps }: RunTxInput): Promise<RunTxResult> {
  const token = approval ? TOKENS[approval.token] : undefined;
  let steps: TxStep[] = [
    ...(approval ? [{ key: 'allowance', label: 'Check allowance', state: 'idle' as const }] : []),
    { key: 'simulate', label: 'Simulate', state: 'idle' },
    { key: 'send', label, state: 'idle' },
    { key: 'receipt', label: 'Waiting for receipt', state: 'idle' },
  ];
  const set = (k: string, patch: Partial<TxStep>) => {
    steps = steps.map((s) => (s.key === k ? { ...s, ...patch } : s));
    onSteps(steps);
  };
  const insertApprove = () => {
    const i = steps.findIndex((s) => s.key === 'simulate');
    steps = [...steps.slice(0, i), { key: 'approve', label: `Approve ${token!.symbol}`, state: 'idle' }, { key: 'approve-receipt', label: 'Waiting for approval receipt', state: 'idle' }, ...steps.slice(i)];
    onSteps(steps);
  };
  onSteps(steps);
  try {
    // 1–2. allowance → approve → wait
    if (approval && token) {
      set('allowance', { state: 'active', detail: 'Reading allowance…' });
      const current = await miniSource.allowance(approval.token, account, miniSource.contracts.pool);
      const enough = current >= approval.amount;
      set('allowance', { state: 'done', detail: enough ? `Enough (${fmtToken(current, token.decimals)} ${token.symbol})` : `Too low (${fmtToken(current, token.decimals)} ${token.symbol}), approve first` });
      if (!enough) {
        insertApprove();
        set('approve', { state: 'active', detail: `Confirm in your wallet: approve ${fmtToken(approval.amount, token.decimals)} ${token.symbol}` });
        const approveHash = await miniSource.write({ contract: 'token', address: approval.token, functionName: 'approve', args: [miniSource.contracts.pool, approval.amount] }, account);
        set('approve', { state: 'done', detail: 'Signed' });
        set('approve-receipt', { state: 'active', detail: 'Approval pending…' });
        const ar = await miniSource.waitForReceipt(approveHash);
        if (ar.status !== 'success') return { ok: false, message: messageFor(ar.error ?? new TxRevertedError()), errorName: ar.error?.errorName };
        set('approve-receipt', { state: 'done', detail: 'Approved' });
      }
    }
    // 3. simulate
    set('simulate', { state: 'active', detail: 'Simulating…' });
    await miniSource.simulate(call, account);
    set('simulate', { state: 'done', detail: 'Will succeed' });
    // 4. send
    set('send', { state: 'active', detail: 'Confirm in your wallet…' });
    const hash = await miniSource.write(call, account);
    set('send', { state: 'done', detail: 'Sent' });
    // 5. receipt
    set('receipt', { state: 'active', detail: 'Transaction processing…' });
    const receipt = await miniSource.waitForReceipt(hash);
    if (receipt.status !== 'success') return { ok: false, message: messageFor(receipt.error ?? new TxRevertedError()), errorName: receipt.error?.errorName };
    set('receipt', { state: 'done', detail: `Success · block ${receipt.blockNumber.toString()}` });
    return { ok: true, hash, result: receipt.result };
  } catch (e) {
    // The raw error stays in the console for debugging; the screen only gets the §9 sentence.
    if (!(e instanceof UserRejectedError)) console.error('[mini] transaction failed:', e);
    return { ok: false, message: messageFor(e), errorName: e instanceof MiniContractError ? e.errorName : undefined };
  }
}
