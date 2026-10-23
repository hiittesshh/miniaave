import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HubRoute } from '@/apps/pro/routes';

export const metadata: Metadata = { title: 'Hub' };

export default function Page({ params }: { params: Promise<{ hubId: string }> }) {
  return (
    <Suspense fallback={null}>
      <HubRoute params={params} />
    </Suspense>
  );
}
