'use client';

/**
 * In-app toasts for transaction results, in Pro's surface style (bg-3 card, 12px radius, 1px ring,
 * soft shadow), sliding up from the bottom-left with Pro's snappy easing. Success toasts link to
 * Basescan on Base Sepolia. Auto-dismiss after 6 s, pause on hover, close button, polite live region.
 */
import Box from '@mui/material/Box';
import * as React from 'react';
import { create } from 'zustand';
import { tv } from '@/shared/theme/tokens';
import { motion } from '@/shared/theme/motion';

export interface Toast {
  id: number;
  tone: 'success' | 'error';
  title: string;
  body?: string;
  href?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id: nextId++ }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

function ToastCard({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  const [hover, setHover] = React.useState(false);
  React.useEffect(() => {
    if (hover) return;
    const timer = setTimeout(() => dismiss(t.id), 6000);
    return () => clearTimeout(timer);
  }, [hover, dismiss, t.id]);
  const color = tv(t.tone === 'success' ? 'data-green' : 'data-red');
  return (
    <Box
      role={t.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        width: { xs: 'calc(100vw - 32px)', sm: 360 },
        p: '14px 14px 14px 16px',
        borderRadius: '12px',
        bgcolor: 'bg-3',
        color: 'fg-1',
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.25), 0 0 0 1px ${tv('shadow-stroke-2')}`,
        animation: `mini-toast-in ${motion.duration.snappy}ms ${motion.easing.snappy} both`,
        '@keyframes mini-toast-in': { from: { opacity: 0, transform: 'translateY(12px) scale(0.98)' }, to: { opacity: 1, transform: 'none' } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Box aria-hidden sx={{ mt: '1px', width: 20, height: 20, flexShrink: 0, borderRadius: '50%', bgcolor: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box component="svg" viewBox="0 0 12 12" sx={{ width: 10, height: 10 }}>
          {t.tone === 'success' ? <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
        </Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontSize: 14, fontWeight: 500, lineHeight: '18px' }}>{t.title}</Box>
        {t.body && <Box sx={{ mt: '4px', fontSize: 13, lineHeight: '17px', color: 'fg-2' }}>{t.body}</Box>}
        {t.href && (
          <Box component="a" href={t.href} target="_blank" rel="noreferrer" sx={{ display: 'inline-block', mt: '6px', fontSize: 13, color: 'purple-1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            View on Basescan
          </Box>
        )}
      </Box>
      <Box
        component="button"
        type="button"
        aria-label="Dismiss"
        onClick={() => dismiss(t.id)}
        sx={{ width: 24, height: 24, flexShrink: 0, p: 0, border: 0, borderRadius: '6px', background: 'none', color: 'fg-3', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 100ms, background-color 100ms', '&:hover': { color: 'fg-1', bgcolor: 'button-hover-tertiary' } }}
      >
        <Box component="svg" viewBox="0 0 12 12" sx={{ width: 10, height: 10 }} aria-hidden>
          <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </Box>
      </Box>
    </Box>
  );
}

export function ToastHost() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <Box aria-live="polite" sx={{ position: 'fixed', zIndex: 1400, left: { xs: 16, md: 24 }, bottom: { xs: 16, md: 24 }, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
      {toasts.map((t) => (
        <ToastCard key={t.id} t={t} />
      ))}
    </Box>
  );
}
