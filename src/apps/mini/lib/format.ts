/**
 * The frontend guide's display helpers (§4), on the local BigInt helpers. Convert to Number only
 * at the very end, for display.
 */
import { MAX_UINT256, formatUnits } from './units';

/** Token amount → "1,234.5678" */
export const fmtToken = (v: bigint, decimals: number, dp = 4) =>
  Number(formatUnits(v, decimals)).toLocaleString('en-US', { maximumFractionDigits: dp });

/** USD (8 decimals) → "$1,234.56" */
export const fmtUsd = (v: bigint) =>
  '$' + Number(formatUnits(v, 8)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Health factor (WAD) → "1.13" or "∞" */
export const fmtHealth = (hf: bigint) => (hf === MAX_UINT256 ? '∞' : Number(formatUnits(hf, 18)).toFixed(2));

/** Rate (WAD APR) → APY in percent, as Aave's UI shows it */
export const aprToApyPercent = (rateWad: bigint) => {
  const apr = Number(formatUnits(rateWad, 18));
  return (Math.pow(1 + apr / 31536000, 31536000) - 1) * 100;
};

/** "2.25%" from aprToApyPercent's number. */
export const fmtPercent = (pct: number, dp = 2) => `${pct.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}%`;

/** Utilization (WAD) → "50.00%" (formatUnits(x, 16) + "%"). */
export const fmtWadPercent = (v: bigint, dp = 2) => fmtPercent(Number(formatUnits(v, 16)), dp);

/** BPS → "80%" (Number(x) / 100 + "%"). */
export const fmtBps = (bps: number) => `${(bps / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;

/** Health-factor colour band (§7): ≥ 1.5 green · 1.1–1.5 amber · below 1.1 red. */
export type HealthBand = 'safe' | 'warn' | 'danger';
export const healthBand = (hf: bigint): HealthBand => {
  if (hf === MAX_UINT256 || hf >= 15n * 10n ** 17n) return 'safe';
  if (hf >= 11n * 10n ** 17n) return 'warn';
  return 'danger';
};

/** "0x7099…79C8" */
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
