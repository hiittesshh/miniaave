'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import NumberFlow from '@number-flow/react';
import * as React from 'react';
import { formatHealthFactor } from '@/shared/format';
import { SearchIcon, XCircleIcon } from '@/shared/ui/Icons';
import { useWallet } from '@/shared/state/wallet';
import { tv } from '@/shared/theme/tokens';
import { transition } from '@/shared/theme/motion';

/** Reference colour rules: ≥3 green, <1.1 red, otherwise amber. ∞ (no debt) in green. */
export function hfColor(hf: number) {
  if (!Number.isFinite(hf) || hf >= 3) return 'success.main';
  if (hf < 1.1) return 'error.main';
  return 'warning.main';
}

export function HealthFactorNumber({ value, animate, ...typo }: { value: number; animate?: boolean } & Omit<TypographyProps, 'children'>) {
  const finite = Number.isFinite(value);
  return (
    <Typography component="span" variant="h5" {...typo} sx={{ color: hfColor(value), whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...typo.sx }}>
      {finite && animate ? (
        <NumberFlow value={Math.floor(value * 100) / 100} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} locales="en-US" />
      ) : (
        formatHealthFactor(value)
      )}
    </Typography>
  );
}

export function EmptyStatePaper({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: '3rem 1rem', flex: 1, borderRadius: '0.625rem', animation: 'clone-fade-up 300ms ease both' }}
    >
      <Typography variant="h5" color="fg-1" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Typography variant="description" color="fg-3" sx={{ lineHeight: '1.1875rem', mb: action ? 6 : 0, maxWidth: 360 }}>
        {description}
      </Typography>
      {action}
    </Paper>
  );
}

export function ConnectWalletPaper({ description = 'Connect your wallet to see your supplies, borrowings, and open positions.' }: { description?: string }) {
  const openConnect = useWallet((s) => s.openConnect);
  const connecting = useWallet((s) => s.connectOpen);
  return (
    <EmptyStatePaper
      title="No Wallet Connected"
      description={description}
      action={
        connecting ? (
          <CircularProgress size={24} sx={{ color: 'fg-3' }} />
        ) : (
          <Button variant="outlined" onClick={openConnect}>
            Connect Wallet
          </Button>
        )
      }
    />
  );
}

export function NoSearchResults({ term, subtitle, action }: { term?: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', py: 15, px: 4, textAlign: 'center', animation: 'clone-fade-up 260ms ease both' }}>
      <Typography variant="h5" color="fg-max" noWrap sx={{ maxWidth: '100%' }}>
        {term ? `No search results for '${term}'` : 'No search results'}
      </Typography>
      <Typography variant="description" color="fg-3" sx={{ maxWidth: 280, lineHeight: '1.1875rem' }}>
        {subtitle}
      </Typography>
      {action}
    </Box>
  );
}

export function SearchInput({ value, onChange, placeholder, width = 340, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; width?: number; autoFocus?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: { xs: '100%', sm: width },
        height: 36,
        borderRadius: '0.5rem',
        boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}`,
        transition: transition(['background-color', 'box-shadow']),
        '&:focus-within': { bgcolor: 'bg-3', boxShadow: `0 0 0 1px ${tv('fg-4')}` },
      }}
    >
      <SearchIcon sx={{ fontSize: 18, color: 'fg-icon', ml: 2, flexShrink: 0 }} />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputProps={{ 'aria-label': placeholder }}
        sx={{ flex: 1, mx: 2, fontSize: { xs: '1rem', sm: '0.875rem' }, '& input::placeholder': { color: 'fg-3', opacity: 1 } }}
      />
      {value && (
        <Box component="button" type="button" aria-label="Clear search" onClick={() => onChange('')} sx={{ border: 0, background: 'none', p: 0, mr: 2, cursor: 'pointer', color: 'fg-3', display: 'flex', '&:hover': { color: 'fg-2' } }}>
          <XCircleIcon sx={{ fontSize: 16 }} />
        </Box>
      )}
    </Box>
  );
}

/** Debounced value (the reference debounces search by 300ms). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Cap ring (reference CapsCircularStatus): green, amber at ≥98%, red at 100%. */
export function CapsCircularStatus({ value, tooltip, color }: { value: number; tooltip: React.ReactNode; color?: string }) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  const stroke = color ?? (pct >= 99.99 ? tv('red-1') : pct >= 98 ? tv('yellow-1') : tv('data-green'));
  const r = 37;
  const c = 2 * Math.PI * r;
  const shown = pct > 0 ? Math.max(pct, 2) : 0;
  return (
    <Tooltip title={<Box sx={{ fontSize: '0.75rem' }}>{tooltip}</Box>}>
      <Box sx={{ position: 'relative', width: 80, height: 80, mr: 4, flexShrink: 0 }} tabIndex={0} aria-label={`${pct.toFixed(2)}% of cap used`}>
        <Box component="svg" viewBox="0 0 80 80" sx={{ width: 80, height: 80, transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="2" style={{ stroke: tv('bg-6') }} />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - shown / 100)}
            style={{ stroke, transition: 'stroke-dashoffset 900ms cubic-bezier(0.19, 1, 0.22, 1)' }}
          />
        </Box>
        <Typography variant="h5" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem' }}>
          {pct >= 99.99 ? '100%' : pct > 0 && pct < 0.01 ? '<0.01%' : `${pct.toFixed(2)}%`}
        </Typography>
      </Box>
    </Tooltip>
  );
}
