/**
 * MockLendingDataSource: implements `LendingDataSource` against the simulated chain.
 *
 * - Reads resolve after a short artificial latency so loading skeletons are real.
 * - `submitAction` walks the same phases a wallet transaction would (signature → pending →
 *   confirmed), validates up front like a gas estimate would, and commits the new state in one
 *   atomic update. With "Simulate failures" on, it fails at the pending step and commits nothing.
 */
import type { LendingDataSource, SubmitOptions } from '../source';
import {
  SimulatedTxError,
  type LendingAction,
  type MarketInfo,
  type MarketSnapshot,
  type ProProtocolSnapshot,
  type ProUserState,
  type ProtocolTotals,
  type TxReceipt,
  type TxRecord,
  type UserMarketState,
} from '../types';
import { deriveProUser, deriveUserMarketState } from '../derive';
import { applyAction, marketSnapshot, proSnapshot, type ChainState } from './engine';
import { chainStore, ensureChainHydrated } from './chainStore';
import { DEMO_ACCOUNT, FRESH_ACCOUNT, MARKETS, demoUserMarkets, emptyUserMarkets, freshUserMarkets } from './seed/standard';
import { demoProUser, freshProUser } from './seed/pro';

export interface MockOptions {
  /** Read latency in ms. */
  latencyMs?: number;
  /** Simulated wallet-signature delay in ms. */
  signatureMs?: number;
  /** Simulated block-confirmation delay in ms. */
  pendingMs?: number;
  /** Returns true when the dev toggle "Simulate failures" is on. */
  shouldFail?: () => boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class MockLendingDataSource implements LendingDataSource {
  readonly label = 'Simulated (demo data)';
  readonly isSimulated = true;
  private reads = 0;

  constructor(private readonly opts: MockOptions = {}) {}

  /** First reads are slower (cold load); refetches are quick but still visible. */
  private async latency() {
    this.reads += 1;
    const base = this.opts.latencyMs ?? 420;
    await sleep(this.reads < 6 ? base : Math.round(base * 0.55));
  }

  private state(): ChainState {
    return chainStore.getState().chain;
  }

  /** Creates the account's starting balances the first time it is seen (like a funded wallet). */
  private ensureAccount(account: string) {
    const key = account.toLowerCase();
    const st = this.state();
    if (st.standard.users[key] && st.pro.users[key]) return;
    const next = structuredClone(st);
    if (!next.standard.users[key]) {
      next.standard.users[key] =
        key === DEMO_ACCOUNT ? demoUserMarkets() : key === FRESH_ACCOUNT ? freshUserMarkets() : emptyUserMarkets();
    }
    if (!next.pro.users[key]) {
      next.pro.users[key] = key === DEMO_ACCOUNT ? demoProUser() : key === FRESH_ACCOUNT ? freshProUser() : { positions: {}, wallet: {}, allowances: {} };
    }
    chainStore.getState().commit(next);
  }

  async getMarkets(): Promise<MarketInfo[]> {
    await ensureChainHydrated();
    await this.latency();
    return MARKETS;
  }

  async getMarket(marketId: string): Promise<MarketSnapshot> {
    await ensureChainHydrated();
    await this.latency();
    return marketSnapshot(this.state(), marketId);
  }

  async getUserMarketState(marketId: string, account: string): Promise<UserMarketState> {
    await ensureChainHydrated();
    await this.latency();
    this.ensureAccount(account);
    const st = this.state();
    const snap = marketSnapshot(st, marketId);
    return deriveUserMarketState(snap, account.toLowerCase(), st.standard.users[account.toLowerCase()][marketId]);
  }

  async getProProtocol(): Promise<ProProtocolSnapshot> {
    await ensureChainHydrated();
    await this.latency();
    return proSnapshot(this.state());
  }

  async getProUserState(account: string): Promise<ProUserState> {
    await ensureChainHydrated();
    await this.latency();
    this.ensureAccount(account);
    const st = this.state();
    return deriveProUser(proSnapshot(st), account.toLowerCase(), st.pro.users[account.toLowerCase()]);
  }

  async getProtocolTotals(): Promise<ProtocolTotals> {
    await ensureChainHydrated();
    await this.latency();
    const st = this.state();
    const v3 = MARKETS.filter((mk) => !mk.isTestnet).map((mk) => marketSnapshot(st, mk.id).totals);
    const v3d = v3.reduce((a, x) => a + x.marketSizeUSD, 0);
    const v3l = v3.reduce((a, x) => a + x.borrowsUSD, 0);
    const pro = proSnapshot(st).totals;
    return {
      depositsUSD: v3d + pro.depositsUSD,
      loansUSD: v3l + pro.borrowsUSD,
      byVersion: [
        { label: 'Aave V3 (demo)', depositsUSD: v3d, loansUSD: v3l },
        { label: 'Aave V4 (demo)', depositsUSD: pro.depositsUSD, loansUSD: pro.borrowsUSD },
      ].sort((a, b) => b.depositsUSD - a.depositsUSD),
    };
  }

  async getTransactions(query: { app: 'standard' | 'pro'; account: string; marketId?: string }): Promise<TxRecord[]> {
    await ensureChainHydrated();
    await this.latency();
    const acc = query.account.toLowerCase();
    return this.state().txLog.filter(
      (t) => t.app === query.app && t.account === acc && (!query.marketId || t.marketId === query.marketId)
    );
  }

  async resetSimulation(): Promise<void> {
    await ensureChainHydrated();
    chainStore.getState().reset();
  }

  async submitAction(action: LendingAction, options: SubmitOptions = {}): Promise<TxReceipt> {
    await ensureChainHydrated();
    this.ensureAccount(action.account);
    // 1) "Gas estimation": validate against current state. Throws before any wallet prompt.
    applyAction(this.state(), action);

    // 2) Simulated wallet signature.
    options.onPhase?.('awaiting-signature');
    await sleep(this.opts.signatureMs ?? 900);

    // 3) Simulated pending transaction (a permit signature has no on-chain step).
    const isPermit = action.kind === 'approve' && options.approvalMethod === 'permit';
    if (!isPermit) {
      options.onPhase?.('pending');
      await sleep(this.opts.pendingMs ?? 1500);
    }

    if (this.opts.shouldFail?.()) {
      throw new SimulatedTxError(
        'Simulated failure: the demo network rejected this transaction. Nothing changed, and no real funds exist.',
        'simulated-failure'
      );
    }

    // 4) Commit atomically against the latest state (re-validated).
    const { state, record } = applyAction(this.state(), action);
    chainStore.getState().commit(state);
    return { hash: record.hash, record };
  }
}
