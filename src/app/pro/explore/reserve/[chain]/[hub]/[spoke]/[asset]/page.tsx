import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReserveRoute } from '@/apps/pro/routes';

export const metadata: Metadata = { title: 'Reserve' };

export default function Page({ params }: { params: Promise<{ chain: string; hub: string; spoke: string; asset: string }> }) {
  return (
    <Suspense fallback={null}>
      <ReserveRoute params={params} />
    </Suspense>
  );
}
