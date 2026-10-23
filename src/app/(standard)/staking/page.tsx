import type { Metadata } from 'next';
import { NotIncludedPage } from '@/apps/standard/NotIncludedPage';

export const metadata: Metadata = { title: 'Umbrella' };

export default function Page() {
  return <NotIncludedPage feature="Umbrella" blurb="Stake assets to help cover protocol deficits and earn rewards." />;
}
