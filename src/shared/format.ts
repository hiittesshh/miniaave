/**
 * Number formatting that follows the reference app's FormattedNumber rules:
 * - Percent values are fractions (0.0345 → "3.45").
 * - Default decimals: 0 for exactly zero; 2 for values ≥ 1, percentages and USD; 7 otherwise.
 * - Tiny non-zero values render as "<0.01" (or "<0.0000001").
 * - Compact notation (K/M/B/T) when asked, or automatically above 99,999.
 * Formatting is en-US.
 */

export interface FormatOptions {
  decimals?: number;
  /** true forces compact, false forbids it, undefined = auto above 99,999. */
  compact?: boolean;
  percent?: boolean;
  usd?: boolean;
}

export interface FormattedParts {
  /** "<" when the value is below the smallest displayable amount. */
  prefix: string;
  value: string;
  postfix: string;
}

const POSTFIXES = ['', 'K', 'M', 'B', 'T', 'P', 'E', 'Z', 'Y'];

export function defaultDecimals(value: number, opts: FormatOptions) {
  if (value === 0) return 0;
  if (Math.abs(value) >= 1 || opts.percent || opts.usd) return 2;
  return 7;
}

export function formatParts(raw: number, opts: FormatOptions = {}): FormattedParts {
  let value = Number.isFinite(raw) ? raw : 0;
  if (opts.percent) value *= 100;
  const decimals = opts.decimals ?? defaultDecimals(value, opts);
  const min = decimals > 0 ? Math.pow(10, -decimals) : 1;

  if (value !== 0 && Math.abs(value) < min) {
    return {
      prefix: '<',
      value: min.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
      postfix: '',
    };
  }

  const useCompact = opts.compact === true || (opts.compact !== false && Math.abs(value) > 99_999);
  let postfix = '';
  if (useCompact && Math.abs(value) >= 1000) {
    const tier = Math.min(Math.floor(Math.log10(Math.abs(value)) / 3), POSTFIXES.length - 1);
    value = value / Math.pow(1000, tier);
    postfix = POSTFIXES[tier];
    // Rounding can push 999.995K to "1,000.00K"; bump the tier instead.
    if (Math.abs(Number(value.toFixed(decimals))) >= 1000 && tier + 1 < POSTFIXES.length) {
      value /= 1000;
      postfix = POSTFIXES[tier + 1];
    }
  }

  const minFrac = Math.abs(value) >= 1 || opts.usd || opts.percent || postfix ? decimals : 0;
  return {
    prefix: '',
    value: value.toLocaleString('en-US', {
      minimumFractionDigits: Math.min(minFrac, decimals),
      maximumFractionDigits: decimals,
    }),
    postfix,
  };
}

/** Plain string: formatNumber(1234567, { compact: true }) → "1.23M". */
export function formatNumber(value: number, opts: FormatOptions = {}): string {
  const p = formatParts(value, opts);
  return `${p.prefix}${opts.usd ? '$' : ''}${p.value}${p.postfix}${opts.percent ? '%' : ''}`;
}

/** Pro tables use lowercase compact suffixes: "680.56k", "$423.60m". */
export function formatLowerCompact(value: number, opts: FormatOptions = {}): string {
  // The live Pro tables compact from 1,000 ("43.59K ETH", "$108.96M"), not from 100,000. The
  // 2026-10-13 live capture uses uppercase suffixes (an earlier screenshot showed lowercase).
  return formatNumber(value, { ...opts, compact: opts.compact ?? Math.abs(value) >= 1000 });
}

export const formatUSD = (value: number, opts: Omit<FormatOptions, 'usd'> = {}) => formatNumber(value, { ...opts, usd: true });
export const formatPercent = (fraction: number, decimals = 2) => formatNumber(fraction, { percent: true, decimals });

/** Health factor display: rounded DOWN to 2 decimals, "∞" for no debt. */
export function formatHealthFactor(hf: number): string {
  if (!Number.isFinite(hf)) return '∞';
  const floored = Math.floor(hf * 100) / 100;
  return formatNumber(floored, { decimals: 2, compact: floored > 99_999 });
}

/** Converts a user-typed string to a number ("1,234.5" → 1234.5). Empty/invalid → 0. */
export function parseAmount(input: string): number {
  const n = Number(input.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Keeps only a valid decimal number string with at most `decimals` fraction digits. */
export function sanitizeAmountInput(input: string, decimals: number): string {
  let s = input.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  if (s.startsWith('.')) s = `0${s}`;
  const [int, frac] = s.split('.');
  const cleanInt = int.replace(/^0+(?=\d)/, '');
  return frac !== undefined ? `${cleanInt}.${frac.slice(0, Math.min(decimals, 12))}` : cleanInt;
}

/** "September 18, 2026" */
export const formatDateHeading = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/** "03:07 PM" */
export const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
