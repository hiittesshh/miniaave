import type { Metadata } from 'next';
import { NotIncludedPage } from '@/apps/standard/NotIncludedPage';

export const metadata: Metadata = { title: 'Savings' };

export default function Page() {
  return <NotIncludedPage feature="Savings" blurb="Deposit GHO into savings to earn yield." />;
}
