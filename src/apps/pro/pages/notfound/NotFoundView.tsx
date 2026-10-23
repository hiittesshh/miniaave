'use client';

/**
 * Pro 404 ("Page not Found"), measured on the live site (pro.aave.com/explore, 2026-10-14):
 * - no sidebar and no topbar (the marker below asks Builder A's shell to hide them, REQUESTS B-2)
 * - a full-width area 160px shorter than the viewport, centring a 321px column with 24px gaps:
 *   a 90×72 "window" tile (bg-1, 8px radius, 1px bg-4 inset ring, 12px title bar), the title
 *   (14/500/18) and message (14/19 fg-3, 8px apart), and a secondary "← Back" pill (36px)
 * - the live tile shows the Aave logomark with blinking eyes; per the guardrails we draw a neutral
 *   glyph (a dotted search ring) instead — logged as INTENTIONAL
 */
import Box from '@mui/material/Box';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';
import { ProButton } from '../../ui';
import { PIBack } from '../../icons';

function WindowTile() {
  return (
    <Box sx={{ position: 'relative', width: 90, height: 72, borderRadius: '8px', bgcolor: 'bg-1', boxShadow: `inset 0 0 0 1px ${tv('bg-4')}`, overflow: 'hidden' }} aria-hidden>
      <Box sx={{ height: 12, boxShadow: `inset 0 -1px 0 ${tv('bg-4')}` }} />
      <Box component="svg" viewBox="0 0 78 60" sx={{ position: 'absolute', left: 6, top: 12, width: 78, height: 60, color: 'fg-4' }}>
        <circle cx="35" cy="28" r="12" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="3 4.2" strokeLinecap="round" />
        <path d="M44 37l8 8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      </Box>
    </Box>
  );
}

export function NotFoundView() {
  return (
    <>
      {/* Tells the shell to hide its sidebar and topbar (CSS :has, no flash). */}
      <div data-pro-bare hidden />
      <Box
        sx={{
          mt: { xs: '-76px', md: '-104px' },
          height: 'calc(100dvh - 160px)',
          minHeight: 360,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ width: 321, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center', animation: 'a3-nf-in 300ms cubic-bezier(0.19, 1, 0.22, 1) both', '@keyframes a3-nf-in': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
          <WindowTile />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Box component="h1" sx={{ m: 0, fontSize: 14, fontWeight: 500, lineHeight: '18px', color: 'fg-1' }}>
              Page not Found
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: 14, lineHeight: '19px', color: 'fg-3' }}>
              We could not find the page you were looking for.
            </Box>
          </Box>
          <ProButton variant="secondary" href="/pro" prefixIcon={<PIBack size={20} />} sx={{ pl: '12px', pr: '14px', bgcolor: 'bg-3' }}>
            Back
          </ProButton>
        </Box>
      </Box>
    </>
  );
}
