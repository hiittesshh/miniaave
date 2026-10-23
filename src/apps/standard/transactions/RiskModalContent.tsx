'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { useUserMarketState } from '@/data/hooks';
import { formatHealthFactor, formatPercent } from '@/shared/format';
import { useWallet } from '@/shared/state/wallet';
import { tv } from '@/shared/theme/tokens';
import { motion } from '@/shared/theme/motion';
import { ModalLoading } from './contents';
import { TxModalTitle } from './parts';

function InfoCard({ title, description, value, tone, children, bottom, last }: { title: string; description: string; value: string; tone: 'success' | 'warning' | 'error'; children: React.ReactNode; bottom: string; last?: boolean }) {
  return (
    <Box sx={{ border: `1px solid ${tv('border-2')}`, borderRadius: '6px', px: 4, pt: 4, pb: 6, mb: last ? 0 : 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ width: 'calc(100% - 72px)' }}>
          <Typography variant="subheader1" sx={{ mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="fg-2" component="p">
            {description}
          </Typography>
        </Box>
        <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: `${tone}.main`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography variant="main12" sx={{ color: '#fff' }}>
            {value}
          </Typography>
        </Box>
      </Box>
      {children}
      <Typography variant="subheader2" color="fg-2">
        {bottom}
      </Typography>
    </Box>
  );
}

function Marker({ left, label, sub }: { left: number; label: string; sub?: React.ReactNode }) {
  const align = left > 75 ? 'right' : left < 15 ? 'left' : 'center';
  const shift = align === 'right' ? '-100%' : align === 'left' ? '0' : '-50%';
  return (
    <Box sx={{ position: 'absolute', bottom: '10px', left: `${left}%`, transition: `left ${motion.duration.smooth * 2}ms ${motion.easing.smooth}` }}>
      <Box sx={{ position: 'absolute', bottom: '8px', transform: `translateX(${shift})`, textAlign: align, whiteSpace: 'nowrap' }}>
        <Typography variant="main12" component="p">
          {label}
        </Typography>
        {sub}
      </Box>
      <Box sx={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `6px solid ${tv('fg-1')}`, transform: 'translateX(-50%)' }} />
    </Box>
  );
}

export function RiskModalContent({ marketId }: { marketId: string }) {
  const account = useWallet((s) => s.account);
  const user = useUserMarketState(marketId, account).data;
  if (!user) return <ModalLoading />;
  const s = user.summary;
  const hf = s.healthFactor;
  const hfTone = !Number.isFinite(hf) || hf > 3 ? 'success' : hf > 1.1 ? 'warning' : 'error';
  const ltvPct = s.currentLTV * 100;
  const maxPct = s.maxLTV * 100;
  const ltPct = s.liquidationThreshold * 100;
  const ltvTone = ltvPct >= Math.min(maxPct, ltPct) ? 'error' : ltvPct > maxPct / 2 ? 'warning' : 'success';
  const hfPos = Math.min(Number.isFinite(hf) ? hf * 10 : 100, 100);

  return (
    <>
      <TxModalTitle title="Liquidation risk parameters" />
      <Typography variant="description" color="fg-1" sx={{ mb: 6 }}>
        Your health factor and loan to value determine the assurance of your collateral. To avoid liquidations you can supply more collateral or repay borrow positions.
      </Typography>

      <InfoCard
        title="Health factor"
        description="Safety of your deposited collateral against the borrowed assets and its underlying value."
        value={formatHealthFactor(hf)}
        tone={hfTone}
        bottom="If the health factor goes below 1, the liquidation of your collateral might be triggered."
      >
        <Box sx={{ position: 'relative', mt: '33px', mb: 4 }}>
          <Marker left={hfPos} label={formatHealthFactor(hf)} />
          <Box sx={{ height: 4, borderRadius: '1px', background: 'linear-gradient(90deg, #BC0000 0%, #F89F1A 47.92%, #46BC4B 100%)' }} />
          <Box sx={{ position: 'absolute', left: '10%', top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateX(-50%)' }}>
            <Box sx={{ width: 2, height: 10, bgcolor: 'error.main', mt: '-3px' }} />
            <Typography variant="subheader2" sx={{ color: 'error.main', pt: '6px' }}>
              1.00
            </Typography>
            <Typography variant="helperText" sx={{ color: 'error.main', textAlign: 'center' }}>
              Liquidation value
            </Typography>
          </Box>
          <Box sx={{ height: 44 }} />
        </Box>
      </InfoCard>

      <InfoCard
        title="Current LTV"
        description="Your current loan to value based on your collateral supplied."
        value={formatPercent(s.currentLTV)}
        tone={ltvTone}
        bottom="If your loan to value goes above the liquidation threshold your collateral supplied may be liquidated."
        last
      >
        <Box sx={{ position: 'relative', mt: '45px', mb: '55px' }}>
          <Marker
            left={Math.min(ltvPct, 100)}
            label={formatPercent(s.currentLTV)}
            sub={
              <Typography variant="helperText" color="fg-3" component="p">
                MAX {formatPercent(s.maxLTV)}
              </Typography>
            }
          />
          <Box sx={{ position: 'relative', height: 4, borderRadius: '1px', bgcolor: 'border-2', overflow: 'hidden' }}>
            {ltvPct < maxPct && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${Math.min(maxPct, 100)}%`,
                  background: `repeating-linear-gradient(-45deg, ${tv('border-2')}, ${tv('border-2')} 4px, var(--mui-palette-${ltvTone}-main) 4px, var(--mui-palette-${ltvTone}-main) 7px)`,
                  opacity: 0.5,
                }}
              />
            )}
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(ltvPct, 100)}%`, bgcolor: `${ltvTone}.main`, transition: `width ${motion.duration.smooth * 2}ms ${motion.easing.smooth}` }} />
          </Box>
          <Box sx={{ position: 'absolute', left: `${Math.min(ltPct, 100)}%`, top: '6px', transform: ltPct > 75 ? 'translateX(-100%)' : 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: ltPct > 75 ? 'flex-end' : 'center' }}>
            <Box sx={{ width: 2, height: 10, bgcolor: 'error.main', mt: '-10px' }} />
            <Typography variant="subheader2" sx={{ color: 'error.main' }}>
              {formatPercent(s.liquidationThreshold)}
            </Typography>
            <Typography variant="helperText" sx={{ color: 'error.main', textAlign: ltPct > 75 ? 'right' : 'center' }}>
              Liquidation
              <br />
              threshold
            </Typography>
          </Box>
        </Box>
      </InfoCard>
    </>
  );
}
