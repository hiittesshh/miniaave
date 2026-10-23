'use client';

/**
 * Filter pill + dropdown, rebuilt from the live explore filters (computed styles, 1440×900):
 * - pill: bg-3 with a 1px rgba(255,255,255,.1) ring, 36px tall, 14/500 text, 20px fg-3 icons, 8px
 *   gaps; padding 12px left with an icon (14px without) and 16px right (7px before a chevron,
 *   40px when a clear "×" sits inside). It never turns primary: a selection reads "Hubs (1)".
 * - panel: bg-3, 12px radius, 5px padding, `0 2px 14px rgba(0,0,0,.15)` + 1px border-1 ring,
 *   enters with the live "enterPop" (opacity 0→1, scale .96→1, 100ms). Multi-selects sit 10px
 *   below the pill (2px left of it); single selects 17px below, right-aligned 4px past it.
 * - multi-select: 38px search row ("Search hubs", 18px fg-4 icon, 1px border-1 rule under the
 *   input), "HUBS … CLEAR" header (11/600 fg-4 uppercase), 32px items (6px padding, 7px radius,
 *   hover fill rgba(255,255,255,.06) in 50ms) with an 18px round checkbox (1.5px #3b3838 ring;
 *   checked = purple fill + white tick). Label fg-2/400, selected fg-1/500 (color .1s).
 * - single-select: 32px items (8px padding), the selected one fg-1/500 with a filled purple check.
 */
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Popover from '@mui/material/Popover';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';
import { PISearch } from '../icons';
import { ProButton } from '../ui';

export interface PillOption<T> {
  value: T;
  label: React.ReactNode;
  /** Plain text used by the search box (defaults to String(value)). */
  text?: string;
}

/** Live filter glyph: three centred lines (12/8/4px) in a 20px box. */
export function FilterLinesIcon() {
  return (
    <Box component="svg" viewBox="0 0 20 20" aria-hidden sx={{ width: 20, height: 20, display: 'block' }}>
      <path d="M4 5h12M6 10h8M8 15h4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </Box>
  );
}

