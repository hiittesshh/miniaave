import type { Metadata } from 'next';
import { ExplorePage } from '@/apps/pro/pages/Explore';

export const metadata: Metadata = { title: 'Deposit' };

export default function Page() {
  return <ExplorePage side="supply" />;
}
