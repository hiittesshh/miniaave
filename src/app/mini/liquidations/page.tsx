import type { Metadata } from 'next';
import { LiquidationsPage } from '@/apps/mini/pages/Liquidations';

export const metadata: Metadata = { title: 'Liquidations' };

export default function Page() {
  return <LiquidationsPage />;
}
