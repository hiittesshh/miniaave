'use client';

import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, useColorScheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appTheme } from '@/shared/theme/theme';
import { DataSourceProvider } from '@/data/DataSourceProvider';
import { MockLendingDataSource } from '@/data/mock/mockSource';
import { useSettings } from '@/shared/state/settings';
import { useWallet } from '@/shared/state/wallet';

/** `?colorScheme=light|dark|system` sets the theme (handy for demo links and screenshots). */
function ColorSchemeFromUrl() {
  const { setMode } = useColorScheme();
  React.useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('colorScheme');
    if (v === 'light' || v === 'dark' || v === 'system') setMode(v);
  }, [setMode]);
  return null;
}

/**
 * Client-side providers: theme (CSS-variables mode), TanStack Query, and the data source.
 *
 * To go live, replace `MockLendingDataSource` with a chain-backed implementation of
 * `LendingDataSource`. That is the only line in the app that knows data is simulated.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 15_000 } },
      })
  );
  const [source] = React.useState(
    () => new MockLendingDataSource({ shouldFail: () => useSettings.getState().simulateFailures })
  );

  React.useEffect(() => {
    // Persisted demo preferences load after first paint so server and client HTML match.
    void Promise.all([useSettings.persist.rehydrate(), useWallet.persist.rehydrate()]).then(() => {
      // Shareable demo links: ?demoAccount=demo|fresh connects a demo account, ?testMode=1 turns
      // on test mode. Both are demo conveniences; they never touch a real wallet.
      const params = new URLSearchParams(window.location.search);
      const acc = params.get('demoAccount');
      if (acc === 'demo' || acc === 'fresh') useWallet.getState().connect(acc);
      if (acc === 'none') useWallet.getState().disconnect();
      if (params.get('testMode') === '1') useSettings.getState().set({ testnetMode: true, marketId: 'base_sepolia' });
      if (params.get('testMode') === '0') useSettings.getState().set({ testnetMode: false, marketId: 'core' });
    });
  }, []);

  return (
    <ThemeProvider theme={appTheme} defaultMode="system" disableTransitionOnChange>
      <ColorSchemeFromUrl />
      <CssBaseline enableColorScheme />
      <QueryClientProvider client={queryClient}>
        <DataSourceProvider source={source}>{children}</DataSourceProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
