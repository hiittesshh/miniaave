'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useProtocolTotals } from '@/data/hooks';
import type { AssetCategory, MarketInfo, Reserve, UserMarketState } from '@/data/types';
import { FormattedNumber } from '@/shared/ui/FormattedNumber';
import { InfoTooltip } from '@/shared/ui/InfoTooltip';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { formatUSD } from '@/shared/format';
import { tv } from '@/shared/theme/tokens';
import { ContentContainer, PageHeader, PageHeaderStat } from '../components/PageHeader';
import { MarketSwitcher } from '../components/MarketSwitcher';
import { NoSearchResults, SearchInput, useDebounced } from '../components/Bits';
import { ListColumn, ListHeaderTitle, ListHeaderWrapper, ListItem, ListLoaderRows, MobileCard, Row, sortRows, useSort } from '../components/Lists';
import { ROUTES } from '../layout/nav';
import { CategorySelect } from '../components/CategorySelect';
import { useStdContext } from '../state';
import { assetDisplay } from '../display';

const BORROW_TOOLTIP = (
  <>
    Variable interest rate will <b>fluctuate</b> based on the market conditions.
  </>
);

export function MarketsHeader() {
  const { market } = useStdContext();
  const totals = useProtocolTotals();
  const t = market.data?.totals;
  const breakdown = (key: 'depositsUSD' | 'loansUSD') => (
    <Box sx={{ minWidth: 180, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="description" color="fg-3">
        Across every market in this demo (simulated)
      </Typography>
      {totals.data?.byVersion.map((v) => (
        <Box key={v.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
          <span>{v.label}</span>
          <b>{formatUSD(v[key], { compact: true })}</b>
        </Box>
      ))}
    </Box>
  );
  return (
    <PageHeader
      title={<MarketSwitcher />}
      stats={
        <>
          <PageHeaderStat label={<InfoTooltip title={breakdown('depositsUSD')}>Aave total deposits</InfoTooltip>} loading={!totals.data}>
            <FormattedNumber value={totals.data?.depositsUSD ?? 0} usd compact variant="statValue" animate />
          </PageHeaderStat>
          <PageHeaderStat label={<InfoTooltip title={breakdown('loansUSD')}>Aave total loans</InfoTooltip>} loading={!totals.data}>
            <FormattedNumber value={totals.data?.loansUSD ?? 0} usd compact variant="statValue" animate />
          </PageHeaderStat>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
          <PageHeaderStat label="Total market size" loading={!t}>
            <FormattedNumber value={t?.marketSizeUSD ?? 0} usd compact variant="statValue" animate />
          </PageHeaderStat>
          <PageHeaderStat label="Total available" loading={!t}>
            <FormattedNumber value={t?.availableUSD ?? 0} usd compact variant="statValue" animate />
          </PageHeaderStat>
          <PageHeaderStat label="Total borrows" loading={!t}>
            <FormattedNumber value={t?.borrowsUSD ?? 0} usd compact variant="statValue" animate />
          </PageHeaderStat>
        </>
      }
    />
  );
}

function MarketsTable({ rows, market, loading }: { rows: Reserve[]; market: MarketInfo; loading?: boolean }) {
  const router = useRouter();
  const { sort, toggle } = useSort();
  const sorted = sortRows(rows, sort, {
    symbol: (r) => assetDisplay(r, market).symbol.toUpperCase(),
    totalSupplied: (r) => r.totalSuppliedUSD,
    supplyAPY: (r) => r.supplyAPY,
    totalBorrowed: (r) => r.totalBorrowedUSD,
    borrowAPY: (r) => (r.borrowingEnabled ? r.variableBorrowAPY : -1),
  });
  const go = (r: Reserve) => router.push(ROUTES.reserve(r.symbol, market.id));
  const header = (
    <ListHeaderWrapper px={5}>
      <ListColumn isRow align="left" maxWidth={280} minWidth={170}>
        <ListHeaderTitle sortKey="symbol" sort={sort} onSort={toggle}>
          Asset
        </ListHeaderTitle>
      </ListColumn>
      <ListColumn align="left">
        <ListHeaderTitle sortKey="totalSupplied" sort={sort} onSort={toggle}>
          Total supplied
        </ListHeaderTitle>
      </ListColumn>
      <ListColumn align="left">
        <ListHeaderTitle sortKey="supplyAPY" sort={sort} onSort={toggle}>
          Supply APY
        </ListHeaderTitle>
      </ListColumn>
      <ListColumn align="left">
        <ListHeaderTitle sortKey="totalBorrowed" sort={sort} onSort={toggle}>
          Total borrowed
        </ListHeaderTitle>
      </ListColumn>
      <ListColumn align="left">
        <ListHeaderTitle sortKey="borrowAPY" sort={sort} onSort={toggle} tooltip={BORROW_TOOLTIP}>
          Borrow APY, variable
        </ListHeaderTitle>
      </ListColumn>
      <ListColumn minWidth={95} maxWidth={95} flex={0}>
        {null}
      </ListColumn>
    </ListHeaderWrapper>
  );

  if (loading) {
    return (
      <>
        {header}
        <ListLoaderRows columns={5} rows={4} withButtons={1} />
      </>
    );
  }

  return (
    <>
      <Box sx={{ display: { xs: 'none', mdlg: 'block' } }}>
        {header}
        {sorted.map((r, i) => {
          const d = assetDisplay(r, market);
          const noBorrow = !r.borrowingEnabled && r.totalBorrowed === 0;
          return (
            <ListItem key={r.id} minHeight={76} px={5} hover onClick={() => go(r)} last={i === sorted.length - 1}>
              <ListColumn isRow align="left" maxWidth={280} minWidth={170}>
                <TokenIcon symbol={d.symbol} size={32} />
                <Box sx={{ pl: 3.5, minWidth: 0 }}>
                  <Typography variant="subheader1" noWrap>
                    {d.name}
                  </Typography>
                  <Typography variant="description" color="fg-3" component="p">
                    {d.symbol}
                  </Typography>
                </Box>
              </ListColumn>
              <ListColumn align="left">
                <FormattedNumber value={r.totalSupplied} compact variant="h5" />
                <FormattedNumber value={r.totalSuppliedUSD} usd compact variant="description" color="fg-2" sx={{ mt: '2px' }} />
              </ListColumn>
              <ListColumn align="left">
                <FormattedNumber value={r.supplyAPY} percent variant="h5" />
              </ListColumn>
              <ListColumn align="left">
                {noBorrow ? (
                  <Typography variant="h5" color="fg-4">
                    —
                  </Typography>
                ) : (
                  <>
                    <FormattedNumber value={r.totalBorrowed} compact variant="h5" />
                    <FormattedNumber value={r.totalBorrowedUSD} usd compact variant="description" color="fg-2" sx={{ mt: '2px' }} />
                  </>
                )}
              </ListColumn>
              <ListColumn align="left">
                {noBorrow ? (
                  <Typography variant="h5" color="fg-4">
                    —
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <FormattedNumber value={r.variableBorrowAPY} percent variant="h5" />
                    {!r.borrowingEnabled && (
                      <Typography variant="description" color="fg-3">
                        (Disabled)
                      </Typography>
                    )}
                  </Box>
                )}
              </ListColumn>
              <ListColumn minWidth={95} maxWidth={95} flex={0}>
                <Button
                  variant="tertiary"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(r);
                  }}
                >
                  Details
                </Button>
              </ListColumn>
            </ListItem>
          );
        })}
      </Box>
      <Box sx={{ display: { xs: 'block', mdlg: 'none' }, '& > div': { display: 'block' } }}>
        {sorted.map((r, i) => {
          const d = assetDisplay(r, market);
          const noBorrow = !r.borrowingEnabled && r.totalBorrowed === 0;
          return (
            <MobileCard
              key={r.id}
              first={i === 0}
              header={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={() => go(r)}>
                  <TokenIcon symbol={d.symbol} size={40} />
                  <Box>
                    <Typography variant="h4">{d.name}</Typography>
                    <Typography variant="subheader2" color="fg-3">
                      {d.symbol}
                    </Typography>
                  </Box>
                </Box>
              }
              actions={
                <Button variant="tertiary" fullWidth onClick={() => go(r)}>
                  View details
                </Button>
              }
            >
              <Row caption="Total supplied" mb={3}>
                <FormattedNumber value={r.totalSupplied} compact variant="h5" />
                <FormattedNumber value={r.totalSuppliedUSD} usd compact variant="description" color="fg-2" />
              </Row>
              <Row caption="Supply APY" mb={4}>
                <FormattedNumber value={r.supplyAPY} percent variant="h5" />
              </Row>
              <Divider sx={{ mb: 4 }} />
              <Row caption="Total borrowed" mb={3}>
                {noBorrow ? '—' : <FormattedNumber value={r.totalBorrowed} compact variant="h5" />}
              </Row>
              <Row caption={<InfoTooltip title={BORROW_TOOLTIP}>Borrow APY, variable</InfoTooltip>} mb={6}>
                {noBorrow ? '—' : <FormattedNumber value={r.variableBorrowAPY} percent variant="h5" />}
              </Row>
            </MobileCard>
          );
        })}
      </Box>
    </>
  );
}

export function MarketsPage() {
  const { market, user, account } = useStdContext();
  const [query, setQuery] = React.useState('');
  const term = useDebounced(query, 300).trim().toLowerCase();
  const [inWallet, setInWallet] = React.useState(false);
  const [categories, setCategories] = React.useState<AssetCategory[]>([]);
  const [showSmall, setShowSmall] = React.useState(false);
  const [showFrozen, setShowFrozen] = React.useState(false);
  const snap = market.data;

  // Reset the category filter when the market changes (state derived during render).
  const [catMarket, setCatMarket] = React.useState(snap?.market.id);
  if (snap && snap.market.id !== catMarket) {
    setCatMarket(snap.market.id);
    setCategories([]);
  }

  const hasBalance = (r: Reserve, u?: UserMarketState) => {
    if (!u || !snap) return false;
    const native = r.symbol === snap.market.wrappedNativeSymbol ? (u.wallet[snap.market.nativeSymbol] ?? 0) : 0;
    return (u.wallet[r.symbol] ?? 0) + native > 0;
  };

  const filtered = (snap?.reserves ?? [])
    .filter((r) => {
      if (!term) return true;
      const d = assetDisplay(r, snap!.market);
      return [r.symbol, r.name, d.symbol, d.name].some((x) => x.toLowerCase().includes(term));
    })
    .filter((r) => categories.length === 0 || categories.includes(r.category))
    .filter((r) => !inWallet || hasBalance(r, user.data));
  const active = filtered.filter((r) => !r.isFrozen && !r.isPaused);
  const frozen = filtered.filter((r) => r.isFrozen || r.isPaused);
  const allSmall = active.every((r) => r.totalSuppliedUSD < 100_000);
  const visible = [...active].sort((a, b) => b.totalSuppliedUSD - a.totalSuppliedUSD).filter((r) => showSmall || allSmall || r.totalSuppliedUSD >= 100_000);
  const anyFrozen = (snap?.reserves ?? []).some((r) => r.isFrozen || r.isPaused);

  return (
    <>
      <MarketsHeader />
      <ContentContainer>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '1.5rem', xsm: '2rem' } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: { xs: '0.75rem', sm: '0.5rem' } }}>
            <SearchInput value={query} onChange={setQuery} placeholder="Search asset name, symbol, or address" />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
              {account && (
                <Button variant="outlined" onClick={() => setInWallet((v) => !v)} aria-pressed={inWallet} sx={{ gap: 2 }}>
                  In Wallet
                  <Switch checked={inWallet} tabIndex={-1} size="small" slotProps={{ input: { 'aria-hidden': true } }} />
                </Button>
              )}
              <CategorySelect value={categories} onChange={setCategories} />
            </Box>
          </Box>

          <Paper variant="table" sx={{ overflow: 'clip' }}>
            {snap && visible.length === 0 && !market.isLoading ? (
              <NoSearchResults term={query || undefined} subtitle="We couldn't find any assets related to your search." />
            ) : (
              <MarketsTable rows={visible} market={snap?.market ?? ({} as MarketInfo)} loading={!snap} />
            )}
            <Box sx={{ px: { xs: 4, xsm: 6 }, py: { xs: 3, sm: 0 }, minHeight: { sm: 48 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: { xs: '1rem', sm: '0.75rem' }, borderTop: `1px solid ${tv('border-0')}` }}>
              {anyFrozen && (
                <>
                  <FormControlLabel control={<Switch checked={showFrozen} onChange={(e) => setShowFrozen(e.target.checked)} />} label={<Typography variant="subheader1">Show frozen/paused assets</Typography>} />
                  <Box sx={{ width: '1px', height: '1.25rem', bgcolor: 'border-2', display: { xs: 'none', sm: 'block' } }} />
                </>
              )}
              <FormControlLabel control={<Switch checked={showSmall} onChange={(e) => setShowSmall(e.target.checked)} />} label={<Typography variant="subheader1">Show assets &lt;$100k supply</Typography>} />
            </Box>
          </Paper>

          {showFrozen && frozen.length > 0 && snap && (
            <Box sx={{ animation: 'clone-fade-up 260ms ease both' }}>
              <Alert severity="info" sx={{ mb: 6 }}>
                These assets are temporarily frozen or paused by community decisions, meaning that further supply / borrow of these assets are unavailable. Withdrawals and debt repayments are allowed. (In this demo, freezing is part of the seed data.)
              </Alert>
              <Paper variant="table" sx={{ overflow: 'clip' }}>
                <MarketsTable rows={frozen} market={snap.market} />
              </Paper>
            </Box>
          )}
          {market.isError && <Skeleton height={0} />}
        </Box>
      </ContentContainer>
    </>
  );
}
