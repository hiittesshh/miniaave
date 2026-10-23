'use client';

/**
 * Event feed in Pro's ActivityList style (bg-2 card, day column, 24px token logos, hover plate,
 * "See more"): used by History and by the Reserve page's recent activity. Rows come straight from
 * the event log (§10). On Base Sepolia each row links to its transaction on Basescan.
 */
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import * as React from 'react';
import { PIExternal } from '@/apps/pro/icons';
import { BIPlus } from '@/apps/pro/pages/token/icons';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { tv } from '@/shared/theme/tokens';
import { TOKENS, explorerTxUrl, roleOf } from '../data/config';
import type { Address, MiniEvent } from '../data/types';
import { fmtToken, fmtUsd, shortAddr } from '../lib/format';

const eq = (a?: string | null, b?: string | null) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());
const who = (a: Address) => roleOf(a) ?? shortAddr(a);

export type EventKind = 'Supply' | 'Withdraw' | 'Borrow' | 'Repay' | 'Liquidation' | 'PriceSet';
export const EVENT_LABEL: Record<EventKind, string> = { Supply: 'Supplied', Withdraw: 'Withdrawn', Borrow: 'Borrowed', Repay: 'Repaid', Liquidation: 'Liquidation', PriceSet: 'Price set' };

export interface EventRow {
  id: string;
  e: MiniEvent;
  day: string;
  symbol: string;
  title: string;
  detail: string;
  amount: string;
  unit: string;
  /** text used by the History search */
  haystack: string;
}

/** One event → the words on its row. `me` turns "Borrower" into "You" where it applies. */
export function describeEvent(e: MiniEvent, me: Address | null): EventRow {
  const day = new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const id = `${e.transactionHash}-${e.logIndex}`;
  const you = (a: Address) => (eq(a, me) ? 'you' : who(a));
  let row: Omit<EventRow, 'id' | 'e' | 'day' | 'haystack'>;
  if (e.eventName === 'PriceSet') {
    const t = TOKENS[e.args.asset];
    row = { symbol: t?.symbol ?? '?', title: `${t?.symbol} price set`, detail: 'Oracle owner', amount: fmtUsd(e.args.price), unit: '' };
  } else if (e.eventName === 'Liquidation') {
    const c = TOKENS[e.args.collateralAsset];
    const d = TOKENS[e.args.debtAsset];
    const title = eq(e.args.user, me) ? 'You were liquidated' : eq(e.args.liquidator, me) ? `You liquidated ${who(e.args.user)}` : `Liquidated ${who(e.args.user)}`;
    row = { symbol: c?.symbol ?? '?', title, detail: `${fmtToken(e.args.debtCovered, d?.decimals ?? 18)} ${d?.symbol} repaid by ${you(e.args.liquidator)}`, amount: fmtToken(e.args.collateralSeized, c?.decimals ?? 18), unit: `${c?.symbol} seized` };
  } else {
    const t = TOKENS[e.args.asset];
    row = { symbol: t?.symbol ?? '?', title: `${EVENT_LABEL[e.eventName]} ${t?.symbol}`, detail: `by ${you(e.args.user)}`, amount: fmtToken(e.args.amount, t?.decimals ?? 18), unit: t?.symbol ?? '' };
  }
  return { id, e, day, ...row, haystack: `${row.title} ${row.detail} ${row.unit} ${e.eventName} ${e.transactionHash}`.toLowerCase() };
}

