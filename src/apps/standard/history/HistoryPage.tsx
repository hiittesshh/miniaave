'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { useTransactions } from '@/data/hooks';
import type { TxRecord } from '@/data/types';
import { formatDateHeading, formatNumber, formatTime, formatUSD } from '@/shared/format';
import { ChevronUpDownIcon } from '@/shared/ui/Icons';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useWallet } from '@/shared/state/wallet';
import { tv } from '@/shared/theme/tokens';
import { ContentContainer, PageHeader } from '../components/PageHeader';
import { MarketSwitcher } from '../components/MarketSwitcher';
import { ConnectWalletPaper, NoSearchResults, SearchInput, useDebounced } from '../components/Bits';
import { useStdContext } from '../state';

const TYPES: { key: TxRecord['kind']; label: string }[] = [
  { key: 'supply', label: 'Supply' },
  { key: 'borrow', label: 'Borrow' },
  { key: 'withdraw', label: 'Withdraw' },
  { key: 'repay', label: 'Repay' },
  { key: 'collateral', label: 'Collateral change' },
  { key: 'emode', label: 'E-Mode change' },
  { key: 'approve', label: 'Approval' },
  { key: 'faucet', label: 'Faucet' },
];

const TITLES: Record<string, string> = {
  supply: 'Supply',
  withdraw: 'Withdraw',
  borrow: 'Borrow',
  repay: 'Repay',
  collateral: 'Collateral usage',
  emode: 'E-Mode',
  approve: 'Approval',
  faucet: 'Faucet',
};

function Amount({ r, sign }: { r: TxRecord; sign: '+' | '−' }) {
  return (
    <Tooltip title={`${formatUSD(r.amountUSD ?? 0)} · ${r.amount} ${r.symbol}`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TokenIcon symbol={r.symbol ?? ''} size={20} />
        <Typography variant="h5">
          {sign} {formatNumber(r.amount ?? 0, { compact: (r.amount ?? 0) > 100_000 })}
        </Typography>
        <Typography variant="h5">{r.symbol}</Typography>
      </Box>
    </Tooltip>
  );
}

function Details({ r }: { r: TxRecord }) {
  switch (r.kind) {
    case 'supply':
    case 'repay':
    case 'faucet':
      return <Amount r={r} sign="+" />;
    case 'borrow':
    case 'withdraw':
      return <Amount r={r} sign="−" />;
    case 'approve':
      return (
        <Typography variant="description" color="fg-1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Approved <TokenIcon symbol={r.symbol ?? ''} size={20} /> {formatNumber(r.amount ?? 0)} {r.symbol}
        </Typography>
      );
    case 'collateral':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="description" color="fg-1">
            Collateralization
          </Typography>
          <Typography variant="subheader1" sx={{ color: r.collateralEnabled ? 'success.main' : 'error.main', px: '3px' }}>
            {r.collateralEnabled ? 'enabled' : 'disabled'}
          </Typography>
          <Typography variant="description" color="fg-1">
            for
          </Typography>
          <TokenIcon symbol={r.symbol ?? ''} size={20} />
          <Typography variant="h5">{r.symbol}</Typography>
        </Box>
      );
    case 'emode':
      return (
        <Typography variant="description" color="fg-1">
          E-Mode <b>{r.eModeFrom}</b> → <b>{r.eModeTo}</b>
        </Typography>
      );
    default:
      return (
        <Typography variant="h5" color="fg-2">
          Transaction details not available
        </Typography>
      );
  }
}

