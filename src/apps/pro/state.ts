'use client';

import { create } from 'zustand';
import { useProProtocol, useProUser } from '@/data/hooks';
import { useWallet } from '@/shared/state/wallet';
import { useSettings } from '@/shared/state/settings';

export type ProModalType = 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'collateral' | 'rate';

interface ProModalState {
  modal: { type: ProModalType; reserveId: string } | null;
  open: (m: { type: ProModalType; reserveId: string }) => void;
  close: () => void;
}

export const useProModal = create<ProModalState>((set) => ({
  modal: null,
  open: (m) => set({ modal: m }),
  close: () => set({ modal: null }),
}));

/** Selected chain filter for the Pro topbar/explore pages (null = All Chains). */
interface ProFilterState {
  chainId: number | null;
  setChain: (id: number | null) => void;
}

export const useProFilter = create<ProFilterState>((set) => ({ chainId: null, setChain: (chainId) => set({ chainId }) }));

export function useProContext() {
  const account = useWallet((s) => s.account);
  const walletHydrated = useWallet((s) => s.hydrated);
  const settingsHydrated = useSettings((s) => s.hydrated);
  const protocol = useProProtocol();
  const user = useProUser(account);
  return { account, hydrated: walletHydrated && settingsHydrated, protocol, user };
}

export const proRoutes = {
  home: '/pro',
  activity: '/pro/activity',
  deposit: '/pro/explore/deposit',
  borrow: '/pro/explore/borrow',
  insights: '/pro/insights',
  /** reserve id `${chain}:${hub}:${spoke}:${symbol}` → /pro/explore/reserve/chain/hub/spoke/symbol */
  reserve: (reserveId: string) => `/pro/explore/reserve/${reserveId.split(':').map(encodeURIComponent).join('/')}`,
  hub: (hubId: string) => `/pro/explore/hub/${hubId.replace(':', '-')}`,
  market: (spokeId: string) => `/pro/explore/market/${spokeId.replace(':', '-')}`,
  token: (symbol: string) => `/pro/explore/token/${encodeURIComponent(symbol)}`,
  position: (positionId: string) => `/pro/position/${encodeURIComponent(positionId)}`,
};

/** "ethereum-core" → "ethereum:core" (URL-safe ids for hubs and markets). */
export const fromSlugId = (slug: string) => {
  const i = slug.indexOf('-');
  return i > 0 ? `${slug.slice(0, i)}:${slug.slice(i + 1)}` : slug;
};
