/**
 * Which data source Mini-Aave uses: "mock" (the in-browser engine, the default) or "chain" (the
 * real contracts through wagmi + MetaMask).
 *
 * Order of precedence: the toggle in the wallet menu (saved in localStorage) → the
 * NEXT_PUBLIC_MINI_SOURCE env value → "mock". Anything unexpected falls back to "mock", so a typo
 * can never point a demo at a chain by accident.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SourceMode = 'mock' | 'chain';

/** Inlined at build time by Next (NEXT_PUBLIC_*). */
export const ENV_SOURCE = process.env.NEXT_PUBLIC_MINI_SOURCE;

export function resolveSourceMode(envValue: string | undefined | null, stored: unknown): SourceMode {
  if (stored === 'mock' || stored === 'chain') return stored;
  return envValue?.trim().toLowerCase() === 'chain' ? 'chain' : 'mock';
}

interface MiniSettingsState {
  /** null = follow the env default */
  stored: SourceMode | null;
  setSource: (mode: SourceMode) => void;
  /** Chain mode without a (supported) wallet: the network to read from. null = the env target. */
  readChain: number | null;
  setReadChain: (chainId: number | null) => void;
}

export const useMiniSettings = create<MiniSettingsState>()(
  persist(
    (set) => ({
      stored: null,
      setSource: (mode) => set({ stored: mode }),
      readChain: null,
      setReadChain: (readChain) => set({ readChain }),
    }),
    // Hydrated by MiniProviders after the first render, so the first client render matches the
    // server's (the env default) and React doesn't report a hydration mismatch.
    { name: 'minilend-source-v1', skipHydration: true },
  ),
);

/** Current mode, outside React (the data-source switch). */
export const getSourceMode = (): SourceMode => resolveSourceMode(ENV_SOURCE, useMiniSettings.getState().stored);

/** The network picked for chain-mode reads (null = env target). */
export const getPreferredChain = () => useMiniSettings.getState().readChain;
export const usePreferredChain = () => useMiniSettings((s) => s.readChain);

/** Current mode, inside React (re-renders on toggle). */
export const useSourceMode = (): SourceMode => useMiniSettings((s) => resolveSourceMode(ENV_SOURCE, s.stored));
