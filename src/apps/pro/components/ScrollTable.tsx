'use client';

/**
 * Explore-style table, rebuilt from computed-style measurements of the live Pro app (1440×900):
 * - card: bg-2, 10px radius, 20px padding, `0 2px 4px` shadow plus a 1px border-1 ring
 * - header: 11px/500 uppercase fg-3 names (sorted column fg-1 with a 7×10 sort icon), 16px below
 * - first column: min 355px, grows when there is room; scrolling columns 120px with 8px gaps (the
 *   last 161px) after a 32px fade zone; cells fade out at their right edge
 * - like the live table, a 1px spacer gives the native horizontal scroll range while a sticky
 *   content layer stays put and only the middle sections translate; each middle section is masked
 *   (fade-in on the left, fade-out on the right while more columns remain), so row rules stay
 *   full-width and unmasked
 * - "Scroll left/right" 24×32 buttons and a card-tall divider appear only while overflowing
 * - 73px rows separated by 1px border-0 rules
 * - below 860px every row becomes its own card: header (first column + `mobileAside`), a rule,
 *   then label/value rows
 */
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Link from 'next/link';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';

export interface ScrollColumn<T> {
  key: string;
  label: string;
  /** Desktop cell. */
  render: (row: T) => React.ReactNode;
  /** Mobile value (defaults to `render`). */
  mobile?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  width?: number;
  /** Hide this field in the mobile card. */
  hideOnMobile?: boolean;
}

const FIRST_MIN = 355;
const COL_W = 120;
const LAST_W = 161;
const GAP = 8;
const FADE = 32;
const TAIL = 36;
const MOBILE_BP = 860;

