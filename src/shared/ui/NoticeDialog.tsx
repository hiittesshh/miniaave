'use client';

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { BasicModal } from './BasicModal';
import { useNotice } from '@/shared/state/notice';

export function NoticeDialog({ pill = false }: { pill?: boolean }) {
  const { notice, close } = useNotice();
  return (
    <BasicModal open={Boolean(notice)} onClose={close} labelledBy="notice-title">
      {notice && (
        <>
          <Typography id="notice-title" component="h2" sx={{ fontSize: '1rem', fontWeight: 500, lineHeight: '1.5rem', color: 'fg-1', mb: 3, pr: '2rem' }}>
            {notice.title}
          </Typography>
          <Typography variant="description" color="fg-2" sx={{ mb: 6 }}>
            {notice.body}
          </Typography>
          <Button fullWidth variant="contained" size="large" onClick={close} sx={pill ? { borderRadius: '10rem' } : undefined}>
            Got it
          </Button>
        </>
      )}
    </BasicModal>
  );
}
