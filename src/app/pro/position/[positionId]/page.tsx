import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PositionRoute } from '@/apps/pro/routes';

export const metadata: Metadata = { title: 'Position' };

export default function Page({ params }: { params: Promise<{ positionId: string }> }) {
  return (
    <Suspense fallback={null}>
      <PositionRoute params={params} />
    </Suspense>
  );
}
