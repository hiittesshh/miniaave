'use client';

import Box, { type BoxProps } from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';
import { transition } from '@/shared/theme/motion';
import { MinusIcon } from '@/shared/ui/Icons';
import { FormattedNumber } from '@/shared/ui/FormattedNumber';
import { InfoTooltip } from '@/shared/ui/InfoTooltip';

// ---------------------------------------------------------------------------------------------
// Sorting: click a column → descending, again → ascending, third time → original order.
// ---------------------------------------------------------------------------------------------

export interface SortState {
  name: string;
  desc: boolean;
}

export function useSort(initial: SortState = { name: '', desc: false }) {
  const [sort, setSort] = React.useState<SortState>(initial);
  const toggle = (name: string) =>
    setSort((s) => {
      if (s.name !== name) return { name, desc: true };
      if (s.desc) return { name, desc: false };
      return { name: '', desc: false };
    });
  return { sort, toggle };
}

export function sortRows<T>(rows: T[], sort: SortState, accessors: Record<string, (r: T) => number | string>): T[] {
  if (!sort.name || !accessors[sort.name]) return rows;
  const get = accessors[sort.name];
  const dir = sort.desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y) * dir;
    return ((x as number) - (y as number)) * dir;
  });
}

// ---------------------------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------------------------

export function ListWrapper({
  title,
  titleExtra,
  subtitle,
  topInfo,
  children,
  subChildren,
  withTopMargin,
  storageKey,
  noData,
}: {
  title: React.ReactNode;
  titleExtra?: React.ReactNode;
  subtitle?: React.ReactNode;
  topInfo?: React.ReactNode;
  children: React.ReactNode;
  subChildren?: React.ReactNode;
  withTopMargin?: boolean;
  storageKey?: string;
  noData?: boolean;
}) {
  // Lists only mount on the client (after data loads), so reading storage here is safe.
  const [collapsed, setCollapsed] = React.useState(() => {
    if (!storageKey || typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false; // storage blocked: keep expanded
    }
  });
  const toggle = () => {
    setCollapsed((c) => {
      try {
        if (storageKey) localStorage.setItem(storageKey, String(!c));
      } catch {
        /* ignore */
      }
      return !c;
    });
  };
  const open = !collapsed;

  return (
    <Box sx={{ mt: withTopMargin ? '2rem' : 0 }}>
      <Paper variant="table" sx={{ overflow: 'clip' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            py: { xs: '0.875rem', xsm: '1rem' },
            pl: { xs: '1rem', xsm: '1.25rem' },
            pr: '1rem',
            bgcolor: 'table-bg',
            borderRadius: 'inherit',
            boxShadow: open ? `inset 0 -1px 0 ${tv('border-0')}` : 'none',
            borderBottomLeftRadius: open ? 0 : undefined,
            borderBottomRightRadius: open ? 0 : undefined,
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', minHeight: 36, gap: 2 }}>
            <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 500, lineHeight: '1.125rem', color: 'fg-1', mr: 4, textTransform: 'capitalize' }}>
              {title}
            </Typography>
            {subtitle && <Box sx={{ display: { xs: 'none', xsm: 'flex' }, alignItems: 'center' }}>{subtitle}</Box>}
            <Box sx={{ flex: 1 }} />
            {open && titleExtra}
            {!noData && (
              <Button
                variant="tertiary"
                onClick={toggle}
                aria-expanded={open}
                endIcon={
                  <Box sx={{ position: 'relative', width: 18, height: 18, display: { xs: 'none', xsm: 'block' } }}>
                    <MinusIcon sx={{ position: 'absolute', inset: 0, fontSize: 18, color: 'fg-3' }} />
                    <MinusIcon sx={{ position: 'absolute', inset: 0, fontSize: 18, color: 'fg-3', transform: 'rotate(90deg)', opacity: open ? 0 : 1, transition: 'opacity 0.2s ease' }} />
                  </Box>
                }
              >
                {open ? 'Hide' : 'Show'}
              </Button>
            )}
            {subtitle && <Box sx={{ display: { xs: 'flex', xsm: 'none' }, width: '100%', justifyContent: 'flex-end' }}>{subtitle}</Box>}
          </Box>
          {topInfo && open && (
            <Box sx={{ display: 'flex', gap: '2.5rem', borderTop: `1px solid ${tv('border-0')}`, pt: '1.25rem', overflowX: 'auto', '&:empty': { display: 'none' } }}>{topInfo}</Box>
          )}
        </Box>
        <Collapse in={open} timeout={220} unmountOnExit={false}>
          {children}
        </Collapse>
      </Paper>
      {open && subChildren && <Box sx={{ mt: '1rem' }}>{subChildren}</Box>}
    </Box>
  );
}

