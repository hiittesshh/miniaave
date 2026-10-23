'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEMO_ACCOUNT, FRESH_ACCOUNT } from '@/data/mock/seed/standard';

/**
 * The mock wallet. "Connecting" just picks one of two obviously fake demo addresses: there is no
 * wallet library, no signing and no RPC. A real integration would replace this store with
 * wagmi/viem state, and the rest of the UI would keep reading `account`.
 */
export type DemoAccountKind = 'demo' | 'fresh';

export const DEMO_ACCOUNTS: Record<DemoAccountKind, { address: string; label: string; description: string }> = {
  demo: {
    address: DEMO_ACCOUNT,
    label: 'Demo account',
    description: 'Comes with example supplies, borrows and wallet balances.',
  },
  fresh: {
    address: FRESH_ACCOUNT,
    label: 'Fresh demo account',
    description: 'Wallet balances only, no positions yet. Good for the empty states.',
  },
};

interface WalletState {
  hydrated: boolean;
  account: string | null;
  kind: DemoAccountKind | null;
  connectOpen: boolean;
  openConnect: () => void;
  closeConnect: () => void;
  connect: (kind: DemoAccountKind) => void;
  disconnect: () => void;
}

export const useWallet = create<WalletState>()(
  persist(
    (set) => ({
      hydrated: false,
      account: null,
      kind: null,
      connectOpen: false,
      openConnect: () => set({ connectOpen: true }),
      closeConnect: () => set({ connectOpen: false }),
      connect: (kind) => set({ account: DEMO_ACCOUNTS[kind].address, kind, connectOpen: false }),
      disconnect: () => set({ account: null, kind: null }),
    }),
    {
      name: 'aave-clone-wallet',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ account: s.account, kind: s.kind }),
      onRehydrateStorage: () => () => useWallet.setState({ hydrated: true }),
    }
  )
);

/** Short address for display, reference format: 0x44...2c18 */
export const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`;
