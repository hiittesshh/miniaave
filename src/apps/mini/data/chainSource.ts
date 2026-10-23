/**
 * The REAL data source: the Mini-Aave contracts through viem (reads, events, simulate, receipts) and
 * wagmi (the MetaMask signature). Same interface and same return shapes as the mock, so no screen
 * changes. Follows the guide:
 *
 *   §6 reads       readContract on the pool / tokens / oracle. Reads fired together are merged into
 *                  one request (wagmi config: multicall batching + JSON-RPC batching).
 *   §8 writes      runTx() drives: allowance → approve → WAIT receipt → simulate → write → WAIT receipt.
 *                  This file supplies each step; `simulate` and `write` use the ABI with pool + token
 *                  + oracle errors so reverts decode by name.
 *   §9 errors      every write-path error goes through decodeChainError() → the mock's error classes.
 *   §10 events     getContractEvents from DEPLOY_BLOCK, in block chunks, cached per chain (only new
 *                  blocks are fetched on refresh; a chain reset is detected by block hash).
 *   §7 refresh     watchBlockNumber (throttled) + every confirmed receipt notifies subscribers.
 *
 * Which chain: the wallet's chain when we have contracts there, else the network picked in the
 * wallet menu, else TARGET_CHAIN_ID (config.ts pickReadChain).
 */
import { parseEventLogs, zeroAddress, type Abi, type AbiEvent, type Log } from 'viem';
import { getConnection, getPublicClient, writeContract } from 'wagmi/actions';
import { erc20Abi, oracleAbi, poolAbi } from '../abis';
import { TxRevertedError } from '../lib/errors';
import { toViemCall } from './calls';
import { decodeChainError } from './chainErrors';
import { DEPLOY_BLOCK, LOG_CHUNK_BLOCKS, LOG_SCAN, contractsFor, pickReadChain, type ContractSet } from './config';
import { makeHistoryReads, type HistoryReads } from './historyReads';
import { scanLogs } from './logs';
import { useScanProgress } from './scanProgress';
import { getPreferredChain } from './settings';
import type { MiniDataSource, SourceStatus, TxResult } from './sourceTypes';
import type { Address, MiniEvent, ReserveConfig, ReserveView, TokenInfo, UserAccountData } from './types';
import { wagmiConfig, type MiniChainId } from './wagmi';

const ZERO_SET: ContractSet = { pool: zeroAddress, oracle: zeroAddress, usdc: zeroAddress, weth: zeroAddress };
/** Without a configured deploy block, scan only this many recent blocks (never the whole chain). */
const FALLBACK_LOOKBACK = 50_000n;
const BLOCK_REFRESH_MIN_MS = 5_000;

export class ChainUnavailableError extends Error {
  constructor(readonly status: Exclude<SourceStatus, 'ok'>) {
    super(`Chain source unavailable: ${status}`);
    this.name = 'ChainUnavailableError';
  }
}

const readChainId = () => pickReadChain(getConnection(wagmiConfig).chainId, getPreferredChain());

function client() {
  const c = getPublicClient(wagmiConfig, { chainId: readChainId() as MiniChainId });
  if (!c) throw new ChainUnavailableError('no-contracts');
  return c;
}

function need(): ContractSet {
  const c = contractsFor(readChainId());
  if (!c) throw new ChainUnavailableError('no-contracts');
  return c;
}

// --- shape normalisers: small integer fields come back as number for uint8/uint16 and as bigint
// --- for uint256; Number() makes either work, so a wrong width guess can't break the screens.
type Raw = Record<string, unknown>;
const num = (v: unknown) => Number(v as number | bigint);
const big = (v: unknown) => BigInt(v as bigint);

export function normalizeReserveView(r: Raw): ReserveView {
  return {
    asset: r.asset as Address,
    decimals: num(r.decimals),
    price: big(r.price),
    totalSupplied: big(r.totalSupplied),
    totalBorrowed: big(r.totalBorrowed),
    availableLiquidity: big(r.availableLiquidity),
    utilization: big(r.utilization),
    supplyRate: big(r.supplyRate),
    borrowRate: big(r.borrowRate),
    ltv: num(r.ltv),
    liquidationThreshold: num(r.liquidationThreshold),
    liquidationBonus: num(r.liquidationBonus),
  };
}

export function normalizeReserveConfig(r: Raw): ReserveConfig {
  return {
    ltv: num(r.ltv),
    liquidationThreshold: num(r.liquidationThreshold),
    liquidationBonus: num(r.liquidationBonus),
    reserveFactor: num(r.reserveFactor),
    baseRate: big(r.baseRate),
    slope1: big(r.slope1),
    slope2: big(r.slope2),
    optimalUtilization: big(r.optimalUtilization),
  };
}

