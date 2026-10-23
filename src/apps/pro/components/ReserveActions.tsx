'use client';

/**
 * Live mobile reserve-card footer (explore, market and hub tables): a full-width tertiary
 * "Deposit"/"Borrow" pill and a round "More actions" button that opens the reserve page.
 * The transaction itself is SIMULATED (the modal labels it); a wallet is required first.
 */
import type { ProReserve } from '@/data/types';
import { PIMore } from '../icons';
import { proRoutes, useProModal } from '../state';
import { ProButton } from '../ui';
import { useRequireWallet } from '../pages/Dashboard';

export function ReserveMobileActions({ r, side }: { r: ProReserve; side: 'supply' | 'borrow' }) {
  const open = useProModal((s) => s.open);
  const requireWallet = useRequireWallet();
  return (
    <>
      <ProButton variant="tertiary" sx={{ flex: 1 }} onClick={() => requireWallet(() => open({ type: side === 'supply' ? 'deposit' : 'borrow', reserveId: r.id }))}>
        {side === 'supply' ? 'Deposit' : 'Borrow'}
      </ProButton>
      <ProButton variant="tertiary" size="square" aria-label="More actions" href={proRoutes.reserve(r.id)}>
        <PIMore />
      </ProButton>
    </>
  );
}
