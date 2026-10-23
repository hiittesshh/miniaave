'use client';

/**
 * wagmi for the /mini routes ONLY (the root providers, /pro and / are untouched). It sits inside
 * the app's existing QueryClientProvider, so wagmi and our hooks share one TanStack Query cache.
 *
 * The wallet is only reconnected in chain mode: mock mode never touches window.ethereum.
 */
import * as React from 'react';
import { WagmiProvider } from 'wagmi';
import { reconnect } from 'wagmi/actions';
import { useMiniSettings, useSourceMode } from '../data/settings';
import { useMiniWallet } from '../data/wallet';
import { useMockFunding } from '../data/funding';
import { wagmiConfig } from '../data/wagmi';

export function MiniProviders({ children }: { children: React.ReactNode }) {
  const mode = useSourceMode();
  // Saved settings (data source, read network, mock wallet) load after hydration: layout effects run
  // before any query's passive effect, so no request goes out with the default settings.
  React.useLayoutEffect(() => {
    void useMiniSettings.persist.rehydrate();
    void useMiniWallet.persist.rehydrate();
    void useMockFunding.persist.rehydrate();
  }, []);
  React.useEffect(() => {
    if (mode === 'chain') void reconnect(wagmiConfig);
  }, [mode]);
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      {children}
    </WagmiProvider>
  );
}
