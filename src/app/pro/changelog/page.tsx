import type { Metadata } from 'next';
import { ChangelogList } from '@/apps/pro/pages/changelog/ChangelogPage';

export const metadata: Metadata = { title: 'Changelog' };

export default function Page() {
  return <ChangelogList />;
}