export function normalizeAccountData(r: Raw): UserAccountData {
  return {
    totalCollateralUsd: big(r.totalCollateralUsd),
    totalDebtUsd: big(r.totalDebtUsd),
    borrowLimitUsd: big(r.borrowLimitUsd),
    availableBorrowsUsd: big(r.availableBorrowsUsd),
    liquidationLimitUsd: big(r.liquidationLimitUsd),
    healthFactor: big(r.healthFactor),
  };
}

/** Decoded pool / oracle logs → MiniEvent. Logs missing a field (ABI mismatch) are skipped. */
export function logsToEvents(logs: readonly (Log & { eventName?: string; args?: unknown })[], timestamps: Map<bigint, number>): MiniEvent[] {
  const out: MiniEvent[] = [];
  for (const log of logs) {
    if (log.blockNumber == null || log.transactionHash == null || log.logIndex == null) continue;
    const a = (log.args ?? {}) as Raw;
    const meta = { blockNumber: log.blockNumber, transactionHash: log.transactionHash, logIndex: log.logIndex, timestamp: timestamps.get(log.blockNumber) ?? 0 };
    const isAddr = (v: unknown): v is Address => typeof v === 'string' && v.startsWith('0x');
    const isBig = (v: unknown): v is bigint => typeof v === 'bigint';
    switch (log.eventName) {
      case 'Supply':
      case 'Withdraw':
      case 'Borrow':
      case 'Repay':
        if (isAddr(a.asset) && isAddr(a.user) && isBig(a.amount)) out.push({ eventName: log.eventName, args: { asset: a.asset, user: a.user, amount: a.amount }, ...meta });
        break;
      case 'Liquidation':
        if (isAddr(a.collateralAsset) && isAddr(a.debtAsset) && isAddr(a.user) && isBig(a.debtCovered) && isBig(a.collateralSeized) && isAddr(a.liquidator))
          out.push({ eventName: 'Liquidation', args: { collateralAsset: a.collateralAsset, debtAsset: a.debtAsset, user: a.user, debtCovered: a.debtCovered, collateralSeized: a.collateralSeized, liquidator: a.liquidator }, ...meta });
        break;
      case 'PriceSet':
        if (isAddr(a.asset) && isBig(a.price)) out.push({ eventName: 'PriceSet', args: { asset: a.asset, price: a.price }, ...meta });
        break;
    }
  }
  return out.sort((x, y) => (x.blockNumber === y.blockNumber ? x.logIndex - y.logIndex : x.blockNumber < y.blockNumber ? -1 : 1));
}

/** What a confirmed receipt "returned", read from its pool events (the UI shows it on success). */
export function resultFromReceiptLogs(logs: readonly Log[], pool: Address): TxResult | undefined {
  const parsed = parseEventLogs({ abi: poolAbi, logs: logs.filter((l) => l.address.toLowerCase() === pool.toLowerCase()) as Log[] });
  for (const l of parsed) {
    const a = l.args as Raw;
    if (l.eventName === 'Liquidation') return [big(a.debtCovered), big(a.collateralSeized)] as const;
  }
  for (const l of parsed) {
    const a = l.args as Raw;
    if (typeof a.amount === 'bigint') return a.amount;
  }
  return undefined;
}

// --- caches -----------------------------------------------------------------------------------------
const tokenCache = new Map<string, TokenInfo>();
const blockTimeCache = new Map<string, number>();
const eventCache = new Map<number, { pool: Address; toBlock: bigint; toBlockHash: `0x${string}` | null; events: MiniEvent[] }>();
// (EventCacheEntry below has the same shape; the persisted copy lives in localStorage.)
const listeners = new Set<() => void>();
const inflight = new Map<number, Promise<MiniEvent[]>>();

type EventCacheEntry = { pool: Address; toBlock: bigint; toBlockHash: `0x${string}` | null; events: MiniEvent[] };
const STORE_PREFIX = 'mini-aave-events-v1';
const bigReplacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? { __big: v.toString() } : v);
const bigReviver = (_k: string, v: unknown) => (v && typeof v === 'object' && '__big' in (v as object) ? BigInt((v as { __big: string }).__big) : v);
/** The scanned log survives reloads (public Base Sepolia needs ~1 minute for a full first scan). */
function loadStored(chainId: number, pool: Address): EventCacheEntry | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(`${STORE_PREFIX}:${chainId}:${pool.toLowerCase()}`);
    return raw ? (JSON.parse(raw, bigReviver) as EventCacheEntry) : undefined;
  } catch {
    return undefined;
  }
}
function saveStored(chainId: number, entry: EventCacheEntry) {
  try {
    window.localStorage.setItem(`${STORE_PREFIX}:${chainId}:${entry.pool.toLowerCase()}`, JSON.stringify(entry, bigReplacer));
  } catch {
    /* storage full or blocked: the in-memory cache still works */
  }
}

