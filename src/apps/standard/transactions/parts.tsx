'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputBase from '@mui/material/InputBase';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { formatNumber, sanitizeAmountInput } from '@/shared/format';
import { FormattedNumber } from '@/shared/ui/FormattedNumber';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { InfoTooltip } from '@/shared/ui/InfoTooltip';
import { ArrowRightIcon, CheckIcon, ChevronUpDownIcon, ClockIcon, CloseIcon, CopyIcon, GasIcon, SettingsIcon, XCircleIcon } from '@/shared/ui/Icons';
import { surfaceShadow, tv } from '@/shared/theme/tokens';
import { motion, transition } from '@/shared/theme/motion';
import type { TxPhase } from '@/data/types';
import { HealthFactorNumber } from '../components/Bits';
import type { FlowStatus } from './flow';

export function TxModalTitle({ title, symbol }: { title: string; symbol?: string }) {
  return (
    <Typography id="tx-modal-title" component="h2" sx={{ fontSize: '1rem', fontWeight: 500, lineHeight: '1.5rem', color: 'fg-1', mb: 6, pr: '2rem' }}>
      {title} {symbol}
    </Typography>
  );
}

// ---------------------------------------------------------------------------------------------
// Amount input
// ---------------------------------------------------------------------------------------------

export interface AssetOption {
  value: string;
  symbol: string;
  label?: string;
  balance: number;
}

export function AssetInput({
  value,
  onChange,
  symbol,
  priceUSD,
  max,
  balanceLabel,
  decimals,
  disabled,
  capTooltip,
  assets,
  selected,
  onSelect,
  title = 'Amount',
}: {
  value: string;
  onChange: (v: string) => void;
  symbol: string;
  priceUSD: number;
  max: number;
  balanceLabel: string;
  decimals: number;
  disabled?: boolean;
  capTooltip?: string;
  assets?: AssetOption[];
  selected?: string;
  onSelect?: (v: string) => void;
  title?: string;
}) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const amount = Number(value || 0);
  const isMax = value !== '' && amount === max;

  const handle = (raw: string) => {
    const clean = sanitizeAmountInput(raw, decimals);
    // Over the maximum snaps to the maximum (reference AssetInput behaviour).
    if (clean !== '' && Number(clean) > max) onChange(String(max));
    else onChange(clean);
  };

  return (
    <Box>
      <Typography component="div" variant="description" color="fg-2" sx={{ mb: '0.5rem', display: 'flex', alignItems: 'center' }}>
        {capTooltip ? <InfoTooltip title={capTooltip}>{title}</InfoTooltip> : title}
      </Typography>
      <Box
        sx={{
          borderRadius: '0.5rem',
          boxShadow: surfaceShadow('shadow-stroke-1'),
          bgcolor: 'bg-2',
          overflow: 'hidden',
          transition: transition(['box-shadow'], 150),
          '&:focus-within': { boxShadow: `0px 2px 4px 0px ${tv('shadow-low')}, 0 0 0 1px ${tv('fg-4')}` },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', px: 3, pt: 3, pb: 2, mb: '2px' }}>
          <InputBase
            value={value}
            onChange={(e) => handle(e.target.value)}
            placeholder="0.00"
            autoFocus
            disabled={disabled}
            inputProps={{ 'aria-label': 'amount input', inputMode: 'decimal' }}
            sx={{ flex: 1, fontSize: 21, height: 28, '& input': { p: 0, textOverflow: 'ellipsis' }, '& input::placeholder': { color: 'fg-4', opacity: 1 } }}
          />
          {value !== '' && !disabled && (
            <Box component="button" type="button" aria-label="Clear amount" onClick={() => onChange('')} sx={{ border: 0, background: 'none', p: 0, ml: 2, mr: 1, cursor: 'pointer', color: 'fg-3', display: 'flex', '&:hover': { color: 'fg-2' } }}>
              <XCircleIcon sx={{ fontSize: 16 }} />
            </Box>
          )}
          {assets && assets.length > 1 && onSelect ? (
            <>
              <Box
                component="button"
                type="button"
                aria-haspopup="listbox"
                onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
                sx={{ display: 'flex', alignItems: 'center', gap: 2, border: 0, background: 'none', cursor: 'pointer', p: '2px 4px', ml: 2, borderRadius: '0.375rem', color: 'fg-1', fontFamily: 'inherit', '&:hover': { bgcolor: 'button-hover' } }}
              >
                <TokenIcon symbol={symbol} size={24} />
                <Typography variant="h4">{assets.find((a) => a.value === selected)?.label ?? symbol}</Typography>
                <ChevronUpDownIcon sx={{ fontSize: 18, color: 'fg-3' }} />
              </Box>
              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { maxHeight: 240 } } }}>
                {assets.map((a) => (
                  <MenuItem
                    key={a.value}
                    selected={a.value === selected}
                    onClick={() => {
                      onSelect(a.value);
                      onChange('');
                      setAnchor(null);
                    }}
                    sx={{ gap: 2, minWidth: 220 }}
                  >
                    <TokenIcon symbol={a.symbol} size={22} />
                    <Typography variant="description" sx={{ flex: 1 }}>
                      {a.label ?? a.symbol}
                    </Typography>
                    <FormattedNumber value={a.balance} compact variant="description" color="fg-3" />
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2, mr: 1 }} title={symbol}>
              <TokenIcon symbol={symbol} size={24} />
              <Typography variant="h3" sx={{ lineHeight: '28px', maxWidth: '9ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {symbol}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', height: 16, px: 3, mb: 3 }}>
          <FormattedNumber value={amount * priceUSD} usd compact variant="subheader2" color="fg-3" sx={{ flexGrow: 1 }} />
          <Typography component="div" variant="subheader2" color="fg-2" sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {balanceLabel} <FormattedNumber value={max} compact variant="subheader2" color="fg-2" />
            <Button
              size="small"
              variant="text"
              onClick={() => onChange(String(max))}
              disabled={disabled || isMax || max <= 0}
              sx={{ minWidth: 0, ml: '7px', p: 0, height: 'auto', fontSize: '0.75rem', fontWeight: 600, color: 'fg-1', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }, '&.Mui-disabled': { color: 'fg-4' } }}
            >
              Max
            </Button>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// "Transaction overview"
// ---------------------------------------------------------------------------------------------

export function TxDetails({ children, gasUSD }: { children: React.ReactNode; gasUSD?: number }) {
  return (
    <Box sx={{ pt: '1rem' }}>
      <Typography variant="description" color="fg-2" sx={{ mb: '0.5rem' }}>
        Transaction overview
      </Typography>
      <Box sx={{ p: 3, boxShadow: surfaceShadow('shadow-stroke-1'), borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</Box>
      {gasUSD !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 6 }}>
          <GasIcon sx={{ fontSize: 16, color: 'fg-2', mr: '6px' }} />
          <Typography variant="caption" color="fg-2">
            ${gasUSD.toFixed(2)}
          </Typography>
          <InfoTooltip title="Simulated network cost for display only. Nothing is paid: this demo has no blockchain.">
            <Typography variant="caption" color="fg-4" sx={{ ml: 1 }}>
              simulated
            </Typography>
          </InfoTooltip>
        </Box>
      )}
    </Box>
  );
}

export function DetailsRow({ caption, children, align = 'center' }: { caption: React.ReactNode; children: React.ReactNode; align?: 'center' | 'flex-start' }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: align, gap: 2 }}>
      <Typography component="div" variant="description" color="fg-1" sx={{ mr: 2 }}>
        {caption}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right', minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

