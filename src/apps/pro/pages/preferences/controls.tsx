'use client';

/**
 * Preference controls, measured on live /preferences (2026-10-14):
 * - SegmentedToggle: rgba(0,0,0,.4) track, 3px padding, pill radius; 30px items, 14px text,
 *   0 14px padding; the active item is 500 at full opacity, others 400 at .3 (.5 on hover), both
 *   over 100ms. A bg-4 pill slides under the active item (position and width, ~100ms ease-in-out,
 *   sampled frame by frame). Each label reserves its bold width so nothing shifts.
 * - SelectMenu: a 36px bg-4 pill (tertiary button: 0 7px 0 14px, 6px gap, up/down glyph in fg-3,
 *   hover overlay 6%). The menu opens 17px below, right edge 4px past the trigger: bg-3, 12px
 *   radius, 5px padding, `0 2px 14px shadow-low` + 1px border-1 ring, at least 248px wide, enterPop
 *   100ms. Rows 28px (6px padding, 7px radius), label 14/16 fg-2, optional sub-label fg-4 16px to
 *   the right; hover/focus: 6% white plate, label fg-1/500. Arrow keys move, Escape closes.
 *   Below 600px the choices open in a bottom sheet (title, close button, 40px rows) instead.
 * - Switch: 34×20 pill, off fg-4, on purple-1; 16px #fafafa thumb 2px inset with a soft shadow,
 *   slides 14px; transform/background over 100ms; 16px invisible hit area around it.
 */
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import type { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';
import { UpDownIcon } from '../../components/PillMenu';
import { ProButton } from '../../ui';
import { BIClose } from '../token/icons';
import { DialogFrame } from '../watch-address/DialogFrame';

// ---------------------------------------------------------------------------------------------

export function SegmentedToggle<T extends string>({ label, value, options, onChange, track = 'card' }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; /** 'card' (preferences): rgba(0,0,0,.4) inset track; 'surface' (reserve Top Addresses): bg-2 with a 10% ring. */ track?: 'card' | 'surface' }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [plate, setPlate] = React.useState<{ x: number; w: number } | null>(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  React.useLayoutEffect(() => {
    const el = refs.current[index];
    if (el) setPlate({ x: el.offsetLeft, w: el.offsetWidth });
  }, [index]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <Box role="radiogroup" aria-label={label} onKeyDown={onKey} sx={{ position: 'relative', display: 'flex', p: '3px', borderRadius: '160px', bgcolor: track === 'surface' ? 'bg-2' : 'rgba(0, 0, 0, 0.4)', boxShadow: track === 'surface' ? `0 0 0 1px ${tv('shadow-stroke-2')}` : 'none', overflow: 'hidden' }}>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          top: 3,
          height: 30,
          borderRadius: '160px',
          bgcolor: 'bg-4',
          width: plate ? plate.w : 0,
          transform: `translateX(${plate ? plate.x : 3}px)`,
          transition: 'transform 100ms ease-in-out, width 100ms ease-in-out',
        }}
      />
      {options.map((o, i) => {
        const on = i === index;
        return (
          <Box
            key={o.value}
            component="button"
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[i] = el;
            }}
            onClick={() => onChange(o.value)}
            sx={{
              position: 'relative',
              height: 30,
              p: '0 14px',
              border: 0,
              borderRadius: '160px',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
              fontSize: 14,
              lineHeight: '14px',
              fontWeight: on ? 500 : 400,
              color: 'fg-1',
              opacity: on ? 1 : 0.3,
              transition: 'opacity 0.1s ease-in-out, font-weight 0.1s ease-in-out',
              '&:hover': { opacity: on ? 1 : 0.5 },
              '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '-2px' },
            }}
          >
            {/* The hidden bold copy reserves the active width (live does the same). */}
            <Box component="span" data-label={o.label} sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', '&::after': { content: 'attr(data-label)', height: 0, overflow: 'hidden', visibility: 'hidden', fontWeight: 500, userSelect: 'none', pointerEvents: 'none' } }}>
              {o.label}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------

/**
 * Value change morph (live, sampled frame by frame): the old value fades out (linear) while shrinking
 * to ~0.8 over ~190ms; the new one fades in over 200ms starting ~100ms later while scaling .95 → 1
 * (400ms, cubic-bezier(.19,1,.22,1)); the pill eases to the new width (~200ms ease-out). Live morphs letter by letter;
 * this does the same timings per word.
 */
export function MorphText({ text }: { text: string }) {
  const [state, setState] = React.useState({ cur: text, prev: '', n: 0 });
  // Derived from the previous render (React's "storing information from previous renders" pattern).
  if (state.cur !== text) setState({ cur: text, prev: state.cur, n: state.n + 1 });
  const [width, setWidth] = React.useState<number>();
  return (
    <Box component="span" sx={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap', width, transition: 'width 200ms ease-out' }}>
      <Box
        component="span"
        aria-hidden
        ref={(el: HTMLSpanElement | null) => {
          if (el && el.offsetWidth !== width) setWidth(el.offsetWidth);
        }}
        sx={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden' }}
      >
        {state.cur}
      </Box>
      {state.n > 0 && (
        <Box key={`out-${state.n}`} component="span" aria-hidden sx={{ position: 'absolute', left: 0, top: 0, animation: 'a3-morph-out-o 190ms linear both, a3-morph-out-s 190ms ease-out both', '@keyframes a3-morph-out-o': { from: { opacity: 1 }, to: { opacity: 0 } }, '@keyframes a3-morph-out-s': { from: { transform: 'none' }, to: { transform: 'scale(0.8)' } } }}>
          {state.prev}
        </Box>
      )}
      <Box
        key={`in-${state.n}`}
        component="span"
        sx={{
          display: 'inline-block',
          animation: state.n ? 'a3-morph-in-o 200ms linear 100ms both, a3-morph-in-s 400ms cubic-bezier(0.19, 1, 0.22, 1) 100ms both' : 'none',
          '@keyframes a3-morph-in-o': { from: { opacity: 0 }, to: { opacity: 1 } },
          '@keyframes a3-morph-in-s': { from: { transform: 'scale(0.95)' }, to: { transform: 'none' } },
        }}
      >
        {state.cur}
      </Box>
    </Box>
  );
}

export interface SelectOption<T> {
  value: T;
  label: string;
  sub?: string;
}

export function SelectMenu<T extends string>({ label, display, options, onChange }: { label: string; display: string; options: SelectOption<T>[]; onChange: (v: T) => void }) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  // Live: below 600px the same choices open in a bottom sheet instead of a dropdown.
  const sheet = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));
  const list = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();
  const close = () => setAnchor(null);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(list.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };
  const items = (
    <Box ref={list} role="menu" aria-label={label} onKeyDown={onKey} sx={sheet ? { display: 'flex', flexDirection: 'column', mx: '-10px' } : undefined}>
      {options.map((o) => (
        <Box
          key={o.value}
          component="button"
          type="button"
          role="menuitem"
          onClick={() => {
            onChange(o.value);
            close();
          }}
          sx={{
            position: 'relative',
            isolation: 'isolate',
            width: '100%',
            minHeight: sheet ? 40 : undefined,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            p: sheet ? '4px 10px' : '6px',
            border: 0,
            borderRadius: sheet ? '8px' : '7px',
            background: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: sheet ? '18px' : '16px',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            '& .lbl': { color: 'fg-2', fontWeight: 400, transition: 'color 0.1s, font-weight 0.1s' },
            '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', bgcolor: 'button-hover-tertiary', opacity: 0, transition: 'opacity 50ms', zIndex: -1 },
            '&:hover::before, &:focus-visible::before': { opacity: 1 },
            '&:hover .lbl, &:focus-visible .lbl': { color: 'fg-1', fontWeight: 500 },
            '&:focus-visible': { outline: 'none' },
          }}
        >
          <Box component="span" className="lbl" sx={{ flex: 1 }}>
            {o.label}
          </Box>
          {o.sub && (
            <Box component="span" sx={{ pl: '16px', color: 'fg-4' }}>
              {o.sub}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
  return (
    <>
      <ProButton
        variant="tertiary"
        aria-haspopup={sheet ? 'dialog' : 'menu'}
        aria-expanded={anchor ? 'true' : undefined}
        aria-label={`${label}, ${display}`}
        suffixIcon={<UpDownIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ pl: '14px', pr: '7px', gap: '6px' }}
      >
        <MorphText text={display} />
      </ProButton>
      {sheet ? (
        // Live sheet (390px): 64px title row (14/500, 23px/20px padding) with a 20px round close
        // button and a rule inset 20px under it, then 40px rows (4px/10px padding, 8px radius) in a
        // 10px/20px/22px body.
        <DialogFrame open={Boolean(anchor)} onClose={close} labelledBy={titleId} width={360}>
          <Box sx={{ position: 'relative', p: '23px 20px', '&::after': { content: '""', position: 'absolute', left: 20, right: 20, bottom: 0, height: '1px', bgcolor: 'border-0' } }}>
            <Box component="h1" id={titleId} sx={{ m: 0, fontSize: 14, fontWeight: 500, lineHeight: '18px', color: 'fg-1' }}>
              {label}
            </Box>
            <Box
              component="button"
              type="button"
              aria-label="Close"
              onClick={close}
              sx={{ position: 'absolute', right: 20, top: 22, width: 20, height: 20, p: 0, border: 0, borderRadius: '50%', background: 'none', color: 'fg-2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.1s, background 0.1s, transform 0.1s', '&:hover': { color: 'fg-1' } }}
            >
              <BIClose size={20} />
            </Box>
          </Box>
          <Box sx={{ p: '10px 20px 22px' }}>{items}</Box>
        </DialogFrame>
      ) : (
        <Popover
          open={Boolean(anchor)}
          anchorEl={anchor}
          onClose={close}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            // The shared theme fills every MUI Backdrop (32% black), even the invisible one a
            // Popover uses; live menus never dim the page.
            backdrop: { sx: { bgcolor: 'transparent' } },
            paper: {
              tabIndex: -1,
              sx: {
                mt: '17px',
                ml: '4px',
                minWidth: 248,
                p: '5px',
                borderRadius: '12px !important',
                bgcolor: 'bg-3',
                backgroundImage: 'none',
                boxShadow: `0 2px 14px ${tv('shadow-low')}, 0 0 0 1px ${tv('border-1')} !important`,
                outline: 'none',
                animation: 'a3-enter-pop 100ms ease both',
                '@keyframes a3-enter-pop': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'none' } },
              },
            },
          }}
        >
          {items}
        </Popover>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------

export function Switch({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Box
      component="button"
      type="button"
      role="switch"
      id={id}
      aria-label={label}
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={() => onChange(!checked)}
      sx={{
        position: 'relative',
        width: 34,
        height: 20,
        flexShrink: 0,
        p: 0,
        border: 0,
        borderRadius: '16px',
        cursor: 'pointer',
        bgcolor: checked ? 'purple-1' : 'fg-4',
        transition: 'transform 0.1s, background 0.1s, border-color 0.1s',
        '&::before': { content: '""', position: 'absolute', inset: '-16px' },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 2,
          left: 2,
          width: 16,
          height: 16,
          borderRadius: '32px',
          bgcolor: '#fafafa',
          boxShadow: '0 2px 2px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0, 0, 0, 0.04)',
          transform: checked ? 'translateX(14px)' : 'none',
          transition: 'transform 0.1s',
        },
        '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2 },
      }}
    />
  );
}
