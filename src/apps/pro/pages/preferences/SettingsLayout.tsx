'use client';

/**
 * Shared frame for the settings pages (/preferences, /watch-address), measured on the live site
 * (2026-10-14, 1440×900 and 390×844, steady state after the shell's 0.3s padding transition):
 * - a 610px column centred in the content area (live `max-width: var(--page-width-md)`), 48px
 *   between the page heading and each section
 * - page heading h2 24/500/28.8 (19/500/22.8 below 600px); optional subheading 14/18.9 fg-3, 8px
 *   below; an optional action on the right (wraps under the title when it does not fit)
 * - section: h4 16/500/19.2, then its content 24px below (Watch Address: 32px)
 * - card: bg-2 (dark), 10px radius, `0 2px 4px shadow-low` + 1px stroke-1 ring (= ProCard), 4px/20px
 *   padding; rows 14.56px top/bottom, 1px border-0 rule between rows, flex-wrap with 16px gaps so
 *   the control drops under the text only when both do not fit (live: at 390px, not at 500px)
 */
import Box from '@mui/material/Box';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';
import { ProCard } from '../../ui';

export function SettingsPage({ children }: { children: React.ReactNode }) {
  return <Box sx={{ width: '100%', maxWidth: 610, mx: 'auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>{children}</Box>;
}

export function SettingsHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, flex: action ? '0 1 auto' : '1 1 100%' }}>
        <Box component="h2" sx={{ m: 0, fontSize: { xs: 19, sm: 24 }, fontWeight: 500, lineHeight: { xs: '22.8px', sm: '28.8px' }, color: 'fg-1' }}>
          {title}
        </Box>
        {subtitle && (
          <Box component="p" sx={{ m: 0, fontSize: 14, lineHeight: '18.9px', color: 'fg-3' }}>
            {subtitle}
          </Box>
        )}
      </Box>
      {action && <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>{action}</Box>}
    </Box>
  );
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Box component="h4" sx={{ m: 0, alignSelf: 'flex-start', fontSize: 16, fontWeight: 500, lineHeight: '19.2px', color: 'fg-1' }}>
        {title}
      </Box>
      <ProCard sx={{ p: '4px 20px' }}>
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {children}
        </Box>
      </ProCard>
    </Box>
  );
}

export function SettingsRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        py: '14.56px',
        '&:not(:last-of-type)': { borderBottom: `1px solid ${tv('border-0')}` },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6.08px', minWidth: 0 }}>
        <Box component="strong" sx={{ fontSize: 14, fontWeight: 500, lineHeight: '18px', color: 'fg-1' }}>
          {label}
        </Box>
        <Box component="p" sx={{ m: 0, fontSize: 14, lineHeight: '18.9px', color: 'fg-3' }}>
          {description}
        </Box>
      </Box>
      <Box sx={{ display: 'flex' }}>{children}</Box>
    </Box>
  );
}
