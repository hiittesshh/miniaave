import type { Metadata } from 'next';
import { PreferencesPage } from '@/apps/pro/pages/preferences/PreferencesPage';

export const metadata: Metadata = { title: 'Preferences' };

export default function Page() {
  return <PreferencesPage />;
}
