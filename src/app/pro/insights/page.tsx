import type { Metadata } from 'next';
import { InsightsPage } from '@/apps/pro/pages/insights/InsightsPage';

export const metadata: Metadata = { title: 'Insights' };

export default function Page() {
  return <InsightsPage />;
}
