'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import * as React from 'react';
import { ActivityIcon, CopyIcon, LogoutIcon, SwapIcon } from '@/shared/ui/Icons';
import { DEMO_ACCOUNTS, shortAddress, useWallet } from '@/shared/state/wallet';
import { ROUTES } from './nav';

/** Deterministic gradient avatar for an address (no external avatar service). */
export function AddressAvatar({ address, size = 20 }: { address: string; size?: number }) {
  const h = parseInt(address.slice(-6), 16) % 360;
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `conic-gradient(from 90deg, hsl(${h} 70% 60%), hsl(${(h + 90) % 360} 70% 55%), hsl(${(h + 200) % 360} 70% 60%), hsl(${h} 70% 60%))`,
      }}
    />
  );
}

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const { account, kind, openConnect, disconnect, connect } = useWallet();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  if (!account) {
    return (
      <Button variant="outlined" onClick={openConnect}>
        {compact ? 'Connect' : 'Connect Wallet'}
      </Button>
    );
  }

  const other = kind === 'demo' ? 'fresh' : 'demo';
  return (
    <>
      <Button
        variant="outlined"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="true"
        aria-expanded={anchor ? 'true' : undefined}
        sx={{ gap: '0.5rem', pl: '0.62rem' }}
      >
        <AddressAvatar address={account} />
        <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {shortAddress(account)}
        </Box>
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 260 } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: '0.5rem', py: 2 }}>
          <AddressAvatar address={account} size={36} />
          <Box>
            <Typography variant="subheader1">{kind ? DEMO_ACCOUNTS[kind].label : 'Demo account'}</Typography>
            <Typography variant="caption" color="fg-3" component="p" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {shortAddress(account)} · not a real wallet
            </Typography>
          </Box>
        </Box>
        <Divider />
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
          <ListItemText>{copied ? 'Copied!' : 'Copy address'}</ListItemText>
        </MenuItem>
        <MenuItem component={Link} href={ROUTES.history} onClick={() => setAnchor(null)}>
          <ListItemIcon>
            <ActivityIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText>View transactions</ListItemText>
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
