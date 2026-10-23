'use client';

import { create } from 'zustand';
import { useMarket, useMarkets, useUserMarketState } from '@/data/hooks';
import { useSettings } from '@/shared/state/settings';
import { useWallet } from '@/shared/state/wallet';

export type StdModalType = 'supply' | 'withdraw' | 'borrow' | 'repay' | 'collateral' | 'emode' | 'faucet' | 'risk';

interface StdModalState {
  modal: { type: StdModalType; symbol?: string; marketId: string; native?: boolean } | null;
  open: (m: NonNullable<StdModalState['modal']>) => void;
  close: () => void;
}

/** Which transaction modal is open (one at a time, like the reference's modal context). */
export const useStdModal = create<StdModalState>((set) => ({
  modal: null,
  open: (m) => set({ modal: m }),
  close: () => set({ modal: null }),
}));

/**
 * Current market + connected account + their data. Every Standard screen starts here.
 * The market follows the "Test Mode" setting: a mainnet market is never shown in test mode.
 */
export function useStdContext() {
  const settingsHydrated = useSettings((s) => s.hydrated);
  const storedMarketId = useSettings((s) => s.marketId);
  const testnetMode = useSettings((s) => s.testnetMode);
  const walletHydrated = useWallet((s) => s.hydrated);
  const account = useWallet((s) => s.account);
  const markets = useMarkets();

  const list = markets.data ?? [];
  const stored = list.find((m) => m.id === storedMarketId);
  const fallback = list.find((m) => m.isTestnet === testnetMode);
  const marketId = stored && stored.isTestnet === testnetMode ? stored.id : (fallback?.id ?? storedMarketId);

  const market = useMarket(marketId);
  const user = useUserMarketState(marketId, account);
  return {
    hydrated: settingsHydrated && walletHydrated,
    account,
    marketId,
    markets: list,
    testnetMode,
    market,
    user,
  };
}
