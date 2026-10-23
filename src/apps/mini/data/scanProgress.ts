/**
 * Progress of the chain source's event-log scan (§10), for the "Reading pool history…" notice.
 * The first visit to Base Sepolia reads ~1,100 windows of 200 blocks at the public RPC's rate limit;
 * later visits only read the new blocks (the result is cached in localStorage).
 */
import { create } from 'zustand';

export interface ScanProgress {
  chainId: number | null;
  done: number;
  total: number;
  active: boolean;
  set: (p: Partial<Omit<ScanProgress, 'set'>>) => void;
}

export const useScanProgress = create<ScanProgress>()((set) => ({ chainId: null, done: 0, total: 0, active: false, set: (p) => set(p) }));
