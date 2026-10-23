'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useMarket, useMarkets, useUserMarketState } from '@/data/hooks';
import type { MarketSnapshot, Reserve, UserMarketState } from '@/data/types';
import { maxBorrow, maxSupply } from '@/lib/aave-math';
import { FormattedNumber } from '@/shared/ui/FormattedNumber';
import { InfoTooltip } from '@/shared/ui/InfoTooltip';
import { ArrowUpRightIcon, CheckIcon, ChevronLeftIcon, CloseIcon, WalletIcon, BoltIcon } from '@/shared/ui/Icons';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useNotice } from '@/shared/state/notice';
import { useSettings } from '@/shared/state/settings';
import { useWallet } from '@/shared/state/wallet';
import { DARK, tv } from '@/shared/theme/tokens';
import { CHART_COLORS, ChartLegend, InterestRateModelChart, RateHistoryChart, type TimeRange } from '@/shared/charts/charts';
import { ContentContainer, PageHeader, PageHeaderStat } from '../components/PageHeader';
import { MarketBadge } from '../components/MarketSwitcher';
import { CapsCircularStatus } from '../components/Bits';
import { ROUTES } from '../layout/nav';
import { useStdModal } from '../state';
import { assetDisplay } from '../display';

// ---------------------------------------------------------------------------------------------
// Panel primitives (reference ReservePanels)
// ---------------------------------------------------------------------------------------------

function PanelRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'flex' }, animation: 'clone-fade-up 300ms ease both' }}>
      <Typography variant="subheader1" sx={{ minWidth: 170, mr: 4, mb: { xs: 6, md: 0 } }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function PanelItem({ title, children, borderless }: { title: React.ReactNode; children: React.ReactNode; borderless?: boolean }) {
  return (
    <Box
      sx={{
        position: 'relative',
        pr: 4,
        mr: 4,
        '&::after': borderless ? undefined : { content: '""', display: { xs: 'none', md: 'block' }, position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', height: 32, width: '1px', bgcolor: 'border-2' },
        '&:last-of-type::after': { display: 'none' },
      }}
    >
      <Typography component="div" variant="description" color="fg-2">
        {title}
      </Typography>
      <Box sx={{ py: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
    </Box>
  );
}

function OverviewBox({ title, value, tooltip, wide }: { title: string; value: React.ReactNode; tooltip?: string; wide?: boolean }) {
  return (
    <Box sx={{ borderRadius: '6px', border: `1px solid ${tv('border-2')}`, flex: wide ? '0 0 100%' : '0 0 32%', maxWidth: wide ? '100%' : '32%', mb: '2%', p: 2 }}>
      <Typography component="div" variant="h5" color="fg-2" sx={{ fontWeight: 400, mb: 1 }}>
        {tooltip ? <InfoTooltip title={tooltip}>{title}</InfoTooltip> : title}
      </Typography>
      <Typography component="div" variant="h5">
        {value}
      </Typography>
    </Box>
  );
}

function RangeSelector({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  return (
    <SegmentedControl
      size="small"
      height={24}
      ariaLabel="Time range"
      value={value}
      onChange={onChange}
      options={(['1w', '1m', '6m', '1y'] as const).map((v) => ({ value: v, label: v }))}
    />
  );
}

function ApyChartBlock({ reserve, side }: { reserve: Reserve; side: 'supply' | 'borrow' }) {
  const [range, setRange] = React.useState<TimeRange>('1w');
  const color = side === 'supply' ? tv('data-green') : tv('data-orange');
  const label = side === 'supply' ? 'Supply APR' : 'Borrow APR, variable';
  return (
    <Box sx={{ mt: 10, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <ChartLegend items={[{ label: `${label} (simulated history)`, color }]} />
        <RangeSelector value={range} onChange={setRange} />
      </Box>
      <RateHistoryChart seed={`${reserve.id}:${side}`} current={side === 'supply' ? reserve.supplyAPR : reserve.variableBorrowAPR} range={range} color={color} label={label} />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Left card: reserve status & configuration
// ---------------------------------------------------------------------------------------------

function ReserveConfiguration({ snap, reserve }: { snap: MarketSnapshot; reserve: Reserve }) {
  const notice = useNotice();
  const supplyCapUsed = reserve.supplyCap > 0 ? reserve.totalSupplied / reserve.supplyCap : 0;
  const borrowCapUsed = reserve.borrowCap > 0 ? reserve.totalBorrowed / reserve.borrowCap : 0;
  const showBorrow = reserve.borrowingEnabled || reserve.totalBorrowed > 0;
  const eModes = snap.eModes.filter((e) => e.collateralSymbols.includes(reserve.symbol) || e.borrowableSymbols.includes(reserve.symbol));
  const d = assetDisplay(reserve, snap.market);

  return (
    <Paper variant="card" sx={{ pt: 4, pb: 20, px: { xs: 4, xsm: 6 } }}>
      <Typography variant="h3" component="h2" sx={{ mb: reserve.isFrozen ? 0 : 9 }}>
        Reserve status &amp; configuration
      </Typography>
      {reserve.isFrozen && (
        <Alert severity="error" sx={{ mt: 4, mb: 10 }}>
          This asset is frozen due to a community decision (in this demo, it is frozen in the seed data). Supplying and borrowing are disabled; withdrawals and repayments still work.
        </Alert>
      )}

      <PanelRow title="Supply Info">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', rowGap: 4, alignItems: { xs: 'flex-start', md: 'center' } }}>
          {reserve.supplyCap > 0 && supplyCapUsed > 0 && (
            <CapsCircularStatus value={supplyCapUsed} tooltip={`Maximum amount available to supply is ${Math.max(reserve.supplyCap - reserve.totalSupplied, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${d.symbol}.`} />
          )}
          <PanelItem title={<InfoTooltip title="Asset supply is limited to a certain amount to reduce protocol exposure to the asset and to help manage risks involved.">Total supplied</InfoTooltip>}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <FormattedNumber value={reserve.totalSupplied} compact variant="h4" animate />
              {reserve.supplyCap > 0 && (
                <>
                  <Typography variant="secondary16" color="fg-1">
                    of
                  </Typography>
                  <FormattedNumber value={reserve.supplyCap} compact variant="h4" />
                </>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormattedNumber value={reserve.totalSuppliedUSD} usd compact variant="description" color="fg-2" />
              {reserve.supplyCap > 0 && (
                <>
                  <Typography variant="description" color="fg-2">
                    of
                  </Typography>
                  <FormattedNumber value={reserve.supplyCap * reserve.priceUSD} usd compact variant="description" color="fg-2" />
                </>
              )}
            </Box>
          </PanelItem>
          <PanelItem title="APY" borderless>
            <FormattedNumber value={reserve.supplyAPY} percent variant="h4" animate />
          </PanelItem>
        </Box>
        {(reserve.borrowingEnabled || reserve.totalBorrowed > 0) && <ApyChartBlock reserve={reserve} side="supply" />}

        <Typography variant="subheader1" sx={{ pt: 10, pb: 3 }}>
          Collateral usage
        </Typography>
        {reserve.usageAsCollateralEnabled && reserve.ltv > 0 ? (
          reserve.isIsolated ? (
            <Alert severity="warning" sx={{ mb: 6 }}>
              <Typography variant="subheader1" component="p">
                Asset can only be used as collateral in isolation mode only.
              </Typography>
              In Isolation mode you cannot supply other assets as collateral for borrowing. Assets used as collateral in Isolation mode can only be borrowed to a specific debt ceiling.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
              <CheckIcon sx={{ fontSize: 16, color: 'data-green' }} />
              <Typography variant="subheader1" sx={{ color: 'data-green' }}>
                Can be collateral
              </Typography>
            </Box>
          )
        ) : (
          <Alert severity="warning" sx={{ mb: 4 }}>
            Asset cannot be used as collateral.
          </Alert>
        )}
        {reserve.usageAsCollateralEnabled && reserve.ltv > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <OverviewBox title="Max LTV" value={<FormattedNumber value={reserve.ltv} percent variant="h5" />} tooltip="The Maximum LTV ratio represents the maximum borrowing power of a specific collateral. For example, if a collateral has an LTV of 75%, the user can borrow up to 0.75 worth of ETH in the principal currency for every 1 ETH worth of collateral." />
            <OverviewBox title="Liquidation threshold" value={<FormattedNumber value={reserve.liquidationThreshold} percent variant="h5" />} tooltip="This represents the threshold at which a borrow position will be considered undercollateralized and subject to liquidation for each collateral." />
            <OverviewBox title="Liquidation penalty" value={<FormattedNumber value={reserve.liquidationBonus} percent variant="h5" />} tooltip="When a liquidation occurs, liquidators repay up to 50% of the outstanding borrowed amount on behalf of the borrower. In return, they can buy the collateral at a discount and keep the difference (liquidation penalty) as a bonus." />
            {reserve.isIsolated && (
              <OverviewBox
                wide
                title="Isolated Debt Ceiling"
                tooltip="Debt ceiling limits the amount possible to borrow against this asset by protocol users."
                value={
                  <>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <FormattedNumber value={reserve.isolationModeTotalDebtUSD} usd compact variant="subheader1" />
                      <Typography variant="subheader1">of</Typography>
                      <FormattedNumber value={reserve.debtCeilingUSD} usd compact variant="subheader1" />
                    </Box>
                    <Box sx={{ height: 5, borderRadius: 5, bgcolor: 'bg-6', my: 2, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${Math.max((reserve.isolationModeTotalDebtUSD / reserve.debtCeilingUSD) * 100, 1)}%`, bgcolor: 'success.main', transition: 'width 600ms ease' }} />
                    </Box>
                  </>
                }
              />
            )}
          </Box>
        )}
      </PanelRow>

      {showBorrow && (
        <>
          <Divider sx={{ my: { xs: 6, sm: 10 } }} />
          <PanelRow title="Borrow info">
            {!reserve.borrowingEnabled && (
              <Alert severity="error" sx={{ mb: 10 }}>
                Borrowing is disabled for this asset.
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', rowGap: 4, alignItems: { xs: 'flex-start', md: 'center' } }}>
              {reserve.borrowCap > 0 && borrowCapUsed > 0 && (
                <CapsCircularStatus value={borrowCapUsed} color={tv('data-orange')} tooltip={`Maximum amount available to borrow is ${Math.max(reserve.borrowCap - reserve.totalBorrowed, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${d.symbol}.`} />
              )}
              <PanelItem title={<InfoTooltip title="Borrowing of this asset is limited to a certain amount to minimize liquidity pool insolvency.">Total borrowed</InfoTooltip>}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <FormattedNumber value={reserve.totalBorrowed} compact variant="h4" animate />
                  {reserve.borrowCap > 0 && (
                    <>
                      <Typography variant="secondary16">of</Typography>
                      <FormattedNumber value={reserve.borrowCap} compact variant="h4" />
                    </>
                  )}
                </Box>
                <FormattedNumber value={reserve.totalBorrowedUSD} usd compact variant="description" color="fg-2" />
              </PanelItem>
              <PanelItem title={<InfoTooltip title="Variable interest rate will fluctuate based on the market conditions.">APY, variable</InfoTooltip>}>
                <FormattedNumber value={reserve.variableBorrowAPY} percent variant="h4" animate />
              </PanelItem>
              {reserve.borrowCap > 0 && (
                <PanelItem title="Borrow cap" borderless>
                  <FormattedNumber value={reserve.borrowCap} compact variant="h4" />
                  <FormattedNumber value={reserve.borrowCap * reserve.priceUSD} usd compact variant="description" color="fg-2" />
                </PanelItem>
              )}
            </Box>
            <ApyChartBlock reserve={reserve} side="borrow" />
            <Typography variant="subheader1" sx={{ pt: 10, pb: 3 }}>
              Collector Info
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <OverviewBox title="Reserve factor" value={<FormattedNumber value={reserve.reserveFactor} percent variant="h5" />} tooltip="Reserve factor is a percentage of interest which goes to a collector contract that is controlled by governance to promote ecosystem growth." />
              <OverviewBox
                title="Collector Contract"
                value={
                  <Box component="button" type="button" onClick={() => notice.show('No contracts in this demo', 'This clone has no smart contracts. In the real app this links to the collector contract on a block explorer.')} sx={{ border: 0, background: 'none', p: 0, cursor: 'pointer', fontFamily: 'inherit', color: 'fg-2', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '0.875rem' }}>
                    View contract <ArrowUpRightIcon sx={{ fontSize: 14 }} />
                  </Box>
                }
              />
              <Box sx={{ flex: '0 0 32%', height: { md: 70, lg: 60 } }} />
            </Box>
          </PanelRow>
        </>
      )}

      {eModes.length > 0 && (
        <>
          <Divider sx={{ my: { xs: 6, sm: 10 } }} />
          <PanelRow title="E-Mode info">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {eModes.map((e) => (
                <Box key={e.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <BoltIcon sx={{ fontSize: 14, color: 'purple-1' }} />
                    <Typography variant="subheader1">{e.label}</Typography>
                    {[
                      { ok: e.collateralSymbols.includes(reserve.symbol), label: 'Collateral' },
                      { ok: e.borrowableSymbols.includes(reserve.symbol), label: 'Borrowable' },
                    ].map((s) => (
                      <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: '2px', ml: 2 }}>
                        {s.ok ? <CheckIcon sx={{ fontSize: 14, color: 'data-green' }} /> : <CloseIcon sx={{ fontSize: 14, color: 'data-red' }} />}
                        <Typography variant="subheader1" sx={{ color: s.ok ? 'data-green' : 'data-red' }}>
                          {s.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', pt: 3 }}>
                    <OverviewBox title="Max LTV" value={<FormattedNumber value={e.ltv} percent variant="h5" />} />
                    <OverviewBox title="Liquidation threshold" value={<FormattedNumber value={e.liquidationThreshold} percent variant="h5" />} />
                    <OverviewBox title="Liquidation penalty" value={<FormattedNumber value={e.liquidationBonus} percent variant="h5" />} />
                  </Box>
                </Box>
              ))}
              <Typography variant="caption" color="fg-2" component="p">
                E-Mode increases your LTV for a selected category of assets, meaning that when E-mode is enabled, you will have higher borrowing power over assets of the same E-mode category. You can enter E-Mode from your{' '}
                <Box component={Link} href={ROUTES.dashboard} sx={{ textDecoration: 'underline' }}>
                  Dashboard
                </Box>
                .
              </Typography>
            </Box>
          </PanelRow>
        </>
      )}

      {reserve.borrowingEnabled && (
        <>
          <Divider sx={{ my: { xs: 6, sm: 10 } }} />
          <PanelRow title="Interest rate model">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <PanelItem title="Utilization Rate" borderless>
                <FormattedNumber value={reserve.utilization} percent variant="h4" animate />
              </PanelItem>
              <Button variant="tertiary" size="small" endIcon={<ArrowUpRightIcon sx={{ fontSize: '14px !important' }} />} onClick={() => notice.show('Interest rate strategy', `Base ${(reserve.rateStrategy.baseRate * 100).toFixed(2)}%, slope 1 ${(reserve.rateStrategy.slope1 * 100).toFixed(2)}%, slope 2 ${(reserve.rateStrategy.slope2 * 100).toFixed(0)}%, optimal utilization ${(reserve.rateStrategy.optimalUsage * 100).toFixed(0)}%. In the real app this links to the strategy contract; this demo has no contracts.`)}>
                Interest rate strategy
              </Button>
            </Box>
            <Box sx={{ mt: 8, mb: 10 }}>
              <Box sx={{ mb: 4 }}>
                <ChartLegend items={[{ label: 'Borrow APR, variable', color: CHART_COLORS.borrow }, { label: 'Utilization Rate', color: CHART_COLORS.utilization }]} />
              </Box>
              <InterestRateModelChart strategy={reserve.rateStrategy} utilization={reserve.utilization} totalSuppliedUSD={reserve.totalSuppliedUSD} totalBorrowedUSD={reserve.totalBorrowedUSD} />
            </Box>
          </PanelRow>
        </>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------------------------
// Right card: your info
// ---------------------------------------------------------------------------------------------

function ReserveActions({ snap, reserve, user }: { snap: MarketSnapshot; reserve: Reserve; user?: UserMarketState }) {
  const account = useWallet((s) => s.account);
  const openConnect = useWallet((s) => s.openConnect);
  const open = useStdModal((s) => s.open);
  const isWrapped = reserve.symbol === snap.market.wrappedNativeSymbol;
  const [useNative, setUseNative] = React.useState<'native' | 'wrapped'>(isWrapped ? 'native' : 'wrapped');
  const native = isWrapped && useNative === 'native';
  const symbol = native ? snap.market.nativeSymbol : reserve.symbol;

  if (!account) {
    return (
      <Paper variant="card" sx={{ p: { xs: 4, xsm: 6 } }}>
        <Typography variant="h3" sx={{ mb: { xs: 6, xsm: 10 } }}>
          Your info
        </Typography>
        <Typography color="fg-2" sx={{ mb: 6 }}>
          Please connect a wallet to view your personal information here.
        </Typography>
        <Button variant="outlined" onClick={openConnect}>
          Connect Wallet
        </Button>
      </Paper>
    );
  }
  if (!user) {
    return (
      <Paper variant="card" sx={{ p: { xs: 4, xsm: 6 } }}>
        <Skeleton width={120} height={22} sx={{ borderRadius: '4px', mb: 6 }} />
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Skeleton variant="rounded" width={42} height={42} sx={{ borderRadius: '12px' }} />
          <Box>
            <Skeleton width={100} height={12} />
            <Skeleton width={100} height={14} sx={{ mt: 1 }} />
          </Box>
        </Box>
        <Divider sx={{ my: 6 }} />
        <Skeleton height={44} sx={{ borderRadius: '6px' }} />
        <Skeleton height={44} sx={{ borderRadius: '6px', mt: 3 }} />
      </Paper>
    );
  }

  const wallet = user.wallet[symbol] ?? 0;
  const availableSupply = maxSupply({ walletBalance: wallet, isNative: native, supplyCap: reserve.supplyCap, totalSupplied: reserve.totalSupplied, isFrozen: reserve.isFrozen, isPaused: reserve.isPaused, decimals: reserve.decimals });
  const cat = snap.eModes.find((e) => e.id === user.eModeCategoryId);
  const canBorrow = reserve.borrowingEnabled && !reserve.isFrozen && (!cat || cat.borrowableSymbols.includes(reserve.symbol));
  const availableBorrow = canBorrow ? maxBorrow({ availableBorrowsUSD: user.summary.availableBorrowsUSD, priceUSD: reserve.priceUSD, availableLiquidity: reserve.availableLiquidity, borrowCap: reserve.borrowCap, totalBorrowed: reserve.totalBorrowed, decimals: reserve.decimals }) : 0;

  const actionRow = (title: string, tooltip: string, amount: number, onClick: () => void, label: string, disabled: boolean) => (
    <Box>
      <Typography component="div" variant="description" color="fg-2">
        <InfoTooltip title={tooltip}>{title}</InfoTooltip>
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, mt: 1 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <FormattedNumber value={amount} variant="h4" animate />
            <Typography variant="h4" component="span">
              {symbol}
            </Typography>
          </Box>
          <FormattedNumber value={amount * reserve.priceUSD} usd compact variant="subheader2" color="fg-3" />
        </Box>
        <Button variant="contained" disabled={disabled} onClick={onClick} sx={{ height: 36, minWidth: 96 }}>
          {label}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Paper variant="card" sx={{ p: { xs: 4, xsm: 6 } }}>
      <Typography variant="h3" sx={{ mb: 6 }}>
        Your info
      </Typography>
      {isWrapped && (
        <Box sx={{ mb: 4 }}>
          <SegmentedControl
            ariaLabel="Native or wrapped"
            fullWidth
            value={useNative}
            onChange={setUseNative}
            options={[
              { value: 'native', label: snap.market.nativeSymbol },
              { value: 'wrapped', label: reserve.symbol },
            ]}
          />
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: 'bg-2', border: `0.5px solid ${tv('bg-6')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <WalletIcon sx={{ fontSize: 20, color: 'fg-2' }} />
        </Box>
        <Box>
          <Typography variant="description" color="fg-2">
            Wallet balance
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <FormattedNumber value={wallet} variant="h4" animate />
            <Typography variant="buttonL" color="fg-2">
              {symbol}
            </Typography>
          </Box>
        </Box>
      </Box>
      {reserve.isFrozen || reserve.isPaused ? (
        <Alert severity="error" sx={{ mt: 3 }}>
          Since this asset is frozen, the only available actions are withdraw and repay which can be accessed from the{' '}
          <Box component={Link} href={ROUTES.dashboard} sx={{ textDecoration: 'underline' }}>
            Dashboard
          </Box>
        </Alert>
      ) : (
        <>
          <Divider sx={{ my: 6 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {actionRow(
              'Available to supply',
              'This is the total amount that you are able to supply to in this reserve. You are able to supply your wallet balance up until the supply cap is reached.',
              availableSupply,
              () => open({ type: 'supply', symbol: reserve.symbol, marketId: snap.market.id, native }),
              'Supply',
              availableSupply <= 0
            )}
            {canBorrow &&
              actionRow(
                'Available to borrow',
                'This is the total amount available for you to borrow. You can borrow based on your collateral and until the borrow cap is reached.',
                availableBorrow,
                () => open({ type: 'borrow', symbol: reserve.symbol, marketId: snap.market.id }),
                'Borrow',
                availableBorrow <= 0
              )}
            {user.summary.totalCollateralUSD <= 0 && canBorrow && (
              <Alert severity="info" data-size="small">
                To borrow you need to supply any asset to be used as collateral.
              </Alert>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------------------------

export function ReservePage() {
  const params = useSearchParams();
  const router = useRouter();
  const symbol = params.get('underlyingAsset') ?? '';
  const marketParam = params.get('marketName') ?? 'core';
  const markets = useMarkets();
  const account = useWallet((s) => s.account);
  const setSettings = useSettings((s) => s.set);
  const market = useMarket(marketParam);
  const user = useUserMarketState(marketParam, account);
  const notice = useNotice();
  const [tab, setTab] = React.useState<'overview' | 'actions'>('overview');
  const snap = market.data;
  // Case-insensitive, so a hand-typed ?underlyingAsset=usdc still resolves (the reference keys on addresses).
  const reserve = snap?.reserves.find((r) => r.symbol.toLowerCase() === symbol.toLowerCase());

  // Keep the header's market in sync with the reserve being viewed (like the reference).
  React.useEffect(() => {
    const m = markets.data?.find((x) => x.id === marketParam);
    if (m) setSettings({ marketId: m.id, testnetMode: m.isTestnet });
  }, [markets.data, marketParam, setSettings]);

  if (market.isError || (snap && !reserve)) {
    return (
      <ContentContainer>
        <Box sx={{ textAlign: 'center', py: 20 }}>
          <Typography variant="h2" component="h1" sx={{ mb: 4 }}>
            Asset not found
          </Typography>
          <Button variant="outlined" onClick={() => router.push(ROUTES.markets)}>
            Back to Markets
          </Button>
        </Box>
      </ContentContainer>
    );
  }

  const d = reserve && snap ? assetDisplay(reserve, snap.market) : null;

  return (
    <>
      <PageHeader
        above={
          <Button variant="tertiary" size="small" startIcon={<ChevronLeftIcon />} onClick={() => router.back()} sx={{ mb: 6, alignSelf: 'flex-start', display: 'inline-flex' }}>
            Go Back
          </Button>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {d ? <TokenIcon symbol={d.symbol} size={56} /> : <Skeleton variant="circular" width={56} height={56} />}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                {d ? (
                  <>
                    <Typography variant="h2" component="h1" sx={{ fontSize: '1.875rem', maxWidth: '24rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>
                      {d.name}
                    </Typography>
                    <Typography variant="h2" component="span" color="fg-3" sx={{ fontSize: '1.875rem' }}>
                      {d.symbol}
                    </Typography>
                    <Tooltip title="View token contracts">
                      <Box
                        component="button"
                        type="button"
                        aria-label="View token contracts"
                        onClick={() => notice.show('No contracts in this demo', `In the real app this lists the underlying token, the a${reserve!.symbol} token and the variable debt token on a block explorer. This clone has no contracts, so there is nothing to link to.`)}
                        sx={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', border: 0, bgcolor: 'bg-3', boxShadow: `0 2px 4px ${tv('shadow-low')}, 0 0 0 1px ${tv('shadow-stroke-2')}`, color: 'fg-2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 100ms ease', '&:hover': { bgcolor: 'bg-5' }, [DARK]: { boxShadow: 'none' } }}
                      >
                        <ArrowUpRightIcon sx={{ fontSize: 18 }} />
                      </Box>
                    </Tooltip>
                  </>
                ) : (
                  <Skeleton width={160} height={36} sx={{ borderRadius: '6px' }} />
                )}
              </Box>
              {snap && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <Typography variant="description" color="fg-3" sx={{ lineHeight: '0.875rem' }}>
                    on
                  </Typography>
                  <MarketBadge market={snap.market} size={16} />
                  <Typography variant="description" color="fg-1" sx={{ lineHeight: '0.875rem' }}>
                    {snap.market.title}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        }
        stats={
          <>
            <PageHeaderStat label="Reserve size" loading={!reserve}>
              <FormattedNumber value={reserve?.totalSuppliedUSD ?? 0} usd variant="statValue" animate />
            </PageHeaderStat>
            <PageHeaderStat label="Available liquidity" loading={!reserve}>
              <FormattedNumber value={reserve?.borrowingEnabled ? reserve.availableLiquidityUSD : 0} usd variant="statValue" animate />
            </PageHeaderStat>
            <PageHeaderStat label="Utilization rate" loading={!reserve}>
              <FormattedNumber value={reserve?.utilization ?? 0} percent variant="statValue" animate />
            </PageHeaderStat>
            <PageHeaderStat label="Oracle price" loading={!reserve}>
              <FormattedNumber value={reserve?.priceUSD ?? 0} usd variant="statValue" />
              <InfoTooltip title="Prices in this demo are fixed, illustrative values, not live oracle data.">{null}</InfoTooltip>
            </PageHeaderStat>
          </>
        }
      />
      <ContentContainer>
        <Box sx={{ display: { xs: 'flex', lg: 'none' }, justifyContent: { xs: 'center', xsm: 'flex-start' }, mb: 6 }}>
          <Box sx={{ width: { xs: '100%', xsm: 359 } }}>
            <SegmentedControl
              ariaLabel="Overview or your info"
              fullWidth
              value={tab}
              onChange={setTab}
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'actions', label: 'Your info' },
              ]}
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
          <Box sx={{ display: { xs: tab === 'overview' ? 'block' : 'none', lg: 'block' }, width: { xs: '100%', lg: 'calc(100% - 432px)' } }}>
            {snap && reserve ? <ReserveConfiguration snap={snap} reserve={reserve} /> : <Skeleton variant="rounded" height={600} sx={{ borderRadius: '10px' }} />}
          </Box>
          <Box sx={{ display: { xs: tab === 'actions' ? 'block' : 'none', lg: 'block' }, width: { xs: '100%', lg: 416 }, position: { lg: 'sticky' }, top: { lg: 88 } }}>
            {snap && reserve ? <ReserveActions snap={snap} reserve={reserve} user={user.data} /> : <Skeleton variant="rounded" height={260} sx={{ borderRadius: '10px' }} />}
          </Box>
        </Box>
      </ContentContainer>
    </>
  );
}
