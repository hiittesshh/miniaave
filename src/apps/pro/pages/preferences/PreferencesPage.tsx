'use client';

/**
 * Pro /preferences (live, 2026-10-14). Three sections in the settings frame:
 * - Appearance: Time Format (12h | 24h toggle), Date Format (menu with today's date in each format)
 * - Transactions: Approvals (Permit | Transaction)
 * - Security: Analytics switch (live: cookie/tracking consent, off when cookies are denied)
 * Values persist per browser (prefs.ts). The clone has no analytics or tracking at all, so the switch
 * only stores the choice; Approvals is read by nothing yet (simulated transactions have no permits).
 * Live morphs the menu value letter by letter on change; the clone swaps it (logged).
 */
import { APPROVALS, DATE_FORMATS, formatPrefDate, usePrefs, type DateFormat, type TimeFormat, type Approvals } from './prefs';
import { SegmentedToggle, SelectMenu, Switch } from './controls';
import { SettingsHeading, SettingsPage, SettingsRow, SettingsSection } from './SettingsLayout';

/** Same pattern as Entity.tsx LOADED_AT: one timestamp per page load, not per render. */
const TODAY = Date.now();

const TIME: { value: TimeFormat; label: string }[] = [
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
];

export function PreferencesPage() {
  const prefs = usePrefs();
  const dateFormat: DateFormat = prefs.hydrated ? prefs.dateFormat : 'mdy';
  const approvals: Approvals = prefs.hydrated ? prefs.approvals : 'permit';
  return (
    <SettingsPage>
      <SettingsHeading title="Preferences" />
      <SettingsSection title="Appearance">
        <SettingsRow label="Time Format" description="Choose between 12-hour or 24-hour time format">
          <SegmentedToggle label="Time Format" value={prefs.hydrated ? prefs.timeFormat : '12h'} options={TIME} onChange={(timeFormat) => prefs.set({ timeFormat })} />
        </SettingsRow>
        <SettingsRow label="Date Format" description="Select how dates are displayed">
          <SelectMenu
            label="Date Format"
            display={formatPrefDate(TODAY, dateFormat)}
            options={DATE_FORMATS.map((f) => ({ ...f, sub: formatPrefDate(TODAY, f.value) }))}
            onChange={(v) => prefs.set({ dateFormat: v })}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Transactions">
        <SettingsRow label="Approvals" description="Choose how token spending is approved">
          <SelectMenu label="Approval Method" display={APPROVALS.find((a) => a.value === approvals)?.label ?? 'Permit'} options={APPROVALS} onChange={(v) => prefs.set({ approvals: v })} />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Security">
        <SettingsRow label="Analytics" description="Manage cookies and tracking preferences">
          <Switch id="analytics" label="Analytics" checked={prefs.hydrated && prefs.analytics} onChange={(analytics) => prefs.set({ analytics })} />
        </SettingsRow>
      </SettingsSection>
    </SettingsPage>
  );
}
