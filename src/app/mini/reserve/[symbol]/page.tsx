import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReserveRoute } from '@/apps/mini/pages/ReserveRoute';

export const metadata: Metadata = { title: 'Reserve' };

export default function Page({ params }: { params: Promise<{ symbol: string }> }) {
  return (
    <Suspense fallback={null}>
      <ReserveRoute params={params} />
    </Suspense>
  );
}
