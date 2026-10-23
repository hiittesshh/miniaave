'use client';

import { create } from 'zustand';
import type { Address } from '../data/types';

export type MiniTxKind = 'supply' | 'withdraw' | 'borrow' | 'repay' | 'faucet' | 'liquidate' | 'setPrice';

export type MiniTxRequest =
  | { kind: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'faucet'; asset: Address }
  | { kind: 'liquidate'; user: Address }
  | { kind: 'setPrice'; asset: Address };

interface MiniTxState {
  request: MiniTxRequest | null;
  open: (r: MiniTxRequest) => void;
  close: () => void;
}

export const useMiniTx = create<MiniTxState>()((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));
