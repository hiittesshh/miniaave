'use client';

import * as React from 'react';
import { BasicModal } from '@/shared/ui/BasicModal';
import { useStdModal } from '../state';
import { BorrowContent, CollateralContent, FaucetContent, RepayContent, SupplyContent, WithdrawContent } from './contents';
import { EModeContent } from './EModeContent';
import { RiskModalContent } from './RiskModalContent';

/**
 * Renders whichever Standard modal is open. Keeping the last modal around while the close
 * animation plays avoids the content vanishing mid-fade.
 */
export function TxModalHost() {
  const { modal, close } = useStdModal();
  // Keep the last modal while the close animation plays; bump the key when a new one opens.
  const [last, setLast] = React.useState(modal);
  const [key, setKey] = React.useState(0);
  if (modal && modal !== last) {
    setLast(modal);
    setKey((k) => k + 1);
  }
  const m = modal ?? last;

  const content = (() => {
    if (!m) return null;
    const p = { marketId: m.marketId, symbol: m.symbol ?? '', native: m.native, onClose: close };
    switch (m.type) {
      case 'supply':
        return <SupplyContent {...p} />;
      case 'withdraw':
        return <WithdrawContent {...p} />;
      case 'borrow':
        return <BorrowContent {...p} />;
      case 'repay':
        return <RepayContent {...p} />;
      case 'collateral':
        return <CollateralContent {...p} />;
      case 'faucet':
        return <FaucetContent {...p} />;
      case 'emode':
        return <EModeContent marketId={m.marketId} onClose={close} />;
      case 'risk':
        return <RiskModalContent marketId={m.marketId} />;
    }
  })();

  return (
    <BasicModal open={Boolean(modal)} onClose={close} labelledBy="tx-modal-title">
      <React.Fragment key={key}>{content}</React.Fragment>
    </BasicModal>
  );
}
