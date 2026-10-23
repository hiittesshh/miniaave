'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Slide from '@mui/material/Slide';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import { useColorScheme, useTheme } from '@mui/material/styles';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { BrandLockup, DemoBadge } from '@/shared/ui/Brand';
import { ArrowUpRightIcon, BridgeIcon, ChevronDownIcon, ChevronUpDownIcon, HeadsetIcon, RefreshIcon, SwapIcon } from '@/shared/ui/Icons';
import { DARK, tv } from '@/shared/theme/tokens';
import { useSettings } from '@/shared/state/settings';
import { useWallet } from '@/shared/state/wallet';
import { useNotice } from '@/shared/state/notice';
import { HEADER_HEIGHT, HEADER_MOBILE_BELOW, MORE_ITEMS, NAV_ITEMS, ROUTES } from './nav';
import { SettingsMenu, useSettingsActions } from './SettingsMenu';
import { WalletButton } from './WalletButton';

const PAD_Y = '2.25rem';
const PAD_X = '0.8125rem';

/** Reference nav link: fg-3 → fg-1 on hover/active (0.25s), static 2px purple underline when active. */
const navLinkSx = {
  color: tv('fg-3'),
  letterSpacing: '-0.00563rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  p: `${PAD_Y} ${PAD_X}`,
  height: 'auto',
  borderRadius: 0,
  position: 'relative',
  transition: 'color 0.25s ease-out',
  '&.active': { color: tv('fg-1') },
  '&:hover, &[aria-expanded="true"]': { backgroundColor: 'transparent', color: tv('fg-1') },
  '&::after': { content: "''", position: 'absolute', height: '2px', bottom: 0, left: PAD_X, right: PAD_X, background: tv('purple-1'), opacity: 0, transition: 'opacity 0.2s ease' },
  '&.active::after': { opacity: 1 },
} as const;

function useIsActive() {
  const pathname = usePathname();
  const account = useWallet((s) => s.account);
  return (href: string) => {
    if (pathname === href) return true;
    if (pathname === '/') return account ? href === ROUTES.dashboard : href === ROUTES.markets;
    if (href === ROUTES.markets && pathname.startsWith('/reserve-overview')) return true;
    return false;
  };
}

function HideOnScroll({ children, mobile }: { children: React.ReactElement; mobile: boolean }) {
  const trigger = useScrollTrigger({ threshold: 80 });
  return (
    <Slide appear={false} direction="down" in={mobile || !trigger}>
      {children}
    </Slide>
  );
}

