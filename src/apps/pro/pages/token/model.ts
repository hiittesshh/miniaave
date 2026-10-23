/**
 * Token page model: everything the live /explore/token/{symbol} page shows, derived from the
 * shared Pro snapshot (Builder A's seed via useProProtocol), so every figure here agrees with the
 * Deposit/Borrow explore tables, hub, market and reserve pages.
 *
 * Live rules (observed 2026-10-14):
 * - the ETH page also lists WETH reserves (Arc rows show "WETH" amounts); a modal explains
 *   "WETH Is Displayed as ETH". WETH.e on Avalanche is not part of it (Chains = 2)
 * - Deposit Markets = suppliable reserves; Borrow Markets = borrowable reserves
 * - default row order: market name descending (case-insensitive), then chain, then hub; the
 *   chart legend lists the same markets in the reverse order
 * - stats: totals across every reserve of the asset; capacities are the sums of the caps
 */
import type { ChainInfo, ProHubAsset, ProHubSummary, ProProtocolSnapshot, ProReserve, ProSpokeSummary } from '@/data/types';

/** Symbols merged into one token page (live shows WETH under ETH). */
const ALIASES: Record<string, string[]> = { ETH: ['ETH', 'WETH'], WETH: ['ETH', 'WETH'] };

export const canonicalSymbol = (s: string) => (s.toUpperCase() === 'WETH' ? 'ETH' : s);

export interface TokenRow {
  r: ProReserve;
  chain?: ChainInfo;
  hub?: ProHubSummary;
  spoke?: ProSpokeSummary;
  hubAsset?: ProHubAsset;
  /** Deposit side: supply + underlying + incentive APY. Borrow side: borrow APY. */
  apy: number;
  hasRewards: boolean;
  amount: number;
  amountUSD: number;
  cap: number;
  capacityFilled: number;
  remaining: number;
  /** Hub assets ordered by deposits (live "Hub Assets"). */
  hubAssets: ProHubAsset[];
  /** Deposit rows: assets borrowable against this collateral in the same market (live "Borrowable Assets"). */
  borrowable: string[];
  /** Borrow rows: collateral accepted by the market (live "Supp. Collateral"). */
  collateral: string[];
}

export interface TokenSide {
  rows: TokenRow[];
  totalTokens: number;
  totalUSD: number;
  capTokens: number;
  capUSD: number;
  chains: number;
  apyMin: number;
  apyMax: number;
}

export interface TokenModel {
  symbol: string;
  name: string;
  priceUSD: number;
  aliases: string[];
  totalDeposits: number;
  totalDepositsUSD: number;
  totalBorrows: number;
  totalBorrowsUSD: number;
  chains: ChainInfo[];
  deposit: TokenSide;
  borrow: TokenSide;
}

const lc = (s: string) => s.toLowerCase();

