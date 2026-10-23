'use client';

/**
 * Settings sidebar pieces (live /preferences and /watch-address, captured 2026-10-14):
 * - header: "← Back to App" (14px fg-3, 16px arrow) in place of the logo/collapse row
 * - nav: Preferences / Account / Watch Address, then "RESOURCES": Changelog, Help Center ↗,
 *   Developer Docs ↗ — same row metrics as the main nav (36px rows, 8px radius, 18px icon)
 * Builder A's Sidebar renders these for settings paths (docs/REQUESTS.md B-1).
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';
import { transition } from '@/shared/theme/motion';
import { PIBack, PIDocs, PIExternal, PIHelp } from '../../icons';
import { BIAccount, BIChangelog, BIPreferences, BIWatch } from '../token/icons';

export const settingsRoutes = {
  preferences: '/pro/preferences',
  account: '/pro/account',
  watch: '/pro/watch-address',
  changelog: '/pro/changelog',
};

/** True for the routes that use the settings sidebar and hide the desktop topbar. */
export const isSettingsPath = (pathname: string | null | undefined) => !!pathname && /^\/pro\/(preferences|watch-address|account)(\/|$)/.test(pathname);

export function SettingsSidebarHeader() {
  return (
    <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'bg-1', display: 'flex', alignItems: 'center', p: '16px 10px 12px 20px', height: 70 }}>
      <Box
        component={Link}
        href="/pro"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', py: '13px', color: 'fg-3', fontSize: 14, lineHeight: '14px', textDecoration: 'none', transition: 'color 100ms', '& svg': { transition: 'transform 100ms' }, '&:hover': { color: 'fg-1' }, '&:hover svg': { transform: 'translateX(-2px)' }, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2, borderRadius: '4px' } }}
      >
        <PIBack size={16} />
        Back to App
      </Box>
    </Box>
  );
}

type Item = { label: string; href: string; icon: React.ReactNode; external?: boolean };
const GROUPS: { label?: string; items: Item[] }[] = [
  {
    items: [
      { label: 'Preferences', href: settingsRoutes.preferences, icon: <BIPreferences /> },
      { label: 'Account', href: settingsRoutes.account, icon: <BIAccount /> },
      { label: 'Watch Address', href: settingsRoutes.watch, icon: <BIWatch /> },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Changelog', href: settingsRoutes.changelog, icon: <BIChangelog /> },
      { label: 'Help Center', href: 'https://aave.com/help', icon: <PIHelp />, external: true },
      { label: 'Developer Docs', href: 'https://aave.com/docs/aave-v4', icon: <PIDocs />, external: true },
    ],
  },
];

function List({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <Box component="nav" aria-label="Settings navigation" sx={{ display: 'flex', flexDirection: 'column', gap: '8px', px: '10px' }}>
      {GROUPS.map((g, gi) => (
        <Box key={gi}>
          {g.label && (
            <Typography component="h3" sx={{ color: 'fg-3', textTransform: 'uppercase', p: '14px 10px 6px', fontSize: 11, fontWeight: 500, lineHeight: '13.2px' }}>
              {g.label}
            </Typography>
          )}
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {g.items.map((it) => {
              const active = !it.external && pathname.startsWith(it.href);
              return (
                <li key={it.label}>
                  <Box
                    component={Link}
                    href={it.href}
                    target={it.external ? '_blank' : undefined}
                    rel={it.external ? 'noopener noreferrer' : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigate}
                    sx={{
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      px: '10px',
                      position: 'relative',
                      borderRadius: '8px',
                      fontSize: 14,
                      lineHeight: '14px',
                      fontWeight: active ? 500 : 400,
                      color: active ? 'fg-1' : 'fg-2',
                      bgcolor: active ? 'selected' : 'transparent',
                      textDecoration: 'none',
                      transition: transition(['color', 'background-color', 'font-weight'], 100),
                      // Live hover (probed 2026-10-14): 6% white plate, fg-1, weight 500, icon fg-1.
                      '&:hover': { color: 'fg-1', fontWeight: 500, bgcolor: active ? 'selected' : 'button-hover-tertiary' },
                      '&:hover .settings-nav-icon': { color: 'fg-1' },
                      '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '-2px' },
                    }}
                  >
                    <Box component="span" className="settings-nav-icon" sx={{ display: 'flex', color: active ? 'fg-1' : 'fg-3', transition: 'color 100ms' }}>
                      {it.icon}
                    </Box>
                    {it.label}
                    {it.external && (
                      <Box component="span" sx={{ position: 'absolute', right: '10px', top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: 'fg-4' }}>
                        <PIExternal />
                      </Box>
                    )}
                  </Box>
                </li>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function ListWithPath(props: { onNavigate?: () => void }) {
  return <List {...props} pathname={usePathname() ?? ''} />;
}

/** usePathname() is request data on dynamic routes, so it sits inside <Suspense> (same as Builder A's NavList). */
export function SettingsNavList(props: { onNavigate?: () => void }) {
  return (
    <React.Suspense fallback={<List {...props} pathname="" />}>
      <ListWithPath {...props} />
    </React.Suspense>
  );
}
