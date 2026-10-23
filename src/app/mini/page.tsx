import type { Metadata } from 'next';
import { DashboardPage } from '@/apps/mini/pages/Dashboard';
import { BRAND } from '@/apps/mini/brand';

// `absolute`: a layout's title template only applies to its child segments, not to the page in the
// same folder, so without it /mini would fall back to the root layout's template.
export const metadata: Metadata = { title: { absolute: `Dashboard · ${BRAND}` } };

export default function Page() {
  return <DashboardPage />;
}
