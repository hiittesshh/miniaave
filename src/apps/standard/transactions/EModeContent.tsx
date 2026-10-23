'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { useMarket, useUserMarketState } from '@/data/hooks';
import { EMODE_EXIT_HF_FLOOR, summarizePosition } from '@/lib/aave-math';
import { formatPercent } from '@/shared/format';
import { CheckIcon, ChevronUpDownIcon, MinusIcon } from '@/shared/ui/Icons';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useWallet } from '@/shared/state/wallet';
import { tv } from '@/shared/theme/tokens';
import { simulatedGasUSD, useTxFlow, userLines } from './flow';
import { ModalLoading } from './contents';
import { Arrow, DetailsRow, HFRow, TxActions, TxDetails, TxErrorView, TxModalTitle, TxSuccessView } from './parts';

export function EModeContent({ marketId, onClose }: { marketId: string; onClose: () => void }) {
  const account = useWallet((s) => s.account);
  const market = useMarket(marketId);
  const userQ = useUserMarketState(marketId, account);
  const flow = useTxFlow();
  const snap = market.data;
  const user = userQ.data;
  const current = user?.eModeCategoryId ?? 0;
  const [selected, setSelected] = React.useState<number | null>(null);
  const [disabling, setDisabling] = React.useState(false);

  if (!account || !snap || !user) return <ModalLoading />;
  if (flow.status.kind === 'success') return <TxSuccessView title="All done" description={undefined} hash={flow.status.receipt.hash} onClose={onClose} />;
  if (flow.status.kind === 'failed') return <TxErrorView message={flow.status.message} onClose={onClose} onRetry={flow.reset} />;

  const target = disabling ? 0 : (selected ?? (current || snap.eModes[0]?.id || 0));
  const cat = snap.eModes.find((e) => e.id === target);
  const before = summarizePosition(userLines(snap, user));
  const after = summarizePosition(userLines(snap, user, target));

  const blockedBorrows = (id: number) => {
    const c = snap.eModes.find((e) => e.id === id);
    if (!c) return [];
    return user.reserves.filter((u) => u.borrowed > 0 && !c.borrowableSymbols.includes(u.symbol)).map((u) => u.symbol);
  };
  const unavailable = target !== 0 ? blockedBorrows(target) : [];
  const hfTooLow = Number.isFinite(after.healthFactor) && after.healthFactor < EMODE_EXIT_HF_FLOOR;
  const ltvChanged = Math.abs(after.maxLTV - before.maxLTV) > 1e-9;
  const verb = target === 0 ? 'Disable' : current === 0 ? 'Enable' : 'Switch';
  const blocked = target === current || unavailable.length > 0 || hfTooLow;

  const sortedCats = [...snap.eModes].sort((a, b) => blockedBorrows(a.id).length - blockedBorrows(b.id).length || a.id - b.id);

  return (
    <>
      <TxModalTitle title="Manage E-Mode" />
      <Typography variant="caption" color="fg-2" component="p" sx={{ mb: 6 }}>
        Enabling E-Mode allows you to maximize your borrowing power, however, borrowing is restricted to assets within the selected category.
      </Typography>

      <TxDetails gasUSD={simulatedGasUSD('emode')}>
        {current !== 0 && (
          <DetailsRow caption="Disable E-Mode">
            <Switch checked={disabling} onChange={(e) => setDisabling(e.target.checked)} slotProps={{ input: { 'aria-label': 'Disable E-Mode' } }} />
          </DetailsRow>
        )}
        <Collapse in={!disabling} unmountOnExit>
          <Box>
            <Typography variant="caption" color="fg-2" sx={{ mb: 1 }}>
              Asset category
            </Typography>
            <Select
              fullWidth
              value={String(target || '')}
              onChange={(e) => setSelected(Number(e.target.value))}
              IconComponent={(p) => <ChevronUpDownIcon {...p} sx={{ fontSize: 18, color: 'fg-3', right: '10px !important' }} />}
              sx={{ height: 44, borderRadius: '6px', '& .MuiOutlinedInput-notchedOutline': { borderColor: tv('border-2') } }}
              renderValue={(v) => snap.eModes.find((e) => String(e.id) === v)?.label ?? 'Select category'}
            >
              {sortedCats.map((e) => {
                const blockedList = blockedBorrows(e.id);
                return (
                  <MenuItem key={e.id} value={String(e.id)} sx={{ gap: 2, opacity: blockedList.length ? 0.5 : 1, fontStyle: blockedList.length ? 'italic' : 'normal' }}>
                    <Box sx={{ flex: 1 }}>{e.label}</Box>
                    {e.id === current && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                        <Typography variant="subheader2" color="success.main">
                          Enabled
                        </Typography>
                      </Box>
                    )}
                    {blockedList.length > 0 && (
                      <Typography variant="subheader2" color="fg-3" sx={{ fontStyle: 'italic' }}>
                        Unavailable
                      </Typography>
                    )}
                  </MenuItem>
                );
              })}
            </Select>
            <Divider sx={{ my: 4 }} />
          </Box>
        </Collapse>
        <DetailsRow caption="Max LTV">
          <Typography variant="subheader2">{formatPercent(before.maxLTV)}</Typography>
          {ltvChanged && (
            <>
              <Arrow />
              <Typography variant="subheader2">{formatPercent(after.maxLTV)}</Typography>
            </>
          )}
        </DetailsRow>
        <HFRow before={before.healthFactor} after={after.healthFactor} />
        {cat && !disabling && (
          <Box sx={{ maxHeight: 270, overflowY: 'auto', borderTop: `1px solid ${tv('border-0')}`, pt: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 4, rowGap: 2, alignItems: 'center' }}>
              {['Asset', 'Collateral', 'Borrowable'].map((h) => (
                <Typography key={h} variant="helperText" color="fg-3" sx={{ textTransform: 'uppercase', textAlign: h === 'Asset' ? 'left' : 'center' }}>
                  {h}
                </Typography>
              ))}
              {[...new Set([...cat.collateralSymbols, ...cat.borrowableSymbols])].map((sym) => (
                <React.Fragment key={sym}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TokenIcon symbol={sym} size={20} />
                    <Typography variant="subheader2">{sym}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>{cat.collateralSymbols.includes(sym) ? <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} /> : <MinusIcon sx={{ fontSize: 16, color: 'fg-4' }} />}</Box>
                  <Box sx={{ textAlign: 'center' }}>{cat.borrowableSymbols.includes(sym) ? <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} /> : <MinusIcon sx={{ fontSize: 16, color: 'fg-4' }} />}</Box>
                </React.Fragment>
              ))}
            </Box>
          </Box>
        )}
      </TxDetails>

      {unavailable.length > 0 && (
        <Alert severity="info" sx={{ my: 6 }}>
          <Typography variant="subheader1" component="p">
            Cannot switch to this category
          </Typography>
          Repay your {unavailable.join(', ')} {unavailable.length > 1 ? 'borrows' : 'borrow'} to use this category.
        </Alert>
      )}
      {hfTooLow && (
        <Alert severity="error" sx={{ my: 6 }}>
          <Typography variant="subheader1" component="p">
            Cannot {verb.toLowerCase()} E-Mode
          </Typography>
          You can not {verb.toLowerCase()} E-Mode because that could cause liquidation. To exit E-Mode supply or repay borrowed positions.
        </Alert>
      )}
      {!hfTooLow && !blocked && after.healthFactor < before.healthFactor && Number.isFinite(before.healthFactor) && (
        <Alert severity="error" sx={{ my: 6 }}>
          <Typography variant="subheader1" component="p">
            Liquidation risk
          </Typography>
          This action will reduce your health factor. Please be mindful of the increased risk of collateral liquidation.
        </Alert>
      )}

      <TxActions
        status={flow.status}
        amountRequired={false}
        amount={0}
        needsApproval={false}
        approvedNow={false}
        symbol=""
        actionText={`${verb} E-Mode`}
        actionInProgressText={`${verb === 'Switch' ? 'Switching' : verb === 'Enable' ? 'Enabling' : 'Disabling'} E-Mode`}
        blocked={blocked}
        onAction={() => void flow.run('main', { app: 'standard', kind: 'emode', marketId, account, categoryId: target })}
        inlineError={flow.inlineError}
      />
    </>
  );
}
