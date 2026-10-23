import type { Metadata } from 'next';
import { HistoryPage } from '@/apps/standard/history/HistoryPage';

export const metadata: Metadata = { title: 'Transaction history' };

export default function Page() {
  return <HistoryPage />;
}
