/**
 * The seam between the UI and wherever the data comes from.
 *
 *   UI components → hooks (src/data/hooks) → LendingDataSource → (mock today, chain later)
 *
 * Components never import mock data. To go live, write a `ChainDataSource` implementing this
 * interface (reading contracts or Aave's GraphQL API, sending real transactions through a
 * wallet), and pass it to <DataSourceProvider>. Nothing else in the UI has to change.
 */
import type {
  LendingAction,
  MarketInfo,
  MarketSnapshot,
  ProProtocolSnapshot,
  ProUserState,
  ProtocolTotals,
  TxPhase,
  TxReceipt,
  TxRecord,
  UserMarketState,
} from './types';

export interface SubmitOptions {
  /** Called as the transaction moves through its phases (wallet signature, then pending). */
  onPhase?: (phase: TxPhase) => void;
  /**
   * For approvals: 'permit' is an off-chain signature (no pending transaction), 'transaction'
   * is an on-chain approve(). Mirrors the reference "Approve with Signed message / Transaction".
   */
  approvalMethod?: 'permit' | 'transaction';
}

export interface LendingDataSource {
  /** Human-readable label, e.g. "Simulated (demo)". Shown in the UI. */
  readonly label: string;
  /** True when no real funds or chains are involved. The UI uses this for its disclaimers. */
  readonly isSimulated: boolean;

  // Standard (V3-style) ----------------------------------------------------------------------
  getMarkets(): Promise<MarketInfo[]>;
  getMarket(marketId: string): Promise<MarketSnapshot>;
  getUserMarketState(marketId: string, account: string): Promise<UserMarketState>;

  // Pro (V4-style) -----------------------------------------------------------------------------
  getProProtocol(): Promise<ProProtocolSnapshot>;
  getProUserState(account: string): Promise<ProUserState>;

  /** Protocol-wide totals across every version (the "Aave total deposits / loans" header stats). */
  getProtocolTotals(): Promise<ProtocolTotals>;

  // Shared ---------------------------------------------------------------------------------------
  getTransactions(query: { app: 'standard' | 'pro'; account: string; marketId?: string }): Promise<TxRecord[]>;
  /**
   * Submits an action. Resolves once "confirmed"; rejects with `SimulatedTxError` on failure.
   * On failure nothing changes. On success every affected figure changes atomically.
   */
  submitAction(action: LendingAction, options?: SubmitOptions): Promise<TxReceipt>;

  /** Simulation only: restore the seed state. A chain-backed source leaves this undefined. */
  resetSimulation?(): Promise<void>;
}