export function tokenModel(snap: ProProtocolSnapshot, rawSymbol: string): TokenModel | null {
  const want = (ALIASES[rawSymbol.toUpperCase()] ?? [rawSymbol]).map(lc);
  const all = snap.reserves.filter((r) => want.includes(lc(r.symbol)));
  if (!all.length) return null;
  const canon = all.find((r) => lc(r.symbol) === lc(canonicalSymbol(rawSymbol))) ?? all[0];
  const chainOf = (id: number) => snap.chains.find((c) => c.id === id);
  const hubOf = (id: string) => snap.hubs.find((h) => h.id === id);
  const spokeOf = (id: string) => snap.spokes.find((s) => s.id === id);
  const assetOf = (r: ProReserve) => snap.hubAssets.find((a) => a.hubId === r.hubId && a.symbol === r.symbol);

  const order = (a: TokenRow, b: TokenRow) =>
    lc(b.r.spokeName).localeCompare(lc(a.r.spokeName)) || (a.chain?.name ?? '').localeCompare(b.chain?.name ?? '') || a.r.hubName.localeCompare(b.r.hubName);

  const row = (r: ProReserve, side: 'deposit' | 'borrow'): TokenRow => {
    const isDep = side === 'deposit';
    const amount = isDep ? r.supplied : r.borrowed;
    const cap = isDep ? r.supplyCap : r.borrowCap;
    const inSpoke = snap.reserves.filter((x) => x.spokeId === r.spokeId && x.hubId === r.hubId);
    return {
      r,
      chain: chainOf(r.chainId),
      hub: hubOf(r.hubId),
      spoke: spokeOf(r.spokeId),
      hubAsset: assetOf(r),
      apy: isDep ? r.supplyAPY + r.underlyingYieldAPY + r.incentiveAPY : r.borrowAPY,
      hasRewards: isDep && r.incentiveAPY > 0,
      amount,
      amountUSD: amount * r.priceUSD,
      cap,
      capacityFilled: cap > 0 ? Math.min(1, amount / cap) : 0,
      remaining: Math.max(0, cap - amount),
      hubAssets: snap.hubAssets.filter((a) => a.hubId === r.hubId).sort((x, y) => y.totalSuppliedUSD - x.totalSuppliedUSD),
      borrowable: r.collateral ? [...new Set(inSpoke.filter((x) => x.borrowable && x.id !== r.id).map((x) => x.symbol))] : [],
      collateral: [...new Set(inSpoke.filter((x) => x.collateral && x.suppliable).map((x) => x.symbol))],
    };
  };

  const side = (rows: TokenRow[]): TokenSide => {
    const apys = rows.map((x) => x.apy);
    return {
      rows,
      totalTokens: rows.reduce((s, x) => s + x.amount, 0),
      totalUSD: rows.reduce((s, x) => s + x.amountUSD, 0),
      capTokens: rows.reduce((s, x) => s + x.cap, 0),
      capUSD: rows.reduce((s, x) => s + x.cap * x.r.priceUSD, 0),
      chains: new Set(rows.map((x) => x.r.chainId)).size,
      apyMin: apys.length ? Math.min(...apys) : 0,
      apyMax: apys.length ? Math.max(...apys) : 0,
    };
  };

  const deposit = side(all.filter((r) => r.suppliable && !r.paused).map((r) => row(r, 'deposit')).sort(order));
  const borrow = side(all.filter((r) => r.borrowable && !r.paused).map((r) => row(r, 'borrow')).sort(order));
  const totalDeposits = all.reduce((s, r) => s + r.supplied, 0);
  const totalDepositsUSD = all.reduce((s, r) => s + r.suppliedUSD, 0);
  const totalBorrows = all.reduce((s, r) => s + r.borrowed, 0);
  const totalBorrowsUSD = all.reduce((s, r) => s + r.borrowedUSD, 0);
  return {
    symbol: canonicalSymbol(canon.symbol),
    name: canon.name,
    // Deposit-weighted price across hubs (each hub prices the asset independently).
    priceUSD: totalDeposits > 0 ? totalDepositsUSD / totalDeposits : canon.priceUSD,
    aliases: [...new Set(all.map((r) => r.symbol))],
    totalDeposits,
    totalDepositsUSD,
    totalBorrows,
    totalBorrowsUSD,
    chains: snap.chains.filter((c) => all.some((r) => r.chainId === c.id)),
    deposit,
    borrow,
  };
}

/** Restrict a side to one chain (header "Asset on <chain>" picker). */
export function filterSide(s: TokenSide, chainId: number | null): TokenSide {
  if (chainId === null) return s;
  const rows = s.rows.filter((x) => x.r.chainId === chainId);
  const apys = rows.map((x) => x.apy);
  return {
    rows,
    totalTokens: rows.reduce((t, x) => t + x.amount, 0),
    totalUSD: rows.reduce((t, x) => t + x.amountUSD, 0),
    capTokens: rows.reduce((t, x) => t + x.cap, 0),
    capUSD: rows.reduce((t, x) => t + x.cap * x.r.priceUSD, 0),
    chains: rows.length ? 1 : 0,
    apyMin: apys.length ? Math.min(...apys) : 0,
    apyMax: apys.length ? Math.max(...apys) : 0,
  };
}

/** Spikiness of a rate history: busy (high-utilisation) hub assets swing more. */
export const spikinessOf = (row: TokenRow) => {
  const u = row.hubAsset?.utilization ?? 0;
  return u > 0.93 ? 0.8 : u > 0.85 ? 0.35 : 0.05;
};
