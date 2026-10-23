import type { Metadata } from 'next';
import { NotIncludedPage } from '@/apps/standard/NotIncludedPage';

export const metadata: Metadata = { title: 'Safety Module' };

export default function Page() {
  return <NotIncludedPage feature="Safety Module" blurb="Legacy staking module that backstops the protocol." />;
}