/** Pool events + the oracle's PriceSet, in ONE eth_getLogs per window (two addresses). */
const scanEvents = [...poolAbi.filter((x) => x.type === 'event'), ...oracleAbi.filter((x) => x.type === 'event' && x.name === 'PriceSet')] as unknown as AbiEvent[];

async function loadEvents(chainId: number): Promise<MiniEvent[]> {
  const c = need();
  const pc = client();
  const latest = await pc.getBlockNumber({ cacheTime: 0 });
  let entry: EventCacheEntry | undefined = eventCache.get(chainId) ?? loadStored(chainId, c.pool);
  // Chain reset (anvil restarted) or a different deployment: start over.
  if (entry && (entry.pool !== c.pool || latest < entry.toBlock)) entry = undefined;
  if (entry?.toBlockHash) {
    const b = await pc.getBlock({ blockNumber: entry.toBlock }).catch(() => null);
    if (!b || b.hash !== entry.toBlockHash) entry = undefined;
  }
  if (!entry) {
    const deploy = DEPLOY_BLOCK[chainId];
    if (deploy === undefined) console.warn(`[mini] No DEPLOY_BLOCK for chain ${chainId}: reading only the last ${FALLBACK_LOOKBACK} blocks of events.`);
    const start = deploy ?? (latest > FALLBACK_LOOKBACK ? latest - FALLBACK_LOOKBACK : 0n);
    entry = { pool: c.pool, toBlock: start - 1n, toBlockHash: null, events: [] };
  }
  const from = entry.toBlock + 1n;
  if (from > latest) return entry.events;
  const span = LOG_CHUNK_BLOCKS[chainId] ?? 5_000n;
  const pace = LOG_SCAN[chainId] ?? { perWave: 4, waveMs: 0 };
  const progress = useScanProgress.getState();
  progress.set({ chainId, done: 0, total: Number((latest - from) / span + 1n), active: true });
  let cur: EventCacheEntry = entry;
  try {
    await scanLogs({
      from,
      to: latest,
      span,
      perWave: pace.perWave,
      waveMs: pace.waveMs,
      fetchRange: (a, b) => pc.getLogs({ address: [c.pool, c.oracle], events: scanEvents, fromBlock: a, toBlock: b }),
      onProgress: async (doneThrough, found, done, total) => {
        const logs = found as unknown as (Log & { eventName?: string; args?: unknown })[];
        const times = logs.length ? await blockTimes(chainId, logs.map((l) => l.blockNumber).filter((n): n is bigint => n != null)) : new Map<bigint, number>();
        cur = { pool: c.pool, toBlock: doneThrough, toBlockHash: null, events: [...cur.events, ...logsToEvents(logs, times)] };
        eventCache.set(chainId, cur);
        // Save every ~10 waves (and at the end) so a reload resumes instead of starting over.
        if (done === total || Math.round(done / pace.perWave) % 10 === 0) saveStored(chainId, cur);
        useScanProgress.getState().set({ done, total });
      },
    });
    const head = await pc.getBlock({ blockNumber: latest });
    cur = { ...cur, toBlock: latest, toBlockHash: head.hash };
    eventCache.set(chainId, cur);
    saveStored(chainId, cur);
  } finally {
    useScanProgress.getState().set({ active: false });
  }
  return cur.events;
}
const emit = () => listeners.forEach((l) => l());

async function blockTimes(chainId: number, numbers: bigint[]): Promise<Map<bigint, number>> {
  const pc = client();
  const out = new Map<bigint, number>();
  await Promise.all(
    [...new Set(numbers)].map(async (n) => {
      const k = `${chainId}:${n}`;
      let ms = blockTimeCache.get(k);
      if (ms === undefined) {
        const b = await pc.getBlock({ blockNumber: n });
        ms = Number(b.timestamp) * 1000;
        blockTimeCache.set(k, ms);
      }
      out.set(n, ms);
    }),
  );
  return out;
}

let chainHistoryCache: HistoryReads | null = null;
const chainHistory = () => (chainHistoryCache ??= makeHistoryReads(chainSource, { simulated: false }));

