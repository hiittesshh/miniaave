'use client';

/**
 * Mock wallet for Mini-Aave: connect as one of the §3 test accounts (addresses only; the app never
 * holds a private key), disconnect, or pretend to be on the wrong chain (§8: the UI must then offer
 * "Switch network" instead of the action buttons).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LOCAL_CHAIN_ID } from './config';
import type { Address } from './types';

interface MiniWalletState {
  account: Address | null;
  /** The chain the mock wallet is on. 31337 = the contracts' chain; anything else = wrong network. */
  chainId: number;
  connect: (account: Address) => void;
  disconnect: () => void;
  setChain: (chainId: number) => void;
}

/** A chain without the contracts, used by the "wrong network" toggle. */
export const WRONG_CHAIN_ID = 1;

export const useMiniWallet = create<MiniWalletState>()(
  persist(
    (set) => ({
      account: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      chainId: LOCAL_CHAIN_ID,
      connect: (account) => set({ account }),
      disconnect: () => set({ account: null }),
      setChain: (chainId) => set({ chainId }),
    }),
    { name: 'minilend-wallet-v1', skipHydration: true }, // hydrated by MiniProviders (see settings.ts)
  ),
);

// Screens read the wallet through data/useWallet.ts, which uses this store in mock mode only.