export const Arrow = () => <ArrowRightIcon sx={{ fontSize: 14, mx: '4px', color: 'fg-2' }} />;

export function HFRow({ before, after, loading }: { before: number; after: number; loading?: boolean }) {
  if (!Number.isFinite(before) && !Number.isFinite(after)) return null;
  const changed = Number.isFinite(after) !== Number.isFinite(before) || Math.abs(after - before) > 1e-9;
  return (
    <DetailsRow caption="Health factor" align="flex-start">
      <Box sx={{ textAlign: 'right' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {loading ? (
            <Skeleton width={80} height={20} sx={{ borderRadius: '4px' }} />
          ) : (
            <>
              <HealthFactorNumber value={before} />
              {changed && (
                <Box sx={{ display: 'flex', alignItems: 'center', animation: 'clone-fade-up 200ms ease both' }}>
                  <Arrow />
                  <HealthFactorNumber value={Number.isNaN(after) ? before : Math.max(after, 0)} />
                </Box>
              )}
            </>
          )}
        </Box>
        <Typography variant="helperText" color="fg-2">
          Liquidation at &lt;1.0
        </Typography>
      </Box>
    </DetailsRow>
  );
}

export function NumberChange({ before, after, symbol, usdBefore, usdAfter }: { before: number; after?: number; symbol: string; usdBefore?: number; usdAfter?: number }) {
  return (
    <Box sx={{ textAlign: 'right' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <FormattedNumber value={before} variant="h5" symbol={symbol} compact />
        {after !== undefined && (
          <>
            <Arrow />
            <FormattedNumber value={Math.max(after, 0)} variant="h5" symbol={symbol} compact />
          </>
        )}
      </Box>
      {usdBefore !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <FormattedNumber value={usdBefore} usd compact variant="helperText" color="fg-2" />
          {usdAfter !== undefined && (
            <>
              <Arrow />
              <FormattedNumber value={Math.max(usdAfter, 0)} usd compact variant="helperText" color="fg-2" />
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Risk acknowledgement and alerts
// ---------------------------------------------------------------------------------------------

export function RiskCheckbox({ message, checked, onChange }: { message: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Box sx={{ animation: 'clone-fade-up 220ms ease both' }}>
      <Alert severity="error" icon={false} sx={{ my: 6 }}>
        {message}
      </Alert>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <FormControlLabel
          control={<Checkbox size="small" checked={checked} onChange={(e) => onChange(e.target.checked)} />}
          label={<Typography variant="description">I acknowledge the risks involved.</Typography>}
        />
      </Box>
    </Box>
  );
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="helperText" component="p" sx={{ color: 'error.main', mt: 2, fontSize: '0.75rem', lineHeight: '1rem', animation: 'clone-fade-up 200ms ease both' }}>
      {children}
    </Typography>
  );
}

// ---------------------------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------------------------

const phaseText = (phase: TxPhase) =>
  phase === 'awaiting-signature' ? 'Confirm in your demo wallet… (simulated, auto-confirms)' : 'Simulated transaction pending…';

export function TxActions({
  status,
  amountRequired = true,
  amount,
  needsApproval,
  approvedNow,
  symbol,
  actionText,
  actionInProgressText,
  blocked,
  blockedText,
  onApprove,
  onAction,
  approvalMethod,
  onApprovalMethod,
  inlineError,
}: {
  status: FlowStatus;
  amountRequired?: boolean;
  amount: number;
  needsApproval: boolean;
  approvedNow: boolean;
  symbol: string;
  actionText: string;
  actionInProgressText: string;
  blocked?: boolean;
  blockedText?: string;
  onApprove?: () => void;
  onAction: () => void;
  approvalMethod?: 'permit' | 'transaction';
  onApprovalMethod?: (m: 'permit' | 'transaction') => void;
  inlineError?: string | null;
}) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const approving = status.kind === 'approving';
  const executing = status.kind === 'executing';
  const noAmount = amountRequired && !(amount > 0);
  const showApprove = (needsApproval || approvedNow) && !noAmount && !blocked;
  const approveDone = approvedNow && !needsApproval;

  let mainLabel: React.ReactNode = actionText;
  let mainDisabled = false;
  if (blocked) {
    mainLabel = blockedText ?? actionText;
    mainDisabled = true;
  } else if (noAmount) {
    mainLabel = 'Enter an amount';
    mainDisabled = true;
  } else if (executing) {
    mainLabel = actionInProgressText;
    mainDisabled = true;
  } else if (needsApproval || approving) {
    mainDisabled = true;
  }

  const phase = approving || executing ? (status as { phase: TxPhase }).phase : null;
  const spinner = <CircularProgress size={16} color="inherit" sx={{ mr: 2 }} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', mt: 12 }}>
      {showApprove && onApprove && (
        <>
          {!approveDone && onApprovalMethod && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, mb: 2 }}>
              <InfoTooltip title="To continue, you need to grant the (simulated) pool permission to move this token from your demo wallet. A signed message is gas-free; a transaction is an on-chain approval. Nothing real happens here.">
                <Typography variant="subheader2" color="fg-3">
                  Why approve?
                </Typography>
              </InfoTooltip>
              <Box
                component="button"
                type="button"
                onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
                sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: 0, background: 'none', cursor: 'pointer', p: 0, fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 500, color: 'fg-2' }}
              >
                Approve with
                <Box component="span" sx={{ color: 'info.main' }}>
                  {approvalMethod === 'permit' ? 'Signed message' : 'Transaction'}
                </Box>
                <SettingsIcon sx={{ fontSize: 16, color: 'info.main' }} />
              </Box>
              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                {(['permit', 'transaction'] as const).map((m) => (
                  <MenuItem
                    key={m}
                    selected={approvalMethod === m}
                    onClick={() => {
                      onApprovalMethod?.(m);
                      setAnchor(null);
                    }}
                    sx={{ gap: 3 }}
                  >
                    <Typography variant="subheader1" sx={{ flex: 1 }}>
                      {m === 'permit' ? 'Signed message' : 'Transaction'}
                    </Typography>
                    {approvalMethod === m && <CheckIcon sx={{ fontSize: 18, color: 'purple-1' }} />}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          )}
          <Button variant="contained" size="large" disabled={approving || approveDone} onClick={onApprove} sx={{ mb: 2, minHeight: 44 }}>
            {approveDone ? (
              <>
                Approve Confirmed
                <CheckIcon sx={{ fontSize: 20, ml: 2 }} />
              </>
            ) : approving ? (
              <>
                {spinner}Approving {symbol}...
              </>
            ) : (
              <>Approve {symbol} to continue</>
            )}
          </Button>
        </>
      )}
      <Button variant="contained" size="large" disabled={mainDisabled} onClick={onAction} sx={{ minHeight: 44 }} data-testid="tx-main-action">
        {executing && spinner}
        {mainLabel}
      </Button>
      <Box sx={{ minHeight: 20, mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }} aria-live="polite">
        {phase && (
          <Typography variant="caption" color="fg-3" sx={{ display: 'flex', alignItems: 'center', gap: 1, animation: 'clone-fade-up 200ms ease both' }} key={phase}>
            <ClockIcon sx={{ fontSize: 14 }} />
            {phaseText(phase)}
          </Typography>
        )}
      </Box>
      {inlineError && <InlineError>{inlineError}</InlineError>}
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Result views
// ---------------------------------------------------------------------------------------------

function StatusHeader({ tone, title, children }: { tone: 'success' | 'error'; title: string; children?: React.ReactNode }) {
  const color = tone === 'success' ? tv('data-green') : tv('data-red');
  return (
    <Box
      sx={{
        m: -6,
        mb: 0,
        px: 6,
        py: 10,
        borderTopLeftRadius: 'inherit',
        borderTopRightRadius: 'inherit',
        background: `linear-gradient(180deg, color-mix(in srgb, ${color} 16%, transparent) 0%, transparent 58.28%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          bgcolor: color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: `clone-pop ${motion.duration.smooth}ms ${motion.easing.snappy} both`,
          '@keyframes clone-pop': { from: { transform: 'scale(0.6)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        }}
      >
        {tone === 'success' ? <CheckIcon sx={{ fontSize: '2rem' }} /> : <CloseIcon sx={{ fontSize: '2rem' }} />}
      </Box>
      <Typography variant="h2" color="fg-1" sx={{ mt: '1.5rem', animation: 'clone-fade-up 260ms 60ms ease both' }}>
        {title}
      </Typography>
      <Box sx={{ mt: '0.5rem', animation: 'clone-fade-up 260ms 120ms ease both' }}>{children}</Box>
    </Box>
  );
}

export function TxSuccessView({ title, description, hash, onClose }: { title: string; description?: React.ReactNode; hash: string; onClose: () => void }) {
  const router = useRouter();
  return (
    <Box>
      <StatusHeader tone="success" title={title}>
        {description && (
          <Typography variant="base" color="fg-3" component="div">
            {description}
          </Typography>
        )}
      </StatusHeader>
      <Box sx={{ mt: 4, p: 3, borderRadius: '0.5rem', bgcolor: 'bg-2', boxShadow: surfaceShadow('shadow-stroke-1') }}>
        <Typography variant="subheader2" color="fg-1">
          Simulated transaction confirmed
        </Typography>
        <Typography variant="caption" color="fg-3" component="p" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-all' }}>
          {hash.slice(0, 18)}…{hash.slice(-6)} (fake hash, no explorer)
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', mt: '1.5rem' }}>
        <Button
          variant="outlined"
          size="large"
          onClick={() => {
            onClose();
            router.push('/history');
          }}
        >
          View in transaction history
        </Button>
        <Button variant="contained" size="large" onClick={onClose}>
          Done
        </Button>
      </Box>
    </Box>
  );
}

export function TxErrorView({ message, onClose, onRetry }: { message: string; onClose: () => void; onRetry?: () => void }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Box>
      <StatusHeader tone="error" title="Transaction Failed">
        <Typography variant="base" color="fg-3" component="div">
          We were unable to complete this transaction
        </Typography>
      </StatusHeader>
      <Alert severity="info" icon={false} sx={{ mt: 4 }}>
        {message} Your balances and positions are exactly as before.
      </Alert>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
        <Button
          variant="tertiary"
          size="small"
          endIcon={<CopyIcon sx={{ fontSize: 12 }} />}
          onClick={() => {
            void navigator.clipboard?.writeText(message).catch(() => undefined);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy error text'}
        </Button>
        {onRetry && (
          <Button variant="tertiary" size="small" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Box>
      <Button fullWidth variant="contained" size="large" onClick={onClose} sx={{ mt: 6 }}>
        Close
      </Button>
    </Box>
  );
}

export const describeAmount = (verb: string, amount: number, symbol: string) => (
  <>
    You {verb}{' '}
    <Box component="span" sx={{ color: 'fg-1', fontWeight: 500 }}>
      {formatNumber(amount, { compact: amount > 99_999 })} {symbol}
    </Box>
  </>
);
