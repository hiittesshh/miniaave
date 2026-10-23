'use client';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { ProProtocolSnapshot, ProReserve, ProUserState } from '@/data/types';
import { effectiveBorrowRate, maxBorrow } from '@/lib/aave-math';
import { formatNumber, formatPercent, formatUSD } from '@/shared/format';
import { CHART_COLORS, ChartLegend, InterestRateModelChart, RateHistoryChart, type TimeRange } from '@/shared/charts/charts';
import { ChevronLeftIcon, InfoIcon, WalletIcon } from '@/shared/ui/Icons';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useWallet } from '@/shared/state/wallet';
import { tv } from '@/shared/theme/tokens';
import { ChainIcon, HealthFactor, HubMarketIcon, Pct, ProButton, ProCard, ProEmpty, Section, Stat, StatsRow, Tag, USD } from '../ui';
import { proRoutes, useProContext, useProModal } from '../state';
import { previewSpoke, spokeLines } from '../transactions/ProTxModal';

function KV({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: '0.875rem 1rem', borderRadius: '0.75rem', boxShadow: `inset 0 0 0 1px ${tv('border-1')}` }}>
      <Typography component="div" sx={{ color: 'fg-3', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {label}
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoIcon tabIndex={0} sx={{ fontSize: 13, color: 'fg-4' }} />
          </Tooltip>
        )}
      </Typography>
      <Box sx={{ mt: 1, fontWeight: 500, fontSize: '0.9375rem' }}>{children}</Box>
    </Box>
  );
}

