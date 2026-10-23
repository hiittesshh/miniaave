/**
 * THE ONE DATA-SOURCE MODULE for Mini-Aave.
 *
 * Every screen talks to the contracts only through `miniSource` (via data/hooks.ts and
 * tx/runTx.ts). Its methods mirror the real calls one to one:
 *   reads  → publicClient.readContract(getReserveList / getReserveData / getUserReserveData /
 *            getUserAccountData / getReserveConfig / owner / balanceOf / allowance) and getContractEvents
 *   writes → publicClient.simulateContract, walletClient.writeContract, waitForTransactionReceipt
 * and return the same shapes (bigint, the guide's units).
 *
 * Two implementations of the same interface (sourceTypes.ts):
 *   mockSource  (below)            the in-browser engine; the default
 *   chainSource (chainSource.ts)   the real contracts via wagmi + viem + MetaMask
 * `miniSource` (bottom of this file) forwards every call to the one selected in settings.ts.
 *
 * The mock keeps the engine state in memory + localStorage, waits a little for "signatures" and
 * "blocks", lets the mock wallet reject a signature, and mines each write on the then-current state
 * (so a write can still revert at mining time, like on-chain).
 */
import { MiniContractError, UserRejectedError } from '../lib/errors';
import { ADDR, LOCAL_CHAIN_ID, TOKENS } from './config';
import {
  allowance as engineAllowance,
  applyWrite,
  balanceOf as engineBalanceOf,
  demoState,
  fakeHash,
  getReserveConfig as engineReserveConfig,
  getReserveData as engineReserveData,
  getReserveList as engineReserveList,
  getUserAccountData as engineAccountData,
  getUserReserveData as engineUserReserveData,
  oracleOwner as engineOwner,
  type MiniState,
} from './engine';
import { chainSource } from './chainSource';
import { makeHistoryReads } from './historyReads';
import { getSourceMode } from './settings';
import type { MiniDataSource } from './sourceTypes';
import type { Address, MiniEvent, WriteCall } from './types';

export type { MiniDataSource, SourceStatus } from './sourceTypes';

// ---------------------------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------------------------

// v2: events carry wall-clock times (v1 states have the engine's fixed 2026-10-14 clock).
const STORAGE_KEY = 'minilend-state-v2';
const DAY = 86_400_000;
const SIGN_MS = 700;
const MINE_MS = 900;
const READ_MS = 60;

const bigReplacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? { __big: v.toString() } : v);
const bigReviver = (_k: string, v: unknown) => (v && typeof v === 'object' && '__big' in (v as object) ? BigInt((v as { __big: string }).__big) : v);

/**
 * The demo state with real-looking times: the engine replays the §12 setup on its own fixed clock
 * (one block every 12 s), so its blocks are spread from 24 to 10 days before `now`.
 * Deterministic for a given `now`; saved with the state, so the times don't move afterwards.
 */
export function timedDemoState(now: number): MiniState {
  const s = demoState();
  const last = Number(s.blockNumber);
  // 24 → 10 days ago: the pool is fully set up 10 days before "now", so the 1W charts show a live
  // market and 1M / All show how it was built.
  const span = 14 * DAY;
  const timeOf = (block: bigint) => Math.round(now - 24 * DAY + ((Number(block) - 1) / Math.max(1, last - 1)) * span);
  // On a real chain the deploy script sets the prices with oracle.setPrice, so the log starts with
  // PriceSet events; the engine sets them directly. Add them (as a "block 0") so a price replay
  // knows the starting prices, exactly as on chain.
  const deployPrices: MiniEvent[] = Object.entries(s.prices).map(([asset, price], i) => ({
    eventName: 'PriceSet',
    args: { asset: (Object.values(ADDR).find((a) => a.toLowerCase() === asset) ?? asset) as Address, price },
    blockNumber: 0n,
    transactionHash: fakeHash(0n, i),
    logIndex: i,
    timestamp: timeOf(1n) - 60_000,
  }));
  return { ...s, events: [...deployPrices, ...s.events.map((e) => ({ ...e, timestamp: timeOf(e.blockNumber) }))], time: timeOf(s.blockNumber) };
}

/** New mock blocks are stamped with the wall clock (the engine itself stays pure). */
const stampNow = (s: MiniState): MiniState => ({ ...s, time: Math.max(s.time, Date.now() - 12_000) });

function load(): MiniState {
  if (typeof window === 'undefined') return demoState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw, bigReviver) as MiniState;
  } catch {
    /* storage blocked or corrupt: start from the demo state */
  }
  const fresh = timedDemoState(Date.now());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh, bigReplacer));
  } catch {
    /* ignore */
  }
  return fresh;
}

let state: MiniState | null = null;
const current = () => (state ??= load());
const listeners = new Set<() => void>();
const pending = new Map<`0x${string}`, { call: WriteCall; account: Address }>();
let rejectSignature: (() => void) | null = null;
let txCounter = 0;

