'use client';

/**
 * Builder B's extra Pro icons. Same convention as src/apps/pro/icons.tsx (Builder A): the live app
 * uses a custom 18px / 1.25px-stroke set that is not open, so we use Lucide (ISC) at the same size
 * with an absolute 1.25px stroke. Glyph shapes differ slightly from live (logged as intentional).
 */
import type { LucideIcon, LucideProps } from 'lucide-react';
import { Binoculars, Check, ChevronDown, ChevronRight, ChevronsUpDown, CircleUser, Ellipsis, Info, List, Plus, SlidersHorizontal, SquareArrowOutUpRight, X } from 'lucide-react';

const make = (Icon: LucideIcon, name: string) => {
  const C = ({ size = 18, strokeWidth = 1.25, ...rest }: LucideProps) => <Icon size={size} strokeWidth={strokeWidth} absoluteStrokeWidth aria-hidden focusable={false} {...rest} />;
  C.displayName = `ProBIcon(${name})`;
  return C;
};

export const BIPreferences = make(SlidersHorizontal, 'Preferences');
export const BIAccount = make(CircleUser, 'Account');
export const BIWatch = make(Binoculars, 'Watch');
export const BIChangelog = make(List, 'Changelog');
export const BIPlus = make(Plus, 'Plus');
export const BICheck = make(Check, 'Check');
export const BIChevronDown = make(ChevronDown, 'ChevronDown');
export const BIChevronRight = make(ChevronRight, 'ChevronRight');
export const BIUpDown = make(ChevronsUpDown, 'UpDown');
export const BIMore = make(Ellipsis, 'More');
export const BIInfo = make(Info, 'Info');
export const BIClose = make(X, 'Close');
export const BIOpen = make(SquareArrowOutUpRight, 'Open');

/**
 * Rewards/incentive badge: a ring with a small rising tick. Live draws a purple-1 ring with a
 * purple-2 mark; this is our own geometry (nothing copied).
 */
export function RewardBadge({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden focusable="false" style={{ flexShrink: 0, display: 'block' }}>
      <circle cx="8" cy="8" r="6.4" stroke="var(--mui-palette-purple-1)" strokeWidth="1.25" />
      <path d="M5 8.6l1.6 1.5L11 6" stroke="var(--mui-palette-purple-2)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