export const chainSource: MiniDataSource = {
  kind: 'chain',
  get chainId() {
    return readChainId();
  },
  get contracts() {
    return contractsFor(readChainId()) ?? ZERO_SET;
  },

  async status() {
    const c = contractsFor(readChainId());
    if (!c) return 'no-contracts';
    let pc;
    try {
      pc = client();
      await pc.getBlockNumber({ cacheTime: 0 });
    } catch {
      return 'unreachable';
    }
    try {
      const code = await pc.getCode({ address: c.pool });
      return code && code !== '0x' ? 'ok' : 'not-deployed';
    } catch {
      return 'unreachable';
    }
  },

  // --- §6 reads ---------------------------------------------------------------------------------
  async getReserveList() {
    const list = await client().readContract({ address: need().pool, abi: poolAbi, functionName: 'getReserveList' });
    return [...list];
  },
  async getReserveData(asset) {
    return normalizeReserveView((await client().readContract({ address: need().pool, abi: poolAbi, functionName: 'getReserveData', args: [asset] })) as unknown as Raw);
  },
  async getReserveConfig(asset) {
    return normalizeReserveConfig((await client().readContract({ address: need().pool, abi: poolAbi, functionName: 'getReserveConfig', args: [asset] })) as unknown as Raw);
  },
  async getUserReserveData(asset, user) {
    const [supplied, borrowed] = await client().readContract({ address: need().pool, abi: poolAbi, functionName: 'getUserReserveData', args: [asset, user] });
    return [supplied, borrowed] as const;
  },
  async getUserAccountData(user) {
    return normalizeAccountData((await client().readContract({ address: need().pool, abi: poolAbi, functionName: 'getUserAccountData', args: [user] })) as unknown as Raw);
  },
  oracleOwner() {
    return client().readContract({ address: need().oracle, abi: oracleAbi, functionName: 'owner' });
  },
  async tokenInfo(token) {
    const k = `${readChainId()}:${token.toLowerCase()}`;
    const hit = tokenCache.get(k);
    if (hit) return hit;
    const pc = client();
    const [symbol, name, decimals] = await Promise.all([
      pc.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }),
      pc.readContract({ address: token, abi: erc20Abi, functionName: 'name' }),
      pc.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
    ]);
    const info: TokenInfo = { address: token, symbol, name, decimals: Number(decimals) };
    tokenCache.set(k, info);
    return info;
  },
  balanceOf(token, user) {
    return client().readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [user] });
  },
  allowance(token, owner, spender) {
    return client().readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] });
  },

  // --- §10 events -------------------------------------------------------------------------------
  getEvents() {
    // One scan per chain at a time: every hook that needs events shares it.
    const chainId = readChainId();
    let p = inflight.get(chainId);
    if (!p) {
      p = loadEvents(chainId).finally(() => inflight.delete(chainId));
      inflight.set(chainId, p);
    }
    return p.then((events) => [...events]);
  },

  // --- chart series: the event log replayed with block timestamps (historyReads.ts) ------------
  getReserveHistory: (asset) => chainHistory().getReserveHistory(asset),
  getPriceHistory: (asset) => chainHistory().getPriceHistory(asset),
  getUserHistory: (user) => chainHistory().getUserHistory(user),

  // --- §8 writes --------------------------------------------------------------------------------
  async simulate(call, account) {
    try {
      const req = toViemCall(call, need());
      const { result } = await client().simulateContract({ ...req, account } as Parameters<ReturnType<typeof client>['simulateContract']>[0]);
      return { result: typeof result === 'bigint' || Array.isArray(result) ? (result as TxResult) : undefined };
    } catch (e) {
      throw decodeChainError(e);
    }
  },

  async write(call, account) {
    try {
      const req = toViemCall(call, need());
      // The call is built dynamically (WriteCall → toViemCall, unit-tested), so wagmi's per-ABI
      // generics can't check it here; the cast is limited to this one boundary.
      const params = { ...req, abi: req.abi as Abi, account, chainId: readChainId() as MiniChainId };
      return await writeContract(wagmiConfig, params as unknown as Parameters<typeof writeContract<typeof wagmiConfig, Abi, string, readonly unknown[], MiniChainId>>[1]);
    } catch (e) {
      throw decodeChainError(e);
    }
  },

  async waitForReceipt(hash) {
    try {
      const r = await client().waitForTransactionReceipt({ hash });
      if (r.status !== 'success') return { transactionHash: hash, status: 'reverted', blockNumber: r.blockNumber, error: new TxRevertedError() };
      const result = resultFromReceiptLogs(r.logs, need().pool);
      emit(); // §7: refetch everything after every confirmed transaction
      return { transactionHash: hash, status: 'success', blockNumber: r.blockNumber, result };
    } catch (e) {
      throw decodeChainError(e);
    }
  },

  subscribe(listener) {
    listeners.add(listener);
    let last = 0;
    let unwatch: (() => void) | undefined;
    try {
      unwatch = client().watchBlockNumber({
        poll: true,
        emitMissed: false,
        onBlockNumber: () => {
          const now = Date.now();
          if (now - last < BLOCK_REFRESH_MIN_MS) return;
          last = now;
          listener();
        },
        onError: () => {
          /* RPC down: the status banner covers it */
        },
      });
    } catch {
      /* no client for this chain */
    }
    return () => {
      listeners.delete(listener);
      unwatch?.();
    };
  },

  // A real wallet has its own Reject button; there is no demo state to reset on a chain.
  rejectPendingSignature() {},
  resetDemo() {},
};
