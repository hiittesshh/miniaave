'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useTransactions } from '@/data/hooks';
import type { TxRecord } from '@/data/types';
import { formatLowerCompact, formatNumber, formatPercent, formatUSD } from '@/shared/format';
import { ChartLegend, TotalsChart } from '@/shared/charts/charts';
import { ActivityIcon, BorrowIcon, CheckIcon, DepositIcon, DownloadIcon, LayersIcon, ShieldIcon } from '@/shared/ui/Icons';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useWallet } from '@/shared/state/wallet';
import { tv } from '@/shared/theme/tokens';
import { AssetCell, ChainIcon, PageTitle, ProButton, ProCard, ProEmpty, ProTable, Section, Stat, StatsRow, Tag, USD } from '../ui';
import { proRoutes, useProContext, useProFilter } from '../state';
import { PillMenu, SearchField } from './Explore';

const ACTION: Record<string, { label: string; icon: React.ReactNode }> = {
  deposit: { label: 'Deposit', icon: <DepositIcon sx={{ fontSize: 16 }} /> },
  withdraw: { label: 'Withdraw', icon: <BorrowIcon sx={{ fontSize: 16 }} /> },
  borrow: { label: 'Borrow', icon: <BorrowIcon sx={{ fontSize: 16 }} /> },
  repay: { label: 'Repaid', icon: <DepositIcon sx={{ fontSize: 16 }} /> },
  collateral: { label: 'Collateral', icon: <ShieldIcon sx={{ fontSize: 16 }} /> },
  approve: { label: 'Approval', icon: <CheckIcon sx={{ fontSize: 16 }} /> },
};

