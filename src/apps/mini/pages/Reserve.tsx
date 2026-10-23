'use client';

/**
 * Reserve page (/mini/reserve/[symbol]), modelled on Pro's reserve page and built from Pro's parts:
 * sticky compacting EntityHeader with Supply / Borrow, five top stats, Interest Rates chart, Supply
 * and Borrow totals chart, Protocol Parameters (rings), the Interest Rate Model curve drawn from
 * getReserveConfig, Available Liquidity (chart), Top Addresses and recent activity, all from the
 * event log (replayed exactly on a chain, simulated in mock mode).
 */
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import * as React from 'react';
import { EntityHeader, SectionDivider, SectionHeading, SERIES, StatBlock, StatGroup, StatLine, StatSummary } from '@/apps/pro/components/Entity';
import { ScrollTable, type ScrollColumn } from '@/apps/pro/components/ScrollTable';
import { PIBorrow, PIDeposit, PIMore } from '@/apps/pro/icons';
import { BigRing, InfoLabel, IrmCurve, Param, PctRing, reserveCard, ShareBar, TopStat } from '@/apps/pro/pages/ReservePage';
import { SegmentedToggle } from '@/apps/pro/pages/preferences/controls';
import { ProButton, ProEmpty, USD } from '@/apps/pro/ui';
import { formatLowerCompact } from '@/shared/format';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { tv } from '@/shared/theme/tokens';
import { roleOf } from '../data/config';
import { useAccountData, useEvents, useMarkets, useReserveConfig, useReserveHistory, type MarketRow } from '../data/hooks';
import { useReadChainId, useWallet } from '../data/useWallet';
import { borrowAprAt, rateModelOf, supplyAprAt, topHolders, type Holder, type ReserveHistoryPoint } from '../lib/history';
import { aprToApyPercent, fmtBps, fmtPercent, fmtToken, fmtUsd, fmtWadPercent, shortAddr } from '../lib/format';
import { miniRoutes } from '../layout/MiniShell';
import { useMiniTx } from '../tx/store';
import { ActivitySkeleton, describeEvent, EventFeed } from '../ui/activity';
import { MiniChart } from '../ui/charts';
import { ActionGate, useReadChainName } from '../ui/parts';
import { tokens, usdOf } from './Markets';
import { BRAND } from '../brand';

const pct = (v: number) => fmtPercent(v * 100);
const relTime = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000);
  return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/** Your supplied / borrowed amounts of this asset, with Withdraw / Repay (connected wallet only). */
