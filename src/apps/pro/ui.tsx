'use client';

import Box, { type BoxProps } from '@mui/material/Box';
import ButtonBase, { type ButtonBaseProps } from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import NumberFlow from '@number-flow/react';
import Link from 'next/link';
import * as React from 'react';
import { formatHealthFactor, formatNumber, formatPercent, formatUSD } from '@/shared/format';
import { DARK, surfaceShadow, tv, type TokenName } from '@/shared/theme/tokens';
import { motion, transition } from '@/shared/theme/motion';
import { InfoIcon } from '@/shared/ui/Icons';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import type { ChainInfo } from '@/data/types';

// ---------------------------------------------------------------------------------------------
// Buttons (Pro: pill shape, 2.25rem tall, variants primary / secondary / tertiary / text)
// ---------------------------------------------------------------------------------------------

export type ProButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'text';

type ProButtonProps = Omit<ButtonBaseProps, 'children'> & {
  variant?: ProButtonVariant;
  size?: 'sm' | 'md' | 'lg' | 'square';
  wide?: boolean;
  loading?: boolean;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  href?: string;
  tone?: 'default' | 'danger';
  children?: React.ReactNode;
};

export const ProButton = React.forwardRef<HTMLButtonElement, ProButtonProps>(function ProButton(
  { variant = 'primary', size = 'md', wide, loading, prefixIcon, suffixIcon, children, sx, href, tone = 'default', disabled, ...rest },
  ref
) {
  const palette: Record<ProButtonVariant, { color: string; bg: string; hover: string; shadow: string }> = {
    primary: { color: tv('button-primary-fg'), bg: tv('fg-1'), hover: 'rgba(255,255,255,0.16)', shadow: 'none' },
    secondary: { color: tv('fg-1'), bg: tv('bg-3'), hover: tv('button-hover-secondary'), shadow: surfaceShadow() },
    tertiary: { color: tv('fg-1'), bg: tv('bg-4'), hover: tv('button-hover-tertiary'), shadow: 'none' },
    text: { color: tv('fg-2'), bg: 'transparent', hover: 'transparent', shadow: 'none' },
  };
  const p = palette[variant];
  const height = size === 'sm' ? '1.75rem' : size === 'lg' ? '3rem' : '2.25rem';
  return (
    <ButtonBase
      ref={ref}
      {...(href ? { LinkComponent: Link, href } : {})}
      disabled={disabled || loading}
      {...rest}
      sx={[
        {
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
          height,
          px: size === 'square' ? 0 : size === 'sm' ? '0.625rem' : size === 'lg' ? '1.3125rem' : '0.875rem',
          aspectRatio: size === 'square' ? '1' : undefined,
          width: wide ? '100%' : undefined,
          borderRadius: '10rem',
          fontFamily: 'inherit',
          fontSize: size === 'lg' ? '0.9375rem' : '0.875rem',
          fontWeight: 500,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          color: p.color,
          bgcolor: p.bg,
          boxShadow: p.shadow,
          gap: size === 'sm' ? '0.25rem' : '0.5rem',
          transition: transition(['box-shadow', 'background-color', 'transform', 'color'], 180),
          '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', bgcolor: p.hover, opacity: 0, transition: 'opacity 100ms ease', zIndex: -1 },
          '&:hover::before': { opacity: 1 },
          '&:active': { transform: 'scale(0.99)', transitionDuration: '100ms' },
          '&.Mui-disabled': { opacity: 0.3, cursor: 'not-allowed', pointerEvents: 'auto' },
          '&.Mui-focusVisible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '2px' },
          '& .pro-btn-icon': { color: variant === 'primary' ? 'inherit' : tv('fg-3'), display: 'flex' },
          ...(variant === 'text' && { px: 0, '&:hover': { color: tv('fg-1') } }),
          ...(tone === 'danger' && { '&:hover': { bgcolor: tv('danger'), color: '#fff' } }),
          [DARK]: variant === 'secondary' ? { boxShadow: `0 0 0 1px ${tv('border-2')}` } : {},
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'inherit',
          transition: `opacity 200ms ease, transform 200ms ease`,
          opacity: loading ? 0 : 1,
          transform: loading ? 'translateY(8px)' : 'none',
        }}
      >
        {prefixIcon && <span className="pro-btn-icon">{prefixIcon}</span>}
        {children}
        {suffixIcon && <span className="pro-btn-icon">{suffixIcon}</span>}
      </Box>
      {loading && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={16} color="inherit" />
        </Box>
      )}
    </ButtonBase>
  );
});

