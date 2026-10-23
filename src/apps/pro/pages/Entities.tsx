'use client';

import Box from '@mui/material/Box';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { ProReserve } from '@/data/types';
import { formatLowerCompact, formatPercent, formatUSD } from '@/shared/format';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { ChainIcon, HubMarketIcon, PageTitle, ProButton, ProEmpty, ProTable, Section, Stat, StatsRow } from '../ui';
import { proRoutes, useProContext, useProModal } from '../state';
import { useRequireWallet } from './Dashboard';

export function TokenPage({ symbol }: { symbol: string }) {
  const router = useRouter();
  const { protocol } = useProContext();
  const open = useProModal((s) => s.open);
  const requireWallet = useRequireWallet();
  const snap = protocol.data;
  const reserves = snap?.reserves.filter((r) => r.symbol.toLowerCase() === symbol.toLowerCase()) ?? [];
  if (snap && reserves.length === 0) return <ProEmpty titleAs="h1" title="No Asset Data" description={`${symbol} is not listed in any demo market.`} action={<ProButton href={proRoutes.deposit}>Explore</ProButton>} />;
  const first = reserves[0];
  const sym = first?.symbol ?? symbol; // canonical casing for display
  const deposits = reserves.filter((r) => r.suppliable);
  const borrows = reserves.filter((r) => r.borrowable);
  const chainCount = new Set(reserves.map((r) => r.chainId)).size;
  const chainOf = (id: number) => snap?.chains.find((c) => c.id === id);
  const best = (list: ProReserve[], f: (r: ProReserve) => number) => (list.length ? Math.max(...list.map(f)) : 0);

  return (
    <>
      <PageTitle
        title={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <TokenIcon symbol={sym} size={40} /> {sym} <Box component="span" sx={{ color: 'fg-3' }}>{first?.name}</Box>
          </Box>
        }
        subtitle={first && (first.collateral ? `Deposit ${sym} to earn yield and use it as collateral for borrowing` : `Deposit ${sym} to earn yield`)}
      />
      <StatsRow>
        <Stat label="Price" loading={!first}>{first && formatUSD(first.priceUSD)}</Stat>
        <Stat label="Chains" tooltip="The number of chains this asset is available on" loading={!first}>{chainCount}</Stat>
        <Stat label="Deposit Markets" loading={!first}>{deposits.length}</Stat>
        <Stat label="Borrow Markets" loading={!first}>{borrows.length}</Stat>
        <Stat label="Best Deposit APY" loading={!first}>{first && <Box component="span" sx={{ color: 'data-green' }}>{formatPercent(best(deposits, (r) => r.supplyAPY + r.underlyingYieldAPY))}</Box>}</Stat>
      </StatsRow>
      {[
        { title: 'Deposit Markets', list: deposits, side: 'deposit' as const },
        { title: 'Borrow Markets', list: borrows, side: 'borrow' as const },
      ].map((g) => (
        <Section key={g.title} title={g.title} description={g.side === 'deposit' ? 'Markets where this asset can be deposited across all chains' : 'Markets where this asset can be borrowed across all chains'}>
          {g.list.length === 0 && snap ? (
            <ProEmpty title={g.side === 'borrow' ? 'This asset cannot be borrowed' : 'No Deposit Opportunities'} description={g.side === 'borrow' ? `Borrowing ${sym} is currently not supported by any markets` : 'No markets accept this asset'} />
          ) : (
            <ProTable
              rows={g.list}
              loading={!snap}
              rowKey={(r) => r.id}
              onRowClick={(r) => router.push(proRoutes.reserve(r.id))}
              defaultSort={{ key: 'apy', desc: true }}
              columns={[
                { key: 'market', label: 'Market', render: (r) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><HubMarketIcon kind="market" label={r.spokeName} size={28} /><Box><Box sx={{ fontWeight: 500 }}>{r.spokeName}</Box><Box sx={{ color: 'fg-3', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 1 }}><ChainIcon chain={chainOf(r.chainId)} size={12} /> {r.hubName} Hub</Box></Box></Box>, sortValue: (r) => r.spokeName },
                { key: 'apy', label: g.side === 'deposit' ? 'Deposit APY' : 'Borrow APY', render: (r) => <Box component="span" sx={{ color: g.side === 'deposit' ? 'data-green' : 'fg-1' }}>{formatPercent(g.side === 'deposit' ? r.supplyAPY + r.underlyingYieldAPY : r.borrowAPY)}</Box>, sortValue: (r) => (g.side === 'deposit' ? r.supplyAPY : r.borrowAPY) },
                { key: 'tot', label: g.side === 'deposit' ? 'Total Deposits' : 'Total Borrows', render: (r) => formatLowerCompact(g.side === 'deposit' ? r.suppliedUSD : r.borrowedUSD, { usd: true, compact: true }), sortValue: (r) => (g.side === 'deposit' ? r.suppliedUSD : r.borrowedUSD) },
                { key: 'cf', label: 'Collateral Factor', render: (r) => (r.collateral ? formatPercent(r.collateralFactor, 1) : '—'), sortValue: (r) => r.collateralFactor, hideOnMobile: true },
              ]}
              actions={(r) => (
                <ProButton size="sm" variant="secondary" disabled={r.frozen} onClick={() => requireWallet(() => open({ type: g.side, reserveId: r.id }))}>
                  {g.side === 'deposit' ? 'Deposit' : 'Borrow'}
                </ProButton>
              )}
            />
          )}
        </Section>
      ))}
    </>
  );
}
