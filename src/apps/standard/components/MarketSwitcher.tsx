'use client';

import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Popover from '@mui/material/Popover';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import * as React from 'react';
import Link from 'next/link';
import type { MarketInfo } from '@/data/types';
import { ArrowUpRightIcon, ChevronUpDownIcon, SearchIcon } from '@/shared/ui/Icons';
import { useSettings } from '@/shared/state/settings';
import { DARK, tv } from '@/shared/theme/tokens';
import { motion } from '@/shared/theme/motion';
import { useStdContext } from '../state';
import { marketDisplay } from '../display';

/** Switcher sections, in the reference's order (Ethereum instances first, then L1/L2 networks). */
const SECTIONS: { category: MarketInfo['category']; label: string }[] = [
  { category: 'ethereum', label: 'Ethereum' },
  { category: 'l1', label: 'L1 Networks' },
  { category: 'l2', label: 'L2 Networks' },
  { category: 'testnet', label: 'Testnets' },
];

/** Neutral market badge (no network logos): coloured rounded square with the market initial. */
export function MarketBadge({ market, size = 28 }: { market: Pick<MarketInfo, 'title' | 'badgeColor' | 'isTestnet'>; size?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.3)}px`,
        bgcolor: market.badgeColor,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.46,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {marketDisplay(market).name[0]}
      {market.isTestnet && (
        <Box sx={{ position: 'absolute', right: -3, bottom: -3, width: size * 0.5, height: size * 0.5, borderRadius: '50%', bgcolor: '#29B6F6', fontSize: size * 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 2px ${tv('bg-3')}` }}>
          {marketDisplay(market).testChain?.[0] ?? 'T'}
        </Box>
      )}
    </Box>
  );
}

/**
 * Market switcher (reference MarketSwitcher): the big market title in the page header opens a
 * popover (bottom sheet on phones) with search and market sections. Includes the link to the
 * Pro (V4) clone, as the reference does.
 */