function YourPosition({ m }: { m: MarketRow }) {
  const { account } = useWallet();
  const user = useAccountData(account);
  const open = useMiniTx((s) => s.open);
  const row = user.data?.rows.find((r) => r.asset === m.asset);
  if (!account || !row) return null;
  const [supplied, borrowed] = row.data;
  const cell = (label: string, v: bigint, action: React.ReactNode) => (
    <Box sx={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box>
        <InfoLabel label={label} />
        <Box sx={{ mt: '9px', fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          {fmtToken(v, m.decimals)} <Box component="span" sx={{ fontSize: 14, color: 'fg-3', fontWeight: 400 }}>{m.token.symbol} · {formatLowerCompact(usdOf(v, m), { usd: true })}</Box>
        </Box>
      </Box>
      {action}
    </Box>
  );
  return (
    <Box sx={{ ...reserveCard, mt: '32px', p: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px 40px', animation: 'clone-fade-up 300ms ease both' }}>
      {cell('You supplied', supplied, <ActionGate compact><ProButton size="sm" variant="secondary" disabled={supplied === 0n} onClick={() => open({ kind: 'withdraw', asset: m.asset })}>Withdraw</ProButton></ActionGate>)}
      <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'border-1', display: { xs: 'none', md: 'block' } }} />
      {cell('You borrowed', borrowed, <ActionGate compact><ProButton size="sm" variant="secondary" disabled={borrowed === 0n} onClick={() => open({ kind: 'repay', asset: m.asset })}>Repay</ProButton></ActionGate>)}
    </Box>
  );
}

export function ReservePage({ symbol }: { symbol: string }) {
  const markets = useMarkets();
  const m = markets.data?.find((r) => r.token.symbol.toLowerCase() === symbol.toLowerCase());
  const config = useReserveConfig(m?.asset);
  const history = useReserveHistory(m?.asset);
  const events = useEvents();
  const wallet = useWallet();
  const open = useMiniTx((s) => s.open);
  const network = useReadChainName();
  const readChain = useReadChainId();
  const [menu, setMenu] = React.useState<HTMLElement | null>(null);
  const [side, setSide] = React.useState<'deposits' | 'borrows'>('deposits');
  const [holderPage, setHolderPage] = React.useState(10);

  if (markets.data && !m) {
    return <ProEmpty titleAs="h1" title="Asset not found" description={`The ${BRAND} pool has no reserve called “${symbol}”.`} action={<ProButton variant="secondary" href={miniRoutes.markets}>Back to Markets</ProButton>} />;
  }

  const sym = m?.token.symbol ?? symbol.toUpperCase();
  const util = m ? tokens(m.utilization, 18) : 0;
  const model = config.data ? rateModelOf(config.data) : null;
  const chainId = wallet.mode === 'chain' ? readChain : null;
  const act = (kind: 'supply' | 'borrow' | 'faucet') => m && open({ kind, asset: m.asset });

  const assetEvents = m ? (events.data ?? []).filter((e) => (e.eventName === 'Liquidation' ? e.args.collateralAsset === m.asset || e.args.debtAsset === m.asset : e.args.asset === m.asset)) : [];
  const rows = assetEvents.slice().reverse().map((e) => describeEvent(e, wallet.account));
  const holders = m ? topHolders(events.data ?? [], m.asset, m.decimals, side) : [];
  const price = m ? Number(m.price) / 1e8 : 0;

  const actions = (wide: boolean) => (
    <ActionGate>
      <ProButton variant="secondary" prefixIcon={<PIDeposit />} onClick={() => act('supply')} sx={wide ? { flex: 1 } : undefined}>
        Supply
      </ProButton>
      <ProButton variant="secondary" prefixIcon={<PIBorrow />} onClick={() => act('borrow')} sx={wide ? { flex: 1 } : undefined}>
        Borrow
      </ProButton>
    </ActionGate>
  );
  const moreButton = (
    <ProButton variant="secondary" size="square" aria-label="More options" aria-haspopup="menu" aria-expanded={menu ? 'true' : undefined} onClick={(e) => setMenu(e.currentTarget)}>
      <PIMore />
    </ProButton>
  );

  const holderFirst: ScrollColumn<Holder> = {
    key: 'holder',
    label: 'Holder',
    render: (h) => (
      <Box component="span" sx={{ display: 'inline-flex', gap: '8px', whiteSpace: 'nowrap' }}>
        {shortAddr(h.address)}
        {roleOf(h.address) && <Box component="span" sx={{ color: 'fg-3' }}>{roleOf(h.address)}</Box>}
        {wallet.account && h.address.toLowerCase() === wallet.account.toLowerCase() && <Box component="span" sx={{ color: 'purple-1' }}>You</Box>}
      </Box>
    ),
  };
  const holderCols: ScrollColumn<Holder>[] = [
    { key: 'share', label: side === 'deposits' ? 'Share of Deposits' : 'Share of Borrows', render: (h) => <ShareBar share={h.share} width={164} />, mobile: (h) => pct(h.share), sortValue: (h) => h.share },
    {
      key: 'amount',
      label: side === 'deposits' ? 'Supplied' : 'Borrowed',
      render: (h) => (
        <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
          <Box component="span" sx={{ fontWeight: 500 }}>{formatLowerCompact(h.amount)} {sym}</Box> <Box component="span" sx={{ color: 'fg-3' }}>{formatLowerCompact(h.amount * price, { usd: true })}</Box>
        </Box>
      ),
      sortValue: (h) => h.amount,
    },
    { key: 'ago', label: 'Latest Activity', render: (h) => <Box component="span" sx={{ color: 'fg-2' }}>{relTime(h.lastT)}</Box>, sortValue: (h) => h.lastT, hideOnMobile: true },
  ];

  return (
    <Box>
      <EntityHeader
        titleSize={28}
        mobileActions={false}
        icon={m ? <TokenIcon symbol={sym} size={56} /> : <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'bg-3' }} />}
        title={
          <>
            {m?.token.name ?? ''}{' '}
            <Box component="span" sx={{ color: 'fg-3' }}>
              {sym}
            </Box>
          </>
        }
        sub={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'fg-2' }}>
            <Box component="a" href={miniRoutes.markets} sx={{ color: 'fg-1', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>
              {BRAND} Pool
            </Box>
            on {network}
          </Box>
        }
        actions={
          <>
            {actions(false)}
            {moreButton}
          </>
        }
      />
      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem
          onClick={() => {
            setMenu(null);
            void navigator.clipboard?.writeText(window.location.href);
          }}
        >
          Copy link
        </MenuItem>
        <MenuItem
          disabled={!wallet.account || wallet.wrongChain}
          onClick={() => {
            setMenu(null);
            act('faucet');
          }}
        >
          Get test {sym} (faucet)
        </MenuItem>
      </Menu>

      {m && <YourPosition m={m} />}

      <Box sx={{ mt: { xs: '28px', md: '52px' }, display: { xs: 'grid', md: 'flex' }, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: { xs: '32px', md: 0 }, rowGap: { xs: '25.6px', md: 3 }, flexWrap: 'wrap' }}>
        <TopStat first label="Total Supplied" tooltip="Everything supplied to this reserve, interest included" value={m ? <USD value={usdOf(m.totalSupplied, m)} /> : '—'} sub={m && `${formatLowerCompact(tokens(m.totalSupplied, m.decimals))} ${sym}`} />
        <TopStat label="Total Borrowed" tooltip="Everything borrowed from this reserve, interest included" value={m ? <USD value={usdOf(m.totalBorrowed, m)} /> : '—'} sub={m && `${formatLowerCompact(tokens(m.totalBorrowed, m.decimals))} ${sym}`} />
        <TopStat label="Available Liquidity" tooltip="Cash in the pool that can be borrowed or withdrawn right now" value={m ? <USD value={usdOf(m.availableLiquidity, m)} /> : '—'} sub={m && `${formatLowerCompact(tokens(m.availableLiquidity, m.decimals))} ${sym}`} />
        <TopStat label="Utilization" tooltip="Share of the supplied money that is borrowed" value={<PctRing value={util} />} />
        <TopStat label="Oracle Price" tooltip="USD price of one whole token from the price oracle" value={m ? <USD value={price} compact={false} /> : '—'} />
      </Box>
      <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: '8px', mt: '32px' }}>
        {actions(true)}
        {moreButton}
      </Box>

      <SectionDivider />
      <SectionHeading title="Interest Rates" description={`Supply and borrow APY for ${sym}, recomputed from utilization at every pool event.`} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: 0 }}>
        <Box sx={{ pt: '5px', mb: { xs: '-3px', lg: 0 } }}>
          <StatBlock label="Supply APY" tooltip="What suppliers earn per year (APR compounded per second, as Aave shows it)" space={17}>
            {m ? fmtPercent(aprToApyPercent(m.supplyRate)) : '—'}
          </StatBlock>
          <StatBlock label="Borrow APY" tooltip="What borrowers pay per year (variable)" divider={false}>
            {m ? fmtPercent(aprToApyPercent(m.borrowRate)) : '—'}
          </StatBlock>
        </Box>
        <MiniChart<ReserveHistoryPoint>
          ariaLabel={`${sym} interest rates`}
          history={history.data}
          series={[
            { key: 'sup', label: 'Supply APY', color: SERIES.green, kind: 'pct', value: (p) => p.supplyApy },
            { key: 'bor', label: 'Borrow APY', color: SERIES.orange, kind: 'pct', value: (p) => p.borrowApy },
          ]}
        />
      </Box>

      <SectionDivider />
      <SectionHeading title="Supply and Borrow" description={`Total ${sym} supplied to and borrowed from the pool, in USD at the oracle price of each moment.`} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: '24px' }}>
        <StatSummary label="Total Supplied" tooltip="Everything supplied to this reserve" value={m ? <USD value={usdOf(m.totalSupplied, m)} /> : '—'} sub={m && `${fmtToken(m.totalSupplied, m.decimals, 2)} ${sym}`}>
          <StatGroup>
            <StatLine label="Total Borrowed" tooltip="Everything borrowed from this reserve">{m ? formatLowerCompact(usdOf(m.totalBorrowed, m), { usd: true }) : '—'}</StatLine>
            <StatLine label="Borrowed share" tooltip="Utilization: borrowed ÷ supplied">{m ? fmtWadPercent(m.utilization) : '—'}</StatLine>
          </StatGroup>
        </StatSummary>
        <MiniChart<ReserveHistoryPoint>
          ariaLabel={`${sym} supplied and borrowed`}
          history={history.data}
          defaultRange="1M"
          series={[
            { key: 'sup', label: 'Total Supplied', color: SERIES.green, kind: 'usd', value: (p) => p.suppliedUsd },
            { key: 'bor', label: 'Total Borrowed', color: SERIES.orange, kind: 'usd', value: (p) => p.borrowedUsd },
          ]}
        />
      </Box>

      <SectionDivider />
      <SectionHeading title="Protocol Parameters" description="Risk settings of this reserve, read from getReserveConfig." />
      {config.data && m ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, columnGap: '32px', rowGap: '28px' }}>
            {[
              { label: 'Max LTV', tip: 'Borrow limit as a share of this collateral (8000 BPS = 80%)', v: config.data.ltv, color: SERIES.purple },
              { label: 'Liquidation threshold', tip: 'Danger line: collateral counts at this share for the health factor', v: config.data.liquidationThreshold, color: SERIES.orange },
              { label: 'Liquidation bonus', tip: "Liquidator's discount on seized collateral", v: config.data.liquidationBonus, color: SERIES.pink },
              { label: 'Reserve factor', tip: 'Share of interest the pool keeps', v: config.data.reserveFactor, color: SERIES.green },
            ].map((p, i) => (
              <Box key={p.label} sx={{ borderLeft: { md: i ? `1px solid ${tv('border-1')}` : 'none' }, pl: { md: i ? '32px' : 0 }, minWidth: 0 }}>
                <InfoLabel label={p.label} tooltip={p.tip} />
                <Box sx={{ mt: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <BigRing value={p.v / 10_000} color={p.color} />
                  <Box sx={{ fontSize: { xs: 19, md: 24 }, fontWeight: 500 }}>{fmtBps(p.v)}</Box>
                </Box>
              </Box>
            ))}
          </Box>
          <Box component="dl" sx={{ ...reserveCard, m: 0, mt: '40px', p: '24px 20px', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, columnGap: '32px', rowGap: '24px' }}>
            <Param label="Token" tooltip="The ERC-20 contract of this reserve">{shortAddr(m.asset)}</Param>
            <Param label="Decimals" tooltip="Token decimals (§4: USDC 6, WETH 18)">{m.decimals}</Param>
            <Param label="Use as collateral" tooltip="Supplied tokens count as collateral immediately">Supported</Param>
            <Param label="Close factor" tooltip="At most this share of a debt can be repaid in one liquidation">50%</Param>
            <Param label="Oracle price" tooltip="USD price of one whole token (8 decimals on chain)">{fmtUsd(m.price)}</Param>
            <Param label="Interest" tooltip="Variable rate, accrued every second">Variable</Param>
          </Box>
        </>
      ) : (
        <Box sx={{ ...reserveCard, height: 160 }} aria-busy />
      )}

      <SectionDivider />
      <SectionHeading title="Interest Rate Model" description="Borrow rates rise with utilization, slowly up to the optimal point and steeply above it." />
      {model && config.data ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: '24px' }}>
          <StatSummary label="Utilization Rate" tooltip="Share of the supplied money that is borrowed" value={<PctRing value={util} />}>
            <StatGroup>
              <StatLine label="Optimal utilization" tooltip="Above this utilization the steeper slope applies">{pct(model.optimal)}</StatLine>
              <StatLine label="Slope below optimal">{pct(model.slope1)}</StatLine>
              <StatLine label="Slope above optimal">{pct(model.slope2)}</StatLine>
              <StatLine label="Base borrow rate">{pct(model.base)}</StatLine>
              <StatLine label="Borrow APR now">{pct(borrowAprAt(util, model))}</StatLine>
            </StatGroup>
          </StatSummary>
          <Box>
            <IrmCurve rateAt={(u) => borrowAprAt(u, model)} second={{ rateAt: (u) => supplyAprAt(u, model), color: SERIES.green }} optimal={model.optimal} current={util} drawIn />
            <Box sx={{ display: 'flex', gap: '16px', mt: '12px', fontSize: 13, color: 'fg-3' }}>
              {[
                ['Borrow APR', SERIES.orange],
                ['Supply APR', SERIES.green],
              ].map(([l, c]) => (
                <Box key={l} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />
                  {l}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ ...reserveCard, height: 320 }} aria-busy />
      )}

      <SectionDivider />
      <SectionHeading title="Available Liquidity" description="Cash in the pool that can be borrowed or withdrawn right now." />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: '24px' }}>
        <StatSummary label="Available Liquidity" tooltip="Supplied minus borrowed" value={m ? <USD value={usdOf(m.availableLiquidity, m)} /> : '—'} sub={m && `${fmtToken(m.availableLiquidity, m.decimals, 2)} ${sym}`} />
        <MiniChart<ReserveHistoryPoint> ariaLabel={`${sym} available liquidity`} history={history.data} height={320} legend={false} defaultRange="1M" series={[{ key: 'liq', label: 'Available liquidity', color: SERIES.purple, kind: 'num', value: (p) => p.available }]} />
      </Box>

      <SectionDivider />
      <SectionHeading
        title="Top Addresses"
        description="Largest positions by address, replayed from the pool's events."
        right={
          <Box sx={{ alignSelf: 'center', mt: { xs: '7px', md: 0 } }}>
            <SegmentedToggle
              label="Top addresses by"
              track="surface"
              value={side}
              options={[
                { value: 'deposits', label: 'Deposits' },
                { value: 'borrows', label: 'Borrows' },
              ]}
              onChange={(v) => {
                setSide(v);
                setHolderPage(10);
              }}
            />
          </Box>
        }
      />
      {holders.length === 0 && events.data ? (
        <ProEmpty title={side === 'deposits' ? 'No suppliers yet' : 'No borrowers yet'} description={`Nobody has ${side === 'deposits' ? 'supplied' : 'borrowed'} ${sym} yet.`} />
      ) : (
        <ScrollTable
          rows={holders.slice(0, holderPage)}
          first={holderFirst}
          columns={holderCols}
          rowKey={(h) => h.address}
          defaultSort={{ key: 'share', desc: true }}
          firstWidth={260}
          loading={!events.data}
          dense
          mobileAside={(h) => pct(h.share)}
          footer={
            holderPage < holders.length && (
              <ProButton variant="text" onClick={() => setHolderPage((n) => n + 10)}>
                See more
              </ProButton>
            )
          }
        />
      )}

      <SectionDivider />
      <SectionHeading title="Recent Activity" description={`Supplies, withdrawals, borrows, repayments and liquidations of ${sym}.`} />
      {!events.data ? <ActivitySkeleton /> : <EventFeed rows={rows} chainId={chainId} empty={<ProEmpty title="No activity yet" description={`No ${sym} events in the pool yet.`} />} />}
    </Box>
  );
}

