'use client';

/**
 * Pro display preferences (live /preferences, captured 2026-10-14):
 * - Time Format: 12h | 24h (default 12h)
 * - Date Format: Month / Day / Year ("October 14, 2026", default) | Day / Month / Year
 *   ("14 October 2026") | Year - Month - Day ("2026-10-14")
 * - Approvals: Permit (default) | Transaction
 * - Analytics: off by default in the not-connected, cookies-denied capture
 * Persisted per browser. Loaded after the first paint (skipHydration) so server and client HTML
 * match, the same pattern as the shared settings store.
 */
import * as React from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type TimeFormat = '12h' | '24h';
export type DateFormat = 'mdy' | 'dmy' | 'ymd';
export type Approvals = 'permit' | 'transaction';

export const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'mdy', label: 'Month / Day / Year' },
  { value: 'dmy', label: 'Day / Month / Year' },
  { value: 'ymd', label: 'Year - Month - Day' },
];

export const APPROVALS: { value: Approvals; label: string }[] = [
  { value: 'permit', label: 'Permit' },
  { value: 'transaction', label: 'Transaction' },
];

interface PrefsState {
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  approvals: Approvals;
  analytics: boolean;
  hydrated: boolean;
  set: (p: Partial<Omit<PrefsState, 'set' | 'hydrated'>>) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({ timeFormat: '12h', dateFormat: 'mdy', approvals: 'permit', analytics: false, hydrated: false, set: (p) => set(p) }),
    {
      name: 'aave-clone-pro-prefs',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ timeFormat, dateFormat, approvals, analytics }) => ({ timeFormat, dateFormat, approvals, analytics }),
      onRehydrateStorage: () => () => usePrefsStore.setState({ hydrated: true }),
    },
  ),
);

/** Reads preferences, rehydrating from storage once after mount. */
export function usePrefs() {
  const s = usePrefsStore();
  React.useEffect(() => {
    if (!usePrefsStore.getState().hydrated) void usePrefsStore.persist.rehydrate();
  }, []);
  return s;
}

/** "October 14, 2026" | "14 October 2026" | "2026-10-14" */
export function formatPrefDate(ts: number, f: DateFormat) {
  const d = new Date(ts);
  if (f === 'ymd') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (f === 'dmy') return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Chart tooltip time: "7:30 PM" (12h) or "19:30" (24h). */
export function formatChartTime(ts: number, hour12: boolean) {
  return new Date(ts).toLocaleTimeString(hour12 ? 'en-US' : 'en-GB', { hour: 'numeric', minute: '2-digit', hour12 });
}
