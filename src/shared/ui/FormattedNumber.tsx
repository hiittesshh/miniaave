'use client';

import Typography, { type TypographyProps } from '@mui/material/Typography';
import Box from '@mui/material/Box';
import NumberFlow from '@number-flow/react';
import { formatParts, type FormatOptions } from '@/shared/format';

/**
 * Number display following the reference's FormattedNumber rules (see src/shared/format.ts):
 * "$" prefix and "%" / symbol suffix with a 2px gap, compact above 99,999, "<0.01" for dust.
 */
export interface FormattedNumberProps extends Omit<TypographyProps, 'children'>, FormatOptions {
  value: number;
  /** Token symbol suffix ("ETH"). */
  symbol?: string;
  /** Colour of "$", "%" and the symbol (defaults to the number's colour). */
  symbolsColor?: string;
  /** Animate changes with NumberFlow (used for header stats after a transaction). */
  animate?: boolean;
}

export function FormattedNumber({
  value,
  decimals,
  compact,
  percent,
  usd,
  symbol,
  symbolsColor,
  animate,
  sx,
  ...typography
}: FormattedNumberProps) {
  const opts = { decimals, compact, percent, usd };
  const parts = formatParts(value, opts);
  const sym = (s: string, side: 'l' | 'r') => (
    <Box component="span" sx={{ color: symbolsColor ?? 'inherit', [side === 'l' ? 'mr' : 'ml']: '2px' }}>
      {s}
    </Box>
  );

  if (animate && parts.prefix === '') {
    return (
      <Typography component="span" {...typography} sx={{ display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap', ...sx }}>
        {usd && sym('$', 'l')}
        <AnimatedValue value={value} opts={opts} />
        {percent && sym('%', 'r')}
        {symbol && sym(symbol, 'r')}
      </Typography>
    );
  }

  return (
    <Typography component="span" {...typography} sx={{ display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap', ...sx }}>
      {parts.prefix}
      {usd && sym('$', 'l')}
      {parts.value}
      {parts.postfix}
      {percent && sym('%', 'r')}
      {symbol && sym(symbol, 'r')}
    </Typography>
  );
}

/** NumberFlow wrapper that reproduces our compact/decimal rules with Intl options. */
function AnimatedValue({ value, opts }: { value: number; opts: FormatOptions }) {
  const v = opts.percent ? value * 100 : value;
  const parts = formatParts(value, opts);
  const decimalsUsed = parts.value.includes('.') ? parts.value.split('.')[1].length : 0;
  const useCompact = parts.postfix !== '';
  return (
    <NumberFlow
      value={Number.isFinite(v) ? v : 0}
      format={{
        notation: useCompact ? 'compact' : 'standard',
        minimumFractionDigits: decimalsUsed,
        maximumFractionDigits: decimalsUsed,
      }}
      locales="en-US"
      willChange
    />
  );
}
