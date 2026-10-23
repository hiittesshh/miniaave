/**
 * The simulated chain's storage: one Zustand store holding the whole `ChainState`, persisted to
 * localStorage so positions survive a reload. Only the mock data source touches this store; UI
 * code reads data through hooks, never from here.
 */
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';
import { initialChainState, STATE_VERSION, type ChainState } from './engine';

export interface ChainStore {
  chain: ChainState;
  /** Replace the whole chain state in one atomic update. */
  commit: (next: ChainState) => void;
  reset: () => void;
}

export const CHAIN_STORAGE_KEY = 'aave-clone-demo-chain';

export const chainStore = createStore<ChainStore>()(
  persist(
    (set) => ({
      chain: initialChainState(),
      commit: (next) => set({ chain: next }),
      reset: () => set({ chain: initialChainState() }),
    }),
    {
      name: CHAIN_STORAGE_KEY,
      version: STATE_VERSION,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ chain: s.chain }),
      // Old or corrupt saved state is discarded rather than migrated: it is only demo data.
      migrate: () => ({ chain: initialChainState() }) as unknown as ChainStore,
    }
  )
);

let hydration: Promise<void> | null = null;

/** Loads persisted state once (client only). Safe to call many times. */
export function ensureChainHydrated(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!hydration) {
    hydration = Promise.resolve(chainStore.persist.rehydrate()).catch(() => {
      chainStore.getState().reset();
    });
  }
  return hydration;
}
