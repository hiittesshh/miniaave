import type { Metadata } from 'next';
import { ExplorePage } from '@/apps/pro/pages/Explore';

export const metadata: Metadata = { title: 'Borrow' };

export default function Page() {
  return <ExplorePage side="borrow" />;
}