// ---------------------------------------------------------------------------------------------
// Surfaces and layout pieces
// ---------------------------------------------------------------------------------------------

export function ProCard({ children, sx, ...rest }: BoxProps & { component?: React.ElementType; href?: string }) {
  return (
    <Box
      sx={[
        {
          bgcolor: 'bg-3',
          borderRadius: '0.625rem',
          boxShadow: surfaceShadow('shadow-stroke-1'),
          [DARK]: { bgcolor: 'bg-2' },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function PageTitle({ title, subtitle, right, size = 30 }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode; size?: 28 | 30 }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap', rowGap: '0.75rem', animation: 'clone-fade-up 300ms ease both' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h1" sx={{ fontSize: { xs: '1.5rem', sm: `${size}px` }, fontWeight: 500, lineHeight: 1.2, color: 'fg-1' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography component="div" sx={{ color: 'fg-3', fontSize: '0.875rem', lineHeight: '18.9px', mt: '8px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem', '& strong': { color: 'fg-1', fontWeight: 500 } }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {right}
    </Box>
  );
}

export function Section({ title, description, right, children, id }: { title: React.ReactNode; description?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <Box component="section" id={id} sx={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', scrollMarginTop: '6rem', animation: 'clone-fade-up 320ms ease both' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.2, minHeight: '1.8125rem', display: 'flex', alignItems: 'center' }}>
            {title}
          </Typography>
          {description && (
            <Typography sx={{ color: 'fg-3', fontSize: '0.875rem' }} component="div">
              {description}
            </Typography>
          )}
        </Box>
        {right}
      </Box>
      {children}
    </Box>
  );
}

export function Stat({ label, tooltip, children, loading, size = 'md' }: { label: React.ReactNode; tooltip?: string; children: React.ReactNode; loading?: boolean; size?: 'md' | 'lg' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: 0 }}>
      <Typography component="div" sx={{ color: 'fg-3', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
        {label}
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoIcon tabIndex={0} sx={{ fontSize: 13, color: 'fg-4', cursor: 'help' }} />
          </Tooltip>
        )}
      </Typography>
      {loading ? (
        <Skeleton width={90} height={size === 'lg' ? 32 : 22} sx={{ borderRadius: '10rem' }} />
      ) : (
        <Box sx={{ fontSize: size === 'lg' ? { xs: '1.375rem', sm: '1.75rem' } : '1.125rem', fontWeight: 500, lineHeight: 1.15, color: 'fg-1', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: 1 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

export function StatsRow({ children }: { children: React.ReactNode }) {
  return (
    <ProCard sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: '1rem 1.5rem', sm: '1.25rem 2.5rem' }, p: '1.25rem', animation: 'clone-fade-up 300ms ease both' }}>{children}</ProCard>
  );
}

// ---------------------------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------------------------

export function USD({ value, compact = true, animate = true }: { value: number; compact?: boolean; animate?: boolean }) {
  if (!animate) return <>{formatUSD(value, { compact: compact ? undefined : false })}</>;
  const parts = formatUSD(value, { compact: compact ? undefined : false });
  const isCompact = /[KMBT]$/.test(parts);
  return (
    <NumberFlow
      value={Number.isFinite(value) ? value : 0}
      locales="en-US"
      format={{ style: 'currency', currency: 'USD', notation: isCompact ? 'compact' : 'standard', maximumFractionDigits: 2, minimumFractionDigits: isCompact ? 2 : value >= 1 ? 2 : 0 }}
    />
  );
}

export function Pct({ value, animate = true, decimals = 2 }: { value: number; animate?: boolean; decimals?: number }) {
  if (!animate || (value > 0 && value < 0.0001)) return <>{formatPercent(value, decimals)}</>;
  return <NumberFlow value={Number.isFinite(value) ? value : 0} locales="en-US" format={{ style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }} />;
}

export const Amount = ({ value, symbol }: { value: number; symbol?: string }) => (
  <>
    {formatNumber(value, { compact: value > 99_999 })}
    {symbol && (
      <Box component="span" sx={{ color: 'fg-3', ml: '4px' }}>
        {symbol}
      </Box>
    )}
  </>
);

/** Pro health ramp: 7 steps from red (<1.05) to green (≥3). */
export function healthToken(hf: number): TokenName {
  if (!Number.isFinite(hf) || hf >= 3) return 'health-7';
  if (hf >= 2) return 'health-6';
  if (hf >= 1.5) return 'health-5';
  if (hf >= 1.25) return 'health-4';
  if (hf >= 1.1) return 'health-3';
  if (hf >= 1.05) return 'health-2';
  return 'health-1';
}

export function HealthFactor({ value, animate = true, size }: { value: number; animate?: boolean; size?: string }) {
  const color = tv(healthToken(value));
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color, fontSize: size, fontVariantNumeric: 'tabular-nums', transition: 'color 300ms ease' }}>
      <Box component="span" sx={{ width: '0.5em', height: '0.5em', borderRadius: '50%', bgcolor: 'currentColor', boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 20%, transparent)` }} />
      {Number.isFinite(value) && animate ? (
        <NumberFlow value={Math.floor(value * 100) / 100} locales="en-US" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
      ) : (
        formatHealthFactor(value)
      )}
    </Box>
  );
}

/** Horizontal health bar used on position pages and in modals. */
export function HealthBar({ value }: { value: number }) {
  const pos = Number.isFinite(value) ? Math.min(Math.max((value - 1) / 2, 0), 1) * 100 : 100;
  return (
    <Box sx={{ position: 'relative', height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${tv('health-1')}, ${tv('health-3')} 25%, ${tv('health-5')} 55%, ${tv('health-7')})` }}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: `${pos}%`,
          width: 14,
          height: 14,
          borderRadius: '50%',
          bgcolor: 'bg-3',
          border: `3px solid ${tv(healthToken(value))}`,
          transform: 'translate(-50%, -50%)',
          transition: `left 600ms ${motion.easing.smooth}, border-color 300ms ease`,
          boxShadow: `0 1px 3px ${tv('shadow-medium')}`,
        }}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Icons: chain, hub, market (neutral shapes, no third-party logos)
// ---------------------------------------------------------------------------------------------

const CHAIN_LOGOS = new Set(['ethereum', 'base', 'avalanche', 'arc', 'optimism']);

export function ChainIcon({ chain, size = 16 }: { chain?: ChainInfo; size?: number }) {
  if (!chain) return null;
  if (CHAIN_LOGOS.has(chain.slug)) {
    return (
      <Tooltip title={chain.name}>
        <Box component="img" src={`/chain-icons/${chain.slug}.svg`} alt={chain.name} sx={{ width: size, height: size, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
      </Tooltip>
    );
  }
  return (
    <Tooltip title={chain.name}>
      <Box
        component="span"
        sx={{ width: size, height: size, borderRadius: `${size * 0.28}px`, bgcolor: chain.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.55, fontWeight: 700, flexShrink: 0 }}
      >
        {chain.name[0]}
      </Box>
    </Tooltip>
  );
}

export function HubMarketIcon({ kind, label, size = 28 }: { kind: 'hub' | 'market'; label: string; size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: kind === 'hub' ? '50%' : `${size * 0.3}px`,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: kind === 'hub' ? 'purple-1' : 'fg-2',
        bgcolor: kind === 'hub' ? `color-mix(in srgb, ${tv('purple-1')} 14%, transparent)` : 'bg-5',
        fontSize: size * 0.42,
        fontWeight: 600,
        boxShadow: `inset 0 0 0 1px ${tv('border-1')}`,
      }}
      aria-hidden
    >
      {label.slice(0, kind === 'hub' ? 1 : 2).toUpperCase()}
    </Box>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'purple' | 'green' | 'warning' }) {
  const bg = { neutral: tv('bg-5'), purple: `color-mix(in srgb, ${tv('purple-1')} 14%, transparent)`, green: `color-mix(in srgb, ${tv('data-green')} 14%, transparent)`, warning: `color-mix(in srgb, ${tv('yellow-1')} 18%, transparent)` }[tone];
  const color = { neutral: tv('fg-2'), purple: tv('purple-1'), green: tv('data-green'), warning: tv('fg-1') }[tone];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: 22, px: '0.5rem', borderRadius: '10rem', bgcolor: bg, color, fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
      {children}
    </Box>
  );
}

