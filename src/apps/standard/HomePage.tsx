'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import { useStdContext } from './state';
import { DashboardPage } from './dashboard/DashboardPage';
import { MarketsPage } from './markets/MarketsPage';

/** "/" behaves like the reference: Dashboard when a wallet is connected, Markets otherwise. */
export function HomePage() {
  const { hydrated, account } = useStdContext();
  if (!hydrated) {
    return (
      <Box sx={{ py: 12, bgcolor: 'bg-3' }}>
        <Container>
          <Skeleton width={220} height={36} sx={{ borderRadius: '6px' }} />
          <Skeleton width={360} height={18} sx={{ borderRadius: '6px', mt: 4 }} />
        </Container>
      </Box>
    );
  }
  return account ? <DashboardPage /> : <MarketsPage />;
}
