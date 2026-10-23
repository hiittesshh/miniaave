/**
 * getReserveHistory / getPriceHistory / getUserHistory for BOTH data sources. They need only the
 * source's own reads (events with timestamps + the live reserve / account data), so one
 * implementation serves the mock and the chain:
 *
 *   chain  real events (block timestamps) replayed exactly; the last point is the live value.
 *   mock   the mock engine's events replayed the same way, plus deterministic market noise
 *          (lib/history.ts marketNoise) that is 0 at "now": a simulated history that ends at the
 *          current mock state. The charts label it "Simulated history".
 */
import { buildPriceHistory, buildReserveHistory, buildUserHistory, type History, type PricePoint, type ReserveHistoryPoint, type UserHistoryPoint } from '../lib/history';
import { MAX_UINT256 } from '../lib/units';
import type { Address } from './types';
import type { MiniDataSource } from './sourceTypes';

type Reads = Pick<MiniDataSource, 'getEvents' | 'getReserveList' | 'getReserveData' | 'getReserveConfig' | 'tokenInfo' | 'getUserAccountData'>;

export interface HistoryReads {
  getReserveHistory(asset: Address): Promise<History<ReserveHistoryPoint>>;
  getPriceHistory(asset: Address): Promise<History<PricePoint>>;
  getUserHistory(user: Address): Promise<History<UserHistoryPoint>>;
}

const num = (v: bigint, decimals: number) => Number(v) / 10 ** decimals;
const isStable = (symbol: string) => /^USD|DAI$/i.test(symbol);

export function makeHistoryReads(src: Reads, opts: { simulated: boolean; now?: () => number }): HistoryReads {
  const now = opts.now ?? (() => Date.now());
  const noiseFor = (asset: Address, symbol: string) => (opts.simulated ? { seed: `mini:${asset.toLowerCase()}`, totals: 0.04, price: isStable(symbol) ? 0 : 0.05 } : undefined);

  async function priceHistory(asset: Address): Promise<History<PricePoint>> {
    const [events, r, token] = await Promise.all([src.getEvents(), src.getReserveData(asset), src.tokenInfo(asset)]);
    return buildPriceHistory({ events, asset, now: now(), currentPrice: num(r.price, 8), noise: noiseFor(asset, token.symbol) });
  }

  return {
    async getReserveHistory(asset) {
      const [events, r, config, token] = await Promise.all([src.getEvents(), src.getReserveData(asset), src.getReserveConfig(asset), src.tokenInfo(asset)]);
      return buildReserveHistory({
        events,
        asset,
        decimals: r.decimals,
        config,
        now: now(),
        current: { supplied: num(r.totalSupplied, r.decimals), borrowed: num(r.totalBorrowed, r.decimals), price: num(r.price, 8) },
        noise: noiseFor(asset, token.symbol),
      });
    },
    getPriceHistory: priceHistory,
    async getUserHistory(user) {
      const [events, list, account] = await Promise.all([src.getEvents(), src.getReserveList(), src.getUserAccountData(user)]);
      const reserves = await Promise.all(
        list.map(async (asset) => {
          const [r, prices] = await Promise.all([src.getReserveData(asset), priceHistory(asset)]);
          return { asset, decimals: r.decimals, threshold: r.liquidationThreshold / 10_000, prices };
        }),
      );
      return buildUserHistory({
        events,
        user,
        reserves,
        now: now(),
        simulated: opts.simulated,
        current: {
          collateralUsd: num(account.totalCollateralUsd, 8),
          debtUsd: num(account.totalDebtUsd, 8),
          healthFactor: account.healthFactor === MAX_UINT256 ? Infinity : num(account.healthFactor, 18),
        },
      });
    },
  };
}