function commit(next: MiniState) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next, bigReplacer));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Engine reads throw synchronously; async reads reject instead (like an RPC call). */
const read = async <T,>(f: () => T): Promise<T> => {
  await wait(READ_MS);
  return f();
};

export const mockSource: MiniDataSource = {
  kind: 'mock',
  chainId: LOCAL_CHAIN_ID,
  status: async () => 'ok',
  contracts: ADDR,
  getReserveList: () => read(() => engineReserveList()),
  getReserveData: (asset) => read(() => engineReserveData(current(), asset)),
  getReserveConfig: (asset) => read(() => engineReserveConfig(asset)),
  getUserReserveData: (asset, user) => read(() => engineUserReserveData(current(), asset, user)),
  getUserAccountData: (user) => read(() => engineAccountData(current(), user)),
  oracleOwner: () => read(() => engineOwner(current())),
  tokenInfo: (token) => read(() => TOKENS[token]),
  balanceOf: (token, user) => read(() => engineBalanceOf(current(), token, user)),
  allowance: (token, owner) => read(() => engineAllowance(current(), token, owner)),
  getEvents: () => read(() => [...current().events]),
  getReserveHistory: (asset) => mockHistory().getReserveHistory(asset),
  getPriceHistory: (asset) => mockHistory().getPriceHistory(asset),
  getUserHistory: (user) => mockHistory().getUserHistory(user),

  async simulate(call, account) {
    await wait(350);
    const out = applyWrite(current(), account, call); // throws the named error; result discarded
    return { result: out.result };
  },

  async write(call, account) {
    // The mock wallet "asks for a signature": the step list offers Reject while this waits.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => {
        rejectSignature = null;
        resolve();
      }, SIGN_MS);
      rejectSignature = () => {
        clearTimeout(t);
        rejectSignature = null;
        reject(new UserRejectedError());
      };
    });
    const hash = fakeHash(current().blockNumber + 1n, ++txCounter);
    pending.set(hash, { call, account });
    return hash;
  },

  async waitForReceipt(hash) {
    await wait(MINE_MS);
    const tx = pending.get(hash);
    pending.delete(hash);
    const blockNumber = current().blockNumber + 1n;
    if (!tx) return { transactionHash: hash, status: 'reverted', blockNumber };
    try {
      const out = applyWrite(stampNow(current()), tx.account, tx.call);
      commit(out.state);
      return { transactionHash: hash, status: 'success', blockNumber: out.state.blockNumber, result: out.result };
    } catch (e) {
      return { transactionHash: hash, status: 'reverted', blockNumber, error: e instanceof MiniContractError ? e : undefined };
    }
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  rejectPendingSignature() {
    rejectSignature?.();
  },

  resetDemo() {
    pending.clear();
    commit(timedDemoState(Date.now()));
  },
};

const mockHistoryReads = () => makeHistoryReads(mockSource, { simulated: true });
let mockHistoryCache: ReturnType<typeof mockHistoryReads> | null = null;
function mockHistory() {
  return (mockHistoryCache ??= mockHistoryReads());
}

// ---------------------------------------------------------------------------------------------
// The switch: every call goes to the source picked right now (settings.ts: toggle → env → mock).
// ---------------------------------------------------------------------------------------------

/** The source that serves calls right now. */
export const activeSource = (): MiniDataSource => (getSourceMode() === 'chain' ? chainSource : mockSource);

export const miniSource: MiniDataSource = {
  get kind() {
    return activeSource().kind;
  },
  get chainId() {
    return activeSource().chainId;
  },
  get contracts() {
    return activeSource().contracts;
  },
  status: () => activeSource().status(),
  getReserveList: () => activeSource().getReserveList(),
  getReserveData: (asset) => activeSource().getReserveData(asset),
  getReserveConfig: (asset) => activeSource().getReserveConfig(asset),
  getUserReserveData: (asset, user) => activeSource().getUserReserveData(asset, user),
  getUserAccountData: (user) => activeSource().getUserAccountData(user),
  oracleOwner: () => activeSource().oracleOwner(),
  tokenInfo: (token) => activeSource().tokenInfo(token),
  balanceOf: (token, user) => activeSource().balanceOf(token, user),
  allowance: (token, owner, spender) => activeSource().allowance(token, owner, spender),
  getEvents: () => activeSource().getEvents(),
  getReserveHistory: (asset) => activeSource().getReserveHistory(asset),
  getPriceHistory: (asset) => activeSource().getPriceHistory(asset),
  getUserHistory: (user) => activeSource().getUserHistory(user),
  simulate: (call, account) => activeSource().simulate(call, account),
  write: (call, account) => activeSource().write(call, account),
  waitForReceipt: (hash) => activeSource().waitForReceipt(hash),
  subscribe: (listener) => activeSource().subscribe(listener),
  rejectPendingSignature: () => activeSource().rejectPendingSignature(),
  resetDemo: () => activeSource().resetDemo(),
};

