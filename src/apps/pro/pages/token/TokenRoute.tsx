'use client';

import * as React from 'react';
import { TokenPage } from './TokenPage';

/**
 * Client wrapper for /pro/explore/token/[symbol]. Next 16 (Cache Components) passes a `params`
 * promise; `use()` unwraps it inside the page's <Suspense> (same pattern as apps/pro/routes.tsx).
 */
export function TokenRoute({ params }: { params: Promise<{ symbol: string }> }) {
  return <TokenPage symbol={decodeURIComponent(React.use(params).symbol)} />;
}
