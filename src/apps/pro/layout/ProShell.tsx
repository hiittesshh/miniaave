'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import InputBase from '@mui/material/InputBase';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useColorScheme } from '@mui/material/styles';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useDataSource } from '@/data/DataSourceProvider';
import { BrandMark } from '@/shared/ui/Brand';
import { ConnectWalletModal } from '@/shared/ui/ConnectWalletModal';
import { NoticeDialog } from '@/shared/ui/NoticeDialog';
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  LogoutIcon,
  MonitorIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  SwapIcon,
} from '@/shared/ui/Icons';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { DEMO_ACCOUNTS, shortAddress, useWallet } from '@/shared/state/wallet';
import { useSettings } from '@/shared/state/settings';
import { useNotice } from '@/shared/state/notice';
import { DARK, surfaceShadow, tv } from '@/shared/theme/tokens';
import { motion, transition } from '@/shared/theme/motion';
import { AddressAvatar } from '@/apps/standard/layout/WalletButton';
import { ChainIcon, HubMarketIcon, ProButton } from '../ui';
import { proRoutes, useProContext, useProFilter } from '../state';
import { isSettingsPath, SettingsNavList, SettingsSidebarHeader } from '../pages/preferences/SettingsNav';
import { PIBack, PISearch, PISwap, PIAccessV3, PIActivity, PIBorrow, PICollapse, PIDashboard, PIDeposit, PIDocs, PIExternal, PIGovernance, PIHelp, PIInsights, PIMinus, PIProtocol, PISecurity, PISupport } from '../icons';
import { ProTxModalHost } from '../transactions/ProTxModal';

const OPEN_W = '16.25rem';
const CLOSED_W = '3.625rem';
const TOPBAR_H = '4.5rem';
const TOPBAR_H_MOBILE = '3.5rem';
const DUR = `${motion.duration.smooth}ms`;

export type NavLink = { label: string; href?: string; icon: React.ReactNode; external?: boolean; onClick?: () => void };
export type NavGroup = { label?: string; items: NavLink[] };

/**
 * Optional shell variant (e.g. the Mini-Aave mode at /mini). Without one the shell is exactly the
 * Pro shell. A variant swaps the sidebar nav, the wordmark, the topbar's right-hand controls and the
 * modal hosts, and can hide the search box and the promo card.
 */
export interface ShellVariant {
  homeHref: string;
  nav: NavGroup[];
  brand: React.ReactNode;
  compactBrand: React.ReactNode;
  /** Shown right after the wordmark link, outside it, so it can be its own button (a link can't hold one). */
  brandAddon?: React.ReactNode;
  compactBrandAddon?: React.ReactNode;
  brandLabel: string;
  topbarRight: React.ReactNode;
  hosts?: React.ReactNode;
  hideSearch?: boolean;
  hidePromo?: boolean;
  navLabel?: string;
  /** The variant's own search results (replaces assets / hubs / markets; no chain filter). */
  search?: { placeholder: string; groups: (term: string) => { label: string; items: SearchItem[] }[] };
  /** The variant's own sidebar card (Pro promo style; dismissible for the session). */
  promo?: { title: string; sub: string; href: string };
  /** The help button's text. */
  help?: { title: string; body: string };
}
export interface SearchItem {
  key: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  href: string;
}
const ShellVariantContext = React.createContext<ShellVariant | null>(null);
const useShellVariant = () => React.useContext(ShellVariantContext);

function useNav(mobile = false): NavGroup[] {
  const notice = useNotice();
  const variant = useShellVariant();
  if (variant) return variant.nav;
  return [
    {
      items: [
        { label: 'Dashboard', href: proRoutes.home, icon: <PIDashboard /> },
        { label: 'Activity', href: proRoutes.activity, icon: <PIActivity /> },
        // Live: the mobile menu adds Swap under Activity (swaps are out of scope in this demo).
        ...(mobile ? [{ label: 'Swap', icon: <PISwap />, onClick: () => notice.showNotIncluded('Swap') }] : []),
      ],
    },
    {
      label: 'Explore',
      items: [
        { label: 'Deposit', href: proRoutes.deposit, icon: <PIDeposit /> },
        { label: 'Borrow', href: proRoutes.borrow, icon: <PIBorrow /> },
      ],
    },
    {
      label: 'Protocol',
      items: [
        { label: 'Insights', href: proRoutes.insights, icon: <PIInsights /> },
        { label: 'Security', href: 'https://aave.com/security', icon: <PISecurity />, external: true },
        { label: 'Protocol', href: 'https://github.com/aave/aave-v4', icon: <PIProtocol />, external: true },
        { label: 'Governance', href: 'https://governance.aave.com', icon: <PIGovernance />, external: true },
        { label: 'Developer Docs', href: 'https://aave.com/docs/aave-v4', icon: <PIDocs />, external: true },
        { label: 'Access Aave V3', href: '/', icon: <PIAccessV3 />, external: true },
      ],
    },
    {
      label: 'Support',
      items: [
        { label: 'Contact Support', icon: <PISupport />, onClick: () => notice.show('Contact Support', 'In the real app this opens a support form. This demo has no support desk, and since nothing here is real, there are no funds to recover.') },
        { label: 'Help Center', href: 'https://aave.com/help', icon: <PIHelp />, external: true },
      ],
    },
  ];
}

