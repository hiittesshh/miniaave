'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { DARK, tv } from '@/shared/theme/tokens';

/**
 * Full-bleed header band (reference PageHeader / pageBandSx): bg-3 in light, bg-1 in dark,
 * 40–48px vertical padding and a bottom hairline. Title on the left, stats bottom-aligned on
 * the right from md up.
 */
export function PageHeader({ title, description, stats, above }: { title: React.ReactNode; description?: React.ReactNode; stats?: React.ReactNode; above?: React.ReactNode }) {
  return (
    <Box
      sx={{
        pt: { xs: 10, md: 12 },
        pb: { xs: 10, md: 12 },
        color: 'fg-1',
        bgcolor: 'bg-3',
        [DARK]: { bgcolor: 'bg-1' },
        boxShadow: `0 1px 0 ${tv('border-0')}`,
      }}
    >
      <Container sx={{ pb: 0 }}>
        {above}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: { xs: '1.5rem', md: '1rem' },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: { md: 1 }, minWidth: 0 }}>
            {title}
            {description && (
              <Typography variant="description" color="fg-3" sx={{ textWrap: 'balance' }}>
                {description}
              </Typography>
            )}
          </Box>
          {stats && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: '2.5rem', rowGap: '1rem', alignSelf: { md: 'flex-end' } }}>{stats}</Box>
          )}
        </Box>
      </Container>
    </Box>
  );
}

export function PageHeaderStat({ label, children, loading }: { label: React.ReactNode; children: React.ReactNode; loading?: boolean }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.62rem', minWidth: 0 }}>
      <Typography component="div" variant="description" color="fg-3" sx={{ lineHeight: '0.875rem', letterSpacing: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
        {label}
      </Typography>
      {loading ? <Skeleton width={72} height={28} sx={{ borderRadius: '6px' }} /> : <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 28 }}>{children}</Box>}
    </Box>
  );
}

/** Content area under the band: 1.5rem / 2rem top padding (reference CONTENT_TOP_PADDING). */
export function ContentContainer({ children }: { children: React.ReactNode }) {
  return <Container sx={{ pt: { xs: '1.5rem', xsm: '2rem' }, flex: 1 }}>{children}</Container>;
}
