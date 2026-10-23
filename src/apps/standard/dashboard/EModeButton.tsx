'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import type { MarketSnapshot, UserMarketState } from '@/data/types';
import { BoltIcon, SettingsIcon } from '@/shared/ui/Icons';
import { tv } from '@/shared/theme/tokens';
import { useStdModal } from '../state';

const GRADIENT = `linear-gradient(248.86deg, #B6509E 10.51%, #2EBAC6 93.41%)`;

/** Dashboard "E-Mode" trigger + info menu (reference DashboardEModeButton). */
export function EModeButton({ snap, user }: { snap: MarketSnapshot; user: UserMarketState }) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const open = useStdModal((s) => s.open);
  const cat = snap.eModes.find((e) => e.id === user.eModeCategoryId);
  const enabled = Boolean(cat);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <Typography variant="description" color="fg-2" sx={{ mr: 1 }}>
        E-Mode
      </Typography>
      <Button
        variant="outlined"
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="true"
        aria-expanded={anchor ? 'true' : undefined}
        sx={{
          ml: 1,
          borderRadius: '4px',
          height: { xs: '2.25rem', xsm: '1.75rem' },
          px: { xs: '0.88rem', xsm: '0.62rem' },
          gap: '4px',
          ...(enabled && {
            background: `${GRADIENT} !important`,
            '&::after': { content: '""', position: 'absolute', inset: '1px', borderRadius: '3px', bgcolor: 'bg-3', zIndex: -1 },
          }),
        }}
      >
        {enabled ? (
          <Box component="svg" viewBox="0 0 24 24" sx={{ width: 12, height: 12 }}>
            <defs>
              <linearGradient id="emode-g" x1="0" x2="1" y1="0" y2="1">
                <stop stopColor="#B6509E" />
                <stop offset="1" stopColor="#2EBAC6" />
              </linearGradient>
            </defs>
            <path d="M13 2.5L5 13.5h6l-1 8 8-11h-6l1-8z" fill="url(#emode-g)" />
          </Box>
        ) : (
          <BoltIcon sx={{ fontSize: 12, color: 'fg-3' }} />
        )}
        <Typography
          variant="buttonM"
          sx={enabled ? { background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : { color: 'fg-2' }}
        >
          {cat ? cat.label : 'Disabled'}
        </Typography>
        <SettingsIcon sx={{ fontSize: 12, color: 'fg-2' }} />
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { maxWidth: 280 } } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 4, pt: 2, pb: 3 }}>
          <Typography variant="subheader1" sx={{ mb: enabled ? 3 : 1 }}>
            Efficiency mode (E-Mode)
          </Typography>
          {cat && (
            <>
              <Typography variant="caption" color="fg-2" sx={{ mb: 1 }}>
                Asset category
              </Typography>
              <Box sx={{ p: 2, mb: 3, borderRadius: '6px', border: `1px solid ${tv('border-2')}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subheader2">{cat.label}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main', boxShadow: '0 0 0 2px color-mix(in srgb, currentColor 0%, transparent)' }} />
                  <Typography variant="subheader2" color="success.main">
                    Enabled
                  </Typography>
                </Box>
              </Box>
            </>
          )}
          <Typography variant="caption" color="fg-2" component="p" sx={{ mb: 4 }}>
            E-Mode increases your LTV for a selected category of assets.
          </Typography>
          <Button
            fullWidth
            size="small"
            variant={enabled ? 'tertiary' : 'contained'}
            onClick={() => {
              setAnchor(null);
              open({ type: 'emode', marketId: snap.market.id });
            }}
          >
            {enabled ? 'Manage E-Mode' : 'Enable E-Mode'}
          </Button>
        </Box>
      </Menu>
    </Box>
  );
}
