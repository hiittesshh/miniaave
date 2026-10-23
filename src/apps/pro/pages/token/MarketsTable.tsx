'use client';

/**
 * Token page "Deposit Markets" / "Borrow Markets" table, measured on the live page (2026-10-14).
 *
 * The horizontal-scroll mechanics are the same as Builder A's ScrollTable (live tableRoot): a 1px
 * spacer gives the native scroll range while a sticky content layer stays put and only the masked
 * middle section translates. This table is page-specific because the live token table differs
 * (logged in PRO_DISCREPANCY_LOG_A3 #T3):
 * - two sticky columns, CHAIN (35px, 20px chain logo) and MARKET (market name over hub, 14/500 +
 *   14/400 fg-3, gap 6px), in a 191px first section (16px right padding) with a full-height divider
 * - middle columns sized to their header (min 120px; e.g. Remaining Capacity 133px) with 8px gaps
 * - 72px rows; a 1px border-0 rule at each row's bottom (hidden on the hovered row and the last row)
 * - row hover: a table-item-hover-2 plate (8px radius) growing from inset 1.5px -8.5px to 0 -10px
 *   in 30ms, and a 32×32 "⋯" actions trigger fading in at the right (live menu: View Details,
 *   Deposit/Borrow, More Information › market + hub)
 * - mobile (<860px): one card per row (header: chain logo, "Market · Hub", APY on the right; a
 *   rule; label/value rows 34px apart; a Deposit/Borrow pill and a round "⋯"); 2 cards, then
 *   "Show N more"
 */
import Box from '@mui/material/Box';
import Link from 'next/link';
import * as React from 'react';
import type { ChainInfo } from '@/data/types';
import { DARK, tv } from '@/shared/theme/tokens';
import { BIMore } from './icons';
import { Dropdown, type MenuEntry } from './popovers';

export interface MarketColumn<T> {
  key: string;
  label: string;
  /** Live column width (defaults to 120). */
  width?: number;
  render: (row: T) => React.ReactNode;
  mobile?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  /** Not listed in the mobile card (live: APY sits in the card header instead). */
  hideOnMobile?: boolean;
  /** Live borrow cards keep an empty first row (gap + 1px) where the APY would be. */
  mobileBlank?: boolean;
}

const FIRST_W = 191;
const COL_W = 120;
const GAP = 8;
const FADE = 32;
const TAIL = 36;
const MOBILE_BP = 860;
/** Live --table-item-hover-2 (dark #282727, light #f4f4f4), set on the card as --a3-row-hover. */
const ROW_HOVER = 'var(--a3-row-hover)';

