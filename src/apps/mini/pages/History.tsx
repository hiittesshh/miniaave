'use client';

/**
 * History (§10) in Pro's Activity style: the pool's Supply / Withdraw / Borrow / Repay / Liquidation
 * events (plus the oracle's PriceSet), filtered by the indexed `user` for "My activity". Filters:
 * scope toggle, Pro filter pills (type, asset), search; day-grouped feed with skeleton loading and,
 * on Base Sepolia, a Basescan link per row.
 */
import Box from '@mui/material/Box';
import * as React from 'react';
import { FilterLinesIcon, PillMenu } from '@/apps/pro/components/PillMenu';
import { SearchField } from '@/apps/pro/pages/Explore';
import { SegmentedToggle } from '@/apps/pro/pages/preferences/controls';
import { PageTitle, ProButton, ProEmpty } from '@/apps/pro/ui';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { TOKENS } from '../data/config';
import { useEvents } from '../data/hooks';
import type { Address, MiniEvent } from '../data/types';
import { useReadChainId, useWallet } from '../data/useWallet';
import { ActivitySkeleton, describeEvent, EVENT_LABEL, EventFeed, type EventKind } from '../ui/activity';

const eq = (a?: string, b?: string) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());
const KINDS: EventKind[] = ['Supply', 'Withdraw', 'Borrow', 'Repay', 'Liquidation', 'PriceSet'];

function involves(e: MiniEvent, user: Address) {
  if (e.eventName === 'PriceSet') return false;
  if (e.eventName === 'Liquidation') return eq(e.args.user, user) || eq(e.args.liquidator, user);
  return eq(e.args.user, user);
}
const assetsOf = (e: MiniEvent): Address[] => (e.eventName === 'Liquidation' ? [e.args.collateralAsset, e.args.debtAsset] : [e.args.asset]);

export function HistoryPage() {
  const wallet = useWallet();
  const { account } = wallet;
  const events = useEvents();
  const readChain = useReadChainId();
  const [scope, setScope] = React.useState<'mine' | 'all'>('mine');
  const [kinds, setKinds] = React.useState<EventKind[]>([]);
  const [assets, setAssets] = React.useState<string[]>([]);
  const [q, setQ] = React.useState('');
  const mine = scope === 'mine' && Boolean(account);
  const assetOptions = [...new Set(Object.values(TOKENS).map((t) => t.symbol))].map((s) => ({ value: s, label: <><TokenIcon symbol={s} size={18} /> {s}</> }));

  const term = q.trim().toLowerCase();
  const rows = (events.data ?? [])
    .filter((e) => (mine ? involves(e, account!) : true))
    .filter((e) => !kinds.length || kinds.includes(e.eventName as EventKind))
    .filter((e) => !assets.length || assetsOf(e).some((a) => assets.includes(TOKENS[a]?.symbol ?? '')))
    .slice()
    .reverse()
    .map((e) => describeEvent(e, account))
    .filter((r) => !term || r.haystack.includes(term));
  const filtered = kinds.length > 0 || assets.length > 0 || term.length > 0;
  const clear = () => {
    setKinds([]);
    setAssets([]);
    setQ('');
  };

  return (
    <>
      <PageTitle
        size={28}
        title="History"
        subtitle={wallet.mode === 'chain' ? 'Pool events read from the chain since the deployment block, newest first.' : 'Pool events from the mock event log, newest first.'}
        right={
          <SegmentedToggle
            label="Whose activity"
            track="surface"
            value={mine ? 'mine' : 'all'}
            options={[
              { value: 'mine', label: 'My activity' },
              { value: 'all', label: 'Everyone' },
            ]}
            onChange={(v) => setScope(v)}
          />
        }
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', position: { md: 'sticky' }, top: { md: '4.5rem' }, zIndex: 5, py: { md: 2 }, mx: { md: -2 }, px: { md: 2 }, bgcolor: 'bg-1', mt: { md: '-11px' }, mb: { md: '-9px' } }}>
        <PillMenu label="Type" icon={<FilterLinesIcon />} selected={kinds} onChange={setKinds} options={KINDS.map((k) => ({ value: k, label: EVENT_LABEL[k] }))} searchable={false} />
        <PillMenu label="Assets" icon={<FilterLinesIcon />} selected={assets} onChange={setAssets} options={assetOptions} searchable={false} />
        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
        <SearchField value={q} onChange={setQ} placeholder="Search activity" fullOnPhone />
      </Box>
      {!events.data ? (
        <ActivitySkeleton />
      ) : (
        <EventFeed
          key={`${scope}|${kinds.join()}|${assets.join()}|${term}`}
          rows={rows}
          chainId={wallet.mode === 'chain' ? readChain : null}
          pageSize={15}
          empty={
            filtered ? (
              <ProEmpty title="No Results Found" description="Try adjusting your search or filters" action={<ProButton variant="secondary" onClick={clear}>Clear Filters</ProButton>} />
            ) : mine ? (
              <ProEmpty title="No activity yet" description="Supply, borrow or use the faucet and your transactions show up here." action={<ProButton variant="secondary" onClick={() => setScope('all')}>Show everyone</ProButton>} />
            ) : (
              <ProEmpty title="No activity yet" description="Nothing has happened in the pool yet." />
            )
          }
        />
      )}
    </>
  );
}