export function ListTopInfoItem({ title, value, usd, percent, tooltip }: { title: string; value: number; usd?: boolean; percent?: boolean; tooltip?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.62rem', flexShrink: 0 }}>
      <Typography component="div" variant="description" color="fg-3" sx={{ lineHeight: '0.875rem', whiteSpace: 'nowrap' }}>
        {tooltip ? <InfoTooltip title={tooltip}>{title}</InfoTooltip> : title}
      </Typography>
      <FormattedNumber value={value} usd={usd} percent={percent} variant="statValue" animate symbolsColor={tv('fg-3')} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Columns and rows
// ---------------------------------------------------------------------------------------------

export function ListHeaderTitle({ children, sortKey, sort, onSort, tooltip }: { children: React.ReactNode; sortKey?: string; sort?: SortState; onSort?: (k: string) => void; tooltip?: React.ReactNode }) {
  const active = sortKey && sort?.name === sortKey;
  // Order matches the reference: label, then ⓘ, then the sort chevrons.
  const chevrons = sortKey && (
    <Box component="svg" viewBox="0 0 8 10" onClick={() => onSort?.(sortKey)} sx={{ width: 8, height: 10, ml: '4px', flexShrink: 0, cursor: 'pointer' }} aria-hidden>
      <path d="M1 4l3-3 3 3" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: active && !sort!.desc ? tv('fg-1') : tv('fg-icon'), transition: 'stroke 100ms ease' }} />
      <path d="M1 6l3 3 3-3" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: active && sort!.desc ? tv('fg-1') : tv('fg-icon'), transition: 'stroke 100ms ease' }} />
    </Box>
  );
  const label = (
    <Box
      component={sortKey ? 'button' : 'span'}
      type={sortKey ? 'button' : undefined}
      onClick={sortKey ? () => onSort?.(sortKey) : undefined}
      aria-sort={active ? (sort!.desc ? 'descending' : 'ascending') : undefined}
      sx={{
        p: 0,
        border: 0,
        background: 'none',
        cursor: sortKey ? 'pointer' : 'default',
        fontFamily: 'inherit',
        color: active ? 'fg-1' : 'fg-3',
        fontSize: '0.6875rem',
        fontWeight: 500,
        lineHeight: '120%',
        letterSpacing: '0.00313rem',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        textAlign: 'inherit',
        transition: transition(['color']),
        '&:hover': sortKey ? { color: 'fg-1' } : undefined,
        '&:focus-visible': { outline: `2px solid ${tv('fg-1')}`, outlineOffset: '2px', borderRadius: '2px' },
      }}
    >
      {children}
    </Box>
  );
  return (
    <Box component="span" title={typeof children === 'string' ? children : undefined} sx={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, maxWidth: '100%' }}>
      {tooltip ? <InfoTooltip title={tooltip}>{label}</InfoTooltip> : label}
      {chevrons}
    </Box>
  );
}

export function ListHeaderWrapper({ children, px = 4 }: { children: React.ReactNode; px?: number }) {
  return (
    <Box
      sx={{
        display: { xs: 'none', xsm: 'flex' },
        alignItems: 'flex-end',
        gap: '1rem',
        px,
        py: '12.5px',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        bgcolor: 'table-bg',
        borderBottom: `1px solid ${tv('border-0')}`,
      }}
    >
      {children}
    </Box>
  );
}