function NavListWithPath(props: { collapsed: boolean; mobile?: boolean; onNavigate?: () => void }) {
  return <NavListInner {...props} pathname={usePathname()} />;
}

/** usePathname() is request data on dynamic routes, so it must sit inside <Suspense>. */
function NavList(props: { collapsed: boolean; mobile?: boolean; onNavigate?: () => void }) {
  return (
    <React.Suspense fallback={<NavListInner {...props} pathname="" />}>
      <NavListWithPath {...props} />
    </React.Suspense>
  );
}

function NavListInner({ collapsed, mobile = false, onNavigate, pathname }: { collapsed: boolean; mobile?: boolean; onNavigate?: () => void; pathname: string }) {
  const groups = useNav(mobile);
  const variant = useShellVariant();
  const home = variant?.homeHref ?? proRoutes.home;
  const isActive = (href?: string) => {
    if (!href || href.startsWith('http')) return false;
    if (href === home) return pathname === home;
    if (href === '/') return false;
    return pathname.startsWith(href);
  };
  return (
    <Box component="nav" aria-label={variant?.navLabel ?? 'Pro navigation'} sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', px: mobile ? '0.5rem' : '0.625rem' }}>
      {groups.map((g, gi) => (
        <Box key={gi}>
          {g.label && (
            <Typography component="h3" sx={{ position: 'relative', color: 'fg-3', textTransform: 'uppercase', p: '14px 10px 6px', fontSize: 11, fontWeight: 500, lineHeight: '13.2px', whiteSpace: 'nowrap' }}>
              <Box component="span" sx={{ display: 'block', opacity: collapsed ? 0 : 1, transition: `opacity ${DUR} ease-in-out` }}>{g.label}</Box>
              {/* Collapsed rail (live): a short rule stands in for the group label. */}
              <Box component="span" aria-hidden sx={{ position: 'absolute', left: 10, top: '50%', width: 18, height: '1px', bgcolor: 'border-1', opacity: collapsed ? 1 : 0, transition: `opacity ${DUR} ease-in-out` }} />
            </Typography>
          )}
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {g.items.map((it) => {
              const active = isActive(it.href);
              const content = (
                <>
                  <Box component="span" className="nav-icon" sx={{ display: 'flex', flexShrink: 0, color: active ? 'fg-1' : 'fg-3', transition: 'color 100ms' }}>
                    {it.icon}
                  </Box>
                  <Box component="span" sx={{ whiteSpace: 'nowrap', opacity: collapsed ? 0 : 1, transition: `opacity ${DUR} ease-in-out` }}>
                    {it.label}
                  </Box>
                  {it.external && !collapsed && (
                    <Box component="span" className="nav-icon" sx={{ position: 'absolute', right: '0.625rem', top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: 'fg-4', transition: 'color 100ms' }}>
                      <PIExternal />
                    </Box>
                  )}
                </>
              );
              const linkSx = {
                width: '100%',
                height: mobile ? 40 : 36,
                color: active ? 'fg-1' : 'fg-2',
                fontSize: '0.875rem',
                lineHeight: '14px',
                fontWeight: active ? 500 : 400,
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: mobile ? '0.62rem' : '0.5rem',
                px: '0.625rem',
                position: 'relative',
                overflow: 'hidden',
                border: 0,
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                bgcolor: active ? 'selected' : 'transparent',
                transition: transition(['color', 'background-color', 'font-weight'], 100),
                // Live hover (probed 2026-10-14): 6% white plate, label fg-1/500, icon and external arrow fg-1.
                '&:hover': { color: 'fg-1', fontWeight: 500, bgcolor: active ? 'selected' : 'button-hover-tertiary' },
                '&:hover .nav-icon': { color: 'fg-1' },
                '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: '-2px' },
              } as const;
              const el = it.href ? (
                <Box
                  component={Link}
                  href={it.href}
                  target={it.external ? '_blank' : undefined}
                  rel={it.external ? 'noopener noreferrer' : undefined}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  sx={linkSx}
                >
                  {content}
                </Box>
              ) : (
                <Box
                  component="button"
                  type="button"
                  onClick={() => {
                    it.onClick?.();
                    onNavigate?.();
                  }}
                  sx={linkSx}
                >
                  {content}
                </Box>
              );
              return (
                <li key={it.label}>
                  {collapsed ? (
                    <Tooltip title={it.label} placement="right">
                      <span>{el}</span>
                    </Tooltip>
                  ) : (
                    el
                  )}
                </li>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Sidebar promo card, measured from the live app: 220×147 card at 16px/20px insets, bg-3, 14px
 * radius, 0 1px 12px shadow; artwork top-left; title 14/500 and subtitle 14/400 fg-3 at the
 * bottom; a 36×36 "–" dismiss button top-right. The artwork is our own neutral geometry
 * (concentric rings around a disc), not the live illustration.
 */
function PromoArt() {
  return (
    <Box component="svg" viewBox="0 0 220 147" aria-hidden sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <radialGradient id="pro-promo-glow" cx="35" cy="35" r="190" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.10" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="220" height="147" fill="url(#pro-promo-glow)" />
      {[37, 74, 118, 168].map((r, i) => (
        <circle key={r} cx="35" cy="35" r={r} fill="none" stroke="currentColor" strokeOpacity={0.14 - i * 0.025} strokeWidth="1" />
      ))}
      <circle cx="35" cy="35" r="20" fill="currentColor" fillOpacity="0.92" />
      <rect x="27" y="27" width="16" height="16" rx="2.5" fill="var(--mui-palette-bg-3)" />
    </Box>
  );
}

function PromoCard({ collapsed }: { collapsed: boolean }) {
  const variant = useShellVariant();
  const dismissed = useSettings((s) => s.proPromoDismissed);
  const hydrated = useSettings((s) => s.hydrated);
  const set = useSettings((s) => s.set);
  const [variantDismissed, setVariantDismissed] = React.useState(false);
  const promo = variant?.promo;
  if (promo ? variantDismissed : !hydrated || dismissed) return null;
  if (collapsed) return null;
  return (
    <Box sx={{ p: '1rem 1.25rem' }}>
      <Box
        component={Link}
        href={promo?.href ?? proRoutes.market('base:coinbase-stocks')}
        sx={{
          position: 'relative',
          display: 'block',
          height: 147,
          borderRadius: '14px',
          bgcolor: 'bg-3',
          color: 'fg-1',
          boxShadow: '0 1px 12px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          textDecoration: 'none',
          '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2 },
        }}
      >
        <PromoArt />
        <Box
          component="button"
          type="button"
          aria-label="Dismiss"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (promo) setVariantDismissed(true);
            else set({ proPromoDismissed: true });
          }}
          sx={{ position: 'absolute', top: 0, right: 0, width: 36, height: 36, border: 0, background: 'none', p: 0, cursor: 'pointer', color: 'fg-3', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 100ms ease', '&:hover': { color: 'fg-1' } }}
        >
          <PIMinus size={20} />
        </Box>
        <Box sx={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
          <Typography component="h2" sx={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: '18px' }}>
            {promo?.title ?? 'Tokenised Stocks'}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', lineHeight: '19px', color: 'fg-3', mt: '2px' }}>{promo?.sub ?? 'Powered by Base'}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const variant = useShellVariant();
  return (
    <Box
      component="aside"
      sx={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 1200,
        width: open ? OPEN_W : CLOSED_W,
        bgcolor: 'bg-1',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        overflow: 'hidden',
        transition: `width ${DUR} ease-in-out`,
        '&::after': { content: '""', position: 'absolute', top: 0, bottom: 0, right: 0, width: '1px', bgcolor: 'border-0' },
      }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <React.Suspense fallback={<SidebarBody open={open} onToggle={onToggle} pathname="" />}>
          <SidebarBodyWithPath open={open} onToggle={onToggle} />
        </React.Suspense>
      </Box>
      {(!variant?.hidePromo || variant?.promo) && <PromoCard collapsed={!open} />}
    </Box>
  );
}

function SidebarBodyWithPath(props: { open: boolean; onToggle: () => void }) {
  return <SidebarBody {...props} pathname={usePathname()} />;
}

/**
 * Sidebar header + nav. Settings pages (request B-1, live /preferences and /watch-address) swap in
 * Builder B's "Back to App" header and settings nav and drop a marker; the shell's CSS uses it
 * (via :has()) to hide the desktop topbar and pin the open sidebar width, so there is no flash.
 */
function SidebarBody({ open, onToggle, pathname }: { open: boolean; onToggle: () => void; pathname: string }) {
  const variant = useShellVariant();
  if (isSettingsPath(pathname)) {
    return (
      <>
        <span data-pro-settings hidden />
        <SettingsSidebarHeader />
        <SettingsNavList />
      </>
    );
  }
  return (
    <>
        <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'bg-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: open ? '1rem' : 0, p: open ? '1rem 0.625rem 0.75rem 1.25rem' : '1rem 0.625rem 0.75rem', transition: `padding ${DUR} ease-in-out` }}>
          {variant?.brandAddon ? (
            // Same fade / collapse as the plain link below, applied to the link + addon together.
            <Box sx={{ height: 40, display: 'flex', alignItems: 'center', gap: '8px', opacity: open ? 1 : 0, width: open ? 'auto' : 0, overflow: 'hidden', transition: `opacity ${DUR} ease-in-out`, whiteSpace: 'nowrap' }}>
              <Box component={Link} href={variant.homeHref} sx={{ height: 40, display: 'flex', alignItems: 'center' }} aria-label={`${variant.brandLabel} home`}>
                {variant.brand}
              </Box>
              {variant.brandAddon}
            </Box>
          ) : (
            <Box component={Link} href={variant?.homeHref ?? proRoutes.home} sx={{ height: 40, display: 'flex', alignItems: 'center', opacity: open ? 1 : 0, width: open ? 'auto' : 0, overflow: 'hidden', transition: `opacity ${DUR} ease-in-out`, whiteSpace: 'nowrap' }} aria-label={variant ? `${variant.brandLabel} home` : 'Aave Clone Pro home'}>
              {variant ? variant.brand : <ProWordmark />}
            </Box>
          )}
          <Box
            component="button"
            type="button"
            onClick={onToggle}
            aria-label={open ? 'Collapse Sidebar' : 'Expand Sidebar'}
            aria-expanded={open}
            sx={{
              width: 38,
              height: 36,
              flexShrink: 0,
              borderRadius: '0.5rem',
              border: 0,
              background: 'none',
              cursor: 'pointer',
              color: 'fg-4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              '&:hover': { bgcolor: 'selected', color: 'fg-1' },
              '& .logo': { opacity: open ? 0 : 1, transition: 'opacity 120ms', position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'fg-1' },
              '& .icon': { opacity: open ? 1 : 0, transition: 'opacity 120ms', display: 'flex' },
              '&:hover .logo': { opacity: 0 },
              '&:hover .icon': { opacity: 1 },
              '&:focus-visible': { outline: `2px solid ${tv('fg-3')}` },
            }}
          >
            <span className="icon">
              <PICollapse />
            </span>
            <span className="logo">
              <BrandMark size={20} />
            </span>
          </Box>
        </Box>
        <NavList collapsed={!open} />
    </>
  );
}

/** Wordmark with the outlined PRO pill (neutral placeholder mark, not the Aave logo). */
function ProWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'fg-1' }} aria-label="Aave Clone Pro, demo">
      {/* Neutral wordmark kept to the live logo's ~84px box so the PRO and DEMO pills fit beside it. */}
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
        <BrandMark size={18} />
        {!compact && (
          <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em', lineHeight: 1 }}>
            Clone
          </Typography>
        )}
      </Box>
      <Box component="span" sx={{ px: '0.375rem', height: 18, display: 'inline-flex', alignItems: 'center', borderRadius: '10rem', border: `1.5px solid ${tv('purple-1')}`, color: 'purple-1', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.04em' }}>
        PRO
      </Box>
      {/* Guardrail: one compact Demo pill beside PRO (intentional difference, see PRO_DISCREPANCY_LOG). */}
      <Box component="span" title="Demo clone · simulated data · not affiliated with Aave" sx={{ px: '0.375rem', height: 18, display: 'inline-flex', alignItems: 'center', borderRadius: '10rem', border: `1.5px solid ${tv('yellow-1')}`, color: 'yellow-1', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.04em' }}>
        DEMO
      </Box>
    </Box>
  );
}

/** Floating help button, bottom-right (live app). */
function HelpFab() {
  const notice = useNotice();
  const variant = useShellVariant();
  return (
    <Tooltip title="Help" placement="left">
      <Box
        component="button"
        type="button"
        aria-label="Help"
        onClick={() => (variant?.help ? notice.show(variant.help.title, variant.help.body) : notice.show('Help', 'This is a demo clone of the Aave Pro (V4) interface. Deposit, withdraw, borrow, repay and collateral changes are simulated in your browser; nothing touches a real network. Use the account menu for demo controls (Simulate failures, Reset demo data).'))}
        sx={
          variant
            ? { position: 'fixed', right: 24, bottom: 24, zIndex: 1100, width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer', bgcolor: 'bg-3', color: 'fg-2', fontFamily: 'inherit', fontSize: '0.9375rem', fontWeight: 500, boxShadow: surfaceShadow(), transition: transition(['transform', 'color'], 150), '&:hover': { color: 'fg-1', transform: 'translateY(-1px)' }, [DARK]: { bgcolor: 'bg-3' } }
            : // Live Pro (probed 2026-10-14): a 36px secondary pill at right 20 / bottom 16, fg-3 glyph, 4% hover plate.
              { position: 'fixed', right: 20, bottom: 16, zIndex: 1100, width: 36, height: 36, p: 0, borderRadius: '160px', border: 0, cursor: 'pointer', bgcolor: 'bg-3', color: 'fg-3', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, lineHeight: '14px', boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}`, transition: transition(['box-shadow', 'background-color'], 180), '&:hover': { backgroundImage: `linear-gradient(${tv('button-hover-secondary')}, ${tv('button-hover-secondary')})` } }
        }
      >
        ?
      </Box>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------------------------
// Search with grouped results
// ---------------------------------------------------------------------------------------------

function ChainFilter() {
  const { protocol } = useProContext();
  const { chainId, setChain } = useProFilter();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const chains = protocol.data?.chains ?? [];
  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label="Select chain"
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(e: React.MouseEvent<HTMLElement>) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
        sx={{ display: 'flex', alignItems: 'center', gap: '2px', border: 0, background: 'none', cursor: 'pointer', p: '4px', borderRadius: '10rem', color: 'fg-3', '&:hover': { bgcolor: 'button-hover', color: 'fg-1' } }}
      >
        {chainId ? (
          <ChainIcon chain={chains.find((c) => c.id === chainId)} size={20} />
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: '9px 9px', gap: '2px' }}>
            {chains.slice(0, 4).map((c) => (
              <Box key={c.id} sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: c.color }} />
            ))}
          </Box>
        )}
        <ChevronDownIcon sx={{ fontSize: 14 }} />
      </Box>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <Typography sx={{ px: '0.375rem', pt: 1, pb: 1, color: 'fg-4', textTransform: 'uppercase', fontSize: 11, fontWeight: 600 }}>Chains</Typography>
        <MenuItem
          onClick={() => {
            setChain(null);
            setAnchor(null);
          }}
          sx={{ gap: 2 }}
        >
          All Chains
          {chainId === null && <CheckIcon sx={{ fontSize: 16, color: 'purple-1', ml: 'auto' }} />}
        </MenuItem>
        {chains.map((c) => (
          <MenuItem
            key={c.id}
            onClick={() => {
              setChain(c.id);
              setAnchor(null);
            }}
            sx={{ gap: 2 }}
          >
            <ChainIcon chain={c} size={18} />
            {c.name}
            {chainId === c.id && <CheckIcon sx={{ fontSize: 16, color: 'purple-1', ml: 'auto' }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

type SearchProps = { autoFocus?: boolean; onDone?: () => void };

/** A variant with its own search never loads the Pro protocol snapshot. */
function SearchBox(props: SearchProps) {
  const variant = useShellVariant();
  return variant?.search ? <SearchBoxView {...props} snap={undefined} chainId={null} /> : <ProSearchBox {...props} />;
}

function ProSearchBox(props: SearchProps) {
  const { protocol } = useProContext();
  const { chainId } = useProFilter();
  return <SearchBoxView {...props} snap={protocol.data} chainId={chainId} />;
}

function SearchBoxView({ autoFocus, onDone, snap, chainId }: SearchProps & { snap: ReturnType<typeof useProContext>['protocol']['data']; chainId: number | null }) {
  const variant = useShellVariant();
  const router = useRouter();
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const term = q.trim().toLowerCase();
  const inChain = (id: number) => chainId === null || chainId === id;
  const assets = snap
    ? [...new Map(snap.reserves.filter((r) => inChain(r.chainId)).map((r) => [r.symbol, r])).values()].filter((r) => !term || r.symbol.toLowerCase().includes(term) || r.name.toLowerCase().includes(term)).slice(0, 6)
    : [];
  const hubs = snap ? snap.hubs.filter((h) => inChain(h.chainId) && (!term || h.name.toLowerCase().includes(term))).slice(0, 4) : [];
  const markets = snap ? snap.spokes.filter((s) => inChain(s.chainId) && (!term || s.name.toLowerCase().includes(term))).slice(0, 4) : [];
  const chainName = (id: number) => snap?.chains.find((c) => c.id === id)?.name ?? '';
  const go = (href: string) => {
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
    onDone?.();
    router.push(href);
  };
  const variantGroups = variant?.search ? variant.search.groups(term).filter((g) => g.items.length > 0) : null;
  const empty = variantGroups ? variantGroups.length === 0 : assets.length + hubs.length + markets.length === 0;

  const item = (key: string, icon: React.ReactNode, title: string, sub: string, href: string) => (
    <Box
      key={key}
      component="button"
      type="button"
      onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
      onClick={() => go(href)}
      sx={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', p: '0.5rem 0.625rem', border: 0, background: 'none', borderRadius: '0.625rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'fg-1', '&:hover, &:focus-visible': { bgcolor: 'selected', outline: 'none' } }}
    >
      {icon}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{title}</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'fg-3' }}>{sub}</Typography>
      </Box>
    </Box>
  );
  const group = (label: string, children: React.ReactNode[]) =>
    children.length > 0 && (
      <Box sx={{ mb: 1 }}>
        <Typography sx={{ color: 'fg-4', textTransform: 'uppercase', px: '0.625rem', pt: 1.5, pb: 0.5, fontSize: 11, fontWeight: 600 }}>{label}</Typography>
        {children}
      </Box>
    );

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 500 }}>
      <Box
        onClick={() => inputRef.current?.focus()}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          // Live: transparent 500x35 field, 99px radius, 1px border-1 ring, icon 13px in, 0.07s ring transition.
          height: 35,
          pl: '13px',
          pr: '12px',
          borderRadius: '99px',
          bgcolor: 'transparent',
          boxShadow: `0 0 0 1px ${tv('border-1')}`,
          transition: 'box-shadow 70ms ease-out',
          '&:focus-within': { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` },
        }}
      >
        <Box component="span" sx={{ display: 'flex', color: 'fg-4' }}>
          <PISearch />
        </Box>
        <InputBase
          inputRef={inputRef}
          type="search"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={variant?.search?.placeholder ?? 'Search assets, hubs and markets'}
          inputProps={{ 'aria-label': variant?.search?.placeholder ?? 'Search assets, hubs and markets', 'aria-keyshortcuts': '/' }}
          sx={{ flex: 1, fontSize: '0.875rem', '& input': { p: 0 }, '& input::placeholder': { color: 'fg-4', opacity: 1 }, '& input::-webkit-search-cancel-button': { display: 'none' } }}
        />
        {/* Live: the chain filter replaces the '/' hint while the search is open (both fade 70ms). */}
        {open && !variantGroups ? (
          <ChainFilter />
        ) : open ? null : (
          <Box component="span" aria-hidden sx={{ display: { xs: 'none', md: 'inline-flex' }, alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '4px', bgcolor: 'bg-2', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}`, color: 'fg-4', fontSize: 14, lineHeight: '14px' }}>
            /
          </Box>
        )}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: 'calc(100% + 16px)',
          left: 0,
          right: 0,
          zIndex: 30,
          p: '0.375rem',
          borderRadius: '16px',
          bgcolor: 'bg-3',
          boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}`,
          maxHeight: 740,
          overflowY: 'auto',
          opacity: open ? 1 : 0,
          transform: open ? 'none' : 'translateY(-1px) scale(0.99)',
          transformOrigin: '50% 0',
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity 150ms ease, transform ${motion.duration.snappy}ms ${motion.easing.snappy}`,
        }}
        role="listbox"
        aria-label="Search results"
      >
        {(snap || variantGroups) && empty && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>No Results Found for “{q}”</Typography>
            <Typography sx={{ color: 'fg-3', fontSize: '0.8125rem' }}>Try adjusting your search</Typography>
          </Box>
        )}
        {variantGroups?.map((g) => (
          <React.Fragment key={g.label}>{group(g.label, g.items.map((it) => item(it.key, it.icon, it.title, it.sub, it.href)))}</React.Fragment>
        ))}
        {!variantGroups && group(
          'Assets',
          assets.map((r) => item(`a-${r.symbol}`, <TokenIcon symbol={r.symbol} size={28} />, r.symbol, r.name, proRoutes.token(r.symbol)))
        )}
        {!variantGroups && group(
          'Hubs',
          hubs.map((h) => item(`h-${h.id}`, <HubMarketIcon kind="hub" label={h.name} />, `${h.name} Hub`, `on ${chainName(h.chainId)}`, proRoutes.hub(h.id)))
        )}
        {!variantGroups && group(
          'Markets',
          markets.map((s) => item(`m-${s.id}`, <HubMarketIcon kind="market" label={s.name} />, `${s.name} Market`, `on ${chainName(s.chainId)}`, proRoutes.market(s.id)))
        )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Account button + preferences
// ---------------------------------------------------------------------------------------------

function AccountButton() {
  const { account, kind, openConnect, disconnect, connect } = useWallet();
  const settings = useSettings();
  const { mode, setMode } = useColorScheme();
  const ds = useDataSource();
  const qc = useQueryClient();
  const notice = useNotice();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [copied, setCopied] = React.useState(false);
  const hydrated = useWallet((s) => s.hydrated);

  if (!hydrated) return <Box sx={{ width: 150, height: 36, borderRadius: '18px', bgcolor: 'border-1' }} />;
  if (!account)
    return (
      <ProButton variant="primary" onClick={openConnect}>
        Get Started
      </ProButton>
    );
  const other = kind === 'demo' ? 'fresh' : 'demo';
  return (
    <>
      <ProButton variant="secondary" onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="true" aria-expanded={anchor ? 'true' : undefined} prefixIcon={<AddressAvatar address={account} size={18} />}>
        {shortAddress(account)}
      </ProButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { minWidth: 280, borderRadius: '1rem !important' } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: '0.5rem', py: 2 }}>
          <AddressAvatar address={account} size={36} />
          <Box>
            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>{kind ? DEMO_ACCOUNTS[kind].label : 'Demo account'}</Typography>
            <Typography sx={{ color: 'fg-3', fontSize: '0.75rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{shortAddress(account)} · not a real wallet</Typography>
          </Box>
        </Box>
        <MenuItem
          onClick={() => {
            void navigator.clipboard?.writeText(account).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          <ListItemIcon>
            <CopyIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText>{copied ? 'Copied Address' : 'Copy Address'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            connect(other);
            setAnchor(null);
          }}
        >
          <ListItemIcon>
            <SwapIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText>Switch to {DEMO_ACCOUNTS[other].label.toLowerCase()}</ListItemText>
        </MenuItem>
        <Divider />
        <Typography sx={{ px: '0.375rem', pt: 1, pb: 1, color: 'fg-4', textTransform: 'uppercase', fontSize: 11, fontWeight: 600 }}>Theme</Typography>
        <Box sx={{ display: 'flex', gap: 1, px: '0.375rem', pb: 1 }}>
          {(
            [
              ['light', 'Light', <SunIcon key="l" sx={{ fontSize: 16 }} />],
              ['dark', 'Dark', <MoonIcon key="d" sx={{ fontSize: 16 }} />],
              ['system', 'System', <MonitorIcon key="s" sx={{ fontSize: 16 }} />],
            ] as const
          ).map(([k, label, icon]) => (
            <ProButton key={k} size="sm" variant={(mode ?? 'system') === k ? 'primary' : 'tertiary'} prefixIcon={icon} onClick={() => setMode(k)} sx={{ flex: 1 }}>
              {label}
            </ProButton>
          ))}
        </Box>
        <Divider />
        <Typography sx={{ px: '0.375rem', pt: 1, pb: 1, color: 'fg-4', textTransform: 'uppercase', fontSize: 11, fontWeight: 600 }}>Demo controls</Typography>
        <MenuItem role="menuitemcheckbox" aria-checked={settings.simulateFailures} onClick={() => settings.set({ simulateFailures: !settings.simulateFailures })}>
          <ListItemText secondary="Every simulated transaction will fail" slotProps={{ secondary: { sx: { fontSize: '0.75rem', color: 'fg-3' } } }}>
            Simulate failures
          </ListItemText>
          <Switch checked={settings.simulateFailures} tabIndex={-1} sx={{ ml: 3 }} slotProps={{ input: { 'aria-hidden': true } }} />
        </MenuItem>
        <MenuItem
          onClick={async () => {
            setAnchor(null);
            await ds.resetSimulation?.();
            void qc.invalidateQueries();
            notice.show('Demo data reset', 'All simulated balances, positions and history are back to their starting values.');
          }}
        >
          <ListItemText>Reset demo data</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            disconnect();
            setAnchor(null);
          }}
        >
          <ListItemIcon>
            <LogoutIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText>Disconnect</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

/** Live mobile bar: mark + PRO only, then Get Started, search and menu. */
function MobileHome() {
  const variant = useShellVariant();
  const link = (
    <Box component={Link} href={variant?.homeHref ?? proRoutes.home} sx={{ display: 'flex' }} aria-label={variant ? `${variant.brandLabel} home` : 'Aave Clone Pro home'}>
      {variant ? variant.compactBrand : <ProWordmark compact />}
    </Box>
  );
  if (!variant?.compactBrandAddon) return link;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {link}
      {variant.compactBrandAddon}
    </Box>
  );
}

/**
 * Live: entity pages (hub, market, reserve, token) and /preferences swap the mark for a 36px round
 * "Go back" button (/watch-address keeps the mark; both captured 2026-10-14 at 390px).
 */
function MobileHomeOrBack() {
  const pathname = usePathname();
  const router = useRouter();
  if (!/\/explore\/(hub|market|reserve|token)\/|^\/pro\/preferences(\/|$)/.test(pathname)) return <MobileHome />;
  return (
    <ProButton variant="secondary" size="square" aria-label="Go back" onClick={() => router.back()}>
      <PIBack size={20} />
    </ProButton>
  );
}

/** Calls onChange whenever the route changes (closes mobile overlays). */
function OnRouteChange({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  React.useEffect(() => onChange(), [pathname, onChange]);
  return null;
}

// ---------------------------------------------------------------------------------------------

export function ProShell({ children, variant }: { children: React.ReactNode; variant?: ShellVariant }) {
  return (
    <ShellVariantContext.Provider value={variant ?? null}>
      <ProShellInner>{children}</ProShellInner>
    </ShellVariantContext.Provider>
  );
}

function ProShellInner({ children }: { children: React.ReactNode }) {
  const variant = useShellVariant();
  const sidebarOpen = useSettings((s) => s.proSidebarOpen);
  const setSettings = useSettings((s) => s.set);
  const simulateFailures = useSettings((s) => s.simulateFailures);
  const desktop = useMediaQuery((t: import('@mui/material/styles').Theme) => t.breakpoints.up('md'));
  const [drawer, setDrawer] = React.useState(false);
  const [mobileSearch, setMobileSearch] = React.useState(false);
  const closeOverlays = React.useCallback(() => {
    setDrawer(false);
    setMobileSearch(false);
  }, []);
  const offset = desktop ? (sidebarOpen ? OPEN_W : CLOSED_W) : '0px';


  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'bg-1',
        color: 'fg-1',
        // B-1: settings pages (marker from SidebarBody) have no desktop topbar and an always-open sidebar.
        '@media (min-width: 900px)': {
          '&:has([data-pro-settings]) > header': { display: 'none' },
          '&:has([data-pro-settings]) > aside': { width: OPEN_W },
          '&:has([data-pro-settings]) > .pro-content': { pl: OPEN_W },
          // Live: under a sticky entity header the topbar's fade is not drawn over the Back link.
          '&:has([data-entity-header]) > header::before': { opacity: 0 },
          // Live desktop entity pages (market/hub/reserve): no 1px ring under the topbar.
          '&:has([data-entity-header]) > header': { boxShadow: 'none' },
        },
        // B-2: the Pro 404 (marker from Builder B's not-found.tsx) has no sidebar and no topbar.
        '&:has([data-pro-bare]) > aside, &:has([data-pro-bare]) > header': { display: 'none !important' },
        '&:has([data-pro-bare]) > .pro-content': { pl: '0 !important' },
      }}
    >
      <Sidebar open={sidebarOpen} onToggle={() => setSettings({ proSidebarOpen: !sidebarOpen })} />

      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: offset,
          zIndex: 1100,
          height: { xs: TOPBAR_H_MOBILE, md: TOPBAR_H },
          bgcolor: 'bg-1',
          boxShadow: `0 0 0 1px ${tv('border-1')}`,
          transition: `left ${DUR} ease-in-out`,
          '&::before': { content: '""', pointerEvents: 'none', position: 'absolute', top: '100%', left: 0, right: 0, height: '2rem', background: `linear-gradient(to bottom, ${tv('bg-1')}, transparent)` },
        }}
      >
        <Box sx={{ maxWidth: 'calc(90rem + 4rem)', mx: 'auto', height: '100%', px: { xs: '1rem', md: '2rem' }, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mr: 'auto' }}>
            <React.Suspense fallback={<MobileHome />}>
              <MobileHomeOrBack />
            </React.Suspense>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flex: 1, justifyContent: 'flex-start' }}>
            {(!variant?.hideSearch || variant?.search) && <SearchBox />}
          </Box>
          {simulateFailures && (
            <Typography component="span" sx={{ fontSize: '0.625rem', color: 'red-1', fontWeight: 600, letterSpacing: '0.04em', display: { xs: 'none', md: 'block' } }}>
              SIMULATING FAILURES
            </Typography>
          )}
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            {variant ? variant.topbarRight : <AccountButton />}
          </Box>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: '0.5rem' }}>
            {variant ? variant.topbarRight : <AccountButton />}
            {(!variant?.hideSearch || variant?.search) && (
              <ProButton variant="secondary" size="square" aria-label="Search assets" onClick={() => setMobileSearch((v) => !v)}>
                <SearchIcon sx={{ fontSize: 20 }} />
              </ProButton>
            )}
            <ProButton variant="secondary" size="square" aria-label="Open navigation menu" aria-expanded={drawer} onClick={() => setDrawer((v) => !v)}>
              <Box sx={{ position: 'relative', width: 20, height: 20 }}>
                {[5, 10, 15].map((y, i) => (
                  <Box
                    key={y}
                    sx={{
                      position: 'absolute',
                      left: 4,
                      width: 12,
                      height: '1.5px',
                      borderRadius: 1,
                      top: y - 0.75,
                      bgcolor: 'currentColor',
                      transition: `transform ${motion.duration.snappy}ms ${motion.easing.snappy}, opacity 150ms`,
                      transform: drawer ? (i === 0 ? 'translateY(5px) rotate(45deg)' : i === 2 ? 'translateY(-5px) rotate(-45deg)' : 'none') : 'none',
                      opacity: drawer && i === 1 ? 0 : 1,
                    }}
                  />
                ))}
              </Box>
            </ProButton>
          </Box>
        </Box>
        {mobileSearch && (
          <Box sx={{ display: { xs: 'block', md: 'none' }, px: '1rem', pb: 2, bgcolor: 'bg-1', animation: 'clone-fade-up 200ms ease both' }}>
            <SearchBox autoFocus onDone={() => setMobileSearch(false)} />
          </Box>
        )}
      </Box>

      <Drawer
        anchor="right"
        open={drawer && !desktop}
        onClose={() => setDrawer(false)}
        hideBackdrop
        sx={{ top: TOPBAR_H_MOBILE }}
        slotProps={{ paper: { sx: { top: TOPBAR_H_MOBILE, height: `calc(100dvh - ${TOPBAR_H_MOBILE})`, width: '100%', bgcolor: 'bg-1', boxShadow: 'none', borderRadius: 0, p: '0.5rem 0 4rem', overflowY: 'auto' } } }}
      >
        <NavList collapsed={false} mobile onNavigate={() => setDrawer(false)} />
      </Drawer>

      <Box
        className="pro-content"
        sx={{
          pl: offset,
          transition: `padding-left ${DUR} ease-in-out`,
        }}
      >
        <Box
          component="main"
          id="main"
          sx={{
            width: '100%',
            maxWidth: 'calc(90rem + 4rem)',
            mx: 'auto',
            px: { xs: '1rem', md: '2rem' },
            pt: { xs: `calc(${TOPBAR_H_MOBILE} + 1.25rem)`, md: `calc(${TOPBAR_H} + 2rem)` },
            pb: '8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: '1.75rem', md: '3rem' },
          }}
        >
          {children}
        </Box>
      </Box>

      <React.Suspense fallback={null}>
        <OnRouteChange onChange={closeOverlays} />
      </React.Suspense>
      <HelpFab />
      {variant ? (
        variant.hosts
      ) : (
        <>
          <ProTxModalHost />
          <ConnectWalletModal variant="pro" />
        </>
      )}
      <NoticeDialog pill />
    </Box>
  );
}
