import type { Metadata } from 'next';
import { WatchAddressPage } from '@/apps/pro/pages/watch-address/WatchAddressPage';

export const metadata: Metadata = { title: 'Watch Address' };

export default function Page() {
  return <WatchAddressPage />;
}