/** Live up/down chevron (6×3px strokes) in a 20px box. */
export function UpDownIcon() {
  return (
    <Box component="svg" viewBox="0 0 20 20" aria-hidden sx={{ width: 20, height: 20, display: 'block' }}>
      <path d="M7 8l3-3 3 3M7 13l3 3 3-3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

function RoundCheck({ on }: { on: boolean }) {
  return (
    <Box component="svg" viewBox="0 0 20 20" aria-hidden sx={{ width: 20, height: 20, flexShrink: 0, display: 'block', '& circle, & path': { transition: 'fill 100ms, stroke 100ms, opacity 100ms' } }}>
      <circle cx="10" cy="10" r="9" fill={on ? tv('purple-1') : 'transparent'} stroke={on ? tv('purple-1') : '#3b3838'} strokeWidth={1.5} />
      <path d="M6.2 10.4l2.4 2.7 5.3-5.8" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={on ? 1 : 0} />
    </Box>
  );
}

const itemSx = (on: boolean, single: boolean) =>
  ({
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    minHeight: 32,
    p: single ? '8px' : '6px',
    border: 0,
    borderRadius: '7px',
    background: 'none',
    fontFamily: 'inherit',
    fontSize: 14,
    lineHeight: single ? '16px' : '20px',
    fontWeight: on ? 500 : 400,
    color: on ? 'fg-1' : 'fg-2',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'color 0.1s, font-weight 0.1s',
    '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: '7px', bgcolor: 'rgba(255,255,255,0.06)', opacity: 0, transition: 'opacity 50ms', zIndex: -1 },
    '&:hover::before, &:focus-visible::before': { opacity: 1 },
    '&:focus-visible': { outline: 'none' },
  }) as const;

export function PillMenu<T extends string | number>({
  label,
  icon,
  options,
  selected,
  onChange,
  single,
  allLabel,
  chevron = 'none',
  prefix,
  align = 'left',
  searchable,
  heading,
  selectedLabel,
  panelWidth,
}: {
  label: string;
  icon?: React.ReactNode;
  options: PillOption<T>[];
  selected: T[];
  onChange: (v: T[]) => void;
  single?: boolean;
  allLabel?: string;
  chevron?: 'none' | 'updown';
  /** @deprecated pills always keep the secondary look (live); kept for API compatibility. */
  stayNeutral?: boolean;
  /** Muted lead-in before the selected value (live: "Group By: " in fg-2). */
  prefix?: React.ReactNode;
  align?: 'left' | 'right';
  /** Multi-selects show a search row by default (live). */
  searchable?: boolean;
  /** Panel header (live: the label, or "Filter by" for chains). */
  heading?: string;
  /** Pill text for a selection (live chains: the chain name for one, else "Label (n)"). */
  selectedLabel?: (selected: T[]) => React.ReactNode;
  /** Live chains panel is 296px wide (filters 240, single selects 248). */
  panelWidth?: number;
}) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [q, setQ] = React.useState('');
  const active = selected.length > 0;
  const text = !active ? (allLabel ?? label) : selectedLabel ? selectedLabel(selected) : single ? options.find((o) => o.value === selected[0])?.label : `${label} (${selected.length})`;
  const showSearch = searchable ?? !single;
  const clearable = !single && active && chevron === 'none';
  const shown = q ? options.filter((o) => (o.text ?? String(o.value)).toLowerCase().includes(q.toLowerCase())) : options;
  const close = () => {
    setAnchor(null);
    setQ('');
  };
  return (
    <>
      <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
        <ProButton
          variant="secondary"
          prefixIcon={icon}
          suffixIcon={chevron === 'updown' ? <UpDownIcon /> : undefined}
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-haspopup="menu"
          aria-expanded={anchor ? 'true' : undefined}
          aria-label={single && allLabel ? `Filter ${label}, ${active ? String(selected[0]) : allLabel}` : single ? undefined : `Filter ${label}`}
          sx={{ pl: icon ? '12px' : '14px', pr: clearable ? '40px' : chevron === 'updown' ? '7px' : '16px', gap: '8px', bgcolor: 'bg-3', boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' }}
        >
          {prefix ? (
            <span>
              <Box component="span" sx={{ color: 'fg-2' }}>
                {prefix}{' '}
              </Box>
              {text}
            </span>
          ) : (
            text
          )}
        </ProButton>
        {clearable && (
          <Box
            component="button"
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => onChange([])}
            sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, p: 0, border: 0, background: 'none', color: 'fg-3', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 100ms', '&:hover': { color: 'fg-1' } }}
          >
            <Box component="svg" viewBox="0 0 20 20" aria-hidden sx={{ width: 20, height: 20 }}>
              <path d="M6 6l8 8M14 6l-8 8" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            </Box>
          </Box>
        )}
      </Box>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: align }}
        transformOrigin={{ vertical: 'top', horizontal: align }}
        slotProps={{
          // The shared theme fills every Backdrop; live menus never dim the page.
          backdrop: { sx: { bgcolor: 'transparent' } },
          paper: {
            tabIndex: -1,
            sx: {
              mt: single ? '17px' : '10px',
              ml: align === 'right' ? '4px' : '-2px',
              width: panelWidth ?? (single ? 248 : 240),
              maxHeight: 420,
              p: '5px',
              borderRadius: '12px !important',
              bgcolor: 'bg-3',
              backgroundImage: 'none',
              boxShadow: `0 2px 14px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')} !important`,
              outline: 'none',
            },
          },
        }}
      >
        {showSearch && (
          <Box sx={{ position: 'relative', height: 38, mx: '-5px', px: '5px', mb: '5px' }}>
            <Box component="span" sx={{ position: 'absolute', left: 11, top: 7, display: 'flex', color: 'fg-4', pointerEvents: 'none' }}>
              <PISearch size={18} />
            </Box>
            <InputBase
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}`}
              inputProps={{ 'aria-label': `Search ${label.toLowerCase()}` }}
              sx={{ width: '100%', height: 38, fontSize: 14, borderBottom: `1px solid ${tv('border-1')}`, '& input': { p: '7px 8px 12px 32px', height: 'auto' }, '& input::placeholder': { color: 'fg-4', opacity: 1 } }}
            />
          </Box>
        )}
        {!single && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '6px 6px 4px', fontSize: 11, fontWeight: 600, lineHeight: '13px', textTransform: 'uppercase', color: 'fg-4' }}>
            <span>{heading ?? label}</span>
            <Box component="button" type="button" onClick={() => onChange([])} disabled={!active} sx={{ p: 0, border: 0, background: 'none', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, lineHeight: '13px', textTransform: 'uppercase', color: active ? 'fg-2' : 'fg-4', cursor: active ? 'pointer' : 'default', transition: 'color 100ms', '&:hover:not(:disabled)': { color: 'fg-1' } }}>
              Clear
            </Box>
          </Box>
        )}
        <Box role="menu" aria-label={label} sx={{ display: 'flex', flexDirection: 'column' }}>
          {single && allLabel && (
            <Box component="button" type="button" role="menuitemradio" aria-checked={!active} onClick={() => { onChange([]); close(); }} sx={itemSx(!active, true)}>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>{allLabel}</Box>
              {!active && <RoundCheck on />}
            </Box>
          )}
          {shown.map((o) => {
            const on = selected.includes(o.value);
            return (
              <Box
                key={String(o.value)}
                component="button"
                type="button"
                role={single ? 'menuitemradio' : 'menuitemcheckbox'}
                aria-checked={on}
                onClick={() => {
                  if (single) {
                    onChange([o.value]);
                    close();
                  } else onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value]);
                }}
                sx={itemSx(on, !!single)}
              >
                {!single && <RoundCheck on={on} />}
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>{o.label}</Box>
                {single && on && <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RoundCheck on /></Box>}
              </Box>
            );
          })}
          {shown.length === 0 && <Box sx={{ p: '10px 6px', fontSize: 14, color: 'fg-3' }}>No results</Box>}
        </Box>
      </Popover>
    </>
  );
}