export function MarketSwitcher({ hideDescription = false }: { hideDescription?: boolean }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { markets, marketId, testnetMode } = useStdContext();
  const setSettings = useSettings((s) => s.set);
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [rowEl, setRowEl] = React.useState<HTMLDivElement | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const current = markets.find((m) => m.id === marketId);

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const select = (id: string) => {
    setSettings({ marketId: id });
    close();
  };

  const visible = markets.filter((m) => m.isTestnet === testnetMode && m.title.toLowerCase().includes(query.toLowerCase()));
  const showPro = !testnetMode && 'aave pro v4'.includes(query.toLowerCase());

  const row = (key: string, content: React.ReactNode, selected: boolean, onClick: () => void, href?: string) => (
    <Box
      key={key}
      role="button"
      tabIndex={0}
      component={href ? Link : 'div'}
      href={href}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: '2.5rem',
        px: '0.75rem',
        width: isMobile ? '50%' : '33.33%',
        borderRadius: '8px',
        cursor: 'pointer',
        position: 'relative',
        isolation: 'isolate',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '1px',
          zIndex: -1,
          borderRadius: '8px',
          transform: selected ? 'scale(1)' : 'scale(0.96)',
          bgcolor: selected ? 'selected' : 'transparent',
          transition: `transform ${motion.duration.hover}ms ease, background-color ${motion.duration.hover}ms ease`,
        },
        '&:hover::before, &:focus-visible::before': { bgcolor: 'selected', transform: 'scale(1)' },
        outline: 'none',
      }}
    >
      {content}
    </Box>
  );

  const body = (
    <>
      <Box sx={{ height: '3.23rem', px: '1rem', boxShadow: isMobile ? 'none' : `0 0 0 1px ${tv('border-1')}`, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <InputBase
          inputRef={searchRef}
          placeholder="Search markets..."
          inputProps={{ 'aria-label': 'Search markets' }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          startAdornment={<SearchIcon sx={{ fontSize: 18, color: 'fg-4', mr: '0.5rem' }} />}
          sx={{ flex: 1, fontSize: '0.875rem', '& input::placeholder': { color: 'fg-4', opacity: 1 } }}
        />
      </Box>
      <Box sx={{ p: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
        {SECTIONS.map((section) => {
          const items = visible.filter((m) => m.category === section.category);
          const withPro = section.category === 'ethereum' && showPro;
          if (!items.length && !withPro) return null;
          return (
        <Box key={section.category} sx={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Typography sx={{ color: 'fg-3', fontSize: '0.6875rem', fontWeight: 600, lineHeight: '120%', textTransform: 'uppercase' }}>
            {section.label}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {items.map((m) =>
              row(
                m.id,
                <>
                  <MarketBadge market={m} size={24} />
                  <Typography noWrap variant="h5" sx={{ ml: '0.75rem', flex: 1, minWidth: 0 }}>
                    {m.title}
                  </Typography>
                </>,
                m.id === marketId,
                () => select(m.id)
              )
            )}
            {withPro &&
              row(
                'pro',
                <>
                  <MarketBadge market={{ title: 'Pro', badgeColor: tv('purple-1'), isTestnet: false }} size={24} />
                  <Typography noWrap variant="h5" sx={{ ml: '0.75rem', minWidth: 0 }}>
                    Aave Pro
                  </Typography>
                  <Box component="span" sx={{ ml: '6px', width: 26, height: 16, borderRadius: '50px', bgcolor: 'rgba(151, 142, 255, 0.1)', color: '#978eff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                    V4
                  </Box>
                  <ArrowUpRightIcon sx={{ fontSize: 16, color: 'fg-3', ml: 'auto' }} />
                </>,
                false,
                close,
                '/pro'
              )}
          </Box>
        </Box>
          );
        })}
        {visible.length === 0 && !showPro && (
          <Typography variant="description" color="fg-2" sx={{ textAlign: 'center', py: 3 }}>
            No markets found
          </Typography>
        )}
      </Box>
    </>
  );

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Select market"
        onClick={() => setOpen(true)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        sx={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', color: 'fg-1', borderRadius: '8px', outline: 'none', '&:focus-visible .mtitle': { textDecoration: 'underline' } }}
      >
        <Box ref={setRowEl} sx={{ display: 'flex', alignItems: 'center' }}>
          {current ? <MarketBadge market={current} /> : <Box sx={{ width: 28, height: 28 }} />}
          <Typography
            className="mtitle"
            variant="h2"
            component="h1"
            sx={{
              fontSize: '1.875rem',
              ml: '0.75rem',
              mr: '0.5rem',
              backgroundImage: hover || open ? `linear-gradient(100deg, ${tv('fg-1')} 35%, ${tv('purple-1')} 50%, ${tv('fg-1')} 65%)` : 'none',
              backgroundSize: '250% 100%',
              backgroundClip: hover || open ? 'text' : undefined,
              WebkitBackgroundClip: hover || open ? 'text' : undefined,
              color: hover || open ? 'transparent' : 'fg-1',
              animation: hover || open ? 'clone-shimmer 2.4s linear infinite' : 'none',
              '@keyframes clone-shimmer': { from: { backgroundPosition: '150% 0' }, to: { backgroundPosition: '-100% 0' } },
            }}
          >
            {current ? marketDisplay(current).name : ' '}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '1.5rem', px: '0.625rem', borderRadius: '1.5rem', mt: '0.3125rem', background: 'rgba(147, 145, 254, 0.16)' }}>
            <Typography sx={{ color: '#8374FF', fontSize: '1rem', fontWeight: 600, lineHeight: '1.125rem' }}>V3</Typography>
          </Box>
          <ChevronUpDownIcon sx={{ ml: 1, color: 'fg-3', mt: '0.3125rem', transition: `transform ${motion.duration.hoverSlow}ms ease`, transform: open ? 'scale(1.1)' : 'none' }} />
        </Box>
        {!hideDescription && current?.description && (
          <Typography variant="description" sx={{ color: 'fg-3', mt: '1rem' }}>
            {current.description}
          </Typography>
        )}
      </Box>

      {isMobile ? (
        <SwipeableDrawer
          anchor="bottom"
          open={open}
          onClose={close}
          onOpen={() => setOpen(true)}
          disableSwipeToOpen
          slotProps={{ paper: { sx: { bgcolor: 'bg-3', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' } } }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
            <Box sx={{ width: 36, height: 4, borderRadius: '2px', bgcolor: 'border-2' }} />
          </Box>
          {body}
        </SwipeableDrawer>
      ) : (
        <Popover
          open={open}
          anchorEl={rowEl}
          onClose={close}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            transition: { onEntered: () => searchRef.current?.focus() } as never,
            paper: { variant: 'modal', elevation: 0, sx: { width: '34rem', bgcolor: 'bg-3', [DARK]: { bgcolor: 'bg-3' }, overflow: 'hidden', display: 'flex', flexDirection: 'column', mt: '1.25rem', ml: '-1rem' } },
          }}
        >
          {body}
        </Popover>
      )}
    </>
  );
}