export function ActivitySkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Box sx={{ borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}`, p: { xs: '8px 16px', md: '8px 20px' } }} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: 48, py: '12px' }}>
          <Skeleton variant="text" width={80} sx={{ display: { xs: 'none', md: 'block' }, mr: '40px' }} />
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" sx={{ flex: 1, maxWidth: 260 }} />
          <Box sx={{ flex: 1 }} />
          <Skeleton variant="text" width={110} />
        </Box>
      ))}
    </Box>
  );
}

export function EventFeed({ rows, chainId, pageSize = 10, empty }: { rows: EventRow[]; chainId: number | null; pageSize?: number; empty?: React.ReactNode }) {
  const [shown, setShown] = React.useState(pageSize);
  const list = rows.slice(0, shown);
  if (!rows.length) return <>{empty}</>;
  return (
    <Box sx={{ borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}` }}>
      <Box sx={{ p: { xs: '8px 16px', md: '8px 20px' } }}>
        {list.map((r, i) => {
          const firstOfDay = i === 0 || list[i - 1].day !== r.day;
          const url = chainId != null ? explorerTxUrl(chainId, r.e.transactionHash) : null;
          return (
            <Box
              key={r.id}
              component={url ? 'a' : 'div'}
              {...(url ? { href: url, target: '_blank', rel: 'noreferrer' } : {})}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                minHeight: { xs: 62, md: 52 },
                py: '10px',
                color: 'fg-1',
                textDecoration: 'none',
                animation: 'clone-fade-up 260ms ease both',
                animationDelay: `${Math.min(i, 10) * 18}ms`,
                '&::before': i === 0 ? undefined : { content: '""', position: 'absolute', top: 0, left: { xs: 0, md: 120 }, right: 0, height: '1px', bgcolor: 'border-0', display: { xs: 'block', md: firstOfDay ? 'none' : 'block' } },
                '& .hover-bg': { opacity: 0 },
                '&:hover .hover-bg': { opacity: 1 },
                '& .ext': { opacity: 0, transition: 'opacity 100ms ease' },
                '&:hover .ext, &:focus-visible .ext': { opacity: 1 },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            >
              <Box className="hover-bg" sx={{ position: 'absolute', inset: { xs: '1px -8px', md: '1px -3px 1px 108px' }, borderRadius: '10px', bgcolor: 'bg-4', transition: 'opacity 100ms ease', zIndex: 0 }} />
              <Box sx={{ width: 120, flex: 'none', fontSize: 14, fontWeight: 500, lineHeight: '17px', color: 'fg-3', zIndex: 1, display: { xs: 'none', md: 'block' } }}>{firstOfDay ? r.day : ''}</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, zIndex: 1 }}>
                <TokenIcon symbol={r.symbol} size={24} />
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ fontSize: 14, fontWeight: 500, lineHeight: '17px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</Box>
                  <Box sx={{ mt: '2px', fontSize: 13, lineHeight: '17px', color: 'fg-3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Box component="span" sx={{ display: { md: 'none' } }}>{r.day} · </Box>
                    {r.detail}
                    <Box component="span" sx={{ color: 'fg-4' }}> · {new Date(r.e.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Box>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 14, lineHeight: '17px', zIndex: 1, whiteSpace: 'nowrap', pl: 1 }}>
                {r.unit && <TokenIcon symbol={r.symbol} size={16} />}
                <Box component="span" sx={{ fontWeight: 500 }}>{r.amount}</Box>
                {r.unit && <Box component="span" sx={{ color: 'fg-3', display: { xs: 'none', sm: 'inline' } }}>{r.unit}</Box>}
                {url && (
                  <Box component="span" className="ext" aria-label="View on Basescan" sx={{ display: 'inline-flex', color: 'fg-3', ml: '6px' }}>
                    <PIExternal size={14} />
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
      {shown < rows.length && (
        <Box component="button" type="button" onClick={() => setShown((n) => n + pageSize)} sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: { xs: '12px 16px', md: '12px 20px' }, border: 0, borderTop: `1px solid ${tv('border-0')}`, background: 'none', color: 'fg-1', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', borderRadius: '0 0 10px 10px', '& svg': { color: 'fg-3', transition: 'color 100ms' }, '&:hover svg': { color: 'fg-1' } }}>
          See more
          <BIPlus size={20} />
        </Box>
      )}
    </Box>
  );
}
