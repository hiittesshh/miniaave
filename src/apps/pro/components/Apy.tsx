'use client';

/**
 * APY figure with the live markers, shared by the explore tables and the market/hub tables:
 * - "*" after the figure when it includes estimated underlying yield (11px fg-3, raised)
 * - a 14px purple ring check when it includes rewards (illustrative in the clone)
 * Desktop tables put both after the figure; the live mobile cards put the rewards badge first.
 */
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import type { ProReserve } from '@/data/types';
import { formatPercent } from '@/shared/format';
import { tv } from '@/shared/theme/tokens';

/** Anything with the live APY parts: a reserve or a hub asset. */
export type ApyLike = Pick<ProReserve, 'supplyAPY' | 'borrowAPY' | 'underlyingYieldAPY'> & { incentiveAPY?: number; underlyingNote?: boolean; borrowMerit?: boolean };

export const depositApyOf = (r: ApyLike) => r.supplyAPY + r.underlyingYieldAPY + (r.incentiveAPY ?? 0);

const Rewards = ({ r, tip, borrow = false }: { r: ApyLike; tip: boolean; borrow?: boolean }) => {
  // Live rewards badge: 16px, a 12.8px purple-1 ring (1.25px) around a small purple-2 zigzag.
  const badge = (
    <Box component="span" tabIndex={tip ? 0 : undefined} aria-label={tip ? undefined : 'Includes rewards'} sx={{ display: 'inline-flex', width: 16, height: 16, flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6.4" stroke={tv('purple-1')} strokeWidth="1.25" />
        <path d="M4.6 8.1l1.4 1.5 2.9-3.2 2.5 1.7" stroke={tv('purple-2')} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
  return tip ? <Tooltip title={borrow ? 'Eligible for borrow rewards (Incentives and APY Boosts); amounts not simulated' : `Includes ${formatPercent(r.incentiveAPY ?? 0)} illustrative rewards (Incentives and APY Boosts)`}>{badge}</Tooltip> : badge;
};

/** The rewards badge alone at any size (live reserve stats use 20px next to a 24px figure). */
export function RewardsBadge({ size = 16, title }: { size?: number; title: string }) {
  return (
    <Tooltip title={title}>
      <Box component="span" tabIndex={0} sx={{ display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="6.4" stroke={tv('purple-1')} strokeWidth="1.25" />
          <path d="M4.6 8.1l1.4 1.5 2.9-3.2 2.5 1.7" stroke={tv('purple-2')} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Box>
    </Tooltip>
  );
}

/** `side="supply"` shows the deposit APY with markers; `side="borrow"` the plain borrow APY. */
export function ApyCell({ r, side = 'supply', mobile = false }: { r: ApyLike; side?: 'supply' | 'borrow'; mobile?: boolean }) {
  const supply = side === 'supply';
  const star = supply && r.underlyingNote && (
    <Tooltip title="Includes estimated underlying yield">
      <Box component="span" tabIndex={0} sx={mobile ? { color: 'fg-2', fontSize: 14, fontWeight: 400, lineHeight: 1, ml: '-3px' } : { color: 'fg-3', fontSize: 11, fontWeight: 400, lineHeight: 1, alignSelf: 'flex-start', mt: '-1px', ml: '-2px' }}>
        *
      </Box>
    </Tooltip>
  );
  const rewards = (supply ? (r.incentiveAPY ?? 0) > 0 : !!r.borrowMerit) && <Rewards r={r} tip={!mobile} borrow={!supply} />;
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: mobile ? '6px' : '0.375rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
      {mobile && rewards}
      {formatPercent(supply ? depositApyOf(r) : r.borrowAPY)}
      {star}
      {!mobile && rewards}
    </Box>
  );
}
