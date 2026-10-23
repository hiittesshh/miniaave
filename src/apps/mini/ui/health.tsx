'use client';

/**
 * Health-factor gauge on Pro's --health-1…7 ramp, with the guide's colour rules (§7): ≥ 1.5 green,
 * 1.1–1.5 amber, below 1.1 red, below 1 "Can be liquidated", ∞ with no debt.
 * A half-circle from HF 0.8 to 3.0: the three bands are painted as arc segments, a marker slides
 * along the arc (Pro's smooth easing) and the value counts with NumberFlow.
 */
import Box from '@mui/material/Box';
import NumberFlow from '@number-flow/react';
import { tv } from '@/shared/theme/tokens';
import { motion } from '@/shared/theme/motion';

const MIN = 0.8;
const MAX = 3;
const R = 80;
const CX = 100;
const CY = 96;

const bandOf = (hf: number) => (!Number.isFinite(hf) || hf >= 1.5 ? 'safe' : hf >= 1.1 ? 'warn' : 'danger');
export const HEALTH_TOKEN = { safe: 'health-6', warn: 'health-3', danger: 'health-1' } as const;

/** Angle in degrees along the half circle: 180 = left end (HF 0.8), 0 = right end (HF ≥ 3 or ∞). */
const angleOf = (hf: number) => 180 - (Math.min(Math.max(Number.isFinite(hf) ? hf : MAX, MIN), MAX) - MIN) / (MAX - MIN) * 180;
const point = (deg: number) => [CX + R * Math.cos((deg * Math.PI) / 180), CY - R * Math.sin((deg * Math.PI) / 180)] as const;
const arc = (from: number, to: number) => {
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
};

export function HealthGauge({ hf, loading = false }: { hf: number; loading?: boolean }) {
  const band = bandOf(hf);
  const color = tv(HEALTH_TOKEN[band]);
  const a = angleOf(hf);
  const label = !Number.isFinite(hf) ? 'No debt' : hf < 1 ? 'Can be liquidated' : band === 'danger' ? 'Close to liquidation' : band === 'warn' ? 'Watch your position' : 'Safe';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} role="img" aria-label={`Health factor ${Number.isFinite(hf) ? hf.toFixed(2) : 'infinite'}: ${label}`}>
      <Box sx={{ position: 'relative', width: 200, height: 112 }}>
        <svg width={200} height={112} viewBox="0 0 200 112" aria-hidden>
          {/* bands: <1.1 red, 1.1–1.5 amber, ≥1.5 green (2px gaps between them) */}
          <path d={arc(180, angleOf(1.1) + 1)} fill="none" stroke={tv('health-1')} strokeWidth={10} strokeLinecap="round" opacity={0.85} />
          <path d={arc(angleOf(1.1) - 1, angleOf(1.5) + 1)} fill="none" stroke={tv('health-3')} strokeWidth={10} opacity={0.85} />
          <path d={arc(angleOf(1.5) - 1, 0)} fill="none" stroke={tv('health-6')} strokeWidth={10} strokeLinecap="round" opacity={0.85} />
          {/* liquidation line at HF 1 */}
          {(() => {
            const [x1, y1] = point(angleOf(1));
            const [x2, y2] = [CX + (R - 16) * Math.cos((angleOf(1) * Math.PI) / 180), CY - (R - 16) * Math.sin((angleOf(1) * Math.PI) / 180)];
            return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tv('fg-3')} strokeWidth={1.5} strokeDasharray="2 2" />;
          })()}
          {!loading && (
            <g style={{ transform: `rotate(${-a}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: `transform 700ms ${motion.easing.smooth}` }}>
              <circle cx={CX + R} cy={CY} r={9} fill={tv('bg-3')} stroke={color} strokeWidth={4} style={{ transition: 'stroke 300ms ease' }} />
            </g>
          )}
        </svg>
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 4, textAlign: 'center' }}>
          <Box sx={{ fontSize: 30, fontWeight: 500, lineHeight: '34px', color, transition: 'color 300ms ease', fontVariantNumeric: 'tabular-nums' }}>
            {loading ? '—' : Number.isFinite(hf) ? <NumberFlow value={Math.floor(hf * 100) / 100} locales="en-US" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} /> : '∞'}
          </Box>
        </Box>
      </Box>
      <Box sx={{ mt: '6px', fontSize: 14, fontWeight: 500, color: band === 'safe' ? 'fg-2' : color }}>{loading ? 'Health factor' : label}</Box>
      <Box sx={{ mt: '2px', fontSize: 12, color: 'fg-4' }}>Liquidation below 1.00</Box>
    </Box>
  );
}
