'use client';

/**
 * Builder B's popover primitives, measured on the live token page (2026-10-14, tools/a3-pop.mjs):
 * - InfoHint: ⓘ 16px fg-4 trigger; tooltip max 250px, 12px/16.2 fg-1, pad 8px 12px, radius 8,
 *   bg white 10% + blur(20px), shadow `0 1px 12px #0000004d` + inset 1px white 6% ring, 8px above
 *   the trigger, centred; "enterPop" 100ms ease (fade + scale .96 → 1)
 * - HoverCard: bg-3 card, radius 12, pad 5px, inset 1px border-1 ring + `0 16px 32px` shadow-high;
 *   opens below ("slideDownToOpen") or above ("slideUpToOpen") over 250ms cubic-bezier(.16,1,.3,1)
 *   (translateY ∓10px, scale .95 → 1, fade). Sections: title (14/500, pad 10px 5.2px 10px 8px) and
 *   bodies (bg-4, radius 7, pad 0 4px)
 * - MenuCard: dropdown menus; bg-3, radius 12, pad 5, `0 2px 14px` shadow-low + 1px border-1 ring,
 *   enterPop 100ms; 32px items (radius 7, pad 6, gap 8, 14/400 fg-2 label, 20px fg-3 icon),
 *   1px border-1 separators
 */
import Box, { type BoxProps } from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Popper, { type PopperPlacementType } from '@mui/material/Popper';
import Link from 'next/link';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';
import { BIChevronRight } from './icons';

const POP_IN = 'a3-pop-in 100ms ease both';

function useHoverOpen(openDelay = 150, closeDelay = 120) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const t = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => { if (t.current) clearTimeout(t.current); };
  React.useEffect(() => clear, []);
  const enter = (el: HTMLElement) => { clear(); t.current = setTimeout(() => setAnchor(el), openDelay); };
  const leave = () => { clear(); t.current = setTimeout(() => setAnchor(null), closeDelay); };
  const keep = () => clear();
  return { anchor, enter, leave, keep, close: () => { clear(); setAnchor(null); }, open: (el: HTMLElement) => { clear(); setAnchor(el); } };
}

/** The ⓘ glyph (our own: circle, dot, stem). */
export function InfoGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden focusable="false" style={{ display: 'block' }}>
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="8" cy="5.1" r="0.85" fill="currentColor" />
      <path d="M8 7.3v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function InfoHint({ label, text, size = 16 }: { label: string; text: React.ReactNode; size?: number }) {
  const h = useHoverOpen(120, 60);
  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label={label}
        onMouseEnter={(e: React.MouseEvent<HTMLElement>) => h.enter(e.currentTarget)}
        onMouseLeave={h.leave}
        onFocus={(e: React.FocusEvent<HTMLElement>) => h.open(e.currentTarget)}
        onBlur={h.close}
        onClick={(e: React.MouseEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); if (h.anchor) h.close(); else h.open(e.currentTarget); }}
        sx={{ display: 'inline-flex', alignItems: 'center', p: 0, border: 0, background: 'none', color: 'fg-4', cursor: 'default', borderRadius: '50%', transition: 'color 100ms', '&:hover': { color: 'fg-3' }, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2 } }}
      >
        <InfoGlyph size={size} />
      </Box>
      <Popper open={!!h.anchor} anchorEl={h.anchor} placement="top" modifiers={[{ name: 'offset', options: { offset: [0, 8] } }, { name: 'preventOverflow', options: { padding: 8 } }]} sx={{ zIndex: 1500 }}>
        <Box role="tooltip" sx={{ maxWidth: 250, p: '8px 12px', borderRadius: '8px', fontSize: 12, lineHeight: '16.2px', color: 'fg-1', bgcolor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: `0 1px 12px rgba(0, 0, 0, 0.3), inset 0 0 0 1px ${tv('border-0')}`, animation: POP_IN, transformOrigin: 'bottom center' }}>
          {text}
        </Box>
      </Popper>
    </>
  );
}

