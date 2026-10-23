'use client';

/**
 * "Display Preferences" panel of the explore tables, rebuilt from the live panel (computed styles
 * and tooltips captured 2026-10-14):
 * - 266px wide, bg-3, 12px radius, 5px padding, shadow + 1px ring, right-aligned under the
 *   sliders button, enterPop like the filter menus
 * - sections "DISPLAY" and "PROPERTIES" (11/600 fg-4 uppercase heading with a "Reset" action),
 *   separated by a 1px rule; 32px rows (6px padding, 7px radius, 50ms hover plate) with a 14/400
 *   fg-3 label, a 16px fg-4 info icon carrying the live tooltip text, and a 34×20 switch
 *   (fg-4 off, purple-1 on, 16px white knob, 100ms)
 * PROPERTIES lists every table column after the first; turning one off hides that column.
 * Below 600px (live, probed 2026-10-14) the same settings open as a bottom sheet "Display
 * Preferences": Group By › and Sort By › rows (value + chevron) that drill into option lists (with a
 * Back button, the chosen row on a 6% plate with a check, Reset / Done), the two toggles, a
 * PROPERTIES list, and Restore Defaults / Done. 40px rows (4px/10px padding, 8px radius).
 */
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import type { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Tooltip from '@mui/material/Tooltip';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';
import { ProButton } from '../ui';
import { PIBack, PIInfo } from '../icons';
import { BICheck, BIChevronRight, BIClose } from '../pages/token/icons';
import { DialogFrame } from '../pages/watch-address/DialogFrame';

export interface PrefToggle {
  key: string;
  label: string;
  tip: string;
  on: boolean;
}

function Switch({ on }: { on: boolean }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        position: 'relative',
        width: 34,
        height: 20,
        flexShrink: 0,
        borderRadius: '16px',
        bgcolor: on ? 'purple-1' : 'fg-4',
        transition: 'transform 0.1s, background 0.1s, border-color 0.1s',
        '&::before': { content: '""', position: 'absolute', top: 2, left: 2, width: 16, height: 16, borderRadius: '50%', bgcolor: '#fff', transform: on ? 'translateX(14px)' : 'none', transition: 'transform 0.1s' },
      }}
    />
  );
}

function Section({ title, items, onToggle, onReset }: { title: string; items: PrefToggle[]; onToggle: (key: string) => void; onReset: () => void }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '6px 6px 4px', fontSize: 11, fontWeight: 600, lineHeight: '13px', textTransform: 'uppercase', color: 'fg-4' }}>
        <span>{title}</span>
        <Box component="button" type="button" onClick={onReset} sx={{ p: 0, border: 0, background: 'none', borderRadius: '6px', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, lineHeight: '13px', textTransform: 'uppercase', color: 'fg-4', cursor: 'pointer', transition: 'color 100ms', '&:hover': { color: 'fg-2' } }}>
          Reset
        </Box>
      </Box>
      {items.map((it) => (
        <Box
          key={it.key}
          component="button"
          type="button"
          role="menuitemcheckbox"
          aria-checked={it.on}
          onClick={() => onToggle(it.key)}
          sx={{
            position: 'relative',
            isolation: 'isolate',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            minHeight: 32,
            p: '6px',
            border: 0,
            borderRadius: '7px',
            background: 'none',
            fontFamily: 'inherit',
            cursor: 'pointer',
            '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: '7px', bgcolor: 'rgba(255,255,255,0.06)', opacity: 0, transition: 'opacity 50ms', zIndex: -1 },
            '&:hover::before, &:focus-visible::before': { opacity: 1 },
            '&:focus-visible': { outline: 'none' },
          }}
        >
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', fontSize: 14, lineHeight: '14px', color: 'fg-3', textAlign: 'left' }}>
            {it.label}
            <Tooltip title={it.tip}>
              <Box component="span" sx={{ display: 'inline-flex', color: 'fg-4' }} onClick={(e) => e.stopPropagation()}>
                <PIInfo size={16} />
              </Box>
            </Tooltip>
          </Box>
          <Switch on={it.on} />
        </Box>
      ))}
    </Box>
  );
}

export interface SheetChoice<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  defaultValue: T;
  onChange: (v: T) => void;
}

