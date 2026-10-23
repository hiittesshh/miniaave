/**
 * Insights model, derived read-only from the shared Pro snapshot so every figure agrees with the
 * Deposit/Borrow explore tables and the token pages:
 * - "Total deposits" / "Active loans" = the V4 hubs' totals (snapshot.totals), optionally per chain
 * - "All Assets" = one row per asset SYMBOL (live lists WETH and WETH.e separately from ETH),
 *   totals summed over every reserve of that symbol, APY ranges across its markets
 */
import type { ChainInfo, ProProtocolSnapshot, ProReserve } from '@/data/types';

export type CategoryKey = 'stablecoin' | 'eth' | 'stock' | 'other';
export const CATEGORY_LABEL: Record<CategoryKey, string> = { stablecoin: 'Stablecoins', eth: 'Ethereum-derived', stock: 'Stocks', other: 'Other Assets' };
export const CATEGORY_ORDER: CategoryKey[] = ['stablecoin', 'eth', 'stock', 'other'];

export interface AssetRow {
  symbol: string;
  name: string;
  category: CategoryKey;
  /** Set when every reserve of the asset is on one non-Ethereum chain (live shows a chain badge). */
  badgeChain?: ChainInfo;
  deposits: number;
  depositsUSD: number;
  borrows: number;
  borrowsUSD: number;
  depMin: number;
  depMax: number;
  borMin: number;
  borMax: number;
  hasBorrow: boolean;
  depRewards: boolean;
  underlying: boolean;
  depositRows: ProReserve[];
  borrowRows: ProReserve[];
}

const catOf = (r: ProReserve): CategoryKey => (r.category === 'stablecoin' ? 'stablecoin' : r.category === 'eth-correlated' ? 'eth' : r.category === 'stock' ? 'stock' : 'other');
export const depositApyOf = (r: ProReserve) => r.supplyAPY + r.underlyingYieldAPY + r.incentiveAPY;

export function insightsTotals(snap: ProProtocolSnapshot, chainIds: number[]) {
  const hubs = chainIds.length ? snap.hubs.filter((h) => chainIds.includes(h.chainId)) : snap.hubs;
  return { depositsUSD: hubs.reduce((s, h) => s + h.totalSuppliedUSD, 0), borrowsUSD: hubs.reduce((s, h) => s + h.totalBorrowedUSD, 0) };
}

export function assetRows(snap: ProProtocolSnapshot, chainIds: number[]): AssetRow[] {
  const reserves = chainIds.length ? snap.reserves.filter((r) => chainIds.includes(r.chainId)) : snap.reserves;
  const bySymbol = new Map<string, ProReserve[]>();
  // Live merges symbols that differ only in case (USDt on Ethereum + USDT on Avalanche = one row).
  for (const r of reserves) bySymbol.set(r.symbol.toLowerCase(), [...(bySymbol.get(r.symbol.toLowerCase()) ?? []), r]);
  const rows: AssetRow[] = [];
  for (const [, all] of bySymbol) {
    // Name/symbol of the largest member (e.g. USDt over USDT).
    const rs = [...all].sort((a, b) => b.suppliedUSD - a.suppliedUSD);
    const symbol = rs[0].symbol;
    const dep = rs.filter((r) => r.suppliable);
    const bor = rs.filter((r) => r.borrowable);
    const chains = [...new Set(rs.map((r) => r.chainId))];
    // Live ignores markets paying exactly 0% (ETH shows 1.64%, not 0.00% - 1.64%) unless all do.
    const nz = (xs: number[]) => (xs.some((x) => x > 0) ? xs.filter((x) => x > 0) : xs);
    const dApy = nz(dep.map(depositApyOf));
    const bApy = nz(bor.map((r) => r.borrowAPY));
    const one = chains.length === 1 ? snap.chains.find((c) => c.id === chains[0]) : undefined;
    rows.push({
      symbol,
      // Live names the row after the Ethereum listing when there is one ("USD Coin", not Arc's "USDC").
      name: (rs.find((r) => r.chainId === 1) ?? rs[0]).name,
      category: catOf(rs[0]),
      badgeChain: one && one.slug !== 'ethereum' ? one : undefined,
      deposits: rs.reduce((s, r) => s + r.supplied, 0),
      depositsUSD: rs.reduce((s, r) => s + r.suppliedUSD, 0),
      borrows: rs.reduce((s, r) => s + r.borrowed, 0),
      borrowsUSD: rs.reduce((s, r) => s + r.borrowedUSD, 0),
      depMin: dApy.length ? Math.min(...dApy) : 0,
      depMax: dApy.length ? Math.max(...dApy) : 0,
      borMin: bApy.length ? Math.min(...bApy) : 0,
      borMax: bApy.length ? Math.max(...bApy) : 0,
      hasBorrow: bor.length > 0,
      depRewards: dep.some((r) => r.incentiveAPY > 0),
      underlying: dep.some((r) => r.underlyingNote),
      depositRows: dep,
      borrowRows: bor,
    });
  }
  return rows.sort((a, b) => b.depositsUSD - a.depositsUSD);
}