/** Hover card wrapper: renders `children` as the trigger, `card` in the popper. */
export function HoverCard({ card, children, width, placement = 'bottom-start', sx }: { card: React.ReactNode; children: React.ReactNode; width?: number; placement?: PopperPlacementType; sx?: BoxProps['sx'] }) {
  const h = useHoverOpen(200, 140);
  const [actual, setActual] = React.useState<string>(placement);
  return (
    <>
      <Box
        component="span"
        tabIndex={0}
        onMouseEnter={(e: React.MouseEvent<HTMLElement>) => h.enter(e.currentTarget)}
        onMouseLeave={h.leave}
        onFocus={(e: React.FocusEvent<HTMLElement>) => h.open(e.currentTarget)}
        onBlur={h.close}
        sx={[{ display: 'inline-flex', alignItems: 'center', cursor: 'default', borderRadius: '4px', '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2 } }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      >
        {children}
      </Box>
      <Popper
        open={!!h.anchor}
        anchorEl={h.anchor}
        placement={placement}
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
          { name: 'preventOverflow', options: { padding: 8 } },
          { name: 'a3Side', enabled: true, phase: 'write', fn: ({ state }: { state: { placement: string } }) => { if (state.placement !== actual) setActual(state.placement); } },
        ]}
        sx={{ zIndex: 1500 }}
      >
        <Box onMouseEnter={h.keep} onMouseLeave={h.leave} sx={{ width, ...cardSx(actual.startsWith('top') ? 'up' : 'down') }}>
          {card}
        </Box>
      </Popper>
    </>
  );
}

export const cardSx = (dir: 'up' | 'down') => ({
  p: '5px',
  borderRadius: '12px',
  bgcolor: 'bg-3',
  color: 'fg-1',
  boxShadow: `inset 0 0 0 1px ${tv('border-1')}, 0 16px 32px ${tv('shadow-high')}`,
  animation: `${dir === 'down' ? 'a3-slide-down' : 'a3-slide-up'} 250ms cubic-bezier(0.16, 1, 0.3, 1) both`,
  '@keyframes a3-slide-down': { from: { opacity: 0, transform: 'translateY(-10px) scale(0.95)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes a3-slide-up': { from: { opacity: 0, transform: 'translateY(10px) scale(0.95)' }, to: { opacity: 1, transform: 'none' } },
});

export const CardTitle = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', p: '10px 5.2px 10px 8px', fontSize: 14, fontWeight: 500, lineHeight: '18px' }}>
    <span>{children}</span>
    {right}
  </Box>
);

export const CardBody = ({ children, plain }: { children: React.ReactNode; plain?: boolean }) => (
  <Box sx={{ borderRadius: '7px', bgcolor: plain ? 'transparent' : 'bg-4', p: '0 4px', fontSize: 14, lineHeight: '18.9px' }}>{children}</Box>
);

// ---------------------------------------------------------------------------------------------
// Dropdown menu
// ---------------------------------------------------------------------------------------------

export interface MenuEntry {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** Submenu (live "More Information ›"). */
  items?: MenuEntry[];
  selected?: boolean;
  sub?: React.ReactNode;
  /** Multi-select rows: clicking does not close the menu. */
  keepOpen?: boolean;
}

function MenuItemRow({ e, onDone, depth }: { e: MenuEntry; onDone: () => void; depth: number }) {
  const [subAnchor, setSubAnchor] = React.useState<HTMLElement | null>(null);
  const t = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowSx = {
    position: 'relative',
    width: '100%',
    minHeight: e.items ? 36 : 32,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    p: e.items ? '8px' : '6px',
    border: 0,
    borderRadius: e.items ? '6px' : '7px',
    background: 'none',
    color: e.selected ? 'fg-1' : 'fg-2',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: e.selected ? 500 : 400,
    lineHeight: '16px',
    textAlign: 'left',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'color 100ms',
    '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', bgcolor: 'bg-4', opacity: subAnchor ? 1 : 0, transition: 'opacity 50ms' },
    '&:hover, &:focus-visible': { color: 'fg-1', outline: 'none' },
    '&:hover::before, &:focus-visible::before': { opacity: 1 },
    '& > *': { position: 'relative' },
  } as const;
  const inner = (
    <>
      {e.icon && <Box component="span" sx={{ display: 'flex', minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', color: 'fg-3', flexShrink: 0 }}>{e.icon}</Box>}
      <Box component="span" sx={{ flex: 1, whiteSpace: 'nowrap' }}>{e.label}</Box>
      {e.sub && <Box component="span" sx={{ pl: '16px', color: 'fg-4', whiteSpace: 'nowrap' }}>{e.sub}</Box>}
      {e.items && <Box component="span" sx={{ display: 'flex', color: 'fg-3' }}><BIChevronRight size={16} /></Box>}
    </>
  );
  if (e.items) {
    return (
      <>
        <Box
          component="button"
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={!!subAnchor}
          onMouseEnter={(ev: React.MouseEvent<HTMLElement>) => { if (t.current) clearTimeout(t.current); setSubAnchor(ev.currentTarget); }}
          onMouseLeave={() => { t.current = setTimeout(() => setSubAnchor(null), 150); }}
          onClick={(ev: React.MouseEvent<HTMLElement>) => setSubAnchor(subAnchor ? null : ev.currentTarget)}
          onKeyDown={(ev: React.KeyboardEvent<HTMLElement>) => { if (ev.key === 'ArrowRight') setSubAnchor(ev.currentTarget); }}
          sx={rowSx}
        >
          {inner}
        </Box>
        <Popper open={!!subAnchor} anchorEl={subAnchor} placement="right-start" modifiers={[{ name: 'offset', options: { offset: [-8, 6] } }]} sx={{ zIndex: 1501 + depth }}>
          <Box onMouseEnter={() => t.current && clearTimeout(t.current)} onMouseLeave={() => { t.current = setTimeout(() => setSubAnchor(null), 150); }}>
            <MenuCard entries={e.items} onDone={onDone} depth={depth + 1} />
          </Box>
        </Popper>
      </>
    );
  }
  return e.href ? (
    <Box component={Link} href={e.href} role="menuitem" onClick={onDone} sx={rowSx}>
      {inner}
    </Box>
  ) : (
    <Box component="button" type="button" role={e.keepOpen ? 'menuitemcheckbox' : 'menuitem'} onClick={() => { e.onClick?.(); if (!e.keepOpen) onDone(); }} sx={rowSx}>
      {inner}
    </Box>
  );
}

export function MenuCard({ entries, onDone, depth = 0, width = 248, separators = 'all', header }: { entries: MenuEntry[]; onDone: () => void; depth?: number; width?: number; separators?: 'all' | 'afterFirst' | 'none'; header?: React.ReactNode }) {
  return (
    <Box role="menu" sx={{ width, p: '5px', borderRadius: '12px', bgcolor: 'bg-3', boxShadow: `0 2px 14px ${tv('shadow-low')}, 0 0 0 1px ${tv('border-1')}`, animation: POP_IN, transformOrigin: 'top right' }}>
      {header}
      {entries.map((e, i) => (
        <Box key={e.label}>
          <MenuItemRow e={e} onDone={onDone} depth={depth} />
          {i < entries.length - 1 && (separators === 'all' || (separators === 'afterFirst' && i === 0)) && <Box role="separator" sx={{ height: '1px', bgcolor: 'border-1', my: '5px' }} />}
        </Box>
      ))}
    </Box>
  );
}

/** Click-to-open dropdown (Escape / click-away close; arrow keys move focus). */
export function Dropdown({ trigger, entries, placement = 'bottom-end', width, separators, header }: { trigger: (p: { open: boolean; onClick: (e: React.MouseEvent<HTMLElement>) => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => React.ReactNode; entries: MenuEntry[]; placement?: PopperPlacementType; width?: number; separators?: 'all' | 'afterFirst' | 'none'; header?: React.ReactNode }) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!anchor) return;
    const first = ref.current?.querySelector<HTMLElement>('[role=menuitem]');
    first?.focus({ preventScroll: true });
  }, [anchor]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setAnchor(null); anchor?.focus(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...(ref.current?.querySelectorAll<HTMLElement>(':scope > [role=menu] > div > [role=menuitem]') ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };
  return (
    <>
      {trigger({ open: !!anchor, 'aria-expanded': !!anchor, 'aria-haspopup': 'menu', onClick: (e) => { e.preventDefault(); e.stopPropagation(); setAnchor(anchor ? null : e.currentTarget); } })}
      <Popper open={!!anchor} anchorEl={anchor} placement={placement} modifiers={[{ name: 'offset', options: { offset: [0, 8] } }, { name: 'preventOverflow', options: { padding: 8 } }]} sx={{ zIndex: 1500 }}>
        <ClickAwayListener onClickAway={() => setAnchor(null)}>
          <Box ref={ref} onKeyDown={onKey} onClick={(e) => e.stopPropagation()}>
            <MenuCard entries={entries} onDone={() => setAnchor(null)} width={width} separators={separators} header={header} />
          </Box>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