function MoreMenu() {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const isActive = useIsActive();
  const active = MORE_ITEMS.some((i) => isActive(i.href));
  return (
    <>
      <Button
        className={active ? 'active' : undefined}
        aria-haspopup="true"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ ...navLinkSx, '&::after': { ...navLinkSx['&::after'], right: `calc(${PAD_X} + 0.25rem + 16px)` } }}
      >
        More
        <ChevronDownIcon sx={{ ml: '0.25rem', fontSize: 16, transform: anchor ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease-in-out' }} />
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} sx={{ mt: '-1.125rem' }}>
        {MORE_ITEMS.map((i) => (
          <MenuItem
            key={i.href}
            component={Link}
            href={i.href}
            className={isActive(i.href) ? 'active' : undefined}
            onClick={() => setAnchor(null)}
            sx={{ minWidth: 140, fontWeight: 500, color: 'fg-3', transition: 'color 0.25s ease-out', '&.active, &:hover': { color: 'fg-1' } }}
          >
            {i.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** Enter/Space activation for div-based controls (role="button"/"switch"), which browsers do not give for free. */
const onActivateKey = (fn: (e: React.KeyboardEvent<HTMLElement>) => void) => (e: React.KeyboardEvent<HTMLElement>) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn(e);
  }
};

function MenuToggleIcon({ open }: { open: boolean }) {
  const bar = { position: 'absolute', left: '4px', width: '16px', height: '2px', borderRadius: '1px', bgcolor: 'currentColor', transition: 'transform 0.2s ease, opacity 0.2s ease' } as const;
  return (
    <Box sx={{ position: 'relative', width: 24, height: 24, color: 'fg-2' }}>
      <Box sx={{ ...bar, top: '5px', transform: open ? 'translateY(6px) rotate(45deg)' : 'none' }} />
      <Box sx={{ ...bar, top: '11px', opacity: open ? 0 : 1 }} />
      <Box sx={{ ...bar, top: '17px', transform: open ? 'translateY(-6px) rotate(-45deg)' : 'none' }} />
    </Box>
  );
}

function MobileMenu({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const isActive = useIsActive();
  const testnet = useSettings((s) => s.testnetMode);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const { mode, setMode } = useColorScheme();
  const { settings, toggleTestnet, reset } = useSettingsActions();
  const notice = useNotice();
  // The demo banner can sit above the sticky header, so the drawer is placed under the header's
  // real bottom edge (measured on open) instead of a fixed offset; that keeps the toggle reachable.
  const [top, setTop] = React.useState(HEADER_HEIGHT);
  const close = () => setOpen(false);

  const row = { position: 'relative', display: 'flex', alignItems: 'center', width: '100%', minHeight: '3rem', borderRadius: '0.5rem', fontSize: '1.125rem', fontWeight: 500, lineHeight: '120%', color: 'fg-1' } as const;
  const activeBar = { '&::before': { content: '""', position: 'absolute', left: '-0.75rem', top: '50%', transform: 'translateY(-50%)', width: '0.25rem', height: '2.5rem', borderRadius: '0 0.375rem 0.375rem 0', bgcolor: 'purple-1' } };

  return (
    <>
      <Button variant="tertiary" aria-label="menu" aria-pressed={open} sx={{ p: '7px 8px', minWidth: 'unset', ml: 2 }} onClick={(e) => {
          const header = e.currentTarget.closest('header');
          if (!open && header) setTop(Math.max(0, Math.round(header.getBoundingClientRect().bottom)));
          setOpen(!open);
        }}>
        <MenuToggleIcon open={open} />
      </Button>
      <Drawer
        anchor="right"
        open={open}
        onClose={close}
        hideBackdrop
        disableScrollLock
        sx={{ top: `${top}px` }}
        slotProps={{
          paper: {
            sx: { bgcolor: 'bg-1', boxShadow: 'none', borderRadius: 0, width: '100%', top: `${top}px`, height: `calc(100dvh - ${top}px)`, py: '0.75rem', display: 'flex', flexDirection: 'column' },
          },
        }}
      >
        <Box sx={{ flex: 1, overflowY: 'auto', px: '1rem', pb: '3rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {NAV_ITEMS.filter((i) => !('testnetOnly' in i) || testnet).map((i) => (
            <Box key={i.href} component={Link} href={i.href} onClick={close} sx={[row, isActive(i.href) && activeBar]}>
              {i.label}
            </Box>
          ))}
          <Box role="button" aria-expanded={moreOpen} tabIndex={0} onClick={() => setMoreOpen((v) => !v)} onKeyDown={onActivateKey(() => setMoreOpen((v) => !v))} sx={[row, { cursor: 'pointer', justifyContent: 'space-between' }]}>
            More
            <ChevronDownIcon sx={{ fontSize: 18, color: 'fg-2', transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </Box>
          <Collapse in={moreOpen}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', pt: '0.5rem' }}>
              {MORE_ITEMS.map((i) => (
                <Box key={i.href} component={Link} href={i.href} onClick={close} sx={[row, { pl: '0.75rem' }, isActive(i.href) && activeBar]}>
                  {i.label}
                </Box>
              ))}
            </Box>
          </Collapse>
          <Divider sx={{ my: 2 }} />
          <Box component={Link} href={ROUTES.pro} onClick={close} sx={row}>
            Aave V4 (Pro clone)
          </Box>
          <Box role="switch" aria-checked={settings.testnetMode} tabIndex={0} onClick={toggleTestnet} onKeyDown={onActivateKey(toggleTestnet)} sx={[row, { justifyContent: 'space-between', cursor: 'pointer' }]}>
            Test Mode
            <Switch checked={settings.testnetMode} tabIndex={-1} slotProps={{ input: { 'aria-hidden': true } }} />
          </Box>
          <Box role="switch" aria-checked={mode === 'dark'} tabIndex={0} onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} onKeyDown={onActivateKey(() => setMode(mode === 'dark' ? 'light' : 'dark'))} sx={[row, { justifyContent: 'space-between', cursor: 'pointer' }]}>
            Dark mode
            <Switch checked={mode === 'dark'} tabIndex={-1} slotProps={{ input: { 'aria-hidden': true } }} />
          </Box>
          <Box role="switch" aria-checked={settings.simulateFailures} tabIndex={0} onClick={() => settings.set({ simulateFailures: !settings.simulateFailures })} onKeyDown={onActivateKey(() => settings.set({ simulateFailures: !settings.simulateFailures }))} sx={[row, { justifyContent: 'space-between', cursor: 'pointer' }]}>
            Simulate failures
            <Switch checked={settings.simulateFailures} tabIndex={-1} slotProps={{ input: { 'aria-hidden': true } }} />
          </Box>
          <Box role="button" tabIndex={0} onClick={() => void reset()} onKeyDown={onActivateKey(() => void reset())} sx={[row, { cursor: 'pointer' }]}>
            Reset demo data
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', px: '1rem', pt: 2 }}>
          <Button fullWidth variant="tertiary" startIcon={<SwapIcon sx={{ fontSize: 18 }} />} onClick={() => notice.showNotIncluded('Swap')}>
            Swap
          </Button>
          <Button fullWidth variant="tertiary" startIcon={<BridgeIcon sx={{ fontSize: 18 }} />} onClick={() => notice.showNotIncluded('Bridge GHO')}>
            Bridge GHO
          </Button>
        </Box>
      </Drawer>
    </>
  );
}

export function AppHeader() {
  const theme = useTheme();
  const testnet = useSettings((s) => s.testnetMode);
  // Test mode adds the badge, so the reference hands over to mobile earlier and collapses labels.
  const mobileBp = testnet ? 'lg' : HEADER_MOBILE_BELOW;
  const mobile = useMediaQuery(theme.breakpoints.down(mobileBp));
  const belowLg = useMediaQuery(theme.breakpoints.down('lg'));
  // Phones in test mode: the extra 'Test Mode' switcher needs the room, so the lockup drops to the mark.
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const collapsed = belowLg || testnet;
  const isActive = useIsActive();
  const { settings, toggleTestnet } = useSettingsActions();
  const notice = useNotice();
  const [drawer, setDrawer] = React.useState(false);
  const [testAnchor, setTestAnchor] = React.useState<HTMLElement | null>(null);

  if (!mobile && drawer) setDrawer(false);

  return (
    <HideOnScroll mobile={mobile}>
      <Box
        component="header"
        sx={{
          height: HEADER_HEIGHT,
          position: 'sticky',
          top: 0,
          zIndex: 'appBar',
          bgcolor: 'bg-3',
          [DARK]: { bgcolor: 'bg-1' },
          display: 'flex',
          alignItems: 'center',
          boxShadow: `inset 0px -1px 0px ${tv('border-0')}`,
        }}
      >
        <Container sx={{ flexDirection: 'row', alignItems: 'center', pb: 0 }}>
          <Box component={Link} href="/" aria-label="Go to homepage" onClick={() => setDrawer(false)} sx={{ lineHeight: 0, mr: 3, transition: '0.3s ease all', '&:hover': { opacity: 0.7 } }}>
            <BrandLockup compact={testnet && phone} />
          </Box>

          {testnet && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mr: { xs: 1, sm: 3 } }}>
              <Box sx={{ width: '1px', height: '0.75rem', bgcolor: 'border-2' }} />
              <Box
                role="button"
                tabIndex={0}
                aria-haspopup="true"
                aria-expanded={testAnchor ? 'true' : undefined}
                onClick={(e: React.MouseEvent<HTMLElement>) => setTestAnchor(e.currentTarget)}
                onKeyDown={onActivateKey((e) => setTestAnchor(e.currentTarget))}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 28, whiteSpace: 'nowrap', cursor: 'pointer', color: 'teal-ink', fontWeight: 500, fontSize: '0.875rem', transition: 'color 100ms ease', '&:hover': { color: 'green-1' } }}
              >
                Test Mode
                <ChevronUpDownIcon sx={{ fontSize: 16 }} />
              </Box>
              <Menu anchorEl={testAnchor} open={Boolean(testAnchor)} onClose={() => setTestAnchor(null)}>
                <MenuItem
                  onClick={() => {
                    setTestAnchor(null);
                    toggleTestnet();
                  }}
                >
                  Disable testnet
                </MenuItem>
              </Menu>
            </Box>
          )}

          <Box component="nav" aria-label="Main" sx={{ display: { xs: 'none', [mobileBp]: 'flex' }, alignItems: 'center', gap: 2 }}>
            {NAV_ITEMS.filter((i) => !('testnetOnly' in i) || testnet).map((i) => (
              <Button key={i.href} component={Link} href={i.href} className={isActive(i.href) ? 'active' : undefined} sx={navLinkSx}>
                {i.label}
              </Button>
            ))}
            <MoreMenu />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: '0.62rem' }}>
            <DemoBadge dense={collapsed} />
          </Box>

          {!mobile && (
            <Button
              component={Link}
              href={ROUTES.pro}
              variant="outlined"
              endIcon={<ArrowUpRightIcon sx={{ color: 'fg-3' }} />}
              sx={{ mr: '0.62rem', '& .MuiButton-endIcon > *:nth-of-type(1)': { fontSize: '18px' } }}
            >
              {collapsed ? 'V4' : 'Aave V4'}
            </Button>
          )}
          {!mobile && (
            <Button
              variant="outlined"
              onClick={() => notice.showNotIncluded('Swap')}
              startIcon={collapsed ? undefined : <SwapIcon sx={{ fontSize: 18 }} />}
              aria-label="Swap"
              sx={[{ mr: '0.62rem' }, collapsed && { minWidth: 0, p: '0.25rem', aspectRatio: '1' }]}
            >
              {collapsed ? <RefreshIcon sx={{ fontSize: 18, color: 'fg-2' }} /> : 'Swap'}
            </Button>
          )}
          {!mobile && !testnet && (
            <Button
              variant="outlined"
              onClick={() => notice.showNotIncluded('Bridge GHO')}
              startIcon={collapsed ? undefined : <BridgeIcon sx={{ fontSize: 18 }} />}
              aria-label="Bridge GHO"
              sx={[{ mr: '0.62rem' }, collapsed && { minWidth: 0, p: '0.25rem', aspectRatio: '1' }]}
            >
              {collapsed ? <BridgeIcon sx={{ fontSize: 18, color: 'fg-3' }} /> : 'Bridge GHO'}
            </Button>
          )}

          {!mobile && (
            <Button
              variant="outlined"
              aria-label="Get support"
              onClick={() => notice.show('Support', 'In the real app this opens a support form. This demo has no support desk, and since nothing here is real, there is nothing to recover.')}
              sx={{ mr: '0.62rem', minWidth: 0, p: '0.25rem', aspectRatio: '1' }}
            >
              <HeadsetIcon sx={{ fontSize: 18, color: 'fg-2' }} />
            </Button>
          )}
          <WalletButton compact={mobile} />
          {!mobile && <SettingsMenu />}
          <Box sx={{ display: { xs: 'flex', [mobileBp]: 'none' } }}>
            <MobileMenu open={drawer && mobile} setOpen={setDrawer} />
          </Box>
          {settings.simulateFailures && (
            <Typography
              component="span"
              sx={{ position: 'absolute', bottom: 2, right: 12, fontSize: '0.625rem', color: 'red-1', fontWeight: 600, letterSpacing: '0.04em', display: { xs: 'none', sm: 'block' } }}
            >
              SIMULATING FAILURES
            </Typography>
          )}
        </Container>
      </Box>
    </HideOnScroll>
  );
}
