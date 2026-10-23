'use client';

import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { ProPosition, ProProtocolSnapshot, ProReserve, ProUserState } from '@/data/types';
import { formatLowerCompact, formatNumber, formatPercent } from '@/shared/format';
import { ArrowRightIcon, QrIcon } from '@/shared/ui/Icons';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useWallet } from '@/shared/state/wallet';
import { useNotice } from '@/shared/state/notice';
import { surfaceShadow, tv } from '@/shared/theme/tokens';
import { transition } from '@/shared/theme/motion';
import { AssetCell, ChainIcon, HealthFactor, HubMarketIcon, PageTitle, Pct, ProButton, ProCard, ProEmpty, ProTable, Section, Stat, StatsRow, Tag, USD } from '../ui';
import { proRoutes, useProContext, useProModal } from '../state';
import { ExplorePage } from './Explore';

const noopSubscribe = () => () => {};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function useRequireWallet() {
  const account = useWallet((s) => s.account);
  const openConnect = useWallet((s) => s.openConnect);
  return (fn: () => void) => (account ? fn() : openConnect());
}

function FeaturedCard({ r, side, snap }: { r: ProReserve; side: 'supply' | 'borrow'; snap: ProProtocolSnapshot }) {
  const chain = snap.chains.find((c) => c.id === r.chainId);
  return (
    <Box
      component={Link}
      href={proRoutes.reserve(r.id)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        p: '1.25rem',
        borderRadius: '0.875rem',
        bgcolor: 'bg-3',
        boxShadow: surfaceShadow('shadow-stroke-1'),
        transition: transition(['transform', 'box-shadow'], 220),
        '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${tv('shadow-medium')}, 0 0 0 1px ${tv('shadow-stroke-1')}` },
        '&:hover .go': { transform: 'translateX(3px)', color: 'fg-1' },
        '*:where([data-mui-color-scheme="dark"]) &': { bgcolor: 'bg-2' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TokenIcon symbol={r.symbol} size={36} />
          <Box>
            <Typography sx={{ fontWeight: 500 }}>{r.symbol}</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: 'fg-3', display: 'flex', alignItems: 'center', gap: 1 }}>
              {r.spokeName} Market · <ChainIcon chain={chain} size={12} /> {chain?.name}
            </Typography>
          </Box>
        </Box>
        <ArrowRightIcon className="go" sx={{ fontSize: 18, color: 'fg-4', transition: transition(['transform', 'color'], 160) }} />
      </Box>
      <Box sx={{ display: 'flex', gap: 6 }}>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: 'fg-3' }}>{side === 'supply' ? 'Deposit APY' : 'Borrow APY'}</Typography>
          <Typography sx={{ fontSize: '1.375rem', fontWeight: 500, color: side === 'supply' ? 'data-green' : 'fg-1' }}>{formatPercent(side === 'supply' ? r.supplyAPY + r.underlyingYieldAPY : r.borrowAPY)}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: 'fg-3' }}>{side === 'supply' ? 'Total Deposits' : 'Total Borrows'}</Typography>
          <Typography sx={{ fontSize: '1.375rem', fontWeight: 500 }}>{formatLowerCompact(side === 'supply' ? r.suppliedUSD : r.borrowedUSD, { usd: true, compact: true })}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function Hero({ snap }: { snap?: ProProtocolSnapshot }) {
  const openConnect = useWallet((s) => s.openConnect);
  const topSupply = snap ? [...snap.reserves].filter((r) => r.suppliable && !r.frozen).sort((a, b) => b.suppliedUSD - a.suppliedUSD).slice(0, 3) : [];
  const topBorrow = snap ? [...snap.reserves].filter((r) => r.borrowable && !r.frozen).sort((a, b) => b.borrowedUSD - a.borrowedUSD).slice(0, 3) : [];
  return (
    <>
      <ProCard sx={{ p: { xs: '1.5rem', md: '2.5rem' }, position: 'relative', overflow: 'hidden', animation: 'clone-fade-up 320ms ease both' }}>
        <Box
          aria-hidden
          sx={{ position: 'absolute', right: -80, top: -80, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, color-mix(in srgb, ${tv('purple-1')} 22%, transparent), transparent 70%)`, animation: 'pro-float 9s ease-in-out infinite alternate', '@keyframes pro-float': { from: { transform: 'translate(0,0)' }, to: { transform: 'translate(-40px, 30px)' } } }}
        />
        <Typography sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 500, lineHeight: 1.15, maxWidth: 520, position: 'relative' }}>The full power of DeFi</Typography>
        <Typography sx={{ color: 'fg-3', mt: 2, maxWidth: 520, position: 'relative' }}>
          Deposit, borrow and track positions across hubs and markets, including tokenised stocks. Everything on this page is simulated demo data.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 6, position: 'relative', flexWrap: 'wrap' }}>
          <ProButton variant="primary" onClick={openConnect}>
            Get Started
          </ProButton>
          <ProButton variant="secondary" href={proRoutes.deposit}>
            Explore Markets
          </ProButton>
        </Box>
      </ProCard>
      <Section title="Deposit Opportunities" description="Largest markets by total deposits">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>{snap && topSupply.map((r) => <FeaturedCard key={r.id} r={r} side="supply" snap={snap} />)}</Box>
      </Section>
      <Section title="Borrowing Opportunities" description="Largest markets by total borrows">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>{snap && topBorrow.map((r) => <FeaturedCard key={r.id} r={r} side="borrow" snap={snap} />)}</Box>
      </Section>
    </>
  );
}

function PositionsTable({ snap, user }: { snap: ProProtocolSnapshot; user: ProUserState }) {
  const router = useRouter();
  const spoke = (p: ProPosition) => snap.spokes.find((s) => s.id === p.spokeId)!;
  return (
    <ProTable
      rows={user.positions}
      rowKey={(p) => p.id}
      onRowClick={(p) => router.push(proRoutes.position(p.id))}
      defaultSort={{ key: 'balance', desc: true }}
      columns={[
        {
          key: 'market',
          label: 'Market',
          render: (p) => {
            const s = spoke(p);
            const chain = snap.chains.find((c) => c.id === s.chainId);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <HubMarketIcon kind="market" label={s.name} size={32} />
                <Box>
                  <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{s.name} Market</Typography>
                  <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ChainIcon chain={chain} size={12} /> {chain?.name}
                  </Typography>
                </Box>
              </Box>
            );
          },
          sortValue: (p) => spoke(p).name,
        },
        { key: 'balance', label: 'Balance', tooltip: 'Net value of your position (deposits minus borrows)', render: (p) => formatLowerCompact(p.summary.netWorthUSD, { usd: true, compact: true }), sortValue: (p) => p.summary.netWorthUSD },
        { key: 'collateral', label: 'Collateral', render: (p) => formatLowerCompact(p.summary.totalCollateralUSD, { usd: true, compact: true }), sortValue: (p) => p.summary.totalCollateralUSD },
        { key: 'borrowed', label: 'Borrowed', render: (p) => formatLowerCompact(p.summary.totalBorrowedUSD, { usd: true, compact: true }), sortValue: (p) => p.summary.totalBorrowedUSD },
        { key: 'apy', label: 'Position APY', render: (p) => <Box component="span" sx={{ color: p.summary.netAPY >= 0 ? 'data-green' : 'data-red' }}>{formatPercent(p.summary.netAPY)}</Box>, sortValue: (p) => p.summary.netAPY, hideOnMobile: true },
        { key: 'hf', label: 'Health Factor', tooltip: 'A ratio of your total collateral value to total debt. Below 1.0, your position can be liquidated.', render: (p) => <HealthFactor value={p.summary.healthFactor} />, sortValue: (p) => (Number.isFinite(p.summary.healthFactor) ? p.summary.healthFactor : 1e9) },
      ]}
    />
  );
}

function DepositsTable({ snap, user }: { snap: ProProtocolSnapshot; user: ProUserState }) {
  const open = useProModal((s) => s.open);
  const rows = user.positions.flatMap((p) => p.lines.filter((l) => l.supplied > 0).map((l) => ({ l, r: snap.reserves.find((x) => x.id === l.reserveId)! })));
  if (rows.length === 0) return <ProEmpty title="No Deposits" description="Deposit an asset from your wallet to get started" action={<ProButton variant="secondary" href={proRoutes.deposit}>Explore Deposits</ProButton>} />;
  return (
    <ProTable
      rows={rows}
      rowKey={(x) => x.r.id}
      defaultSort={{ key: 'value', desc: true }}
      columns={[
        { key: 'asset', label: 'Asset', render: ({ r }) => <AssetCell symbol={r.symbol} sub={<>{r.spokeName} Market</>} />, sortValue: ({ r }) => r.symbol },
        { key: 'value', label: 'Deposited', render: ({ l, r }) => <Box><Box>{formatLowerCompact(l.suppliedUSD, { usd: true, compact: true })}</Box><Box sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>{formatNumber(l.supplied)} {r.symbol}</Box></Box>, sortValue: ({ l }) => l.suppliedUSD },
        { key: 'apy', label: 'APY', render: ({ r }) => <Box component="span" sx={{ color: 'data-green' }}>{formatPercent(r.supplyAPY + r.underlyingYieldAPY)}</Box>, sortValue: ({ r }) => r.supplyAPY },
        {
          key: 'collateral',
          label: 'Collateral',
          tooltip: 'Whether this asset is enabled as collateral for borrowing',
          render: ({ l, r }) =>
            r.collateral ? (
              <Tooltip title={l.collateralEnabled ? 'Disable as Collateral' : 'Enable as Collateral'}>
                <Switch checked={l.collateralEnabled} onClick={(e) => e.stopPropagation()} onChange={() => open({ type: 'collateral', reserveId: r.id })} slotProps={{ input: { 'aria-label': `Use ${r.symbol} as collateral` } }} />
              </Tooltip>
            ) : (
              <Typography sx={{ color: 'fg-4', fontSize: '0.8125rem' }}>Not eligible</Typography>
            ),
          sortValue: ({ l }) => Number(l.collateralEnabled),
        },
      ]}
      actions={({ r }) => (
        <>
          <ProButton size="sm" variant="secondary" onClick={() => open({ type: 'withdraw', reserveId: r.id })}>
            Withdraw
          </ProButton>
          <ProButton size="sm" variant="primary" onClick={() => open({ type: 'deposit', reserveId: r.id })} disabled={!r.suppliable || r.frozen}>
            Deposit
          </ProButton>
        </>
      )}
    />
  );
}

function BorrowsTable({ snap, user }: { snap: ProProtocolSnapshot; user: ProUserState }) {
  const open = useProModal((s) => s.open);
  const rows = user.positions.flatMap((p) => p.lines.filter((l) => l.borrowed > 0).map((l) => ({ l, p, r: snap.reserves.find((x) => x.id === l.reserveId)! })));
  if (rows.length === 0) return <ProEmpty title="No Borrows" description="Borrow an asset to see it listed here" action={<ProButton variant="secondary" href={proRoutes.borrow}>Explore Borrows</ProButton>} />;
  return (
    <ProTable
      rows={rows}
      rowKey={(x) => x.r.id}
      defaultSort={{ key: 'value', desc: true }}
      columns={[
        { key: 'asset', label: 'Asset', render: ({ r }) => <AssetCell symbol={r.symbol} sub={<>{r.spokeName} Market</>} />, sortValue: ({ r }) => r.symbol },
        { key: 'value', label: 'Borrowed', render: ({ l, r }) => <Box><Box>{formatLowerCompact(l.borrowedUSD, { usd: true, compact: true })}</Box><Box sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>{formatNumber(l.borrowed)} {r.symbol}</Box></Box>, sortValue: ({ l }) => l.borrowedUSD },
        {
          key: 'apy',
          label: 'Borrow APY',
          tooltip: 'Your effective borrow rate, combining the base rate for this asset and your risk premium',
          render: ({ l, r }) => (
            <Box component="button" type="button" onClick={(e: React.MouseEvent) => { e.stopPropagation(); open({ type: 'rate', reserveId: r.id }); }} sx={{ border: 0, background: 'none', p: 0, fontFamily: 'inherit', fontSize: '0.875rem', color: 'fg-1', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
              {formatPercent(l.effectiveBorrowAPY)}
            </Box>
          ),
          sortValue: ({ l }) => l.effectiveBorrowAPY,
        },
        { key: 'rp', label: 'Risk Premium', render: ({ p }) => formatPercent(p.summary.riskPremium), sortValue: ({ p }) => p.summary.riskPremium, hideOnMobile: true },
      ]}
      actions={({ r }) => (
        <>
          <ProButton size="sm" variant="secondary" onClick={() => open({ type: 'repay', reserveId: r.id })}>
            Repay
          </ProButton>
          <ProButton size="sm" variant="primary" onClick={() => open({ type: 'borrow', reserveId: r.id })}>
            Borrow
          </ProButton>
        </>
      )}
    />
  );
}

function BalanceTable({ snap, user }: { snap: ProProtocolSnapshot; user: ProUserState }) {
  const notice = useNotice();
  const rows = Object.entries(user.wallet).flatMap(([chainId, bal]) =>
    Object.entries(bal)
      .filter(([, v]) => v > 0)
      .map(([symbol, amount]) => {
        const r = snap.reserves.find((x) => x.chainId === Number(chainId) && (x.symbol === symbol || x.symbol === `W${symbol}`));
        return { chainId: Number(chainId), symbol, amount, value: amount * (r?.priceUSD ?? 0), depositTarget: snap.reserves.filter((x) => x.chainId === Number(chainId) && x.symbol === symbol && x.suppliable).sort((a, b) => b.supplyAPY - a.supplyAPY)[0] };
      })
  );
  const open = useProModal((s) => s.open);
  if (rows.length === 0)
    return (
      <ProEmpty
        title="No Wallet Balance"
        description="Deposit assets to your account address"
        action={
          <ProButton variant="secondary" prefixIcon={<QrIcon sx={{ fontSize: 16 }} />} onClick={() => notice.show('Fund your Account', 'In the real app this shows a QR code for your address. This demo account cannot receive real funds: switch to the funded demo account from the account menu instead.')}>
            Fund your Account
          </ProButton>
        }
      />
    );
  return (
    <ProTable
      rows={rows}
      rowKey={(x) => `${x.chainId}:${x.symbol}`}
      defaultSort={{ key: 'value', desc: true }}
      columns={[
        { key: 'token', label: 'Asset', render: (x) => <AssetCell symbol={x.symbol} sub={<><ChainIcon chain={snap.chains.find((c) => c.id === x.chainId)} size={12} /> {snap.chains.find((c) => c.id === x.chainId)?.name}</>} />, sortValue: (x) => x.symbol },
        { key: 'amount', label: 'Balance', tooltip: 'Amount of this asset in your wallet', render: (x) => <>{formatNumber(x.amount)} <Box component="span" sx={{ color: 'fg-3' }}>{x.symbol}</Box></>, sortValue: (x) => x.amount },
        { key: 'value', label: 'Value', render: (x) => formatLowerCompact(x.value, { usd: true, compact: true }), sortValue: (x) => x.value },
        { key: 'best', label: 'Best Deposit APY', tooltip: 'Best available deposit APY across all markets for this asset', render: (x) => (x.depositTarget ? <Box component="span" sx={{ color: 'data-green' }}>{formatPercent(x.depositTarget.supplyAPY + x.depositTarget.underlyingYieldAPY)}</Box> : <Box component="span" sx={{ color: 'fg-4' }}>—</Box>), sortValue: (x) => x.depositTarget?.supplyAPY ?? -1, hideOnMobile: true },
      ]}
      actions={(x) =>
        x.depositTarget ? (
          <ProButton size="sm" variant="primary" onClick={() => open({ type: 'deposit', reserveId: x.depositTarget!.id })}>
            Deposit
          </ProButton>
        ) : (
          <ProButton size="sm" variant="tertiary" href={proRoutes.token(x.symbol)}>
            View
          </ProButton>
        )
      }
    />
  );
}

export function ProDashboard() {
  const { account, hydrated, protocol, user } = useProContext();
  // Time-of-day greeting only on the client (server renders a neutral word, no mismatch).
  const hello = React.useSyncExternalStore(noopSubscribe, greeting, () => 'Welcome');
  const snap = protocol.data;
  const u = user.data;
  const s = u?.summary;

  // Live behaviour (2026-10-13 capture): with no wallet, '/' renders the Deposit explore page in place.
  if (hydrated && !account) return <ExplorePage side="supply" />;

  return (
    <>
      <PageTitle title={account ? hello : 'Dashboard'} subtitle={account ? 'Track positions and activity' : 'Overview of your positions across Aave Pro markets'} />
      {!hydrated ? null : !account ? (
        <Hero snap={snap} />
      ) : (
        <>
          <StatsRow>
            <Stat label="Balance" tooltip="Net value of your position in USD (deposits minus borrows)" loading={!s} size="lg">
              <USD value={s?.balanceUSD ?? 0} />
            </Stat>
            <Stat label="Deposited" tooltip="Total value currently deposited in your positions" loading={!s} size="lg">
              <USD value={s?.depositedUSD ?? 0} />
            </Stat>
            <Stat label="Borrowed" tooltip="Total value currently borrowed in your positions" loading={!s} size="lg">
              <USD value={s?.borrowedUSD ?? 0} />
            </Stat>
            <Stat label="Net APY" tooltip="Your net annualised return across all positions after combining deposit yield and borrow costs" loading={!s} size="lg">
              {s && s.balanceUSD > 0 ? <Pct value={s.netAPY} /> : '—'}
            </Stat>
            <Stat label="Lowest Health Factor" tooltip="A ratio of your total collateral value to total debt. Below 1.0, your position can be liquidated." loading={!s} size="lg">
              {s && Number.isFinite(s.lowestHealthFactor) ? <HealthFactor value={s.lowestHealthFactor} /> : '—'}
            </Stat>
          </StatsRow>
          <Section title="Positions" description="Your balances, collateral, and debt on each market" right={<Tag>{u?.positions.length ?? 0} active</Tag>}>
            {!snap || !u ? <ProTable rows={[]} columns={[{ key: 'a', label: 'Market', render: () => null }, { key: 'b', label: 'Balance', render: () => null }, { key: 'c', label: 'Health Factor', render: () => null }]} rowKey={() => ''} loading /> : u.positions.length === 0 ? <ProEmpty title="No Positions" description="Deposit an asset from your wallet to open a position" action={<ProButton variant="primary" href={proRoutes.deposit}>Deposit</ProButton>} /> : <PositionsTable snap={snap} user={u} />}
          </Section>
          {snap && u && (
            <>
              <Section title="Deposits">
                <DepositsTable snap={snap} user={u} />
              </Section>
              <Section title="Borrows" id="loans">
                <BorrowsTable snap={snap} user={u} />
              </Section>
              <Section title="Your Balance" description="Your wallet balance across chains">
                <BalanceTable snap={snap} user={u} />
              </Section>
              <Section title="Rewards">
                <ProEmpty title="No Rewards" description="No rewards available to claim yet" />
              </Section>
            </>
          )}
        </>
      )}
    </>
  );
}
