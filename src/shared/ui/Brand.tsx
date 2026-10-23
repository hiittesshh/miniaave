'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { tv } from '@/shared/theme/tokens';

/**
 * Neutral placeholder brand. Deliberately NOT the Aave logo or ghost mark: a plain rounded
 * square with two bars, plus the words "Aave Clone".
 */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      aria-hidden
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    >
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill="currentColor" />
      <rect x="6.5" y="7" width="3.2" height="10" rx="1.6" fill={tv('bg-1')} />
      <rect x="14.3" y="7" width="3.2" height="10" rx="1.6" fill={tv('bg-1')} opacity="0.55" />
    </Box>
  );
}

export function BrandLockup({ compact = false, suffix }: { compact?: boolean; suffix?: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'fg-1' }} aria-label="Aave Clone, demo">
      <BrandMark />
      {!compact && (
        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          Aave Clone
          {suffix && (
            <Box component="span" sx={{ ml: '0.35rem', color: 'purple-1', fontWeight: 600 }}>
              {suffix}
            </Box>
          )}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Always-visible demo disclaimer chip. Shown in both apps' headers so nobody mistakes this for
 * the real product. Expanded explanation in a tooltip.
 */
export function DemoBadge({ dense = false }: { dense?: boolean }) {
  return (
    <Tooltip
      title={
        <Box sx={{ maxWidth: 260 }}>
          <Typography variant="subheader2" sx={{ mb: 1 }}>
            This is a frontend demo
          </Typography>
          <Typography variant="caption" color="fg-2" component="p">
            Every number is simulated. There is no wallet connection, no blockchain and no real money. Not affiliated with or endorsed
            by Aave.
          </Typography>
        </Box>
      }
    >
      <Box
        tabIndex={0}
        role="note"
        aria-label="Demo, simulated data, not affiliated with Aave"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          height: dense ? 22 : 26,
          px: dense ? '0.5rem' : '0.625rem',
          borderRadius: '999px',
          bgcolor: `color-mix(in srgb, ${tv('yellow-1')} 14%, transparent)`,
          color: 'fg-1',
          fontSize: dense ? '0.6875rem' : '0.75rem',
          fontWeight: 500,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          cursor: 'help',
          outline: 'none',
          '&:focus-visible': { outline: `2px solid ${tv('fg-1')}`, outlineOffset: '2px' },
        }}
      >
        <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'yellow-1', flexShrink: 0 }} />
        <span>Demo</span>
        <Box component="span" sx={{ color: 'fg-3', display: dense ? 'none' : { xs: 'none', xl: 'inline' } }}>
          · simulated data · not affiliated with Aave
        </Box>
      </Box>
    </Tooltip>
  );
}
