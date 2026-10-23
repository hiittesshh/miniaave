'use client';

/**
 * Read hooks for the Mini-Aave screens (the wagmi equivalent is useReadContracts). Everything goes
 * through `miniSource` and refreshes per §7 "When to refresh":
 *  - every 15 s,
 *  - after every new block / confirmed transaction (the source notifies → useMiniLiveRefresh),
 *  - after an account or network switch (the query key holds the source, the chain and the account).
 *
 * In chain mode the data queries wait until `status()` says "ok", so a missing RPC or missing
 * addresses show the banner instead of a stream of failing requests.
 * Per-token reads are issued together (Promise.all) so the chain source can batch them into one
 * request.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useConnection } from 'wagmi';
import { pickReadChain } from './config';
import { borrowersFromEventsList } from './derive';
import { usePreferredChain, useSourceMode } from './settings';
import { miniSource, type SourceStatus } from './source';
import type { Address, MiniEvent, ReserveView, TokenInfo, UserAccountData, UserReserveData } from './types';

const REFRESH_MS = 15_000;

/** "mock" or "chain:<id>": part of every query key, so mock and chain data never mix. */
export function useSourceKey(): string {
  const mode = useSourceMode();
  const { chainId } = useConnection();
  const preferred = usePreferredChain();
  return mode === 'mock' ? 'mock' : `chain:${pickReadChain(chainId, preferred)}`;
}

/** Can the source serve data? Mock: always. Chain: RPC reachable and contracts deployed. */
export function useSourceStatus() {
  const key = useSourceKey();
  return useQuery<SourceStatus>({ queryKey: ['mini', key, 'status'], queryFn: () => miniSource.status(), refetchInterval: REFRESH_MS, retry: false });
}

function useReady() {
  const key = useSourceKey();
  const status = useSourceStatus();
  return { key, ready: key === 'mock' || status.data === 'ok' };
}

/** Invalidate every Mini query whenever the source reports a new block. Mount once (in the shell). */
export function useMiniLiveRefresh() {
  const qc = useQueryClient();
  const key = useSourceKey();
  React.useEffect(() => miniSource.subscribe(() => void qc.invalidateQueries({ queryKey: ['mini'] })), [qc, key]);
}

export interface MarketRow extends ReserveView {
  token: TokenInfo;
}

/** Markets: getReserveList() then getReserveData(asset) + token info for each. */
export function useMarkets() {
  const { key, ready } = useReady();
  return useQuery({
    queryKey: ['mini', key, 'markets'],
    enabled: ready,
    refetchInterval: REFRESH_MS,
    queryFn: async (): Promise<MarketRow[]> => {
      const list = await miniSource.getReserveList();
      return Promise.all(
        list.map(async (asset) => {
          const [data, token] = await Promise.all([miniSource.getReserveData(asset), miniSource.tokenInfo(asset)]);
          return { ...data, token };
        }),
      );
    },
  });
}

export interface UserRow {
  asset: Address;
  data: UserReserveData;
  balance: bigint;
  allowance: bigint;
}

/** Dashboard: getUserAccountData(user) + per token getUserReserveData, balanceOf and allowance. */
export function useAccountData(user: Address | null) {
  const { key, ready } = useReady();
  return useQuery({
    queryKey: ['mini', key, 'account', user],
    enabled: Boolean(user) && ready,
    refetchInterval: REFRESH_MS,
    queryFn: async (): Promise<{ account: UserAccountData; rows: UserRow[] }> => {
      const u = user!;
      const list = await miniSource.getReserveList();
      const pool = miniSource.contracts.pool;
      const [account, rows] = await Promise.all([
        miniSource.getUserAccountData(u),
        Promise.all(
          list.map(async (asset) => {
            const [data, balance, allowance] = await Promise.all([miniSource.getUserReserveData(asset, u), miniSource.balanceOf(asset, u), miniSource.allowance(asset, u, pool)]);
            return { asset, data, balance, allowance };
          }),
        ),
      ]);
      return { account, rows };
    },
  });
}

/** Oracle owner (`oracle.owner()`), for the admin box. */
export function useOracleOwner() {
  const { key, ready } = useReady();
  return useQuery({ queryKey: ['mini', key, 'owner'], enabled: ready, queryFn: () => miniSource.oracleOwner(), refetchInterval: REFRESH_MS });
}

/** All pool events (§10); screens filter them. */
export function useEvents() {
  const { key, ready } = useReady();
  return useQuery({ queryKey: ['mini', key, 'events'], enabled: ready, queryFn: (): Promise<MiniEvent[]> => miniSource.getEvents(), refetchInterval: REFRESH_MS });
}

/** getReserveConfig(asset): the rate curve and risk parameters (§6). */
export function useReserveConfig(asset: Address | undefined) {
  const { key, ready } = useReady();
  return useQuery({ queryKey: ['mini', key, 'config', asset], enabled: ready && Boolean(asset), queryFn: () => miniSource.getReserveConfig(asset!), staleTime: 60_000 });
}

/** Chart series for one reserve: totals, price, utilization and APYs over time. */
export function useReserveHistory(asset: Address | undefined) {
  const { key, ready } = useReady();
  return useQuery({ queryKey: ['mini', key, 'reserve-history', asset], enabled: ready && Boolean(asset), queryFn: () => miniSource.getReserveHistory(asset!), refetchInterval: REFRESH_MS });
}

/** Oracle price over time (Admin chart). */
export function usePriceHistory(asset: Address | undefined) {
  const { key, ready } = useReady();
  return useQuery({ queryKey: ['mini', key, 'price-history', asset], enabled: ready && Boolean(asset), queryFn: () => miniSource.getPriceHistory(asset!), refetchInterval: REFRESH_MS });
}

/** The user's net worth and health factor over time (Dashboard charts). */
export function useUserHistory(user: Address | null) {
  const { key, ready } = useReady();
  return useQuery({ queryKey: ['mini', key, 'user-history', user], enabled: ready && Boolean(user), queryFn: () => miniSource.getUserHistory(user!), refetchInterval: REFRESH_MS });
}

export interface AtRiskRow {
  user: Address;
  account: UserAccountData;
  positions: { asset: Address; supplied: bigint; borrowed: bigint }[];
}

/** Liquidations (§11): unique users from Borrow events → getUserAccountData each → HF < 1. */
export function useAtRisk() {
  const { key, ready } = useReady();
  return useQuery({
    queryKey: ['mini', key, 'at-risk'],
    enabled: ready,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const [events, list] = await Promise.all([miniSource.getEvents(), miniSource.getReserveList()]);
      const users = borrowersFromEventsList(events);
      const rows: AtRiskRow[] = await Promise.all(
        users.map(async (user) => {
          const [account, positions] = await Promise.all([
            miniSource.getUserAccountData(user),
            Promise.all(
              list.map(async (asset) => {
                const [supplied, borrowed] = await miniSource.getUserReserveData(asset, user);
                return { asset, supplied, borrowed };
              }),
            ),
          ]);
          return { user, account, positions };
        }),
      );
      return { all: rows, unsafe: rows.filter((r) => r.account.healthFactor < 10n ** 18n) };
    },
  });
}
