import type { Metadata } from 'next';
import { MarketsPage } from '@/apps/mini/pages/Markets';

export const metadata: Metadata = { title: 'Markets' };

export default function Page() {
  return <MarketsPage />;
}
