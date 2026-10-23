import type { Metadata } from 'next';
import { DashboardPage } from '@/apps/standard/dashboard/DashboardPage';

export const metadata: Metadata = { title: 'Dashboard' };

export default function Page() {
  return <DashboardPage />;
}
