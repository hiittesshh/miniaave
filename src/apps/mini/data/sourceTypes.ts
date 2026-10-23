/**
 * The contract every Mini-Aave data source implements: the mock engine (data/source.ts) and the
 * real chain (data/chainSource.ts). Screens only ever see this interface, through `miniSource`.
 */
import type { MiniContractError, TxRevertedError } from '../lib/errors';
import type { History, PricePoint, ReserveHistoryPoint, UserHistoryPoint } from '../lib/history';
import type { Address, MiniEvent, Receipt, ReserveConfig, ReserveView, TokenInfo, UserAccountData, UserReserveData, WriteCall } from './types';

/**
 * Can this source serve data right now?
 *  ok           ready
 *  no-contracts no addresses configured for this chain (e.g. Base Sepolia before the deploy)
 *  unreachable  the RPC doesn't answer (e.g. anvil not running)
 *  not-deployed the RPC answers but there's no contract code at the pool address (fresh anvil, no deploy)
 */
export type SourceStatus = 'ok' | 'no-contracts' | 'unreachable' | 'not-deployed';

export type TxResult = bigint | readonly [bigint, bigint];

export interface MiniDataSource {
  readonly kind: 'mock' | 'chain';
  readonly chainId: number;
  readonly contracts: { pool: Address; oracle: Address; usdc: Address; weth: Address };
  status(): Promise<SourceStatus>;
  // reads (§6)
  getReserveList(): Promise<Address[]>;
  getReserveData(asset: Address): Promise<ReserveView>;
  getReserveConfig(asset: Address): Promise<ReserveConfig>;
  getUserReserveData(asset: Address, user: Address): Promise<UserReserveData>;
  getUserAccountData(user: Address): Promise<UserAccountData>;
  oracleOwner(): Promise<Address>;
  tokenInfo(token: Address): Promise<TokenInfo>;
  balanceOf(token: Address, user: Address): Promise<bigint>;
  allowance(token: Address, owner: Address, spender: Address): Promise<bigint>;
  /** All pool + oracle events from the deployment block (§10). */
  getEvents(): Promise<MiniEvent[]>;
  // chart series (data/historyReads.ts; simulated in mock mode, replayed from events on a chain)
  getReserveHistory(asset: Address): Promise<History<ReserveHistoryPoint>>;
  getPriceHistory(asset: Address): Promise<History<PricePoint>>;
  getUserHistory(user: Address): Promise<History<UserHistoryPoint>>;
  // writes (§8); they throw MiniContractError / TxRevertedError / UserRejectedError
  simulate(call: WriteCall, account: Address): Promise<{ result?: TxResult }>;
  write(call: WriteCall, account: Address): Promise<`0x${string}`>;
  waitForReceipt(hash: `0x${string}`): Promise<Receipt & { result?: TxResult; error?: MiniContractError | TxRevertedError }>;
  /** Called after new blocks / confirmed transactions (real: watchBlockNumber). */
  subscribe(listener: () => void): () => void;
  // mock-only controls (no-ops on a real chain)
  rejectPendingSignature(): void;
  resetDemo(): void;
}
