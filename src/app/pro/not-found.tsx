import type { Metadata } from 'next';
import { NotFoundView } from '@/apps/pro/pages/notfound/NotFoundView';

export const metadata: Metadata = { title: 'Page not Found' };

export default function NotFound() {
  return <NotFoundView />;
}