export function ListColumn({ children, align = 'left', isRow, minWidth = 70, maxWidth, flex = 1, sx, ...rest }: BoxProps & { align?: 'left' | 'center' | 'right'; isRow?: boolean; minWidth?: number; maxWidth?: number; flex?: number }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        alignItems: isRow ? 'center' : align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end',
        justifyContent: isRow ? (align === 'left' ? 'flex-start' : 'flex-end') : 'center',
        flex,
        minWidth,
        maxWidth,
        p: '4px',
        overflow: 'visible',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function ListItem({ children, onClick, minHeight = 71, px = 4, hover = false, last }: { children: React.ReactNode; onClick?: () => void; minHeight?: number; px?: number; hover?: boolean; last?: boolean }) {
  return (
    <Box
      onClick={onClick}
      role={onClick ? 'link' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        minHeight,
        px,
        borderBottom: last ? 'none' : `1px solid ${tv('border-0')}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: transition(['background-color'], 120),
        animation: 'clone-fade-up 260ms ease both',
        '&:hover': hover ? { bgcolor: 'button-hover' } : undefined,
        '&:focus-visible': { outline: `2px solid ${tv('fg-1')}`, outlineOffset: '-2px' },
      }}
    >
      {children}
    </Box>
  );
}

export function ListValue({ value, usdValue, symbol, disabled, compact }: { value: number; usdValue?: number; symbol?: string; disabled?: boolean; compact?: boolean }) {
  return (
    <>
      <FormattedNumber value={value} compact={compact} variant="h5" symbol={symbol} sx={{ color: disabled ? 'fg-4' : 'fg-1', mb: usdValue !== undefined && !disabled ? '2px' : 0 }} />
      {usdValue !== undefined && !disabled && <FormattedNumber value={usdValue} usd compact variant="description" sx={{ color: 'fg-2' }} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Mobile cards
// ---------------------------------------------------------------------------------------------

export function MobileCard({ header, children, actions, first }: { header: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; first?: boolean }) {
  return (
    <Box sx={{ display: { xs: 'block', xsm: 'none' } }}>
      {!first && <Divider />}
      <Box sx={{ px: 4, pt: 4, pb: 6, animation: 'clone-fade-up 260ms ease both' }}>
        <Box sx={{ mb: '1.5rem' }}>{header}</Box>
        {children}
        {actions && <Box sx={{ display: 'flex', gap: '0.75rem', mt: 5 }}>{actions}</Box>}
      </Box>
    </Box>
  );
}

export function Row({ caption, children, mb = 2, align = 'center' }: { caption: React.ReactNode; children: React.ReactNode; mb?: number; align?: 'center' | 'flex-start' }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: align, mb, gap: 2 }}>
      <Typography component="div" variant="description" color="fg-3">
        {caption}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, textAlign: 'right' }}>{children}</Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Loaders and empty states
// ---------------------------------------------------------------------------------------------

export function ListLoaderRows({ columns, rows = 2, withButtons = 2 }: { columns: number; rows?: number; withButtons?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: { xs: 'none', xsm: 'flex' }, alignItems: 'center', gap: '1rem', minHeight: 71, px: 4, borderBottom: i < rows - 1 ? `1px solid ${tv('border-0')}` : 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: 160 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton width={39} height={20} sx={{ ml: 3, borderRadius: '4px' }} />
          </Box>
          {Array.from({ length: columns - 1 }).map((__, c) => (
            <Box key={c} sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <Skeleton width={70} height={20} sx={{ borderRadius: '4px' }} />
            </Box>
          ))}
          {withButtons > 0 && (
            <Box sx={{ display: 'flex', gap: '0.62rem', width: 160, justifyContent: 'flex-end' }}>
              {Array.from({ length: withButtons }).map((__, b) => (
                <Skeleton key={b} width={74} height={28} sx={{ borderRadius: '0.375rem' }} />
              ))}
            </Box>
          )}
        </Box>
      ))}
      <Box sx={{ display: { xs: 'block', xsm: 'none' }, px: 4, pt: 4, pb: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 6 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton width={100} height={24} sx={{ borderRadius: '4px' }} />
        </Box>
        {[0, 1, 2].map((r) => (
          <Box key={r} sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Skeleton width={100} height={20} sx={{ borderRadius: '4px' }} />
            <Skeleton width={70} height={20} sx={{ borderRadius: '4px' }} />
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 3, mt: 5 }}>
          <Skeleton height={36} sx={{ flex: 1, borderRadius: '0.5rem' }} />
          <Skeleton height={36} sx={{ flex: 1, borderRadius: '0.5rem' }} />
        </Box>
      </Box>
    </>
  );
}

export function ListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <Typography color="fg-2" sx={{ px: { xs: 4, xsm: 6 }, pt: { xs: '0.875rem', xsm: '1.375rem' }, pb: { xs: '0.875rem', xsm: '1.75rem' } }}>
      {children}
    </Typography>
  );
}