function SortIcon({ active, desc }: { active: boolean; desc: boolean }) {
  return (
    <Box component="svg" viewBox="0 0 7 10" aria-hidden className="sort-icon" sx={{ width: 7, height: 10, flexShrink: 0, opacity: active ? 1 : 0, transition: 'opacity 70ms' }}>
      <path d="M1 3.5L3.5 1L6 3.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity={active && desc ? 0.45 : 1} />
      <path d="M1 6.5L3.5 9L6 6.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity={active && !desc ? 0.45 : 1} />
    </Box>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <Box component="svg" viewBox="0 0 7 11" aria-hidden sx={{ width: 7, height: 11 }}>
      <path d={dir === 'left' ? 'M5.5 1L1.5 5.5L5.5 10' : 'M1.5 1L5.5 5.5L1.5 10'} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

export function ChainLogo({ chain, size = 20 }: { chain?: ChainInfo; size?: number }) {
  if (!chain) return null;
  return <Box component="img" src={`/chain-icons/${chain.slug}.svg`} alt={chain.name} title={chain.name} sx={{ width: size, height: size, borderRadius: '50%', display: 'block', flexShrink: 0 }} />;
}

export function MarketsTable<T>({
  rows,
  rowKey,
  chainOf,
  market,
  hub,
  columns,
  rowHref,
  actions,
  mobileAside,
  mobileAction,
  mobileLimit = 2,
}: {
  rows: T[];
  rowKey: (r: T) => string;
  chainOf: (r: T) => ChainInfo | undefined;
  market: (r: T) => string;
  hub: (r: T) => string;
  columns: MarketColumn<T>[];
  rowHref?: (r: T) => string;
  actions?: (r: T) => MenuEntry[];
  mobileAside?: (r: T) => React.ReactNode;
  mobileAction?: (r: T) => { label: string; onClick: () => void };
  mobileLimit?: number;
}) {
  const [sort, setSort] = React.useState<{ key: string; desc: boolean } | null>(null);
  const [mobileShown, setMobileShown] = React.useState(mobileLimit);
  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const get = sort.key === 'market' ? (r: T) => market(r).toLowerCase() : columns.find((c) => c.key === sort.key)?.sortValue;
    if (!get) return rows;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const d = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x as number) - (y as number);
      return sort.desc ? -d : d;
    });
  }, [rows, sort, columns, market]);
  const toggle = (key: string) => setSort((s) => (!s || s.key !== key ? { key, desc: true } : { key, desc: !s.desc }));

  const widthOf = (c: MarketColumn<T>) => c.width ?? COL_W;
  const middleContent = FADE + columns.reduce((s, c) => s + widthOf(c), 0) + GAP * (columns.length - 1) + TAIL;

  // Overflow detection + scroll position (same mechanics as the live tableRoot).
  const scroller = React.useRef<HTMLDivElement | null>(null);
  const content = React.useRef<HTMLDivElement | null>(null);
  const [m, setM] = React.useState({ range: 0, sx: 0 });
  React.useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const measure = () => {
      const w = sc.clientWidth;
      const need = FIRST_W + GAP + middleContent + GAP + TAIL;
      const range = need > w + 1 ? Math.ceil(need - w) : 0;
      const sx = Math.min(sc.scrollLeft, range);
      content.current?.style.setProperty('--sx', `${-sx}px`);
      setM((p) => (p.range === range && p.sx === sx ? p : { range, sx }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sc);
    sc.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      sc.removeEventListener('scroll', measure);
    };
  }, [middleContent]);
  const overflow = m.range > 0;
  const atStart = m.sx <= 1;
  const atEnd = m.sx >= m.range - 1;

  const headerName = (key: string, label: string, sortable: boolean, width?: number) => {
    const active = sort?.key === key;
    return (
      <Box
        key={key}
        component={sortable ? 'button' : 'div'}
        type={sortable ? 'button' : undefined}
        role="columnheader"
        onClick={sortable ? () => toggle(key) : undefined}
        aria-sort={active ? (sort!.desc ? 'descending' : 'ascending') : undefined}
        sx={{ width, flex: width ? 'none' : '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: '5.5px', p: 0, border: 0, background: 'none', fontFamily: 'inherit', fontSize: 11, fontWeight: 500, lineHeight: '11px', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap', color: active ? 'fg-1' : 'fg-3', cursor: sortable ? 'pointer' : 'default', transition: 'color 70ms', '&:hover': sortable ? { color: 'fg-1', '& .sort-icon': { opacity: 1 } } : undefined, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2, borderRadius: '2px' } }}
      >
        {label}
        {sortable && <SortIcon active={active} desc={active ? sort!.desc : true} />}
      </Box>
    );
  };

  const maskImage = 'linear-gradient(to right, transparent, #000 32px, #000 calc(100% - 96px), transparent calc(100% - 32px), transparent)';
  const middle = (children: React.ReactNode) =>
    overflow ? (
      <Box sx={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden', maskImage, alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: `${GAP}px`, pl: `${FADE}px`, width: middleContent, flex: 'none', transform: 'translateX(var(--sx, 0px))' }}>{children}</Box>
      </Box>
    ) : (
      <Box sx={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center' }}>{children}</Box>
    );
  const colSx = (c: MarketColumn<T>) => (overflow ? { width: widthOf(c), flex: 'none' } : { flex: '1 1 0', minWidth: 0 });
  const firstCells = (r: T) => (
    <Box sx={{ width: FIRST_W, flex: 'none', pr: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <Box sx={{ width: 35, flex: 'none', display: 'flex', alignItems: 'center', py: '4px' }}>
        <ChainLogo chain={chainOf(r)} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', py: '4px', overflow: 'hidden' }}>
        <Box component="h4" sx={{ m: 0, fontSize: 14, fontWeight: 500, lineHeight: '16.8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{market(r)}</Box>
        <Box component="p" sx={{ m: 0, fontSize: 14, lineHeight: '16.8px', color: 'fg-3', whiteSpace: 'nowrap' }}>{hub(r)}</Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Desktop and tablet */}
      <Box sx={{ '--a3-row-hover': '#f4f4f4', [DARK]: { '--a3-row-hover': '#282727' }, display: 'none', [`@media (min-width:${MOBILE_BP}px)`]: { display: 'block' }, position: 'relative', p: '20px 20px 12px', borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px ${tv('shadow-low')}, 0 0 0 1px ${tv('border-1')}` }}>
        <Box aria-hidden sx={{ position: 'absolute', top: 0, bottom: 0, left: 20 + FIRST_W, width: '1px', bgcolor: 'border-0', zIndex: 1 }} />
        {overflow && (
          <Box sx={{ position: 'absolute', top: 9.6, right: 10, zIndex: 3, display: 'flex', gap: '4px', bgcolor: 'bg-2' }}>
            {(['left', 'right'] as const).map((d) => {
              const disabled = d === 'left' ? atStart : atEnd;
              return (
                <Box
                  key={d}
                  component="button"
                  type="button"
                  aria-label={d === 'left' ? 'Scroll left' : 'Scroll right'}
                  disabled={disabled}
                  onClick={() => scroller.current?.scrollBy({ left: d === 'left' ? -(COL_W + GAP) * 2 : (COL_W + GAP) * 2, behavior: 'smooth' })}
                  sx={{ width: 24, height: 32, p: 0, border: 0, borderRadius: '6px', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer', color: 'fg-3', opacity: disabled ? 0.3 : 1, transition: 'opacity 200ms, color 200ms', '&:hover:not(:disabled)': { color: 'fg-1' }, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}` } }}
                >
                  <Chevron dir={d} />
                </Box>
              );
            })}
          </Box>
        )}
        <Box ref={scroller} role="table" sx={{ overflowX: 'auto', overflowY: 'hidden', mx: '-10px', px: '10px', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Box aria-hidden sx={{ height: '1px', mb: '-1px', width: `calc(100% + ${m.range}px)` }} />
          <Box ref={content} sx={{ position: 'sticky', left: 0, width: '100%' }}>
            <Box role="row" sx={{ display: 'flex', alignItems: 'flex-start', gap: `${GAP}px`, height: 27, pb: '16px', boxSizing: 'border-box', transform: 'translateY(-1px)', '& > *': { height: 11 } }}>
              <Box sx={{ width: FIRST_W, flex: 'none', pr: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                {headerName('chain', 'Chain', false, 35)}
                {headerName('market', 'Market', true)}
              </Box>
              {middle(columns.map((c) => headerName(c.key, c.label, Boolean(c.sortValue), overflow ? widthOf(c) : undefined)))}
              <Box sx={{ width: TAIL, flex: 'none', ml: overflow ? 0 : `-${GAP}px` }} />
            </Box>
            <Box role="rowgroup">
              {sorted.map((r, i) => {
                const href = rowHref?.(r);
                const last = i === sorted.length - 1;
                return (
                  <Box
                    key={rowKey(r)}
                    component={href ? Link : 'div'}
                    href={href}
                    role="row"
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: `${GAP}px`,
                      height: 72,
                      py: '14.4px',
                      color: 'fg-1',
                      textDecoration: 'none',
                      fontSize: 14,
                      lineHeight: '16.8px',
                      cursor: href ? 'pointer' : 'default',
                      '& > *': { position: 'relative', zIndex: 1 },
                      '&::before': { content: '""', position: 'absolute', inset: '1.5px -8.5px', borderRadius: '8px', bgcolor: ROW_HOVER, opacity: 0, transition: 'opacity 30ms, inset 30ms', zIndex: 0 },
                      '&::after': { content: '""', position: 'absolute', left: 0, right: 0, top: 71, height: '1px', bgcolor: 'border-0', opacity: last ? 0 : 1, transition: 'opacity 30ms' },
                      '&:hover::before, &:focus-visible::before, &:has([aria-expanded="true"])::before': { inset: '0 -10px', opacity: 1 },
                      '&:hover::after, &:has(+ [role=row]:hover)::after': { opacity: 0 },
                      '&:hover .row-actions, &:focus-within .row-actions, & .row-actions:has([aria-expanded="true"])': { opacity: 1 },
                      '&:focus-visible': { outline: 'none' },
                    }}
                  >
                    {firstCells(r)}
                    {middle(
                      columns.map((c) => (
                        <Box key={c.key} role="cell" sx={{ ...colSx(c), display: 'flex', alignItems: 'center', overflow: 'hidden', maskImage: 'linear-gradient(90deg, #000 85%, transparent 100%)' }}>
                          {c.render(r)}
                        </Box>
                      )),
                    )}
                    <Box sx={{ width: TAIL, flex: 'none', display: 'flex', justifyContent: 'flex-end', ml: overflow ? 0 : `-${GAP}px` }}>
                      {actions && (
                        <Box className="row-actions" sx={{ opacity: 0, transition: 'opacity 100ms' }}>
                          <Dropdown
                            entries={actions(r)}
                            trigger={(p) => (
                              <Box component="button" type="button" aria-label="Actions" {...p} sx={{ width: 32, height: 32, p: 0, border: 0, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: p.open ? 'fg-1' : 'fg-3', bgcolor: p.open ? 'bg-4' : 'transparent', transition: 'color 180ms, background-color 180ms', '&:hover': { color: 'fg-1', bgcolor: 'bg-4' }, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}` } }}>
                                <BIMore size={16} />
                              </Box>
                            )}
                          />
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Mobile: one card per row */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', [`@media (min-width:${MOBILE_BP}px)`]: { display: 'none' } }}>
        {sorted.slice(0, mobileShown).map((r) => {
          const href = rowHref?.(r);
          const act = mobileAction?.(r);
          return (
            <Box key={rowKey(r)} sx={{ borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px ${tv('shadow-low')}, 0 0 0 1px ${tv('border-1')}`, p: '16px' }}>
              <Box component={href ? Link : 'div'} href={href} sx={{ display: 'block', color: 'fg-1', textDecoration: 'none' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, minHeight: 20 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, fontSize: 14, lineHeight: '17px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <ChainLogo chain={chainOf(r)} />
                    <Box component="h4" sx={{ m: 0, fontSize: 14, fontWeight: 500 }}>{market(r)}</Box>
                    <Box component="p" sx={{ m: 0, color: 'fg-3', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {hub(r)}</Box>
                  </Box>
                  {mobileAside && <Box sx={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>{mobileAside(r)}</Box>}
                </Box>
                <Box sx={{ height: '1px', bgcolor: 'border-1', my: '16px' }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {columns.filter((c) => !c.hideOnMobile).map((c) => c.mobileBlank ? <Box key={c.key} aria-hidden sx={{ height: 0, mt: '-8px' }} /> : (
                    <Box key={c.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, fontSize: 14, lineHeight: '14px', minHeight: 18 }}>
                      <Box component="span" sx={{ color: 'fg-3', whiteSpace: 'nowrap' }}>{c.label}</Box>
                      <Box component="span" sx={{ fontWeight: 500, textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}>{(c.mobile ?? c.render)(r)}</Box>
                    </Box>
                  ))}
                </Box>
              </Box>
              {(act || actions) && (
                <Box sx={{ mt: '16px', display: 'flex', gap: '8px' }}>
                  {act && (
                    <Box component="button" type="button" onClick={act.onClick} sx={{ flex: 1, height: 36, border: 0, borderRadius: '160px', bgcolor: 'bg-4', color: 'fg-1', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background-color 180ms, transform 180ms', '&:hover': { bgcolor: 'bg-5' }, '&:active': { transform: 'scale(0.99)' } }}>
                      {act.label}
                    </Box>
                  )}
                  {actions && (
                    <Dropdown
                      entries={actions(r)}
                      placement="top-end"
                      trigger={(p) => (
                        <Box component="button" type="button" aria-label="More actions" {...p} sx={{ width: 36, height: 36, flex: 'none', p: 0, border: 0, borderRadius: '160px', bgcolor: 'bg-4', color: 'fg-1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'bg-5' } }}>
                          <BIMore size={18} />
                        </Box>
                      )}
                    />
                  )}
                </Box>
              )}
            </Box>
          );
        })}
        {sorted.length > mobileShown && (
          <Box component="button" type="button" onClick={() => setMobileShown(Infinity)} sx={{ height: 38, border: 0, borderRadius: '160px', bgcolor: 'bg-2', boxShadow: `0 0 0 1px ${tv('border-1')}`, color: 'fg-1', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background-color 100ms', '&:hover': { bgcolor: 'bg-3' } }}>
            Show {sorted.length - mobileShown} more
          </Box>
        )}
      </Box>
    </>
  );
}