function SimulatedChip({ hash }: { hash: string }) {
  return (
    <Tooltip title={`Fake hash ${hash.slice(0, 14)}…${hash.slice(-6)}. Simulated, so there is no block explorer link.`}>
      <Box tabIndex={0} sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', px: '0.625rem', py: '0.25rem', borderRadius: '2.375rem', bgcolor: `color-mix(in srgb, ${tv('data-green')} 10%, transparent)`, fontSize: '0.8125rem', fontWeight: 500, color: 'fg-1', whiteSpace: 'nowrap' }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'data-green' }} />
        Simulated
      </Box>
    </Tooltip>
  );
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function HistoryPage() {
  const { account, marketId, hydrated } = useStdContext();
  const openConnect = useWallet((s) => s.openConnect);
  const txs = useTransactions('standard', account, marketId);
  const [query, setQuery] = React.useState('');
  const term = useDebounced(query).trim().toLowerCase();
  const [types, setTypes] = React.useState<TxRecord['kind'][]>([]);
  const [filterAnchor, setFilterAnchor] = React.useState<HTMLElement | null>(null);
  const [exportAnchor, setExportAnchor] = React.useState<HTMLElement | null>(null);

  const all = txs.data ?? [];
  const rows = all.filter((r) => (types.length === 0 || types.includes(r.kind)) && (!term || (r.symbol ?? '').toLowerCase().includes(term)));
  const groups = rows.reduce<Record<string, TxRecord[]>>((acc, r) => {
    const k = formatDateHeading(r.timestamp);
    (acc[k] ??= []).push(r);
    return acc;
  }, {});
  const filterLabel = types.length === 0 ? 'All transactions' : types.length === 1 ? TYPES.find((t) => t.key === types[0])?.label : `${types.length} transaction types`;

  const exportAs = (format: 'csv' | 'json') => {
    setExportAnchor(null);
    if (format === 'json') {
      download('transactions.json', JSON.stringify(rows.map((r) => ({ ...r, note: 'simulated demo transaction' })), null, 2), 'application/json');
    } else {
      const head = 'action,symbol,amount,amountUSD,timestamp,hash,note';
      const lines = rows.map((r) => [r.kind, r.symbol ?? '', r.amount ?? '', r.amountUSD ?? '', new Date(r.timestamp).toISOString(), r.hash, 'simulated'].join(','));
      download('transactions.csv', [head, ...lines].join('\n'), 'text/csv');
    }
  };

  return (
    <>
      <PageHeader
        title={
          <Box>
            <Typography variant="h5" color="fg-3" sx={{ mb: '0.75rem' }}>
              Transaction history
            </Typography>
            <MarketSwitcher hideDescription />
          </Box>
        }
        description="This list shows the simulated transactions made in this browser. Nothing here happened on a real network."
      />
      <ContentContainer>
        {!hydrated ? (
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: '10px' }} />
        ) : !account ? (
          <ConnectWalletPaper description="Please connect your wallet to view transaction history." />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xsm: 'row' }, justifyContent: 'space-between', gap: { xs: '0.75rem', xsm: '0.5rem' } }}>
              <SearchInput value={query} onChange={setQuery} placeholder="Search assets" />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" endIcon={<ChevronUpDownIcon sx={{ color: 'fg-3' }} />} onClick={(e) => setFilterAnchor(e.currentTarget)} aria-haspopup="true">
                  {filterLabel}
                </Button>
                <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
                  <MenuItem onClick={() => setTypes([])} sx={{ gap: 2 }}>
                    <Checkbox size="small" checked={types.length === 0} sx={{ p: 0 }} />
                    All transactions
                  </MenuItem>
                  <Divider />
                  {TYPES.map((t) => (
                    <MenuItem
                      key={t.key}
                      sx={{ gap: 2 }}
                      onClick={() => {
                        const next = types.includes(t.key) ? types.filter((x) => x !== t.key) : [...types, t.key];
                        setTypes(next.length === TYPES.length ? [] : next);
                      }}
                    >
                      <Checkbox size="small" checked={types.includes(t.key)} sx={{ p: 0 }} />
                      {t.label}
                    </MenuItem>
                  ))}
                </Menu>
                <Button variant="outlined" onClick={(e) => setExportAnchor(e.currentTarget)} disabled={rows.length === 0} aria-haspopup="true">
                  Export
                </Button>
                <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                  <MenuItem onClick={() => exportAs('csv')}>Download CSV</MenuItem>
                  <MenuItem onClick={() => exportAs('json')}>Download JSON</MenuItem>
                </Menu>
              </Box>
            </Box>

            <Paper variant="table" sx={{ overflow: 'hidden' }}>
              {txs.isLoading ? (
                [0, 1].map((g) => (
                  <Box key={g}>
                    <Box sx={{ px: { xs: 4, xsm: 5 }, py: 4, boxShadow: `inset 0 -1px 0 ${tv('border-0')}` }}>
                      <Skeleton width={140} height={24} sx={{ borderRadius: '4px' }} />
                    </Box>
                    {[0, 1, 2].map((r) => (
                      <Box key={r} sx={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 72, px: { xs: 4, xsm: 5 } }}>
                        <Box sx={{ width: 160 }}>
                          <Skeleton width={72} height={18} sx={{ borderRadius: '4px' }} />
                          <Skeleton width={56} height={14} sx={{ borderRadius: '4px', mt: 1 }} />
                        </Box>
                        <Skeleton variant="circular" width={20} height={20} />
                        <Skeleton width={110} height={18} sx={{ borderRadius: '4px' }} />
                      </Box>
                    ))}
                  </Box>
                ))
              ) : rows.length === 0 ? (
                all.length === 0 ? (
                  <NoSearchResults term={undefined} subtitle="Your supplies, borrows and other simulated transactions on this market will show up here." action={null} />
                ) : (
                  <NoSearchResults
                    term={query || undefined}
                    subtitle="We couldn't find any transactions related to your search. Try again with a different asset name, or reset filters."
                    action={
                      <Button
                        variant="tertiary"
                        sx={{ mt: 4 }}
                        onClick={() => {
                          setQuery('');
                          setTypes([]);
                        }}
                      >
                        Reset filters
                      </Button>
                    }
                  />
                )
              ) : (
                Object.entries(groups).map(([date, list]) => (
                  <Box key={date}>
                    <Box sx={{ minHeight: 36, py: { xs: '0.875rem', xsm: '1rem' }, px: { xs: 4, xsm: 5 }, bgcolor: 'table-bg', boxShadow: `inset 0 -1px 0 ${tv('border-0')}, inset 0 1px 0 ${tv('border-0')}` }}>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 500, lineHeight: '1.125rem' }}>{date}</Typography>
                    </Box>
                    {list.map((r) => (
                      <Box
                        key={r.id}
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', md: 'row' },
                          alignItems: { xs: 'stretch', md: 'center' },
                          gap: { xs: 3, md: 4 },
                          minHeight: 72,
                          py: { xs: 4, md: 0 },
                          px: { xs: 4, xsm: 5 },
                          borderBottom: `1px solid ${tv('border-0')}`,
                          animation: 'clone-fade-up 260ms ease both',
                          '&:last-of-type': { borderBottom: 'none' },
                        }}
                      >
                        <Box sx={{ minWidth: 140, maxWidth: { md: 200 }, flex: { md: 1 }, display: 'flex', flexDirection: { xs: 'row', md: 'column' }, justifyContent: 'space-between' }}>
                          <Typography variant="subheader1">{TITLES[r.kind] ?? 'Unknown'}</Typography>
                          <Typography variant="caption" color="fg-3">
                            {formatTime(r.timestamp)}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 2 }}>
                          <Details r={r} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', maxWidth: { md: 200 } }}>
                          <SimulatedChip hash={r.hash} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ))
              )}
            </Paper>
            {!account && (
              <Button variant="outlined" onClick={openConnect}>
                Connect Wallet
              </Button>
            )}
          </Box>
        )}
      </ContentContainer>
    </>
  );
}
