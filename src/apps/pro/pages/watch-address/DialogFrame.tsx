'use client';

/**
 * Live Pro dialog frame (Watch Address, WETH notice; measured 2026-10-14):
 * - backdrop #000 at 70% with blur(10px), fading in over 200ms
 * - desktop: centred, bg-2, 16px radius, 1px white-10% ring + `0 6px 32px` shadow-high, enterPop
 *   200ms (scale .96 → 1); its height eases over 0.3s (cubic-bezier(.19,1,.22,1)) when content grows
 * - mobile (< 600px): a sheet 16px from the left, right and bottom edges, sliding up over 300ms
 */
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';

export function DialogFrame({ open, onClose, labelledBy, width, children }: { open: boolean; onClose: () => void; labelledBy: string; width: number; children: React.ReactNode }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby={labelledBy}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)', animation: 'a3-fade 200ms ease both', '@keyframes a3-fade': { from: { opacity: 0 }, to: { opacity: 1 } } } } }}
    >
      <Box
        role="dialog"
        aria-modal
        aria-labelledby={labelledBy}
        sx={{
          position: 'fixed',
          outline: 'none',
          bgcolor: 'bg-2',
          borderRadius: '16px',
          boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}, 0 6px 32px ${tv('shadow-high')}`,
          color: 'fg-1',
          left: { xs: 16, sm: '50%' },
          right: { xs: 16, sm: 'auto' },
          bottom: { xs: 16, sm: 'auto' },
          top: { xs: 'auto', sm: '50%' },
          width: { xs: 'auto', sm: width },
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          transform: { xs: 'none', sm: 'translate(-50%, -50%)' },
          animation: { xs: 'a3-sheet 300ms cubic-bezier(0.32, 0.72, 0, 1) both', sm: 'a3-dialog 200ms ease both' },
          '@keyframes a3-dialog': { from: { opacity: 0, transform: 'translate(-50%, -48%) scale(0.96)' }, to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' } },
          '@keyframes a3-sheet': { from: { transform: 'translateY(100%) scale(0.96)' }, to: { transform: 'none' } },
        }}
      >
        {children}
      </Box>
    </Modal>
  );
}
