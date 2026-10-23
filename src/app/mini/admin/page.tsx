import type { Metadata } from 'next';
import { AdminPage } from '@/apps/mini/pages/Admin';

export const metadata: Metadata = { title: 'Admin' };

export default function Page() {
  return <AdminPage />;
}
