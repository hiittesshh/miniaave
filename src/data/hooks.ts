'use client';

/**
 * Data hooks: the only way UI code reads or writes lending data.
 * Each hook wraps a `LendingDataSource` call in TanStack Query, so caching, loading states and
 * refetch-after-transaction are handled in one place.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDataSource } from './DataSourceProvider';
import type { SubmitOptions } from './source';
import type { LendingAction } from './types';

export const queryKeys = {
  markets: ['markets'] as const,
  market: (id: string) => ['market', id] as const,
  user: (marketId: string, account?: string | null) => ['user', marketId, account ?? ''] as const,
  proProtocol: ['pro', 'protocol'] as const,
  totals: ['protocol-totals'] as const,
  proUser: (account?: string | null) => ['pro', 'user', account ?? ''] as const,
  txs: (app: string, account?: string | null, marketId?: string) => ['txs', app, account ?? '', marketId ?? ''] as const,
};

export function useMarkets() {
  const ds = useDataSource();
  return useQuery({ queryKey: queryKeys.markets, queryFn: () => ds.getMarkets(), staleTime: Infinity });
}

export function useMarket(marketId: string) {
  const ds = useDataSource();
  return useQuery({ queryKey: queryKeys.market(marketId), queryFn: () => ds.getMarket(marketId) });
}

export function useUserMarketState(marketId: string, account: string | null) {
  const ds = useDataSource();
  return useQuery({
    queryKey: queryKeys.user(marketId, account),
    queryFn: () => ds.getUserMarketState(marketId, account!),
    enabled: Boolean(account),
  });
}

export function useProtocolTotals() {
  const ds = useDataSource();
  return useQuery({ queryKey: queryKeys.totals, queryFn: () => ds.getProtocolTotals() });
}

export function useProProtocol() {
  const ds = useDataSource();
  return useQuery({ queryKey: queryKeys.proProtocol, queryFn: () => ds.getProProtocol() });
}

export function useProUser(account: string | null) {
  const ds = useDataSource();
  return useQuery({ queryKey: queryKeys.proUser(account), queryFn: () => ds.getProUserState(account!), enabled: Boolean(account) });
}

export function useTransactions(app: 'standard' | 'pro', account: string | null, marketId?: string) {
  const ds = useDataSource();
  return useQuery({
    queryKey: queryKeys.txs(app, account, marketId),
    queryFn: () => ds.getTransactions({ app, account: account!, marketId }),
    enabled: Boolean(account),
  });
}

/**
 * Submits a simulated transaction. After a confirmed transaction every query is invalidated so
 * all figures on screen are re-read from the same, already-committed state, which keeps the
 * numbers consistent everywhere. A failed transaction invalidates nothing, because nothing
 * changed.
 */
export function useSubmitAction() {
  const ds = useDataSource();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, options }: { action: LendingAction; options?: SubmitOptions }) => ds.submitAction(action, options),
    onSuccess: () => qc.invalidateQueries(),
  });
}
