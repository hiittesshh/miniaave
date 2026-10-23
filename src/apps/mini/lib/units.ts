/**
 * Tiny local BigInt unit helpers (no viem in this project). Same semantics as viem's
 * formatUnits / parseUnits / maxUint256, which the frontend guide (§4) uses.
 */

export const MAX_UINT256 = 2n ** 256n - 1n;

/** 10n ** BigInt(decimals) */
export const pow10 = (decimals: number) => 10n ** BigInt(decimals);

/** BigInt with hidden decimals → plain decimal string ("1234.5", "-0.01", "1"). */
export function formatUnits(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = pow10(decimals);
  const whole = abs / base;
  let fraction = decimals > 0 ? (abs % base).toString().padStart(decimals, '0') : '';
  fraction = fraction.replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toString()}${fraction ? `.${fraction}` : ''}`;
}

/**
 * Decimal string → BigInt with `decimals` hidden decimals. Extra fraction digits are cut off
 * (viem rounds; the UI never lets the user type more than `decimals` digits anyway).
 * Throws on anything that is not a plain decimal number.
 */
export function parseUnits(value: string, decimals: number): bigint {
  const v = value.trim();
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(v)) throw new Error(`Invalid number: "${value}"`);
  const negative = v.startsWith('-');
  const [whole = '0', fraction = ''] = v.replace('-', '').split('.');
  const frac = fraction.slice(0, decimals).padEnd(decimals, '0');
  const result = BigInt(whole || '0') * pow10(decimals) + BigInt(frac || '0');
  return negative ? -result : result;
}

/** Keeps a text input a valid partial decimal with at most `decimals` fraction digits. */
export function sanitizeDecimalInput(raw: string, decimals: number): string {
  let v = raw.replace(',', '.').replace(/[^\d.]/g, '');
  const dot = v.indexOf('.');
  if (dot >= 0) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '').slice(0, decimals);
  if (v.startsWith('.')) v = `0${v}`;
  return v;
}

export const minBig = (a: bigint, b: bigint) => (a < b ? a : b);
export const maxBig = (a: bigint, b: bigint) => (a > b ? a : b);