export interface SheetExtras {
  groupBy: SheetChoice<string>;
  sort: { key: string; desc: boolean; options: { key: string; label: string }[]; defaultKey: string; onChange: (s: { key: string; desc: boolean }) => void };
  /** True when every setting is at its default (Restore Defaults is disabled then, as live). */
  isDefault: boolean;
  onRestoreDefaults: () => void;
}

const sheetRowSx = (selected = false) =>
  ({
    position: 'relative',
    width: 'calc(100% + 20px)',
    mx: '-10px',
    minHeight: 40,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    p: '4px 10px',
    border: 0,
    borderRadius: '8px',
    bgcolor: selected ? 'button-hover-tertiary' : 'transparent',
    fontFamily: 'inherit',
    fontSize: 14,
    lineHeight: '18px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background-color 0.05s',
    '& .lbl': { color: selected ? 'fg-1' : 'fg-2', fontWeight: selected ? 500 : 400, transition: 'color 0.1s, font-weight 0.1s' },
    '&:hover': { bgcolor: 'button-hover-tertiary' },
    '&:hover .lbl': { color: 'fg-1' },
    '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '-2px' },
  }) as const;

const Sep = () => <Box role="separator" sx={{ height: '1px', bgcolor: 'border-1', mx: '-5px', my: '10px' }} />;

function SheetToggle({ it, onToggle }: { it: PrefToggle; onToggle: (k: string) => void }) {
  return (
    <Box component="button" type="button" role="switch" aria-checked={it.on} onClick={() => onToggle(it.key)} sx={sheetRowSx()}>
      <Box className="lbl" component="span" sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {it.label}
        <Tooltip title={it.tip}>
          <Box component="span" sx={{ display: 'inline-flex', color: 'fg-4' }} onClick={(e) => e.stopPropagation()}>
            <PIInfo size={16} />
          </Box>
        </Tooltip>
      </Box>
      <Switch on={it.on} />
    </Box>
  );
}