function CapacityKV({ label, used, cap, symbol, price }: { label: string; used: number; cap: number; symbol: string; price: number }) {
  const pct = cap > 0 ? Math.min(used / cap, 1) : 0;
  return (
    <KV label={label} tooltip={label === 'Deposit Capacity' ? 'Maximum total deposits allowed before the cap is reached' : 'Maximum total borrows allowed before the cap is reached'}>
      {cap > 0 ? (
        <>
          <Box>
            {formatNumber(used, { compact: true })} <Box component="span" sx={{ color: 'fg-3' }}>of {formatNumber(cap, { compact: true })} {symbol}</Box>
          </Box>
          <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'bg-6', mt: 2, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${pct * 100}%`, bgcolor: pct > 0.98 ? 'red-1' : 'purple-1', borderRadius: 2, transition: 'width 700ms cubic-bezier(0.19,1,0.22,1)' }} />
          </Box>
          <Typography sx={{ fontSize: '0.75rem', color: 'fg-3', mt: 1 }}>{formatUSD(used * price, { compact: true })} · {(pct * 100).toFixed(2)}% filled</Typography>
        </>
      ) : (
        'No cap'
      )}
    </KV>
  );
}

export function YourPositions({ reserve, snap, user }: { reserve: ProReserve; snap: ProProtocolSnapshot; user?: ProUserState }) {
  const account = useWallet((s) => s.account);
  const openConnect = useWallet((s) => s.openConnect);
  const open = useProModal((s) => s.open);
  if (!account)
    return (
      <ProCard sx={{ p: '1.25rem' }}>
        <Typography sx={{ fontWeight: 500, mb: 1 }}>Your Positions</Typography>
        <Typography sx={{ color: 'fg-3', fontSize: '0.875rem', mb: 4 }}>
          <Box component="button" type="button" onClick={openConnect} sx={{ border: 0, background: 'none', p: 0, color: 'fg-1', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
            Connect wallet
          </Box>{' '}
          to view your position.
        </Typography>
        <ProButton variant="primary" wide onClick={openConnect}>
          Connect Wallet
        </ProButton>
      </ProCard>
    );
  if (!user)
    return (
      <ProCard sx={{ p: '1.25rem' }}>
        <Skeleton width={120} height={20} sx={{ borderRadius: '10rem' }} />
        <Skeleton height={80} sx={{ mt: 3, borderRadius: '0.75rem' }} />
      </ProCard>
    );

  const lines = spokeLines(snap, user, reserve.spokeId);
  const mine = lines.find((l) => l.reserve.id === reserve.id)!;
  const p = previewSpoke(lines);
  const wallet = user.wallet[reserve.chainId]?.[reserve.symbol] ?? 0;
  const capRoom = reserve.supplyCap > 0 ? Math.max(reserve.supplyCap - reserve.supplied, 0) : Infinity;
  const availDeposit = reserve.suppliable ? Math.min(wallet, capRoom) : 0;
  const availBorrow = reserve.borrowable ? maxBorrow({ availableBorrowsUSD: p.availableBorrowsUSD, priceUSD: reserve.priceUSD, availableLiquidity: reserve.availableLiquidity, borrowCap: reserve.borrowCap, totalBorrowed: reserve.borrowed, decimals: reserve.decimals }) : 0;

  const block = (title: string, children: React.ReactNode, actions: React.ReactNode) => (
    <Box sx={{ py: 4, borderTop: `1px solid ${tv('border-0')}` }}>
      <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem', mb: 1 }}>{title}</Typography>
      {children}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>{actions}</Box>
    </Box>
  );

  return (
    <ProCard sx={{ p: '1.25rem' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography sx={{ fontWeight: 500 }}>Your Positions</Typography>
        {Number.isFinite(p.healthFactor) && <HealthFactor value={p.healthFactor} />}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'bg-5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WalletIcon sx={{ fontSize: 18, color: 'fg-2' }} />
        </Box>
        <Box>
          <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>Wallet Balance</Typography>
          <Typography sx={{ fontWeight: 500 }}>
            {formatNumber(wallet)} {reserve.symbol}
          </Typography>
        </Box>
      </Box>
      {reserve.suppliable || mine.supplied > 0
        ? block(
            'Your Deposits',
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{formatNumber(mine.supplied)} {reserve.symbol}</Typography>
                <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>{formatUSD(mine.supplied * reserve.priceUSD)} · Available to Deposit {formatNumber(availDeposit)}</Typography>
              </Box>
              {reserve.collateral && mine.supplied > 0 && (
                <Tooltip title={mine.collateralEnabled ? 'Collateral Enabled' : 'Use as Collateral'}>
                  <Switch checked={mine.collateralEnabled} onChange={() => open({ type: 'collateral', reserveId: reserve.id })} slotProps={{ input: { 'aria-label': 'Use as collateral' } }} />
                </Tooltip>
              )}
            </Box>,
            <>
              <ProButton variant="primary" disabled={!reserve.suppliable || reserve.frozen || availDeposit <= 0} onClick={() => open({ type: 'deposit', reserveId: reserve.id })} sx={{ flex: 1 }}>
                Deposit
              </ProButton>
              <ProButton variant="secondary" disabled={mine.supplied <= 0} onClick={() => open({ type: 'withdraw', reserveId: reserve.id })} sx={{ flex: 1 }}>
                Withdraw
              </ProButton>
            </>
          )
        : block('Your Deposits', <Typography sx={{ fontSize: '0.875rem', color: 'fg-3' }}>Depositing {reserve.symbol} is not supported in this reserve</Typography>, null)}
      {reserve.borrowable || mine.borrowed > 0
        ? block(
            'Your Loans',
            <Box>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 500 }}>{formatNumber(mine.borrowed)} {reserve.symbol}</Typography>
              <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>
                {formatUSD(mine.borrowed * reserve.priceUSD)} · Your APY {formatPercent(effectiveBorrowRate(reserve.borrowAPY, p.riskPremium))} · Available to Borrow {formatNumber(availBorrow)}
              </Typography>
            </Box>,
            <>
              <ProButton variant="primary" disabled={!reserve.borrowable || reserve.frozen || availBorrow <= 0} onClick={() => open({ type: 'borrow', reserveId: reserve.id })} sx={{ flex: 1 }}>
                Borrow
              </ProButton>
              <ProButton variant="secondary" disabled={mine.borrowed <= 0} onClick={() => open({ type: 'repay', reserveId: reserve.id })} sx={{ flex: 1 }}>
                Repay
              </ProButton>
            </>
          )
        : block('Your Loans', <Typography sx={{ fontSize: '0.875rem', color: 'fg-3' }}>Borrowing {reserve.symbol} is not supported in this reserve</Typography>, null)}
      <Box sx={{ pt: 4, borderTop: `1px solid ${tv('border-0')}` }}>
        <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>Borrowing Power</Typography>
        <Typography sx={{ fontWeight: 500 }}>{formatUSD(p.availableBorrowsUSD)}</Typography>
        <Typography sx={{ color: 'fg-3', fontSize: '0.75rem', mt: 1 }}>Each collateral asset contributes to your borrowing power based on its value and collateral factor.</Typography>
      </Box>
    </ProCard>
  );
}

export function ProReservePage({ reserveId }: { reserveId: string }) {
  const router = useRouter();
  const { protocol, user } = useProContext();
  const [side, setSide] = React.useState<'supply' | 'borrow'>('supply');
  const [range, setRange] = React.useState<TimeRange>('1m');
  const snap = protocol.data;
  const r = snap?.reserves.find((x) => x.id.toLowerCase() === reserveId.toLowerCase());
  const hubAsset = snap?.hubAssets.find((a) => r && a.hubId === r.hubId && a.symbol === r.symbol);
  const chain = snap?.chains.find((c) => c.id === r?.chainId);

  if (snap && !r) return <ProEmpty titleAs="h1" title="Page not Found" description="We could not find the page you were looking for." action={<ProButton variant="secondary" href={proRoutes.deposit}>Back to Explore</ProButton>} />;

  return (
    <>
      <Box>
        <Box component="button" type="button" onClick={() => router.back()} sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', border: 0, background: 'none', p: 0, mb: 4, color: 'fg-3', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', '&:hover': { color: 'fg-1' }, '&:hover svg': { transform: 'translateX(-2px)' }, '& svg': { transition: 'transform 100ms' } }}>
          <ChevronLeftIcon sx={{ fontSize: 16 }} /> Back
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', animation: 'clone-fade-up 300ms ease both' }}>
          {r ? <TokenIcon symbol={r.symbol} size={48} /> : <Skeleton variant="circular" width={48} height={48} />}
          <Box>
            <Typography component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '1.875rem' }, fontWeight: 500, lineHeight: 1.15 }}>
              {r ? (
                <>
                  {r.symbol} <Box component="span" sx={{ color: 'fg-3' }}>{r.name}</Box>
                </>
              ) : (
                <Skeleton width={200} />
              )}
            </Typography>
            {r && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Box component={Link} href={proRoutes.market(r.spokeId)}>
                  <Tag>{r.spokeName} Market</Tag>
                </Box>
                <Box component={Link} href={proRoutes.hub(r.hubId)}>
                  <Tag tone="purple">{r.hubName} Hub</Tag>
                </Box>
                <Tag>
                  <ChainIcon chain={chain} size={12} /> {chain?.name}
                </Tag>
                {r.frozen && <Tag tone="warning">Frozen</Tag>}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <StatsRow>
        <Stat label="Price" tooltip="Current asset price (illustrative, fixed in this demo)" loading={!r}>
          {r && formatUSD(r.priceUSD)}
        </Stat>
        <Stat label="Total Deposits" tooltip="Total amount currently deposited for this asset" loading={!r}>
          {r && <USD value={r.suppliedUSD} />}
        </Stat>
        <Stat label="Total Borrows" tooltip="Total amount currently borrowed for this asset" loading={!r}>
          {r && <USD value={r.borrowedUSD} />}
        </Stat>
        <Stat label="Deposit APY" loading={!r}>
          {r && (
            <Box component="span" sx={{ color: 'data-green' }}>
              <Pct value={r.supplyAPY + r.underlyingYieldAPY} />
            </Box>
          )}
        </Stat>
        <Stat label="Borrow APY" loading={!r}>
          {r && (r.borrowable ? <Pct value={r.borrowAPY} /> : '—')}
        </Stat>
        <Stat label="Utilisation" tooltip="Percentage of deposited assets currently being borrowed (hub-wide)" loading={!hubAsset}>
          {hubAsset && <Pct value={hubAsset.utilization} />}
        </Stat>
      </StatsRow>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 380px' }, gap: { xs: 7, lg: 8 }, alignItems: 'start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 7, md: 10 }, minWidth: 0 }}>
          <Section
            title="Interest Rates"
            description={r && r.underlyingYieldAPY > 0 ? `Incl. ${formatPercent(r.underlyingYieldAPY)} Est. Underlying Yield` : `${side === 'supply' ? 'Deposit' : 'Borrow'} APY currently offered on this market`}
            right={
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <SegmentedControl ariaLabel="Rate side" size="small" height={28} value={side} onChange={setSide} options={[{ value: 'supply', label: 'Deposit' }, ...(r?.borrowable ? [{ value: 'borrow' as const, label: 'Borrow' }] : [])]} />
                <SegmentedControl ariaLabel="Time window" size="small" height={28} value={range} onChange={setRange} options={(['1w', '1m', '6m', '1y'] as const).map((v) => ({ value: v, label: v.toUpperCase() }))} />
              </Box>
            }
          >
            <ProCard sx={{ p: '1.25rem' }}>
              {r ? (
                <>
                  <ChartLegend items={[{ label: `${side === 'supply' ? 'Deposit' : 'Borrow'} APY (simulated history)`, color: side === 'supply' ? tv('data-green') : tv('data-orange') }]} />
                  <Box sx={{ mt: 3 }}>
                    <RateHistoryChart seed={`${r.id}:${side}`} current={side === 'supply' ? r.supplyAPY + r.underlyingYieldAPY : r.borrowAPY} range={range} color={side === 'supply' ? tv('data-green') : tv('data-orange')} label={side === 'supply' ? 'Deposit APY' : 'Borrow APY'} height={200} />
                  </Box>
                </>
              ) : (
                <Skeleton height={200} />
              )}
            </ProCard>
          </Section>

          {hubAsset && r?.borrowable && (
            <Section title="Interest Rate Model" description={`Rates are set by the ${r.hubName} Hub from its utilisation, shared by every connected market.`}>
              <ProCard sx={{ p: '1.25rem' }}>
                <ChartLegend items={[{ label: 'Borrow APR', color: CHART_COLORS.borrow }, { label: 'Utilisation', color: CHART_COLORS.utilization }]} />
                <Box sx={{ mt: 3 }}>
                  <InterestRateModelChart strategy={hubAsset.rateStrategy} utilization={hubAsset.utilization} totalSuppliedUSD={hubAsset.totalSuppliedUSD} totalBorrowedUSD={hubAsset.totalBorrowedUSD} height={200} />
                </Box>
              </ProCard>
            </Section>
          )}

          {r && hubAsset && (
            <Section title="Reserve Configuration" description="Risk parameters for this asset in this market">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
                <KV label="Collateral Factor" tooltip="Maximum percentage of a collateral asset's value that can be borrowed against">
                  {r.collateral ? formatPercent(r.collateralFactor) : <Box component="span" sx={{ color: 'fg-4' }}>Not eligible</Box>}
                </KV>
                <KV label="Max Liquidation Bonus">{r.collateral ? formatPercent(r.maxLiquidationBonus) : '—'}</KV>
                <KV label="Liquidation Fee">{formatPercent(r.liquidationFee)}</KV>
                <KV label="Collateral Risk" tooltip="An additional charge on borrow rates based on each asset's risk profile, set by governance">{r.collateral ? formatPercent(r.collateralRisk) : '—'}</KV>
                <CapacityKV label="Deposit Capacity" used={r.supplied} cap={r.supplyCap} symbol={r.symbol} price={r.priceUSD} />
                <CapacityKV label="Borrow Capacity" used={r.borrowed} cap={r.borrowable ? r.borrowCap : 0} symbol={r.symbol} price={r.priceUSD} />
                <KV label="Liquidity Fee" tooltip="Fee charged by the Hub on interest earned by depositors">{formatPercent(hubAsset.liquidityFee)}</KV>
                <KV label="Status">
                  <Box component="span" sx={{ color: r.frozen ? 'yellow-1' : 'data-green' }}>{r.frozen ? 'Frozen' : r.paused ? 'Paused' : 'Active'}</Box>
                </KV>
              </Box>
            </Section>
          )}

          {r && (
            <Section title="Hub & Market">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {[
                  { kind: 'hub' as const, name: r.hubName, href: proRoutes.hub(r.hubId), text: 'The central pool where all liquidity is stored, shared across connected markets' },
                  { kind: 'market' as const, name: r.spokeName, href: proRoutes.market(r.spokeId), text: 'A market that connects to a Hub to access shared liquidity, with its own reserves and risk parameters' },
                ].map((x) => (
                  <ProCard key={x.kind} component={Link} href={x.href} sx={{ p: '1rem', display: 'flex', gap: 3, alignItems: 'center', transition: 'transform 180ms ease, box-shadow 180ms ease', '&:hover': { transform: 'translateY(-1px)' } }}>
                    <HubMarketIcon kind={x.kind} label={x.name} size={36} />
                    <Box>
                      <Typography sx={{ fontWeight: 500 }}>
                        {x.name} {x.kind === 'hub' ? 'Hub' : 'Market'}
                      </Typography>
                      <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>{x.text}</Typography>
                    </Box>
                  </ProCard>
                ))}
              </Box>
            </Section>
          )}
        </Box>

        <Box sx={{ position: { lg: 'sticky' }, top: { lg: '6.5rem' } }}>{snap && r && <YourPositions reserve={r} snap={snap} user={user.data} />}</Box>
      </Box>
    </>
  );
}
