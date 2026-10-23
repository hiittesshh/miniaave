'use client';

import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import * as React from 'react';
import type { AssetCategory } from '@/data/types';
import { ChevronUpDownIcon } from '@/shared/ui/Icons';

export const CATEGORIES: { key: AssetCategory; label: string }[] = [
  { key: 'stablecoin', label: 'Stablecoins' },
  { key: 'eth-correlated', label: 'ETH Correlated' },
  { key: 'btc-correlated', label: 'BTC Correlated' },
];

/** "All Categories ⌃⌄" multiselect (Markets toolbar and both asset lists on the Dashboard). */
export function CategorySelect({ value, onChange, size = 'medium' }: { value: AssetCategory[]; onChange: (v: AssetCategory[]) => void; size?: 'small' | 'medium' }) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const label = value.length === 0 ? 'All Categories' : value.length === 1 ? CATEGORIES.find((c) => c.key === value[0])?.label : `${value.length} Categories`;
  return (
    <>
      <Button
        variant="outlined"
        size={size}
        endIcon={<ChevronUpDownIcon sx={{ color: 'fg-3' }} />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="true"
        aria-expanded={anchor ? 'true' : undefined}
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={() => onChange([])} sx={{ gap: 2 }}>
          <Checkbox size="small" checked={value.length === 0} sx={{ p: 0 }} />
          All Categories
        </MenuItem>
        <Divider />
        {CATEGORIES.map((c) => (
          <MenuItem key={c.key} onClick={() => onChange(value.includes(c.key) ? value.filter((v) => v !== c.key) : [...value, c.key])} sx={{ gap: 2 }}>
            <Checkbox size="small" checked={value.includes(c.key)} sx={{ p: 0 }} />
            {c.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
