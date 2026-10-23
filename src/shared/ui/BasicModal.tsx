'use client';

import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Paper from '@mui/material/Paper';
import type { SxProps, Theme } from '@mui/material/styles';
import * as React from 'react';
import { ScaleFade } from '@/shared/theme/ScaleFade';
import { motion } from '@/shared/theme/motion';
import { CloseIcon } from './Icons';

/**
 * Centred modal card. Shell measurements follow the reference (24px padding, 12px radius,
 * max 420px wide, 359px on phones, 30px close X at top-right). The reference does not animate
 * its modals yet; we use its reserved 200ms `motion.modal` token for a subtle scale-fade.
 */
export function BasicModal({
  open,
  onClose,
  children,
  maxWidth = 420,
  hideClose = false,
  labelledBy,
  paperSx,
  closeLabel = 'Close',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  hideClose?: boolean;
  labelledBy?: string;
  paperSx?: SxProps<Theme>;
  closeLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      slotProps={{ backdrop: { transitionDuration: motion.duration.modal } }}
    >
      <ScaleFade in={open} timeout={{ enter: motion.duration.modal, exit: 140 }} fromScale={0.97} easing={motion.easing.smooth}>
        <Paper
          variant="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          sx={[
            {
              position: 'relative',
              m: '10px',
              width: '100%',
              maxWidth: { xs: 359, xsm: maxWidth },
              maxHeight: 'calc(100dvh - 20px)',
              overflowY: 'auto',
              p: 6,
              outline: 'none',
            },
            ...(Array.isArray(paperSx) ? paperSx : paperSx ? [paperSx] : []),
          ]}
        >
          {!hideClose && (
            <IconButton
              aria-label={closeLabel}
              onClick={onClose}
              sx={{ position: 'absolute', top: 21, right: 24, zIndex: 5, p: 0, borderRadius: '0.375rem', color: 'fg-3', '&:hover': { color: 'fg-1', bgcolor: 'button-hover' } }}
            >
              <CloseIcon sx={{ fontSize: 30 }} />
            </IconButton>
          )}
          {children}
        </Paper>
      </ScaleFade>
    </Modal>
  );
}
