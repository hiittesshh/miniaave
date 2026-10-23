// Market (spoke) route: renders apps/pro/pages/Market via routes.tsx.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketRoute } from '@/apps/pro/routes';

export const metadata: Metadata = { title: 'Market' };

export default function Page({ params }: { params: Promise<{ spokeId: string }> }) {
  return (
    <Suspense fallback={null}>
      <MarketRoute params={params} />
    </Suspense>
  );
}
