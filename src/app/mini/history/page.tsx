import type { Metadata } from 'next';
import { HistoryPage } from '@/apps/mini/pages/History';

export const metadata: Metadata = { title: 'History' };

export default function Page() {
  return <HistoryPage />;
}
