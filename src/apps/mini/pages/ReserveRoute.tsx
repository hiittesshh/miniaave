'use client';

import * as React from 'react';
import { ReservePage } from './Reserve';

/** Client wrapper for /mini/reserve/[symbol]: Next 16 passes a `params` promise (same as Pro's TokenRoute). */
export function ReserveRoute({ params }: { params: Promise<{ symbol: string }> }) {
  return <ReservePage symbol={decodeURIComponent(React.use(params).symbol)} />;
}
