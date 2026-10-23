'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { ContentContainer, PageHeader } from './components/PageHeader';
import { EmptyStatePaper } from './components/Bits';
import { ROUTES } from './layout/nav';

/** One clearly-worded placeholder for features kept in the nav for fidelity but out of scope. */
export function NotIncludedPage({ feature, blurb }: { feature: string; blurb: string }) {
  return (
    <>
      <PageHeader
        title={
          <Typography variant="h2" component="h1" sx={{ fontSize: '1.875rem' }}>
            {feature}
          </Typography>
        }
        description={blurb}
      />
      <ContentContainer>
        <EmptyStatePaper
          title="Not included in this clone yet"
          description={`${feature} appears in the navigation so the layout matches the reference, but this demo only recreates the core lending flows: supply, withdraw, borrow, repay, collateral and E-Mode.`}
          action={
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button variant="contained" component={Link} href={ROUTES.dashboard}>
                Go to Dashboard
              </Button>
              <Button variant="outlined" component={Link} href={ROUTES.markets}>
                View Markets
              </Button>
            </Box>
          }
        />
      </ContentContainer>
    </>
  );
}
