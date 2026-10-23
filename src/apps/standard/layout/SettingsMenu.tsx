'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from '@/shared/ui/Icons';
import { useSettings } from '@/shared/state/settings';
import { useNotice } from '@/shared/state/notice';
import { useMarkets } from '@/data/hooks';
import { useDataSource } from '@/data/DataSourceProvider';

const THEMES = [
  { key: 'system', label: 'System', icon: <MonitorIcon sx={{ fontSize: '1.125rem' }} /> },
  { key: 'light', label: 'Light', icon: <SunIcon sx={{ fontSize: '1.125rem' }} /> },
  { key: 'dark', label: 'Dark', icon: <MoonIcon sx={{ fontSize: '1.125rem' }} /> },
] as const;

type View = 'root' | 'theme' | 'language';

/** Settings rows, shared by the desktop menu and the mobile drawer. */
export function useSettingsActions() {
  const settings = useSettings();
  const markets = useMarkets();
  const router = useRouter();
  const qc = useQueryClient();
  const notice = useNotice();
  const ds = useDataSource();

  const toggleTestnet = () => {
    const next = !settings.testnetMode;
    const target = (markets.data ?? []).find((m) => m.isTestnet === next);
    settings.set({ testnetMode: next, marketId: target?.id ?? settings.marketId });
    router.push('/');
  };
  const reset = async () => {
    await ds.resetSimulation?.();
    void qc.invalidateQueries();
    notice.show('Demo data reset', 'All simulated balances, positions and history are back to their starting values.');
  };
  return { settings, toggleTestnet, reset };
}

export function SettingsMenu() {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [view, setView] = React.useState<View>('root');
  const { mode, setMode } = useColorScheme();
  const { settings, toggleTestnet, reset } = useSettingsActions();
  const close = () => setAnchor(null);
  const themeLabel = THEMES.find((t) => t.key === (mode ?? 'system'))?.label ?? 'System';

  const navRow = (label: string, value: string, onClick: () => void) => (
    <MenuItem onClick={onClick}>
      <ListItemText>{label}</ListItemText>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'fg-3', ml: 4 }}>
        <Typography variant="description" color="fg-3">
          {value}
        </Typography>
        <ChevronRightIcon sx={{ fontSize: '1.25rem', color: 'fg-chevron' }} />
      </Box>
    </MenuItem>
  );

  return (
    <>
      <Button
        variant="outlined"
        aria-label="settings"
        aria-haspopup="true"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(e) => {
          setView('root');
          setAnchor(e.currentTarget);
        }}
        sx={{ p: '0 0.5rem', minWidth: 'unset', ml: '0.62rem' }}
      >
        <SettingsIcon sx={{ fontSize: 20, color: 'fg-2' }} />
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 260 } } }}
      >
        {view === 'root' && [
          <MenuItem key="testnet" onClick={toggleTestnet}>
            <ListItemText>Test Mode</ListItemText>
            <Switch checked={settings.testnetMode} tabIndex={-1} slotProps={{ input: { 'aria-label': 'Test Mode' } }} />
          </MenuItem>,
          <Box key="lang">{navRow('Language', 'English', () => setView('language'))}</Box>,
          <Box key="theme">{navRow('Theme', themeLabel, () => setView('theme'))}</Box>,
          <Divider key="d1" />,
          <Typography key="label" variant="subheader2" color="fg-4" sx={{ px: '0.38rem', pt: 1, pb: 1, textTransform: 'uppercase', fontSize: '0.6875rem' }}>
            Demo controls
          </Typography>,
          <MenuItem key="fail" onClick={() => settings.set({ simulateFailures: !settings.simulateFailures })}>
            <ListItemText secondary="Every simulated transaction will fail" slotProps={{ secondary: { sx: { fontSize: '0.75rem', color: 'fg-3' } } }}>
              Simulate failures
            </ListItemText>
            <Switch checked={settings.simulateFailures} tabIndex={-1} slotProps={{ input: { 'aria-label': 'Simulate failures' } }} sx={{ ml: 3 }} />
          </MenuItem>,
          <MenuItem
            key="reset"
            onClick={() => {
              void reset();
              close();
            }}
          >
            <ListItemText>Reset demo data</ListItemText>
          </MenuItem>,
        ]}
        {view !== 'root' && (
          <MenuItem onClick={() => setView('root')} sx={{ color: 'fg-3', mb: '4px' }}>
            <ListItemIcon sx={{ color: 'fg-chevron', width: '1.25rem', mr: '0.5rem' }}>
              <ChevronLeftIcon sx={{ fontSize: '1.125rem' }} />
            </ListItemIcon>
            <ListItemText>Back</ListItemText>
          </MenuItem>
        )}
        {view === 'theme' &&
          THEMES.map((t) => (
            <MenuItem key={t.key} onClick={() => setMode(t.key)}>
              <ListItemIcon sx={{ color: 'fg-3', width: '1.25rem', mr: '0.5rem' }}>{t.icon}</ListItemIcon>
              <ListItemText>{t.label}</ListItemText>
              {(mode ?? 'system') === t.key && <CheckIcon sx={{ fontSize: '1.25rem', color: 'purple-1' }} />}
            </MenuItem>
          ))}
        {view === 'language' && (
          <MenuItem onClick={() => setView('root')}>
            <ListItemText>English</ListItemText>
            <CheckIcon sx={{ fontSize: '1.25rem', color: 'purple-1' }} />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
