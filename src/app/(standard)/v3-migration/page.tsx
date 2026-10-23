import type { Metadata } from 'next';
import { NotIncludedPage } from '@/apps/standard/NotIncludedPage';

export const metadata: Metadata = { title: 'Migrate to V3' };

export default function Page() {
  return <NotIncludedPage feature="Migrate to V3" blurb="Move positions from an older market version." />;
}
