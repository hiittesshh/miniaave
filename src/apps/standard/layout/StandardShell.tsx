'use client';

import Box from '@mui/material/Box';
import * as React from 'react';
import { ConnectWalletModal } from '@/shared/ui/ConnectWalletModal';
import { NoticeDialog } from '@/shared/ui/NoticeDialog';
import { TxModalHost } from '../transactions/TxModalHost';
import { AppHeader } from './AppHeader';
import { AppFooter, TopBarNotify } from './Chrome';

/** Standard app chrome: notify bar, sticky header, page, footer, and the global modals. */
export function StandardShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'bg-1' }}>
      <TopBarNotify />
      <AppHeader />
      <Box component="main" id="main" sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {children}
      </Box>
      <AppFooter />
      <TxModalHost />
      <ConnectWalletModal />
      <NoticeDialog />
    </Box>
  );
}
