'use client';

/**
 * "WETH Is Displayed as ETH" notice shown when the ETH token page opens (live, 2026-10-14).
 * Desktop: 360px dialog centred, bg-2, radius 16, 1px white-10% ring + `0 6px 32px` shadow-high,
 * enterPop 200ms (scale .96 → 1, slight rise). Mobile: bottom sheet 16px from the edges, slides up
 * over 300ms. Backdrop #000 at 70% with blur(10px), fading in over 200ms.
 * Body: 44px ETH logo, 18/500 title, 14/19 fg-3 copy, rule, an 18px checkbox
 * "I understand, don't show this again." and a full-width "Got it" pill (bg-4).
 * Ticking the box persists the dismissal in this browser.
 */
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { BICheck } from './icons';

const KEY = 'aave-clone-pro-weth-notice-dismissed';

export function WethNotice() {
  const [open, setOpen] = React.useState(false);
  const [dontShow, setDontShow] = React.useState(false);
  React.useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === '1';
    } catch {
      /* storage unavailable: show the notice */
    }
    // Live shows the notice once the page has loaded.
    const t = setTimeout(() => !dismissed && setOpen(true), 300);
    return () => clearTimeout(t);
  }, []);
  const close = () => {
    if (dontShow) {
      try {
        localStorage.setItem(KEY, '1');
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  };
  return (
    <Modal
      open={open}
      onClose={close}
      aria-labelledby="weth-notice-title"
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)', animation: 'a3-fade 200ms ease both', '@keyframes a3-fade': { from: { opacity: 0 }, to: { opacity: 1 } } } } }}
    >
      <Box
        role="dialog"
        aria-modal
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
          width: { xs: 'auto', sm: 360 },
          transform: { xs: 'none', sm: 'translate(-50%, -50%)' },
          animation: { xs: 'a3-sheet 300ms cubic-bezier(0.32, 0.72, 0, 1) both', sm: 'a3-dialog 200ms ease both' },
          '@keyframes a3-dialog': { from: { opacity: 0, transform: 'translate(-50%, -48%) scale(0.96)' }, to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' } },
          '@keyframes a3-sheet': { from: { transform: 'translateY(100%) scale(0.96)' }, to: { transform: 'none' } },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', p: { xs: '28px 24px', sm: '24px 28px 28px' } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TokenIcon symbol="ETH" size={44} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Box component="h3" id="weth-notice-title" sx={{ m: 0, fontSize: 18, fontWeight: 500, lineHeight: '24px' }}>
                WETH Is Displayed as ETH
              </Box>
              <Box component="p" sx={{ m: 0, fontSize: 14, lineHeight: '19px', color: 'fg-3' }}>
                WETH and ETH are treated as equivalent within this demo, as in Aave Pro. WETH positions and balances are displayed as ETH throughout the app.
              </Box>
            </Box>
          </Box>
          <Box sx={{ height: '1px', bgcolor: 'border-0' }} />
          <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: 14, lineHeight: '19.6px', color: 'fg-3' }}>
            <Box
              component="button"
              type="button"
              role="checkbox"
              aria-checked={dontShow}
              aria-label="I understand, don't show this again."
              autoFocus
              onClick={() => setDontShow((v) => !v)}
              sx={{ width: 18, height: 18, flexShrink: 0, p: 0, border: 0, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'bg-1', bgcolor: dontShow ? 'fg-1' : 'transparent', boxShadow: dontShow ? 'none' : `inset 0 0 0 1px ${tv('border-2')}`, transition: 'background-color 150ms, box-shadow 150ms', '&:focus-visible, &:focus': { outline: '2px solid rgba(0, 122, 255, 0.5)', outlineOffset: 1 } }}
            >
              {dontShow && <BICheck size={13} strokeWidth={2} />}
            </Box>
            I understand, don&apos;t show this again.
          </Box>
        </Box>
        <Box sx={{ p: '4px 24px 24px' }}>
          <Box
            component="button"
            type="button"
            onClick={close}
            sx={{ width: '100%', height: 36, border: 0, borderRadius: '160px', bgcolor: 'bg-4', color: 'fg-1', boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'background-color 180ms, transform 180ms', '&:hover': { bgcolor: 'bg-5' }, '&:active': { transform: 'scale(0.99)' }, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2 } }}
          >
            Got it
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
