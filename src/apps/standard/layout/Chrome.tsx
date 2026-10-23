'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { ArrowUpRightIcon, CloseIcon } from '@/shared/ui/Icons';
import { useSettings } from '@/shared/state/settings';
import { useNotice } from '@/shared/state/notice';
import { tv } from '@/shared/theme/tokens';

const ABOUT =
  'This site is an independent frontend study that recreates the look and feel of two Aave interfaces. Markets, prices, balances and transactions are simulated in your browser. There is no wallet connection, no blockchain and no real money. It is not affiliated with, endorsed by, or connected to Aave.';

/**
 * Top notify bar (reference TopBarNotify: bg-1, 14px text, purple-2 underlined CTA with ↗,
 * close X on the right). Used for the demo disclaimer. Dismissing it keeps the header's
 * always-visible "Demo" chip.
 */
export function TopBarNotify() {
  const hydrated = useSettings((s) => s.hydrated);
  const dismissed = useSettings((s) => s.notifyDismissed);
  const set = useSettings((s) => s.set);
  const notice = useNotice();
  if (hydrated && dismissed) return null;
  return (
    <Box
      component="aside"
      aria-label="Demo notice"
      sx={{
        position: 'relative',
        bgcolor: 'bg-1',
        color: 'fg-1',
        borderBottom: '1px solid',
        borderColor: 'border-0',
        minHeight: 48,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.38rem',
        px: 12,
        py: 2,
        animation: 'clone-fade-up 300ms ease both',
      }}
    >
      <Typography component="span" sx={{ fontSize: '0.875rem', lineHeight: 1.3, textAlign: 'center' }}>
        You are viewing a demo clone: all data is simulated and nothing here is real or affiliated with Aave.
      </Typography>
      <Box
        component="button"
        type="button"
        onClick={() => notice.show('About this demo', ABOUT)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          p: 0,
          border: 0,
          background: 'none',
          cursor: 'pointer',
          color: 'purple-2',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          lineHeight: 1,
          textDecoration: 'underline',
          textDecorationColor: 'transparent',
          transition: 'text-decoration-color 100ms ease',
          '&:hover': { textDecorationColor: 'currentColor' },
          [`*:where([data-mui-color-scheme="light"]) &`]: { color: tv('purple-1') },
        }}
      >
        Learn more
        <ArrowUpRightIcon sx={{ fontSize: '1rem' }} />
      </Box>
      <IconButton
        aria-label="Dismiss notification"
        size="small"
        onClick={() => set({ notifyDismissed: true })}
        sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'fg-1' }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

const FOOTER_LINKS = [
  { label: 'Terms', href: 'https://aave.com/terms-of-service' },
  { label: 'Privacy', href: 'https://aave.com/privacy-policy/' },
  { label: 'Docs', href: 'https://aave.com/docs' },
  { label: 'FAQS', href: 'https://aave.com/faq' },
];

export function AppFooter() {
  const notice = useNotice();
  const linkSx = {
    color: 'fg-3',
    fontSize: '0.75rem',
    lineHeight: '16px',
    transition: 'color 100ms ease',
    '&:hover': { color: 'fg-1' },
    background: 'none',
    border: 0,
    p: 0,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as const;
  return (
    <Box component="footer" sx={{ width: '100%', boxShadow: `inset 0px 1px 0px ${tv('border-0')}` }}>
      <Container
        sx={{
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '22px',
          pt: { xs: '22px', md: '20px' },
          pb: { xs: '40px', md: '20px' },
        }}
      >
        <Box sx={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {FOOTER_LINKS.map((l) => (
            <Box key={l.label} component="a" href={l.href} target="_blank" rel="noopener noreferrer" sx={linkSx} title="Opens the official Aave site in a new tab">
              {l.label}
            </Box>
          ))}
          <Box component="button" type="button" sx={linkSx} onClick={() => notice.show('About this demo', ABOUT)}>
            About this demo
          </Box>
        </Box>
        <Typography variant="caption" color="fg-4" sx={{ textAlign: 'center' }}>
          Demo build · simulated data · not affiliated with Aave
        </Typography>
      </Container>
    </Box>
  );
}
