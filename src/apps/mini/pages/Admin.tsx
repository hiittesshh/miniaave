'use client';

/**
 * Admin box (§11) as Pro cards: the oracle (owner address, contract, network), one price card per
 * asset with Set price, and the price-history chart rebuilt from PriceSet events (simulated in mock
 * mode). A price input in dollars → parseUnits(value, 8) → oracle.setPrice(asset, price). The nav
 * item shows only for the oracle owner; anyone else sees why, and can still try the call to see the
 * OwnableUnauthorizedAccount message (§9).
 */
import Box from '@mui/material/Box';
import * as React from 'react';
import { SectionDivider, SectionHeading, SERIES, StatGroup, StatLine, StatSummary } from '@/apps/pro/components/Entity';
import { InfoLabel, reserveCard } from '@/apps/pro/pages/ReservePage';
import { SegmentedToggle } from '@/apps/pro/pages/preferences/controls';
import { PageTitle, ProButton, Tag, USD } from '@/apps/pro/ui';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { AddressAvatar } from '@/shared/ui/AddressAvatar';
import { contractsFor, roleOf } from '../data/config';
import { useEvents, useMarkets, useOracleOwner, usePriceHistory } from '../data/hooks';
import { useReadChainId, useWallet } from '../data/useWallet';
import { shortAddr } from '../lib/format';
import type { PricePoint } from '../lib/history';
import { useMiniTx } from '../tx/store';
import { MiniChart } from '../ui/charts';
import { ActionGate, Notice, useReadChainName } from '../ui/parts';

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000);
  return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

export function AdminPage() {
  const { account } = useWallet();
  const owner = useOracleOwner();
  const markets = useMarkets();
  const events = useEvents();
  const network = useReadChainName();
  // Reactive (not miniSource.contracts, which isn't a React value): server and client agree.
  const oracleAddress = contractsFor(useReadChainId())?.oracle;
  const open = useMiniTx((s) => s.open);
  const [symbol, setSymbol] = React.useState('WETH');
  const isOwner = Boolean(account && owner.data && owner.data.toLowerCase() === account.toLowerCase());
  const chartMarket = markets.data?.find((m) => m.token.symbol === symbol) ?? markets.data?.[0];
  const history = usePriceHistory(chartMarket?.asset);
  const priceSets = (events.data ?? []).filter((e): e is Extract<typeof e, { eventName: 'PriceSet' }> => e.eventName === 'PriceSet');
  const lastSet = (asset: string) => priceSets.filter((e) => e.args.asset.toLowerCase() === asset.toLowerCase()).at(-1);
  const pts = history.data?.points ?? [];
  const lo = pts.length ? Math.min(...pts.map((p) => p.price)) : 0;
  const hi = pts.length ? Math.max(...pts.map((p) => p.price)) : 0;

  return (
    <>
      <PageTitle size={28} title="Admin" subtitle="Set token prices on the oracle. Used in the demo to drop the WETH price and trigger a liquidation." right={<Tag tone={isOwner ? 'green' : 'warning'}>{isOwner ? 'You are the oracle owner' : 'Read only'}</Tag>} />
      {!isOwner && (
        <Notice tone="warn" title="Only the oracle owner can set prices">
          oracle.owner() is {owner.data ? shortAddr(owner.data) : '…'}
          {owner.data && roleOf(owner.data) ? ` (the ${roleOf(owner.data)} test account)` : ''}. {account ? `You are connected as ${shortAddr(account)}; a setPrice call from this account reverts with OwnableUnauthorizedAccount.` : 'Connect a wallet first.'}
        </Notice>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '340px minmax(0, 1fr)' }, alignItems: 'start', gap: '20px', animation: 'clone-fade-up 300ms ease both' }}>
        <Box sx={{ ...reserveCard, p: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <InfoLabel label="Price oracle" tooltip="MockOracle: getPrice(token) in USD with 8 decimals; setPrice is owner-only" />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {owner.data ? <AddressAvatar address={owner.data} size={40} /> : <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'bg-3' }} />}
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ fontSize: 16, fontWeight: 500 }}>{owner.data ? shortAddr(owner.data) : '…'}</Box>
              <Box sx={{ fontSize: 13, color: 'fg-3' }}>Owner{owner.data && roleOf(owner.data) ? ` · ${roleOf(owner.data)} test account` : ''}</Box>
            </Box>
          </Box>
          <StatGroup>
            <StatLine label="Oracle contract">{oracleAddress ? shortAddr(oracleAddress) : '—'}</StatLine>
            <StatLine label="Network">{network}</StatLine>
            <StatLine label="Price updates">{priceSets.length}</StatLine>
          </StatGroup>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: '20px' }}>
          {(markets.data ?? []).map((m) => {
            const last = lastSet(m.asset);
            return (
              <Box key={m.asset} sx={{ ...reserveCard, p: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px', transition: 'box-shadow 150ms ease, transform 150ms ease', '&:hover': { transform: 'translateY(-1px)' }, '@media (prefers-reduced-motion: reduce)': { '&:hover': { transform: 'none' } } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <TokenIcon symbol={m.token.symbol} size={40} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ fontSize: 14, color: 'fg-3' }}>{m.token.symbol} price</Box>
                    <Box sx={{ mt: '4px', fontSize: 24, fontWeight: 500 }}>
                      <USD value={Number(m.price) / 1e8} compact={false} />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ fontSize: 13, color: 'fg-3' }}>{last ? `Updated ${ago(last.timestamp)}` : 'Set at deployment'}</Box>
                  <ActionGate compact>
                    <ProButton size="sm" variant={isOwner ? 'primary' : 'secondary'} onClick={() => open({ kind: 'setPrice', asset: m.asset })}>
                      {isOwner ? 'Set price' : 'Try setPrice'}
                    </ProButton>
                  </ActionGate>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box>
        <SectionDivider />
        <SectionHeading
          title="Price history"
          description={`${chartMarket?.token.symbol ?? symbol} oracle price over time, from the PriceSet events.`}
          right={
            <Box sx={{ alignSelf: 'center' }}>
              <SegmentedToggle label="Asset" track="surface" value={symbol} options={(markets.data ?? []).map((m) => ({ value: m.token.symbol, label: m.token.symbol }))} onChange={setSymbol} />
            </Box>
          }
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '308px minmax(0, 1fr)' }, columnGap: '40px', rowGap: '24px' }}>
          <StatSummary label="Current price" tooltip="oracle.getPrice(token)" value={chartMarket ? <USD value={Number(chartMarket.price) / 1e8} compact={false} /> : '—'}>
            <StatGroup>
              <StatLine label="Lowest in history">{pts.length ? `$${lo.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}</StatLine>
              <StatLine label="Highest in history">{pts.length ? `$${hi.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}</StatLine>
              <StatLine label="Last update">{chartMarket && lastSet(chartMarket.asset) ? ago(lastSet(chartMarket.asset)!.timestamp) : '—'}</StatLine>
            </StatGroup>
          </StatSummary>
          <MiniChart<PricePoint> key={chartMarket?.asset} ariaLabel={`${symbol} price history`} history={history.data} height={300} legend={false} defaultRange="1M" series={[{ key: 'px', label: `${symbol} price`, color: SERIES.purple, kind: 'usd', before: NaN, value: (p) => p.price }]} />
        </Box>
      </Box>
    </>
  );
}
