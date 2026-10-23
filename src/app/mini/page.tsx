import type { Metadata } from 'next';
import { DashboardPage } from '@/apps/mini/pages/Dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

export default function Page() {
  return <DashboardPage />;
}