function when(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActivityPage() {
  const { account, hydrated, protocol } = useProContext();
  const openConnect = useWallet((s) => s.openConnect);
  const txs = useTransactions('pro', account);
  const router = useRouter();
  // Live behaviour (2026-10-13 capture): /activity without a wallet redirects to Deposit.
  React.useEffect(() => {
    if (hydrated && !account) router.replace(proRoutes.deposit);
  }, [hydrated, account, router]);
  const [types, setTypes] = React.useState<string[]>([]);
  const snap = protocol.data;
  const rows = (txs.data ?? []).filter((t) => !types.length || types.includes(t.kind));
  const spokeName = (id?: string) => snap?.spokes.find((s) => s.id === id)?.name ?? '';
  const chain = (id?: number) => snap?.chains.find((c) => c.id === id);

  const download = () => {
    const head = 'action,asset,amount,valueUSD,market,time,hash,note';
    const lines = rows.map((t) => [t.kind, t.symbol ?? '', t.amount ?? '', t.amountUSD ?? '', spokeName(t.spokeId), new Date(t.timestamp).toISOString(), t.hash, 'simulated'].join(','));
    const url = URL.createObjectURL(new Blob([[head, ...lines].join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <PageTitle
        title="Activity"
        subtitle="Simulated transactions made with this demo account in this browser"
        right={
          account && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <PillMenu label="Filter" allLabel="All" selected={types} onChange={setTypes} options={['deposit', 'withdraw', 'borrow', 'repay', 'collateral', 'approve'].map((k) => ({ value: k, label: ACTION[k].label }))} />
              <ProButton variant="secondary" prefixIcon={<DownloadIcon sx={{ fontSize: 16 }} />} disabled={rows.length === 0} onClick={download}>
                Download CSV
              </ProButton>
            </Box>
          )
        }
      />
      {!hydrated ? null : !account ? (
        <ProEmpty title="No Activity" description="Connect a demo wallet to see your simulated transactions." action={<ProButton onClick={openConnect}>Connect Wallet</ProButton>} />
      ) : (
        <ProTable
          rows={rows}
          loading={txs.isLoading}
          rowKey={(t: TxRecord) => t.id}
          defaultSort={{ key: 'time', desc: true }}
          empty={<ProEmpty title="No Activity" description={types.length ? 'Try adjusting your filters' : "You haven't made any transactions"} />}
          columns={[
            {
              key: 'action',
              label: 'Action',
              render: (t) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'bg-5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'fg-2' }}>{ACTION[t.kind]?.icon ?? <ActivityIcon sx={{ fontSize: 16 }} />}</Box>
                  <Box>
                    <Box sx={{ fontWeight: 500 }}>{t.kind === 'collateral' ? (t.collateralEnabled ? 'Enabled as Collateral' : 'Disabled as Collateral') : ACTION[t.kind]?.label ?? t.kind}</Box>
                    <Box sx={{ color: 'fg-3', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ChainIcon chain={chain(t.chainId)} size={12} /> {spokeName(t.spokeId)} Market
                    </Box>
                  </Box>
                </Box>
              ),
              sortValue: (t) => t.kind,
            },
            {
              key: 'asset',
              label: 'Amount',
              render: (t) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TokenIcon symbol={t.symbol ?? ''} size={22} />
                  {t.amount !== undefined ? `${formatNumber(t.amount)} ${t.symbol}` : t.symbol}
                </Box>
              ),
              sortValue: (t) => t.amount ?? 0,
            },
            { key: 'value', label: 'USD Value', render: (t) => (t.amountUSD !== undefined ? formatUSD(t.amountUSD) : '—'), sortValue: (t) => t.amountUSD ?? 0 },
            { key: 'time', label: 'Time', render: (t) => <Box component="span" title={new Date(t.timestamp).toLocaleString()}>{when(t.timestamp)}</Box>, sortValue: (t) => t.timestamp },
            { key: 'status', label: 'Status', render: () => <Tag tone="green"><CheckIcon sx={{ fontSize: 12 }} /> Confirmed · simulated</Tag>, hideOnMobile: true },
          ]}
        />
      )}
    </>
  );
}

const WINDOWS = [
  { value: 1, label: '1 Day' },
  { value: 7, label: '1 Week' },
  { value: 30, label: '1 Month' },
  { value: 182, label: '6 Months' },
  { value: 365, label: '1 Year' },
  { value: 730, label: 'All Time' },
];

export function InsightsPage() {
  const router = useRouter();
  const { protocol } = useProContext();
  const { chainId, setChain } = useProFilter();
  const [days, setDays] = React.useState(30);
  const [assets, setAssets] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState('');
  const snap = protocol.data;
  const hubAssets = (snap?.hubAssets ?? []).filter((a) => {
    const hub = snap?.hubs.find((h) => h.id === a.hubId);
    return (chainId === null || hub?.chainId === chainId) && (!assets.length || assets.includes(a.symbol)) && (!query || a.symbol.toLowerCase().includes(query.toLowerCase()));
  });
  const bySymbol = [...new Set(hubAssets.map((a) => a.symbol))].map((symbol) => {
    const list = hubAssets.filter((a) => a.symbol === symbol);
    const borrowing = list.filter((a) => a.totalBorrowed > 0);
    return {
      symbol,
      name: list[0].name,
      deposits: list.reduce((s, a) => s + a.totalSuppliedUSD, 0),
      borrows: list.reduce((s, a) => s + a.totalBorrowedUSD, 0),
      depMin: Math.min(...list.map((a) => a.supplyAPY + a.underlyingYieldAPY)),
      depMax: Math.max(...list.map((a) => a.supplyAPY + a.underlyingYieldAPY)),
      borMin: borrowing.length ? Math.min(...borrowing.map((a) => a.borrowAPY)) : 0,
      borMax: borrowing.length ? Math.max(...borrowing.map((a) => a.borrowAPY)) : 0,
      hubs: list.length,
    };
  });
  const totalDeposits = hubAssets.reduce((s, a) => s + a.totalSuppliedUSD, 0);
  const totalLoans = hubAssets.reduce((s, a) => s + a.totalBorrowedUSD, 0);
  const range = (a: number, b: number) => (Math.abs(a - b) < 1e-6 ? formatPercent(a) : `${formatPercent(a)} – ${formatPercent(b)}`);

  return (
    <>
      <PageTitle title="Insights" subtitle="Overview of protocol activity and performance (simulated demo data)" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Tag tone="purple">Protocol</Tag>
        <PillMenu label="Chains" allLabel="All Chains" single selected={chainId === null ? [] : [chainId]} onChange={(v) => setChain(v.length ? (v[0] as number) : null)} icon={<LayersIcon sx={{ fontSize: 16 }} />} options={(snap?.chains ?? []).map((c) => ({ value: c.id, label: <><ChainIcon chain={c} size={16} /> {c.name}</> }))} />
        <PillMenu label="Time Window" single selected={[days]} onChange={(v) => setDays((v[0] as number) ?? 30)} options={WINDOWS} />
        <PillMenu label="Assets" allLabel="All Assets" selected={assets} onChange={setAssets} options={[...new Set((snap?.hubAssets ?? []).map((a) => a.symbol))].sort().map((s) => ({ value: s, label: s }))} />
      </Box>
      <StatsRow>
        <Stat label="Protocol Deposits" tooltip="Total value of assets deposited across the demo's V4 hubs" loading={!snap} size="lg">
          <USD value={totalDeposits} />
        </Stat>
        <Stat label="Total Protocol Loans" tooltip="Total value of assets currently borrowed across the demo's V4 hubs" loading={!snap} size="lg">
          <USD value={totalLoans} />
        </Stat>
        <Stat label="Utilisation" loading={!snap} size="lg">
          {formatPercent(totalDeposits > 0 ? totalLoans / totalDeposits : 0)}
        </Stat>
        <Stat label="Hubs" loading={!snap} size="lg">
          {snap?.hubs.filter((h) => chainId === null || h.chainId === chainId).length}
        </Stat>
      </StatsRow>
      <ProCard sx={{ p: '1.25rem', animation: 'clone-fade-up 300ms ease both' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <ChartLegend items={[{ label: 'Deposits', color: tv('data-green') }, { label: 'Loans', color: tv('data-orange') }]} />
          <Typography sx={{ fontSize: '0.75rem', color: 'fg-3' }}>Simulated history · {WINDOWS.find((w) => w.value === days)?.label}</Typography>
        </Box>
        {snap && totalDeposits > 0 ? <TotalsChart deposits={totalDeposits} loans={totalLoans} days={days} /> : <Box sx={{ height: 240 }} />}
      </ProCard>
      <Section title="Assets" description="Group By: Asset · ranges show APYs across hubs" right={<SearchField value={query} onChange={setQuery} placeholder="Filter assets" />}>
        <ProTable
          rows={bySymbol}
          loading={!snap}
          rowKey={(r) => r.symbol}
          defaultSort={{ key: 'dep', desc: true }}
          onRowClick={(r) => router.push(proRoutes.token(r.symbol))}
          empty={<ProEmpty title="No Results Found" description="Try adjusting your search or filters" />}
          columns={[
            { key: 'asset', label: 'Asset', render: (r) => <AssetCell symbol={r.symbol} name={r.symbol} sub={`${r.hubs} hub${r.hubs > 1 ? 's' : ''}`} />, sortValue: (r) => r.symbol },
            { key: 'dep', label: 'Total Deposits', render: (r) => formatLowerCompact(r.deposits, { usd: true, compact: true }), sortValue: (r) => r.deposits },
            { key: 'dapy', label: 'Deposit APY', tooltip: 'Range of APYs currently offered across markets', render: (r) => <Box component="span" sx={{ color: 'data-green' }}>{range(r.depMin, r.depMax)}</Box>, sortValue: (r) => r.depMax },
            { key: 'bor', label: 'Total Borrowed', render: (r) => formatLowerCompact(r.borrows, { usd: true, compact: true }), sortValue: (r) => r.borrows },
            { key: 'bapy', label: 'Borrow APY', tooltip: 'Range of APYs currently offered across markets', render: (r) => (r.borrows > 0 ? range(r.borMin, r.borMax) : '—'), sortValue: (r) => r.borMax },
          ]}
        />
      </Section>
    </>
  );
}
