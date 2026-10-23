'use client';

/**
 * Dashboard (§7): header from getUserAccountData(user); four sections from getUserReserveData +
 * balanceOf per token: Your supplies (Withdraw), Your borrows (Repay), Assets to supply (Supply ·
 * Faucet), Assets to borrow (max borrow per the §7 BigInt formula; Borrow).
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { SectionHeading } from '@/apps/pro/components/Entity';
import { PageTitle, ProButton, ProEmpty } from '@/apps/pro/ui';
import { ACCOUNTS } from '../data/config';
import { useAccountData, useMarkets, useUserHistory, type MarketRow, type UserRow } from '../data/hooks';
import { useWallet } from '../data/useWallet';
import { aprToApyPercent, fmtPercent, fmtToken, fmtUsd } from '../lib/format';
import { maxBorrow } from '../lib/preview';
import { useMiniTx } from '../tx/store';
import { ActionGate, TokenCell, useReadChainName } from '../ui/parts';
import Skeleton from '@mui/material/Skeleton';
import { SERIES } from '@/apps/pro/components/Entity';
import { InfoLabel, PctRing, reserveCard } from '@/apps/pro/pages/ReservePage';
import { Tag, USD } from '@/apps/pro/ui';
import type { UserHistoryPoint } from '../lib/history';
import { MAX_UINT256 } from '../lib/units';
import { MiniChart } from '../ui/charts';
import { HealthGauge } from '../ui/health';
import { MIFaucet } from '../ui/icons';
import { useFundModal } from '../data/funding';
import { MiniTable } from '../ui/MiniTable';

interface Line {
  market: MarketRow;
  row: UserRow;
  value: bigint;
}

function HeaderStat({ label, tooltip, children, sub }: { label: string; tooltip?: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <InfoLabel label={label} tooltip={tooltip} />
      <Box sx={{ mt: '10px', fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: '28.8px', color: 'fg-1', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>{children}</Box>
      {sub && <Box sx={{ mt: '6px', fontSize: 13, color: 'fg-3' }}>{sub}</Box>}
    </Box>
  );
}

const usd = (v: bigint) => Number(v) / 1e8;

const amountCell = (v: bigint, m: MarketRow) => (
  <Box component="span" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
    {fmtToken(v, m.decimals)} <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{m.token.symbol}</Box>
  </Box>
);

function Section({ title, description, lines, valueLabel, apy, apyLabel, actions, empty }: { title: string; description: string; lines: Line[]; valueLabel: string; apy: (m: MarketRow) => bigint; apyLabel: string; actions: (l: Line) => React.ReactNode; empty: string }) {
  return (
    <Box>
      <SectionHeading title={title} description={description} />
      <MiniTable
        ariaLabel={title}
        rows={lines}
        rowKey={(l) => l.market.asset}
        first={{ key: 'token', label: 'Token', render: (l) => <TokenCell asset={l.market.asset} /> }}
        columns={[
          { key: 'value', label: valueLabel, render: (l) => amountCell(l.value, l.market) },
          { key: 'usd', label: 'Value', render: (l) => <Box component="span" sx={{ color: 'fg-2' }}>{fmtUsd((l.value * l.market.price) / 10n ** BigInt(l.market.decimals))}</Box>, hideOnMobile: true },
          { key: 'apy', label: apyLabel, render: (l) => <Box component="span" sx={{ fontWeight: 500 }}>{fmtPercent(aprToApyPercent(apy(l.market)))}</Box> },
        ]}
        actions={(l) => <ActionGate compact>{actions(l)}</ActionGate>}
        mobileAside={(l) => fmtPercent(aprToApyPercent(apy(l.market)))}
        empty={empty}
      />
    </Box>
  );
}

export function DashboardPage() {
  const wallet = useWallet();
  const { account } = wallet;
  const markets = useMarkets();
  const user = useAccountData(account);
  const showFund = useFundModal((s) => s.show);
  const history = useUserHistory(account);
  const network = useReadChainName();
  const open = useMiniTx((s) => s.open);

  if (!account) {
    return (
      <>
        <PageTitle size={28} title="Dashboard" subtitle="Your collateral, debt, health factor, supplies and borrows." />
        {wallet.mode === 'mock' ? (
          <ProEmpty
            title="Connect a wallet"
            description="Pick one of the local test accounts (mock wallet: addresses only, no private keys)."
            action={
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                {ACCOUNTS.map((a) => (
                  <ProButton key={a.address} variant="secondary" onClick={() => wallet.connectMock(a.address)}>
                    {a.role}
                  </ProButton>
                ))}
                <ProButton variant="text" prefixIcon={<MIFaucet />} onClick={showFund}>
                  Fund your wallet (simulated)
                </ProButton>
              </Box>
            }
          />
        ) : (
          <ProEmpty
            title="Connect a wallet"
            description={wallet.hasBrowserWallet ? 'Connect MetaMask to see your supplies, borrows and health factor. MetaMask signs every transaction; the app never sees a private key.' : 'No browser wallet found in this browser. Install MetaMask, add the network, then reload this page.'}
            action={
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <ProButton variant="primary" loading={wallet.connecting} disabled={wallet.connecting} onClick={wallet.connectBrowser}>
                    Connect MetaMask
                  </ProButton>
                  <ProButton variant="secondary" prefixIcon={<MIFaucet />} onClick={showFund}>
                    Fund your wallet
                  </ProButton>
                </Box>
                {wallet.error && (
                  <Typography role="alert" sx={{ fontSize: 13, color: 'health-1' }}>
                    {wallet.error}
                  </Typography>
                )}
              </Box>
            }
          />
        )}
      </>
    );
  }

  const acct = user.data?.account;
  const rows = user.data?.rows ?? [];
  const ms = markets.data ?? [];
  const line = (m: MarketRow, value: (r: UserRow) => bigint): Line | null => {
    const r = rows.find((x) => x.asset === m.asset);
    return r ? { market: m, row: r, value: value(r) } : null;
  };
  const lines = (pick: (r: UserRow) => bigint, keep: (l: Line) => boolean) => ms.map((m) => line(m, pick)).filter((l): l is Line => Boolean(l) && keep(l!));
  const supplies = lines((r) => r.data[0], (l) => l.value > 0n);
  const borrows = lines((r) => r.data[1], (l) => l.value > 0n);
  const toSupply = lines((r) => r.balance, () => true);
  const toBorrow = acct ? lines(() => 0n, () => true).map((l) => ({ ...l, value: maxBorrow(acct, l.market) })) : [];
  const used = acct && acct.borrowLimitUsd > 0n ? Number((acct.totalDebtUsd * 10000n) / acct.borrowLimitUsd) / 100 : 0;

  return (
    <>
      <PageTitle size={28} title="Dashboard" subtitle="Your collateral, debt, health factor, supplies and borrows." right={<Tag tone="purple">{wallet.mode === 'mock' ? 'Mock data' : network}</Tag>} />
      {/* A connected wallet with nothing yet (no tokens, nothing supplied or borrowed): the funding path. */}
      {user.data && user.data.rows.every((r) => r.balance === 0n && r.data[0] === 0n && r.data[1] === 0n) && (
        <Box sx={{ ...reserveCard, p: '18px 20px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', animation: 'clone-fade-up 300ms ease both' }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'bg-4', color: 'fg-1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MIFaucet size={20} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Box sx={{ fontSize: 16, fontWeight: 500 }}>New here? Fund your wallet</Box>
            <Box sx={{ mt: '2px', fontSize: 14, color: 'fg-3' }}>Free test ETH for fees, then free test tokens. Three steps, a few minutes, no real money.</Box>
          </Box>
          <ProButton variant="primary" onClick={showFund}>
            Fund your wallet
          </ProButton>
        </Box>
      )}

      {/* Header: Pro stat row (NumberFlow values) beside the health-factor gauge. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 300px' }, gap: '20px', animation: 'clone-fade-up 300ms ease both' }}>
        <Box sx={{ ...reserveCard, p: { xs: '20px 16px', md: '24px' }, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, minmax(0, 1fr))' }, alignContent: 'center', gap: { xs: '24px 16px', md: '28px 24px' } }}>
          <HeaderStat label="Net worth" tooltip="Collateral minus debt">{acct ? <USD value={usd(acct.totalCollateralUsd - acct.totalDebtUsd)} compact={false} /> : <Skeleton width={120} />}</HeaderStat>
          <HeaderStat label="Collateral" tooltip="Value of everything you supplied (getUserAccountData.totalCollateralUsd)">{acct ? <USD value={usd(acct.totalCollateralUsd)} compact={false} /> : <Skeleton width={120} />}</HeaderStat>
          <HeaderStat label="Debt" tooltip="Value of everything you owe, interest included">{acct ? <USD value={usd(acct.totalDebtUsd)} compact={false} /> : <Skeleton width={120} />}</HeaderStat>
          <HeaderStat label="Available to borrow" tooltip="Borrow limit minus debt">{acct ? <USD value={usd(acct.availableBorrowsUsd)} compact={false} /> : <Skeleton width={120} />}</HeaderStat>
          <HeaderStat label="Borrow power used" tooltip="Debt ÷ borrow limit (80% of collateral)" sub={acct ? `of ${fmtUsd(acct.borrowLimitUsd)} limit` : undefined}>
            {acct ? <PctRing value={used / 100} /> : <Skeleton width={90} />}
          </HeaderStat>
          <HeaderStat label="Liquidation limit" tooltip="Collateral × liquidation threshold (85%): the debt at which the health factor reaches 1">{acct ? <USD value={usd(acct.liquidationLimitUsd)} compact={false} /> : <Skeleton width={120} />}</HeaderStat>
        </Box>
        <Box sx={{ ...reserveCard, p: '20px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HealthGauge hf={acct ? (acct.healthFactor === MAX_UINT256 ? Infinity : Number(acct.healthFactor) / 1e18) : Infinity} loading={!acct} />
        </Box>
      </Box>

      {/* Charts: the user's position over time (replayed from their events; simulated in mock mode). */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' }, gap: '20px' }}>
        <Box>
          <SectionHeading title="Your net worth" description="Collateral, debt and net worth, valued at the oracle price of each moment." />
          <MiniChart<UserHistoryPoint>
            ariaLabel="Your net worth over time"
            history={history.data}
            height={240}
            series={[
              { key: 'net', label: 'Net worth', color: SERIES.purple, kind: 'usd', value: (p) => p.netWorthUsd },
              { key: 'col', label: 'Collateral', color: SERIES.green, kind: 'usd', value: (p) => p.collateralUsd },
              { key: 'debt', label: 'Debt', color: SERIES.orange, kind: 'usd', value: (p) => p.debtUsd },
            ]}
          />
        </Box>
        <Box>
          <SectionHeading title="Health factor" description="Below 1.00 the position can be liquidated. Gaps: no debt (∞)." />
          <MiniChart<UserHistoryPoint>
            ariaLabel="Your health factor over time"
            history={history.data}
            height={240}
            series={[{ key: 'hf', label: 'Health factor', color: SERIES.pink, kind: 'num', before: NaN, value: (p) => (Number.isFinite(p.healthFactor) ? p.healthFactor : NaN), format: (v) => (Number.isFinite(v) ? v.toFixed(2) : '∞ (no debt)') }]}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: { xs: '40px', md: '48px' } }}>
        <Section title="Your supplies" description="Tokens you supplied. They earn interest and count as collateral." lines={supplies} valueLabel="Supplied" apy={(m) => m.supplyRate} apyLabel="Supply APY" empty="Nothing supplied yet." actions={(l) => <ProButton size="sm" variant="secondary" onClick={() => open({ kind: 'withdraw', asset: l.market.asset })}>Withdraw</ProButton>} />
        <Section title="Your borrows" description="What you owe. Interest grows every second." lines={borrows} valueLabel="Borrowed" apy={(m) => m.borrowRate} apyLabel="Borrow APY" empty="Nothing borrowed yet." actions={(l) => <ProButton size="sm" variant="secondary" onClick={() => open({ kind: 'repay', asset: l.market.asset })}>Repay</ProButton>} />
        <Section
          title="Assets to supply"
          description="Your wallet balances. Use the faucet for free test tokens."
          lines={toSupply}
          valueLabel="Wallet balance"
          apy={(m) => m.supplyRate}
          apyLabel="Supply APY"
          empty="No tokens listed."
          actions={(l) => (
            <>
              <ProButton size="sm" variant="primary" onClick={() => open({ kind: 'supply', asset: l.market.asset })}>
                Supply
              </ProButton>
              <ProButton size="sm" variant="secondary" onClick={() => open({ kind: 'faucet', asset: l.market.asset })}>
                Faucet
              </ProButton>
            </>
          )}
        />
        <Section title="Assets to borrow" description="Max you can borrow: your available borrows in tokens, minus a 1% margin, capped at the pool's cash." lines={toBorrow} valueLabel="Max you can borrow" apy={(m) => m.borrowRate} apyLabel="Borrow APY" empty="No tokens listed." actions={(l) => <ProButton size="sm" variant="primary" onClick={() => open({ kind: 'borrow', asset: l.market.asset })}>Borrow</ProButton>} />
      </Box>
    </>
  );
}