export function ProEmpty({ title, description, action, titleAs = 'p' }: { title: string; description: string; action?: React.ReactNode; /** 'h1' when the empty state is the whole page (not found). */ titleAs?: 'h1' | 'h2' | 'h3' | 'p' }) {
  return (
    <ProCard sx={{ py: 10, px: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1, animation: 'clone-fade-up 260ms ease both' }}>
      <Typography component={titleAs} sx={{ fontWeight: 500, fontSize: '0.9375rem' }}>{title}</Typography>
      <Typography sx={{ color: 'fg-3', fontSize: '0.875rem', maxWidth: 360 }}>{description}</Typography>
      {action && <Box sx={{ mt: 3 }}>{action}</Box>}
    </ProCard>
  );
}

// ---------------------------------------------------------------------------------------------
// Table: sticky first column, sortable headers (fade-in sort icon), 72px rows, cards on mobile
// ---------------------------------------------------------------------------------------------

export interface Column<T> {
  key: string;
  label: React.ReactNode;
  tooltip?: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  align?: 'left' | 'right';
  width?: number | string;
  hideOnMobile?: boolean;
}

export function ProTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  actions,
  defaultSort,
  loading,
  empty,
  dense,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (r: T) => string;
  onRowClick?: (r: T) => void;
  actions?: (r: T) => React.ReactNode;
  defaultSort?: { key: string; desc: boolean };
  loading?: boolean;
  empty?: React.ReactNode;
  dense?: boolean;
}) {
  const [sort, setSort] = React.useState<{ key: string; desc: boolean } | null>(defaultSort ?? null);
  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const d = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x as number) - (y as number);
      return sort.desc ? -d : d;
    });
  }, [rows, sort, columns]);

  const toggle = (key: string) => setSort((s) => (!s || s.key !== key ? { key, desc: true } : s.desc ? { key, desc: false } : null));
  const template = `${columns.map((c, i) => (c.width ? (typeof c.width === 'number' ? `${c.width}px` : c.width) : i === 0 ? 'minmax(180px, 1.4fr)' : 'minmax(110px, 1fr)')).join(' ')}${actions ? ' auto' : ''}`;
  const rowH = dense ? 60 : 72;

  return (
    <ProCard sx={{ p: { xs: '0.25rem 0.75rem', sm: '0.5rem 1.25rem' }, overflowX: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: template, alignItems: 'center', columnGap: '1rem', height: 44, borderBottom: `1px solid ${tv('border-0')}`, minWidth: 'max-content' }}>
        {columns.map((c) => {
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                gap: '0.4em',
                border: 0,
                background: 'none',
                p: 0,
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                fontSize: '0.6875rem',
                fontWeight: 500,
                color: active ? 'fg-1' : 'fg-3',
                cursor: sortable ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
                transition: 'color 70ms',
                '&:hover': sortable ? { color: 'fg-1' } : undefined,
                '&:hover .sort, &:focus-visible .sort': { opacity: 1 },
                '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '2px', borderRadius: '4px' },
              }}
            >
              {c.label}
              {c.tooltip && (
                <Tooltip title={c.tooltip}>
                  <InfoIcon sx={{ fontSize: 12, color: 'fg-4' }} />
                </Tooltip>
              )}
              {sortable && (
                <Box component="svg" className="sort" viewBox="0 0 10 10" sx={{ width: 9, height: 9, opacity: active ? 1 : 0, transition: 'opacity 120ms ease, transform 160ms ease', transform: active && !sort!.desc ? 'rotate(180deg)' : 'none' }}>
                  <path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </Box>
              )}
            </Box>
          );
        })}
        {actions && <Box />}
      </Box>

      {loading ? (
        [0, 1, 2].map((i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: template }, alignItems: 'center', columnGap: '1rem', height: rowH, borderBottom: i < 2 ? `1px solid ${tv('border-0')}` : 'none' }}>
            {columns.map((c, j) => (
              <Box key={c.key} sx={{ display: j > 1 ? { xs: 'none', md: 'block' } : 'block' }}>
                <Skeleton width={j === 0 ? 140 : 80} height={14} sx={{ borderRadius: '10rem' }} />
              </Box>
            ))}
          </Box>
        ))
      ) : sorted.length === 0 ? (
        <Box sx={{ py: 6 }}>{empty}</Box>
      ) : (
        sorted.map((r, i) => (
          <Box
            key={rowKey(r)}
            onClick={onRowClick ? () => onRowClick(r) : undefined}
            onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(r) : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            role={onRowClick ? 'link' : undefined}
            sx={{
              display: { xs: 'flex', md: 'grid' },
              flexDirection: 'column',
              gap: { xs: '0.625rem', md: 0 },
              gridTemplateColumns: template,
              alignItems: { md: 'center' },
              columnGap: '1rem',
              minHeight: rowH,
              py: { xs: '0.875rem', md: 0 },
              px: { md: '0.5rem' },
              mx: { md: '-0.5rem' },
              borderRadius: { md: '0.5rem' },
              borderBottom: { xs: i < sorted.length - 1 ? `1px solid ${tv('border-0')}` : 'none', md: 'none' },
              position: 'relative',
              cursor: onRowClick ? 'pointer' : 'default',
              fontSize: '0.875rem',
              minWidth: { md: 'max-content' },
              transition: 'background-color 120ms ease',
              animation: `clone-fade-up 280ms ${Math.min(i * 25, 250)}ms ease both`,
              '&:hover': onRowClick ? { bgcolor: 'table-item-hover' } : undefined,
              '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '-2px' },
              '& + &::before': { content: '""', display: { xs: 'none', md: 'block' }, position: 'absolute', top: 0, left: '0.5rem', right: '0.5rem', height: '1px', bgcolor: 'border-0' },
              '&:hover::before, &:hover + &::before': { opacity: 0 },
            }}
          >
            {columns.map((c, j) => (
              <Box
                key={c.key}
                sx={{
                  display: { xs: j > 0 && c.hideOnMobile ? 'none' : 'flex', md: 'flex' },
                  justifyContent: { xs: j === 0 ? 'flex-start' : 'space-between', md: c.align === 'right' ? 'flex-end' : 'flex-start' },
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: 0,
                }}
              >
                {j > 0 && (
                  <Typography component="span" sx={{ display: { xs: 'inline', md: 'none' }, color: 'fg-3', fontSize: '0.8125rem' }}>
                    {c.label}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, textAlign: c.align === 'right' ? 'right' : 'left' }}>{c.render(r)}</Box>
              </Box>
            ))}
            {actions && (
              <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', mt: { xs: 1, md: 0 } }}>
                {actions(r)}
              </Box>
            )}
          </Box>
        ))
      )}
    </ProCard>
  );
}

export function AssetCell({ symbol, name, sub }: { symbol: string; name?: string; sub?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
      <TokenIcon symbol={symbol} size={32} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{name ?? symbol}</Typography>
        {sub !== undefined ? (
          <Typography component="div" sx={{ color: 'fg-3', fontSize: '0.8125rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {sub}
          </Typography>
        ) : (
          name && <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>{symbol}</Typography>
        )}
      </Box>
    </Box>
  );
}


/** Thin "capacity filled" bar used in explore tables. */
export function CapacityBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  const color = pct >= 99.99 ? tv('red-1') : pct >= 90 ? tv('yellow-1') : tv('purple-1');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Box sx={{ width: 56, height: 4, borderRadius: 2, bgcolor: 'bg-6', overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 2, transition: `width 600ms ${motion.easing.smooth}` }} />
      </Box>
      <span>{pct > 0 && pct < 0.01 ? '<0.01%' : `${pct.toFixed(2)}%`}</span>
    </Box>
  );
}
