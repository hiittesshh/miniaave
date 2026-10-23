import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TokenRoute } from '@/apps/pro/pages/token/TokenRoute';

export const metadata: Metadata = { title: 'Asset' };

export default function Page({ params }: { params: Promise<{ symbol: string }> }) {
  return (
    <Suspense fallback={null}>
      <TokenRoute params={params} />
    </Suspense>
  );
}