function SortIcon({ active, desc }: { active: boolean; desc: boolean }) {
  return (
    <Box component="svg" viewBox="0 0 7 10" aria-hidden className="sort-icon" sx={{ width: 7, height: 10, flexShrink: 0, opacity: active ? 1 : 0, transition: 'opacity 100ms ease' }}>
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

/**
 * Live layout modes (measured):
 * - fits: first column = max(355px, 33% of the table width), 8px gap, the remaining columns share
 *   the rest equally (no gaps, no fade) and a 36px tail;
 * - overflow (minimum widths don't fit): first 355px, 8px gap, a masked middle strip that scrolls
 *   via the spacer (32px fade zone + 120px columns with 8px gaps), 8px gap, 36px tail.
 */
function useHScroll(middleContent: number, fitFirst: (w: number) => number, minFirst: number) {
  const scroller = React.useRef<HTMLDivElement | null>(null);
  const content = React.useRef<HTMLDivElement | null>(null);
  const [m, setM] = React.useState({ range: 0, firstW: FIRST_MIN, sx: 0, w: 0 });
  React.useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const measure = () => {
      const w = sc.clientWidth - 20; // minus the 10px side padding that gives the hover plate room (live tableRoot)
      const need = minFirst + GAP + middleContent + GAP + TAIL;
      const overflow = need > w + 1;
      const range = overflow ? Math.ceil(need - w) : 0;
      const firstW = overflow ? minFirst : Math.round(fitFirst(w));
      const sx = Math.min(sc.scrollLeft, range);
      content.current?.style.setProperty('--sx', `${-sx}px`);
      setM((p) => (p.range === range && p.firstW === firstW && p.sx === sx && p.w === w ? p : { range, firstW, sx, w }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(sc);
    sc.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      sc.removeEventListener('scroll', measure);
    };
  }, [middleContent, fitFirst, minFirst]);
  return [{ scroller, content }, { ...m, overflow: m.range > 0, atStart: m.sx <= 1, atEnd: m.sx >= m.range - 1 }] as const;
}

export function ScrollTable<T>({
  rows,
  first,
  columns,
  rowKey,
  rowHref,
  defaultSort,
  loading,
  mobileAside,
  firstWidth,
  equal = false,
  dense = false,
  mobileActions,
  mobileLimit,
  rowActions,
  expandable,
  footer,
  mobileList,
  gapped = false,
  sort: sortProp,
  onSortChange,
}: {
  rows: T[];
  first: ScrollColumn<T>;
  columns: ScrollColumn<T>[];
  rowKey: (r: T) => string;
  rowHref?: (r: T) => string;
  defaultSort?: { key: string; desc: boolean };
  loading?: boolean;
  /** Right side of the mobile card header (live: the APY). */
  mobileAside?: (r: T) => React.ReactNode;
  /** Fixed first-column width in the fits mode (live market tables use ~194px). */
  firstWidth?: number;
  /** All columns, including the first, share the width equally (live Connected Hubs). */
  equal?: boolean;
  /** 48px rows (live Supported Assets / Supported Collateral). */
  dense?: boolean;
  /** Mobile card footer (live explore: a "Deposit"/"Borrow" pill and a round "More actions"). */
  mobileActions?: (r: T) => React.ReactNode;
  /** Mobile: show this many cards, then a "Show N more" pill (live explore: 5). */
  mobileLimit?: number;
  /** Desktop: buttons shown in the 36px tail while the row is hovered (live explore: Deposit + ⋯). */
  rowActions?: (r: T) => React.ReactNode;
  /**
   * Live "Collate Assets": rows that merge several reserves get a chevron in a 26px slot before the
   * first cell; opening one shows its child rows (first cell = childFirst) on a shared rounded plate.
   */
  expandable?: { childrenOf: (r: T) => T[]; childFirst: (c: T) => React.ReactNode; childKey: (c: T) => string };
  /** Desktop: content closing the table card (live reserve Top Addresses: "See more"). */
  footer?: React.ReactNode;
  /** Mobile: a custom list in place of the generated cards (live Top Addresses holder cards). */
  mobileList?: React.ReactNode;
  /** Fits mode with 8px gaps between the middle columns and no 36px tail (live reserve Reward Campaigns). */
  gapped?: boolean;
  /** Controlled sort (live explore: one Sort By for every group table, set from Display Preferences too). */
  sort?: { key: string; desc: boolean };
  onSortChange?: (s: { key: string; desc: boolean }) => void;
}) {
  const [openKeys, setOpenKeys] = React.useState<string[]>([]);
  const [mobileShown, setMobileShown] = React.useState(mobileLimit ?? Infinity);
  const [sortState, setSortState] = React.useState<{ key: string; desc: boolean } | null>(defaultSort ?? null);
  const sort = sortProp ?? sortState;
  const setSort = (f: (s: { key: string; desc: boolean } | null) => { key: string; desc: boolean }) => {
    const next = f(sort);
    if (onSortChange) onSortChange(next);
    else setSortState(next);
  };
  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = [first, ...columns].find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const d = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x as number) - (y as number);
      return sort.desc ? -d : d;
    });
  }, [rows, sort, columns, first]);
  const mobileFields = columns.filter((c) => !c.hideOnMobile);
  const toggle = (key: string) => setSort((s) => (!s || s.key !== key ? { key, desc: true } : { key, desc: !s.desc }));

  const widthOf = (c: ScrollColumn<T>, i: number) => c.width ?? (i === columns.length - 1 ? LAST_W : COL_W);
  // Strip width: 32px fade zone + columns + 36px trailing room (live scroll range is 72px at 1440).
  const middleContent = FADE + columns.reduce((s, c, i) => s + widthOf(c, i), 0) + GAP * (columns.length - 1) + TAIL;
  const n = columns.length;
  const fitFirst = React.useCallback((w: number) => (equal ? w / (n + 1) : firstWidth ?? Math.max(FIRST_MIN, w * 0.33)), [equal, firstWidth, n]);
  const minFirst = equal ? COL_W : firstWidth ?? FIRST_MIN;
  const [{ scroller: scrollerRef, content: contentRef }, h] = useHScroll(middleContent, fitFirst, minFirst);
  const flat = equal && !h.overflow;
  const step = (COL_W + GAP) * 2;

  const headerName = (c: ScrollColumn<T>, width?: number) => {
    const active = sort?.key === c.key;
    const sortable = Boolean(c.sortValue);
    return (
      <Box
        key={c.key}
        component={sortable ? 'button' : 'div'}
        type={sortable ? 'button' : undefined}
        onClick={sortable ? () => toggle(c.key) : undefined}
        aria-sort={active ? (sort!.desc ? 'descending' : 'ascending') : undefined}
        sx={{
          width,
          flex: width ? 'none' : '1 1 0',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          p: 0,
          border: 0,
          background: 'none',
          fontFamily: 'inherit',
          fontSize: 11,
          fontWeight: 500,
          lineHeight: '11px',
          textTransform: 'uppercase',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          color: active ? 'fg-1' : 'fg-3',
          cursor: sortable ? 'pointer' : 'default',
          transition: 'color 100ms ease',
          '&:hover': sortable ? { color: 'fg-1', '& .sort-icon': { opacity: 1 } } : undefined,
          '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2, borderRadius: '2px' },
        }}
      >
        {c.label}
        {sortable && <SortIcon active={active} desc={active ? sort!.desc : true} />}
      </Box>
    );
  };

  // Middle section: a fixed viewport whose inner strip translates with the spacer scroll.
  // Exact live mask on the middle section (fade in over 32px; fade out between 100%-96px and 100%-32px).
  const maskImage = 'linear-gradient(to right, transparent, #000 32px, #000 calc(100% - 96px), transparent calc(100% - 32px), transparent)';
  const middle = (children: React.ReactNode) =>
    h.overflow ? (
      <Box sx={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden', maskImage, ml: `${GAP}px` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: `${GAP}px`, pl: `${FADE}px`, width: middleContent, transform: 'translateX(var(--sx, 0px))' }}>{children}</Box>
      </Box>
    ) : (
      // Equal mode (live Connected Hubs): every column, the first included, gets the same width
      // with 8px gaps — the basis carries the inner gaps so the flex shares stay equal.
      <Box sx={{ flex: flat ? `${n} 1 ${GAP * (n - 1)}px` : '1 1 0', minWidth: 0, ml: `${GAP}px`, gap: flat || gapped ? `${GAP}px` : 0, display: 'flex', alignItems: 'center' }}>{children}</Box>
    );
  const firstSx = flat ? ({ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center' } as const) : ({ flex: 'none', width: h.firstW, minWidth: Math.min(FIRST_MIN, h.firstW), display: 'flex', alignItems: 'center' } as const);
  const tail = flat || (gapped && !h.overflow) ? null : <Box sx={{ width: TAIL, flex: 'none', ml: h.overflow ? `${GAP}px` : 0 }} />;
  // In "fits" mode every middle column is an equal flex share; in overflow mode it is fixed-width.
  const colSx = (c: ScrollColumn<T>, i: number) => (h.overflow ? { width: widthOf(c, i), flex: 'none' } : { flex: '1 1 0', minWidth: 0 });

  const renderRow = (r: T, o: { key: string; href?: string; onClick?: () => void; expanded?: boolean; lead?: React.ReactNode; firstContent?: React.ReactNode }) => (
    <Box
      key={o.key}
      component={o.href ? Link : 'div'}
      href={o.href}
      role={o.onClick ? 'button' : undefined}
      tabIndex={o.onClick ? 0 : undefined}
      aria-expanded={o.expanded}
      onClick={o.onClick}
      onKeyDown={o.onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onClick?.(); } } : undefined}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        py: dense ? '12px' : '14.4px',
        minHeight: dense ? 48 : 72.78, // live: 44px content + 2×14.4px
        color: 'fg-1',
        textDecoration: 'none',
        fontSize: 14,
        lineHeight: '16.8px',
        cursor: o.href || o.onClick ? 'pointer' : 'default',
        isolation: 'isolate',
        // Full-width row rule, outside the masked middle section (live).
        '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '1px', bgcolor: 'border-0', transition: 'opacity 0.03s' },
        // Live hover: a #282727 plate inset 1.5px / -8.5px, 8px radius, 30ms; actions fade in.
        '&::after': { content: '""', position: 'absolute', inset: '1.5px -8.5px', borderRadius: '8px', bgcolor: 'table-item-hover-2', opacity: 0, transition: 'opacity 0.03s, inset 0.03s', zIndex: -1 },
        // Live (probed 2026-10-14): on hover the plate grows to inset 0/-10px and the rule under the row hides.
        '&:hover::after': { opacity: 1, inset: '0 -10px' },
        '&:hover + *::before': { opacity: 0 },
        '& .row-actions': { opacity: 0, transition: 'opacity 0.03s' },
        '&:hover .row-actions, &:focus-within .row-actions': { opacity: 1 },
        '&:hover .hover-underline': { textDecoration: 'underline dotted', textUnderlineOffset: '3px', textDecorationColor: tv('fg-3') },
        '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '-2px' },
      }}
    >
      <Box sx={firstSx}>
        {o.lead}
        {o.firstContent ?? first.render(r)}
      </Box>
      {middle(
        columns.map((c, i) => (
          <Box key={c.key} sx={{ ...colSx(c, i), overflow: 'hidden', maskImage: 'linear-gradient(90deg, #000 85%, transparent 100%)' }}>
            {c.render(r)}
          </Box>
        )),
      )}
      {tail}
      {rowActions && (
        <Box className="row-actions" sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px', zIndex: 2 }} onClick={(e: React.MouseEvent) => e.preventDefault()}>
          {rowActions(r)}
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Desktop and tablet */}
      <Box
        sx={{
          display: 'none',
          [`@media (min-width:${MOBILE_BP}px)`]: { display: 'block' },
          position: 'relative',
          p: '20px',
          borderRadius: '10px',
          bgcolor: 'bg-2',
          boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}`,
        }}
      >
        {h.overflow && (
          <>
            <Box aria-hidden sx={{ position: 'absolute', top: 0, bottom: 0, left: 20 + h.firstW, width: '1px', bgcolor: 'border-0', zIndex: 1 }} />
            <Box sx={{ position: 'absolute', top: 9, right: 10, zIndex: 3, display: 'flex', gap: '4px', bgcolor: 'bg-2' }}>
              {(['left', 'right'] as const).map((d) => {
                const disabled = d === 'left' ? h.atStart : h.atEnd;
                return (
                  <Box
                    key={d}
                    component="button"
                    type="button"
                    aria-label={d === 'left' ? 'Scroll left' : 'Scroll right'}
                    disabled={disabled}
                    onClick={() => scrollerRef.current?.scrollBy({ left: d === 'left' ? -step : step, behavior: 'smooth' })}
                    sx={{ width: 24, height: 32, p: 0, border: 0, borderRadius: '6px', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer', color: disabled ? 'fg-4' : 'fg-2', transition: 'color 100ms ease, background-color 100ms ease', '&:hover:not(:disabled)': { color: 'fg-1', bgcolor: 'button-hover' } }}
                  >
                    <Chevron dir={d} />
                  </Box>
                );
              })}
            </Box>
          </>
        )}
        <Box ref={scrollerRef} sx={{ mb: '-8px', mx: '-10px', px: '10px', overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {/* Spacer: provides the native scroll range (live: tableScrollSpacer). */}
          <Box aria-hidden sx={{ height: '1px', mb: '-1px', width: `calc(100% + ${h.range}px)` }} />
          <Box ref={contentRef} sx={{ position: 'sticky', left: 0, width: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', pb: '16px' }}>
              <Box sx={firstSx}>{headerName(first)}</Box>
              {middle(columns.map((c, i) => headerName(c, h.overflow ? widthOf(c, i) : undefined)))}
              {tail}
            </Box>
            {/* Rows */}
            {loading
              ? [0, 1, 2].map((i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', height: 73, borderTop: `1px solid ${tv('border-0')}` }}>
                    <Box sx={{ ...firstSx, gap: 2 }}>
                      <Skeleton variant="circular" width={44} height={44} />
                      <Skeleton width={120} height={14} sx={{ borderRadius: '10rem' }} />
                    </Box>
                    {middle(
                      columns.map((c, j) => (
                        <Box key={c.key} sx={colSx(c, j)}>
                          <Skeleton width={70} height={14} sx={{ borderRadius: '10rem' }} />
                        </Box>
                      )),
                    )}
                    {tail}
                  </Box>
                ))
              : sorted.map((r) => {
                  const key = rowKey(r);
                  const kids = expandable?.childrenOf(r) ?? [];
                  const canOpen = kids.length > 1;
                  const isOpen = canOpen && openKeys.includes(key);
                  const toggleOpen = () => setOpenKeys((k) => (k.includes(key) ? k.filter((x) => x !== key) : [...k, key]));
                  const parent = renderRow(r, {
                    key,
                    href: canOpen ? undefined : rowHref?.(r),
                    onClick: canOpen ? toggleOpen : undefined,
                    expanded: canOpen ? isOpen : undefined,
                    lead: expandable ? (
                      <Box component="span" aria-hidden sx={{ width: 26, flexShrink: 0, display: 'flex', alignItems: 'center', color: 'fg-3' }}>
                        {canOpen && (
                          <Box component="svg" viewBox="0 0 16 16" sx={{ width: 16, height: 16, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                            <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </Box>
                        )}
                      </Box>
                    ) : null,
                  });
                  if (!isOpen || !expandable) return parent;
                  return (
                    <Box key={key} sx={{ position: 'relative', isolation: 'isolate', '&::before': { content: '""', position: 'absolute', inset: '1.5px -10px', borderRadius: '10px', bgcolor: 'bg-3', zIndex: -1 } }}>
                      {parent}
                      {kids.map((c) =>
                        renderRow(c, {
                          key: expandable.childKey(c),
                          href: rowHref?.(c),
                          lead: <Box component="span" sx={{ width: 26, flexShrink: 0 }} />,
                          firstContent: expandable.childFirst(c),
                        }),
                      )}
                    </Box>
                  );
                })}
          </Box>
        </Box>
        {footer}
      </Box>

      {/* Mobile: one card per row */}
      {mobileList ? (
        <Box sx={{ [`@media (min-width:${MOBILE_BP}px)`]: { display: 'none' } }}>{mobileList}</Box>
      ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', [`@media (min-width:${MOBILE_BP}px)`]: { display: 'none' } }}>
        {sorted.slice(0, mobileShown).map((r) => {
          const href = rowHref?.(r);
          return (
            <Box key={rowKey(r)} sx={{ borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}`, p: '16px' }}>
              <Box component={href ? Link : 'div'} href={href} sx={{ display: 'block', color: 'fg-1', textDecoration: 'none' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}>{(first.mobile ?? first.render)(r)}</Box>
                  {mobileAside && <Box sx={{ fontSize: 14, fontWeight: 500, lineHeight: '18px', whiteSpace: 'nowrap' }}>{mobileAside(r)}</Box>}
                </Box>
                {/* Live reserve lists (collateral, borrowable): header-only cards when no field is shown. */}
                {mobileFields.length > 0 && <Box sx={{ height: '1px', bgcolor: 'border-1', my: '16px' }} />}
                {mobileFields.length > 0 && <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {mobileFields
                    .map((c) => (
                      <Box key={c.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', fontSize: 14, lineHeight: 'normal' }}>
                        <Box component="span" sx={{ color: 'fg-3', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {c.label}
                        </Box>
                        <Box component="span" sx={{ fontWeight: 500, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
                          {(c.mobile ?? c.render)(r)}
                        </Box>
                      </Box>
                    ))}
                </Box>}
              </Box>
              {mobileActions && <Box sx={{ mt: '16px', display: 'flex', gap: '8px' }}>{mobileActions(r)}</Box>}
            </Box>
          );
        })}
        {sorted.length > mobileShown && (
          <Box
            component="button"
            type="button"
            onClick={() => setMobileShown(Infinity)}
            // Live (reserve lists, measured 2026-10-14): a 36px secondary pill (bg-3, 10% ring, 4% hover plate) 8px below.
            sx={{ mt: '8px', height: 36, border: 0, borderRadius: '160px', bgcolor: 'bg-3', boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}`, color: 'fg-1', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, lineHeight: '14px', cursor: 'pointer', transition: 'background-color 100ms ease', '&:hover': { backgroundImage: `linear-gradient(${tv('button-hover-secondary')}, ${tv('button-hover-secondary')})` } }}
          >
            Show {sorted.length - mobileShown} more
          </Box>
        )}
      </Box>
      )}
    </>
  );
}
