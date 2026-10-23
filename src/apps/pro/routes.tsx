'use client';

import * as React from 'react';
import { ReservePage } from './pages/ReservePage';
import { HubPage } from './pages/Hub';
import { MarketPage } from './pages/Market';
import { TokenPage } from './pages/Entities';
import { PositionPage } from './pages/Position';

/**
 * Client wrappers for dynamic Pro routes. Next 16 (Cache Components) hands pages a `params`
 * promise; reading it inside <Suspense> lets the static shell prerender. `use()` unwraps it.
 */
type P<T> = { params: Promise<T> };

export function ReserveRoute({ params }: P<{ chain: string; hub: string; spoke: string; asset: string }>) {
  const p = React.use(params);
  const id = [p.chain, p.hub, p.spoke, p.asset].map(decodeURIComponent).join(':');
  return <ReservePage reserveId={id} />;
}

export function HubRoute({ params }: P<{ hubId: string }>) {
  return <HubPage slug={decodeURIComponent(React.use(params).hubId)} />;
}

export function MarketRoute({ params }: P<{ spokeId: string }>) {
  return <MarketPage slug={decodeURIComponent(React.use(params).spokeId)} />;
}

export function TokenRoute({ params }: P<{ symbol: string }>) {
  return <TokenPage symbol={decodeURIComponent(React.use(params).symbol)} />;
}

export function PositionRoute({ params }: P<{ positionId: string }>) {
  return <PositionPage positionId={decodeURIComponent(React.use(params).positionId)} />;
}
