import { describe, expect, it } from 'vitest';
import { formatLowerCompact, formatHealthFactor, formatNumber, formatPercent, formatUSD, parseAmount, sanitizeAmountInput } from '../format';

describe('formatNumber (reference FormattedNumber rules)', () => {
  it('uses 2 decimals for values ≥ 1 and 7 below 1', () => {
    expect(formatNumber(4)).toBe('4.00');
    expect(formatNumber(0.015)).toBe('0.015');
    expect(formatNumber(0)).toBe('0');
  });
  it('compacts automatically above 99,999', () => {
    expect(formatNumber(99_999)).toBe('99,999.00');
    expect(formatNumber(1_234_567)).toBe('1.23M');
    expect(formatUSD(4_250_000_000)).toBe('$4.25B');
    expect(formatNumber(1_234_567, { compact: false })).toBe('1,234,567.00');
  });
  it('shows "<" for tiny values', () => {
    expect(formatUSD(0.001)).toBe('<$0.01');
    expect(formatPercent(0.00001)).toBe('<0.01%');
  });
  it('formats percentages from fractions', () => {
    expect(formatPercent(0.0345)).toBe('3.45%');
  });
  it('bumps the compact tier when rounding reaches 1000', () => {
    expect(formatNumber(999_999, { compact: true })).toBe('1.00M');
  });
});

describe('Pro compact', () => {
  it('compacts from 1,000 with uppercase suffixes (live capture)', () => {
    expect(formatLowerCompact(680_560)).toBe('680.56K');
    expect(formatLowerCompact(423_600_000, { usd: true })).toBe('$423.60M');
    expect(formatLowerCompact(70.6)).toBe('70.60');
    expect(formatLowerCompact(52_180)).toBe('52.18K');
  });
});

describe('health factor display', () => {
  it('rounds down and shows ∞ without debt', () => {
    expect(formatHealthFactor(1.889)).toBe('1.88');
    expect(formatHealthFactor(Infinity)).toBe('∞');
  });
});

describe('amount input helpers', () => {
  it('sanitizes typed input', () => {
    expect(sanitizeAmountInput('1,234.5678', 2)).toBe('1234.56');
    expect(sanitizeAmountInput('.5', 6)).toBe('0.5');
    expect(sanitizeAmountInput('00012', 6)).toBe('12');
    expect(sanitizeAmountInput('1.2.3', 6)).toBe('1.23');
    expect(sanitizeAmountInput('abc', 6)).toBe('');
  });
  it('parses to a number', () => {
    expect(parseAmount('1,000.5')).toBe(1000.5);
    expect(parseAmount('')).toBe(0);
  });
});
