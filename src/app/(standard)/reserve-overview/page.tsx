import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReservePage } from '@/apps/standard/reserve/ReservePage';

export const metadata: Metadata = { title: 'Reserve overview' };

export default function Page() {
  // useSearchParams() needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={null}>
      <ReservePage />
    </Suspense>
  );
}
