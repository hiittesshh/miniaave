import type { Metadata } from 'next';
import { NotIncludedPage } from '@/apps/standard/NotIncludedPage';

export const metadata: Metadata = { title: 'Governance' };

export default function Page() {
  return <NotIncludedPage feature="Governance" blurb="Vote on proposals that change protocol parameters." />;
}
