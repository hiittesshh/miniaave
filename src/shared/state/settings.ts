'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * UI preferences shared by both clones (persisted per browser). The "Simulate failures" toggle
 * lives here: the mock data source reads it to decide whether simulated transactions fail.
 */
export interface SettingsState {
  hydrated: boolean;
  simulateFailures: boolean;
  testnetMode: boolean;
  /** Standard app: current market id. */
  marketId: string;
  notifyDismissed: boolean;
  proSidebarOpen: boolean;
  proPromoDismissed: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'hydrated'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      hydrated: false,
      simulateFailures: false,
      testnetMode: false,
      marketId: 'core',
      notifyDismissed: false,
      proSidebarOpen: true,
      proPromoDismissed: false,
      set: (patch) => set(patch),
    }),
    {
      name: 'aave-clone-settings',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        simulateFailures: s.simulateFailures,
        testnetMode: s.testnetMode,
        marketId: s.marketId,
        notifyDismissed: s.notifyDismissed,
        proSidebarOpen: s.proSidebarOpen,
        proPromoDismissed: s.proPromoDismissed,
      }),
      onRehydrateStorage: () => () => useSettings.setState({ hydrated: true }),
    }
  )
);
