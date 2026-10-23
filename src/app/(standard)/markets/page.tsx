import type { Metadata } from 'next';
import { MarketsPage } from '@/apps/standard/markets/MarketsPage';

export const metadata: Metadata = { title: 'Markets' };

export default function Page() {
  return <MarketsPage />;
}
