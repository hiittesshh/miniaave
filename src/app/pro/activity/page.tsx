import type { Metadata } from 'next';
import { ActivityPage } from '@/apps/pro/pages/ActivityInsights';

export const metadata: Metadata = { title: 'Activity' };

export default function Page() {
  return <ActivityPage />;
}
