'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import * as React from 'react';
import { FormattedNumber } from '@/shared/ui/FormattedNumber';
import { InfoTooltip } from '@/shared/ui/InfoTooltip';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useNotice } from '@/shared/state/notice';
import { ContentContainer, PageHeader, PageHeaderStat } from '../components/PageHeader';
import { MarketSwitcher } from '../components/MarketSwitcher';
import { ConnectWalletPaper, HealthFactorNumber } from '../components/Bits';
import { ROUTES } from '../layout/nav';
import { useStdContext, useStdModal } from '../state';
import { BorrowAssetsList, BorrowedPositionsList, SuppliedPositionsList, SupplyAssetsList } from './lists';

const NoValue = () => (
  <Typography variant="statValueNoData" sx={{ color: 'inherit', opacity: 0.7 }}>
    —
  </Typography>
);

export function DashboardTopPanel() {
  const { account, user, marketId } = useStdContext();
  const open = useStdModal((s) => s.open);
  const notice = useNotice();
  const s = user.data?.summary;
  const loading = Boolean(account) && !s;
  return (
    <PageHeader
      title={<MarketSwitcher />}
      stats={
        <>
          <PageHeaderStat label="Net worth" loading={loading}>
            {account && s ? <FormattedNumber value={s.netWorthUSD} usd compact variant="statValue" animate /> : <NoValue />}
          </PageHeaderStat>
          <PageHeaderStat
            label={
              <InfoTooltip title="Net APY is the combined effect of all supply and borrow positions on net worth. It is possible to have a negative net APY if debt APY is higher than supply APY.">Net APY</InfoTooltip>
            }
            loading={loading}
          >
            {account && s && s.netWorthUSD > 0 ? <FormattedNumber value={s.netAPY} percent variant="statValue" animate /> : <NoValue />}
          </PageHeaderStat>
          {account && s && Number.isFinite(s.healthFactor) && (
            <PageHeaderStat label="Health factor">
              <HealthFactorNumber value={s.healthFactor} variant="statValue" animate />
              <Button variant="tertiary" size="small" sx={{ ml: 2 }} onClick={() => open({ type: 'risk', marketId })}>
                Risk details
              </Button>
            </PageHeaderStat>
          )}
          {account && (
            <PageHeaderStat label="Available rewards" loading={loading}>
              <FormattedNumber value={0} usd variant="statValue" />
              <Button variant="tertiary" size="small" sx={{ ml: 2 }} onClick={() => notice.showNotIncluded('Claiming rewards')}>
                Claim
              </Button>
            </PageHeaderStat>
          )}
        </>
      }
    />
  );
}

function ListsSkeleton() {
  return (
    <Box sx={{ display: { xs: 'block', lg: 'flex' }, gap: '2rem' }}>
      {[0, 1].map((c) => (
        <Box key={c} sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {[0, 1].map((r) => (
            <Skeleton key={r} variant="rounded" height={r ? 320 : 180} sx={{ borderRadius: '10px', mb: { xs: 8, lg: 0 } }} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function DashboardPage() {
  const { account, market, user, hydrated } = useStdContext();
  const [mode, setMode] = React.useState<'supply' | 'borrow'>('supply');
  const snap = market.data;
  const u = user.data;

  return (
    <>
      <DashboardTopPanel />
      <ContentContainer>
        {!hydrated ? (
          <ListsSkeleton />
        ) : !account ? (
          <ConnectWalletPaper />
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', mb: '1.5rem' }}>
              <Typography variant="h2" component="h2" color="fg-1">
                Your Positions
              </Typography>
              <Button variant="outlined" component={Link} href={ROUTES.history}>
                View transactions
              </Button>
            </Box>
            <Box sx={{ display: { xs: 'flex', lg: 'none' }, justifyContent: { xs: 'center', xsm: 'flex-start' }, mb: { xs: '1.5rem', xsm: '2rem' } }}>
              <Box sx={{ width: { xs: '100%', xsm: 359 } }}>
                <SegmentedControl
                  ariaLabel="Show supply or borrow lists"
                  fullWidth
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'supply', label: 'Supply' },
                    { value: 'borrow', label: 'Borrow' },
                  ]}
                />
              </Box>
            </Box>
            {!snap || !u ? (
              <ListsSkeleton />
            ) : (
              <Box sx={{ display: { xs: 'block', lg: 'flex' }, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ width: { xs: '100%', lg: 'calc(50% - 1rem)' }, display: { xs: mode === 'supply' ? 'block' : 'none', lg: 'block' }, animation: 'clone-fade-up 300ms ease both' }}>
                  <SuppliedPositionsList snap={snap} user={u} />
                  <SupplyAssetsList snap={snap} user={u} />
                </Box>
                <Box sx={{ width: { xs: '100%', lg: 'calc(50% - 1rem)' }, display: { xs: mode === 'borrow' ? 'block' : 'none', lg: 'block' }, animation: 'clone-fade-up 300ms 60ms ease both' }}>
                  <BorrowedPositionsList snap={snap} user={u} />
                  <BorrowAssetsList snap={snap} user={u} />
                </Box>
              </Box>
            )}
          </>
        )}
      </ContentContainer>
    </>
  );
}