function PrefsSheet({ open, onClose, display, properties, onToggleDisplay, onToggleProperty, extras }: { open: boolean; onClose: () => void; display: PrefToggle[]; properties: PrefToggle[]; onToggleDisplay: (k: string) => void; onToggleProperty: (k: string) => void; extras: SheetExtras }) {
  const [view, setView] = React.useState<'main' | 'group' | 'sort'>('main');
  const close = () => {
    onClose();
    setView('main');
  };
  const { groupBy, sort } = extras;
  const sortLabel = sort.options.find((o) => o.key === sort.key)?.label ?? '';
  const title = view === 'group' ? 'Group By' : view === 'sort' ? 'Sort By' : 'Display Preferences';
  const choice = (label: string, selected: boolean, onClick: () => void) => (
    <Box key={label} component="button" type="button" role="menuitemradio" aria-checked={selected} onClick={onClick} sx={sheetRowSx(selected)}>
      <Box className="lbl" component="span" sx={{ flex: 1 }}>{label}</Box>
      {selected && (
        <Box component="span" sx={{ display: 'flex', color: 'fg-2' }}>
          <BICheck size={20} />
        </Box>
      )}
    </Box>
  );
  const drill = (label: string, value: string, to: 'group' | 'sort') => (
    <Box component="button" type="button" onClick={() => setView(to)} sx={sheetRowSx()}>
      <Box className="lbl" component="span" sx={{ flex: 1 }}>{label}</Box>
      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <Box component="span" sx={{ color: 'fg-1', fontWeight: 500 }}>{value}</Box>
        <Box component="span" sx={{ display: 'flex', color: 'fg-4' }}>
          <BIChevronRight size={20} />
        </Box>
      </Box>
    </Box>
  );
  const subDefault = view === 'group' ? groupBy.value === groupBy.defaultValue : sort.key === sort.defaultKey && sort.desc;
  const reset = () => (view === 'group' ? groupBy.onChange(groupBy.defaultValue) : view === 'sort' ? sort.onChange({ key: sort.defaultKey, desc: true }) : extras.onRestoreDefaults());
  const disabled = view === 'main' ? extras.isDefault : subDefault;
  return (
    <DialogFrame open={open} onClose={close} labelledBy="display-prefs-title" width={360}>
      <Box sx={{ position: 'relative', p: view === 'main' ? '23px 20px' : '23px 64px', '&::after': { content: '""', position: 'absolute', left: 20, right: 20, bottom: 0, height: '1px', bgcolor: 'border-0' } }}>
        {view !== 'main' && (
          <Box component="button" type="button" aria-label="Back" onClick={() => setView('main')} sx={{ position: 'absolute', left: 20, top: 22, width: 20, height: 20, p: 0, border: 0, background: 'none', color: 'fg-3', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.1s, transform 0.1s', '&:hover': { color: 'fg-1' } }}>
            <PIBack size={20} />
          </Box>
        )}
        <Box component="h1" id="display-prefs-title" sx={{ m: 0, fontSize: 14, fontWeight: 500, lineHeight: '18px', color: 'fg-1', textAlign: view === 'main' ? 'left' : 'center' }}>
          {title}
        </Box>
        <Box component="button" type="button" aria-label="Close" onClick={close} sx={{ position: 'absolute', right: 20, top: 22, width: 20, height: 20, p: 0, border: 0, borderRadius: '50%', background: 'none', color: 'fg-2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.1s, background 0.1s, transform 0.1s', '&:hover': { color: 'fg-1' } }}>
          <BIClose size={20} />
        </Box>
      </Box>
      <Box sx={{ p: '10px 20px 0' }}>
        {view === 'main' && (
          <>
            {drill('Group By', groupBy.options.find((o) => o.value === groupBy.value)?.label ?? '', 'group')}
            {drill('Sort By', sortLabel, 'sort')}
            <Sep />
            {display.map((it) => (
              <SheetToggle key={it.key} it={it} onToggle={onToggleDisplay} />
            ))}
            <Sep />
            <Box sx={{ p: '6px 0 4px', mb: '5px', fontSize: 11, fontWeight: 600, lineHeight: '13.2px', textTransform: 'uppercase', color: 'fg-4' }}>Properties</Box>
            {properties.map((it) => (
              <SheetToggle key={it.key} it={it} onToggle={onToggleProperty} />
            ))}
          </>
        )}
        {view === 'group' && groupBy.options.map((o) => choice(o.label, o.value === groupBy.value, () => groupBy.onChange(o.value)))}
        {view === 'sort' && (
          <>
            {choice('Ascending', !sort.desc, () => sort.onChange({ key: sort.key, desc: false }))}
            {choice('Descending', sort.desc, () => sort.onChange({ key: sort.key, desc: true }))}
            <Sep />
            {sort.options.map((o) => choice(o.label, o.key === sort.key, () => sort.onChange({ key: o.key, desc: sort.desc })))}
          </>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: '24px', p: '10px 20px 22px' }}>
        <ProButton variant="tertiary" disabled={disabled} onClick={reset} sx={{ flex: 1, height: 40 }}>
          {view === 'main' ? 'Restore Defaults' : 'Reset'}
        </ProButton>
        <ProButton variant="primary" onClick={close} sx={{ flex: 1, height: 40 }}>
          Done
        </ProButton>
      </Box>
    </DialogFrame>
  );
}

export function DisplayPrefs({
  anchor,
  onClose,
  display,
  properties,
  onToggleDisplay,
  onToggleProperty,
  onResetDisplay,
  onResetProperties,
  sheet,
}: {
  anchor: HTMLElement | null;
  onClose: () => void;
  display: PrefToggle[];
  properties: PrefToggle[];
  onToggleDisplay: (key: string) => void;
  onToggleProperty: (key: string) => void;
  onResetDisplay: () => void;
  onResetProperties: () => void;
  /** Group/sort controls for the mobile sheet (live explore pages). */
  sheet?: SheetExtras;
}) {
  const phone = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));
  if (phone && sheet) return <PrefsSheet open={Boolean(anchor)} onClose={onClose} display={display} properties={properties} onToggleDisplay={onToggleDisplay} onToggleProperty={onToggleProperty} extras={sheet} />;
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        // The shared theme fills every Backdrop; live menus never dim the page.
        backdrop: { sx: { bgcolor: 'transparent' } },
        paper: {
          tabIndex: -1,
          sx: {
            mt: '9px',
            ml: '2px',
            width: 266,
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
      <Box role="menu" aria-label="Display Preferences">
        <Section title="Display" items={display} onToggle={onToggleDisplay} onReset={onResetDisplay} />
        <Box sx={{ height: '1px', bgcolor: 'border-1', mx: '-5px', my: '7.5px' }} />
        <Section title="Properties" items={properties} onToggle={onToggleProperty} onReset={onResetProperties} />
      </Box>
    </Popover>
  );
}
