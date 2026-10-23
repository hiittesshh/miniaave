import type { Metadata } from 'next';
import { NotIncludedPage } from '@/apps/standard/NotIncludedPage';

export const metadata: Metadata = { title: 'Bridge GHO' };

export default function Page() {
  return <NotIncludedPage feature="Bridge GHO" blurb="Move GHO between networks." />;
}
