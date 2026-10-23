import type { Metadata } from 'next';
import { FaucetPage } from '@/apps/mini/pages/Faucet';

export const metadata: Metadata = { title: 'Faucet' };

export default function Page() {
  return <FaucetPage />;
}
