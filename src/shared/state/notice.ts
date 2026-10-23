'use client';

import { create } from 'zustand';

/**
 * A tiny "this isn't part of the clone" dialog, used by out-of-scope controls (Swap, Bridge,
 * Claim rewards…) so no button is dead: each one explains instead of doing nothing.
 */
interface NoticeState {
  notice: { title: string; body: string } | null;
  showNotIncluded: (feature: string) => void;
  show: (title: string, body: string) => void;
  close: () => void;
}

export const useNotice = create<NoticeState>((set) => ({
  notice: null,
  showNotIncluded: (feature) =>
    set({
      notice: {
        title: `${feature} is not included in this clone yet`,
        body: `This demo recreates the core lending flows (supply, withdraw, borrow, repay, collateral and E-Mode). ${feature} is visible for fidelity, but it is out of scope for this pass. No real action was taken.`,
      },
    }),
  show: (title, body) => set({ notice: { title, body } }),
  close: () => set({ notice: null }),
}));
