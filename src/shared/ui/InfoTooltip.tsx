'use client';

import Box from '@mui/material/Box';
import Tooltip, { type TooltipProps } from '@mui/material/Tooltip';
import * as React from 'react';
import { InfoIcon } from './Icons';
import { transition } from '@/shared/theme/motion';

/**
 * Label + ⓘ icon that opens a tooltip (reference TextWithTooltip). The icon is fg-3 at rest,
 * fg-2 on hover and fg-1 while open. Keyboard-focusable.
 */
export function InfoTooltip({
  title,
  children,
  placement = 'top',
  iconSize = 14,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  placement?: TooltipProps['placement'];
  iconSize?: number;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {children}
      <Tooltip
        title={<Box sx={{ fontSize: '0.75rem', lineHeight: '1.1rem' }}>{title}</Box>}
        placement={placement}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
      >
        <Box
          component="span"
          tabIndex={0}
          role="button"
          aria-label="More information"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setOpen((o) => !o);
            }
          }}
          sx={{
            display: 'inline-flex',
            cursor: 'pointer',
            color: open ? 'fg-1' : 'fg-3',
            transition: transition(['color']),
            '&:hover': { color: open ? 'fg-1' : 'fg-2' },
            borderRadius: '50%',
            '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: '2px' },
          }}
        >
          <InfoIcon sx={{ fontSize: iconSize }} />
        </Box>
      </Tooltip>
    </Box>
  );
}
