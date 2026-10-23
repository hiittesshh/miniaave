'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { useMarket, useUserMarketState } from '@/data/hooks';
import type { MarketSnapshot, Reserve, UserMarketState, UserReserve } from '@/data/types';
import {
  applyLineChange,
  maxBorrow,
  maxRepay,
  maxSupply,
  maxWithdraw,
  requiresRiskAcknowledgement,
  summarizePosition,
} from '@/lib/aave-math';
import { parseAmount } from '@/shared/format';
import { FormattedNumber } from '@/shared/ui/FormattedNumber';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useWallet } from '@/shared/state/wallet';
import { collateralOnSupply, isCollateralOn, simulatedGasUSD, useTxFlow, userLines } from './flow';
import {
  AssetInput,
  DetailsRow,
  HFRow,
  InlineError,
  NumberChange,
  RiskCheckbox,
  TxActions,
  TxDetails,
  TxErrorView,
  TxModalTitle,
  TxSuccessView,
  describeAmount,
} from './parts';

export interface ContentProps {
  marketId: string;
  symbol: string;
  native?: boolean;
  onClose: () => void;
}

/** Loads market + user data for a modal. Shows a spinner until both are ready. */
function useModalData(marketId: string, symbol: string) {
  const account = useWallet((s) => s.account);
  const market = useMarket(marketId);
  const user = useUserMarketState(marketId, account);
  const snap = market.data;
  const u = user.data;
  const idx = snap ? snap.reserves.findIndex((r) => r.symbol === symbol) : -1;
  return {
    account,
    snap,
    user: u,
    reserve: snap && idx >= 0 ? snap.reserves[idx] : undefined,
    ur: u && idx >= 0 ? u.reserves[idx] : undefined,
    idx,
  };
}

export function ModalLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress size={28} sx={{ color: 'fg-3' }} />
    </Box>
  );
}

type Loaded = { account: string; snap: MarketSnapshot; user: UserMarketState; reserve: Reserve; ur: UserReserve; idx: number };

function withData(Inner: React.ComponentType<ContentProps & Loaded>) {
  return function Wrapped(props: ContentProps) {
    const d = useModalData(props.marketId, props.symbol);
    if (!d.account || !d.snap || !d.user || !d.reserve || !d.ur) return <ModalLoading />;
    return <Inner {...props} {...(d as Loaded)} />;
  };
}

function useAmount() {
  const [value, setValue] = React.useState('');
  return { value, setValue, amount: parseAmount(value) };
}

// ---------------------------------------------------------------------------------------------
// Supply
// ---------------------------------------------------------------------------------------------

export const SupplyContent = withData(function Supply({ account, snap, user, reserve, ur, idx, native, onClose }) {
  const flow = useTxFlow();
  const { value, setValue, amount } = useAmount();
  const [method, setMethod] = React.useState<'permit' | 'transaction'>('permit');
  const isNative = Boolean(native);
  const walletSymbol = isNative ? snap.market.nativeSymbol : reserve.symbol;
  const display = isNative ? snap.market.nativeSymbol : reserve.symbol;
  const max = maxSupply({ walletBalance: user.wallet[walletSymbol] ?? 0, isNative, supplyCap: reserve.supplyCap, totalSupplied: reserve.totalSupplied, isFrozen: reserve.isFrozen, isPaused: reserve.isPaused, decimals: reserve.decimals });
  const collateral = collateralOnSupply(snap, user, reserve);
  const lines = userLines(snap, user);
  const hfAfter = summarizePosition(applyLineChange(lines, { type: 'supply', index: idx, usd: amount * reserve.priceUSD, enableCollateral: ur.supplied > 0 ? undefined : isCollateralOn(collateral) })).healthFactor;
  const needsApproval = !isNative && (user.allowances[reserve.symbol] ?? 0) < amount;
  const capUsed = reserve.supplyCap > 0 ? reserve.totalSupplied / reserve.supplyCap : 0;
  const enteringIsolation = reserve.isIsolated && collateral === 'isolated-enabled' && ur.supplied === 0;

  if (flow.status.kind === 'success')
    return <TxSuccessView title="Supplied Successfully" description={describeAmount('supplied', flow.status.receipt.record.amount ?? amount, display)} hash={flow.status.receipt.hash} onClose={onClose} />;
  if (flow.status.kind === 'failed') return <TxErrorView message={flow.status.message} onClose={onClose} onRetry={flow.reset} />;

  return (
    <>
      <TxModalTitle title="Supply" symbol={display} />
      {enteringIsolation && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subheader1" component="p">
            You are entering Isolation mode
          </Typography>
          In Isolation mode, you cannot supply other assets as collateral. A global debt ceiling limits the borrowing power of the isolated asset. To exit isolation mode disable {reserve.symbol} as collateral before borrowing another asset.
        </Alert>
      )}
      {capUsed >= 0.98 && (
        <Alert severity="warning" data-size="small" sx={{ mb: 3 }}>
          {capUsed >= 0.9999 ? 'Protocol supply cap is at 100% for this asset. Further supply unavailable.' : `Maximum amount available to supply is limited because protocol supply cap is at ${(capUsed * 100).toFixed(2)}%.`}
        </Alert>
      )}
      <AssetInput
        value={value}
        onChange={setValue}
        symbol={display}
        priceUSD={reserve.priceUSD}
        max={max}
        balanceLabel="Wallet balance"
        decimals={reserve.decimals}
        disabled={flow.busy}
        capTooltip="This is the total amount that you are able to supply to in this reserve. You are able to supply your wallet balance up until the supply cap is reached."
      />
      <TxDetails gasUSD={simulatedGasUSD(needsApproval ? 'approve' : 'supply')}>
        <DetailsRow caption="Supply APY">
          <FormattedNumber value={reserve.supplyAPY} percent variant="h5" />
        </DetailsRow>
        <DetailsRow caption="Collateralization">
          <Typography variant="h5" sx={{ color: isCollateralOn(collateral) ? 'success.main' : collateral === 'isolated-disabled' ? 'warning.main' : 'error.main' }}>
            {collateral === 'enabled' ? 'Enabled' : collateral === 'isolated-enabled' ? 'Enabled (isolated)' : collateral === 'unavailable' ? 'Unavailable' : collateral === 'isolated-disabled' ? 'Unavailable in isolation' : 'Disabled'}
          </Typography>
        </DetailsRow>
        <HFRow before={user.summary.healthFactor} after={amount > 0 ? hfAfter : user.summary.healthFactor} />
      </TxDetails>
      <TxActions
        status={flow.status}
        amount={amount}
        needsApproval={needsApproval}
        approvedNow={flow.approvedNow}
        symbol={display}
        actionText={`Supply ${display}`}
        actionInProgressText={`Supplying ${display}`}
        approvalMethod={method}
        onApprovalMethod={setMethod}
        onApprove={() => void flow.run('approve', { app: 'standard', kind: 'approve', marketId: snap.market.id, account, symbol: reserve.symbol, amount }, { approvalMethod: method })}
        onAction={() => void flow.run('main', { app: 'standard', kind: 'supply', marketId: snap.market.id, account, symbol: reserve.symbol, amount, native: isNative })}
        inlineError={flow.inlineError}
      />
    </>
  );
});

// ---------------------------------------------------------------------------------------------
// Withdraw
// ---------------------------------------------------------------------------------------------

export const WithdrawContent = withData(function Withdraw({ account, snap, user, reserve, ur, idx, onClose }) {
  const flow = useTxFlow();
  const { value, setValue, amount } = useAmount();
  const [ack, setAck] = React.useState(false);
  const isWrapped = reserve.symbol === snap.market.wrappedNativeSymbol;
  const [unwrap, setUnwrap] = React.useState(isWrapped);
  const display = isWrapped && unwrap ? snap.market.nativeSymbol : reserve.symbol;
  const max = maxWithdraw({
    supplied: ur.supplied,
    availableLiquidity: reserve.availableLiquidity,
    priceUSD: reserve.priceUSD,
    collateralEnabled: ur.collateralEnabled,
    liquidationThreshold: ur.effectiveLiquidationThreshold,
    healthFactor: user.summary.healthFactor,
    totalBorrowedUSD: user.summary.totalBorrowedUSD,
    decimals: reserve.decimals,
  });
  const lines = userLines(snap, user);
  const hfAfter = summarizePosition(applyLineChange(lines, { type: 'withdraw', index: idx, usd: amount * reserve.priceUSD })).healthFactor;
  const risky = amount > 0 && ur.collateralEnabled && hfAfter >= 1 && requiresRiskAcknowledgement(hfAfter) && user.summary.totalBorrowedUSD > 0;
  const error =
    amount > 0 && hfAfter < 1 && user.summary.totalBorrowedUSD > 0
      ? 'You can not withdraw this amount because it will cause collateral call'
      : amount > reserve.availableLiquidity
        ? 'These funds have been borrowed and are not available for withdrawal at this time.'
        : null;

  if (flow.status.kind === 'success')
    return <TxSuccessView title="Withdrawn Successfully" description={describeAmount('withdrew', flow.status.receipt.record.amount ?? amount, display)} hash={flow.status.receipt.hash} onClose={onClose} />;
  if (flow.status.kind === 'failed') return <TxErrorView message={flow.status.message} onClose={onClose} onRetry={flow.reset} />;

  return (
    <>
      <TxModalTitle title="Withdraw" symbol={display} />
      <AssetInput
        value={value}
        onChange={(v) => {
          setValue(v);
          setAck(false);
        }}
        symbol={display}
        priceUSD={reserve.priceUSD}
        max={max}
        balanceLabel={reserve.availableLiquidity < ur.supplied ? 'Available' : 'Supply balance'}
        decimals={reserve.decimals}
        disabled={flow.busy}
      />
      {error && <InlineError>{error}</InlineError>}
      <TxDetails gasUSD={simulatedGasUSD('withdraw')}>
        <DetailsRow caption="Remaining supply">
          <FormattedNumber value={Math.max(ur.supplied - amount, 0)} variant="h5" symbol={display} sx={{ maxWidth: { xs: 140, sm: 180 }, overflow: 'hidden', textOverflow: 'ellipsis' }} />
        </DetailsRow>
        <HFRow before={user.summary.healthFactor} after={amount > 0 ? hfAfter : user.summary.healthFactor} />
      </TxDetails>
      {isWrapped && (
        <FormControlLabel
          sx={{ mt: 5 }}
          control={<Switch checked={unwrap} onChange={(e) => setUnwrap(e.target.checked)} disabled={flow.busy} />}
          label={<Typography variant="description">{`Unwrap ${reserve.symbol} (to withdraw ${snap.market.nativeSymbol})`}</Typography>}
        />
      )}
      {risky && <RiskCheckbox message="Withdrawing this amount will reduce your health factor and increase risk of liquidation." checked={ack} onChange={setAck} />}
      <Box sx={{ mt: risky ? -12 : 0 }}>
        <TxActions
          status={flow.status}
          amount={amount}
          needsApproval={false}
          approvedNow={false}
          symbol={display}
          actionText={`Withdraw ${display}`}
          actionInProgressText={`Withdrawing ${display}`}
          blocked={Boolean(error) || (risky && !ack)}
          onAction={() => void flow.run('main', { app: 'standard', kind: 'withdraw', marketId: snap.market.id, account, symbol: reserve.symbol, amount, unwrap: isWrapped && unwrap })}
          inlineError={flow.inlineError}
        />
      </Box>
    </>
  );
});

// ---------------------------------------------------------------------------------------------
// Borrow
// ---------------------------------------------------------------------------------------------

export const BorrowContent = withData(function Borrow({ account, snap, user, reserve, idx, onClose }) {
  const flow = useTxFlow();
  const { value, setValue, amount } = useAmount();
  const [ack, setAck] = React.useState(false);
  const isWrapped = reserve.symbol === snap.market.wrappedNativeSymbol;
  const [unwrap, setUnwrap] = React.useState(isWrapped);
  const display = isWrapped && unwrap ? snap.market.nativeSymbol : reserve.symbol;
  const cat = snap.eModes.find((e) => e.id === user.eModeCategoryId);
  const notInCategory = Boolean(cat && !cat.borrowableSymbols.includes(reserve.symbol));
  const isolationBlocked = user.summary.isInIsolationMode && !reserve.borrowableInIsolation;
  const borrowable = reserve.borrowingEnabled && !reserve.isFrozen && !reserve.isPaused && !notInCategory && !isolationBlocked;
  const max = borrowable
    ? maxBorrow({ availableBorrowsUSD: user.summary.availableBorrowsUSD, priceUSD: reserve.priceUSD, availableLiquidity: reserve.availableLiquidity, borrowCap: reserve.borrowCap, totalBorrowed: reserve.totalBorrowed, decimals: reserve.decimals })
    : 0;
  const lines = userLines(snap, user);
  const hfAfter = summarizePosition(applyLineChange(lines, { type: 'borrow', index: idx, usd: amount * reserve.priceUSD })).healthFactor;
  const risky = amount > 0 && requiresRiskAcknowledgement(hfAfter);
  const capUsed = reserve.borrowCap > 0 ? reserve.totalBorrowed / reserve.borrowCap : 0;
  const error = !borrowable
    ? `Borrowing is currently unavailable for ${reserve.symbol}.`
    : amount > reserve.availableLiquidity
      ? `There are not enough funds in the ${reserve.symbol} reserve to borrow`
      : null;

  if (flow.status.kind === 'success')
    return <TxSuccessView title="Borrowed Successfully" description={describeAmount('borrowed', flow.status.receipt.record.amount ?? amount, display)} hash={flow.status.receipt.hash} onClose={onClose} />;
  if (flow.status.kind === 'failed') return <TxErrorView message={flow.status.message} onClose={onClose} onRetry={flow.reset} />;

  return (
    <>
      <TxModalTitle title="Borrow" symbol={display} />
      {capUsed >= 0.98 && (
        <Alert severity="warning" data-size="small" sx={{ mb: 3 }}>
          {capUsed >= 0.9999 ? 'Protocol borrow cap is at 100% for this asset. Further borrowing unavailable.' : 'Maximum amount available to borrow is limited because protocol borrow cap is nearly reached.'}
        </Alert>
      )}
      <AssetInput
        value={value}
        onChange={(v) => {
          setValue(v);
          setAck(false);
        }}
        symbol={display}
        priceUSD={reserve.priceUSD}
        max={max}
        balanceLabel="Available"
        decimals={reserve.decimals}
        disabled={flow.busy || !borrowable}
        capTooltip="This is the total amount available for you to borrow. You can borrow based on your collateral and until the borrow cap is reached."
      />
      {error && <InlineError>{error}</InlineError>}
      <TxDetails gasUSD={simulatedGasUSD('borrow')}>
        <DetailsRow caption="Borrow APY, variable">
          <FormattedNumber value={reserve.variableBorrowAPY} percent variant="h5" />
        </DetailsRow>
        <HFRow before={user.summary.healthFactor} after={amount > 0 ? hfAfter : user.summary.healthFactor} />
      </TxDetails>
      {isWrapped && (
        <FormControlLabel
          sx={{ mt: 5 }}
          control={<Switch checked={unwrap} onChange={(e) => setUnwrap(e.target.checked)} disabled={flow.busy} />}
          label={<Typography variant="description">{`Unwrap ${reserve.symbol} (to borrow ${snap.market.nativeSymbol})`}</Typography>}
        />
      )}
      {risky && <RiskCheckbox message="Borrowing this amount will reduce your health factor and increase risk of liquidation." checked={ack} onChange={setAck} />}
      <Alert severity="info" data-size="small" sx={{ my: 6 }}>
        <b>Attention:</b> Parameter changes via governance can alter your account health factor and risk of liquidation. In this demo, parameters never change on their own.
      </Alert>
      <Box sx={{ mt: -6 }}>
        <TxActions
          status={flow.status}
          amount={amount}
          needsApproval={false}
          approvedNow={false}
          symbol={display}
          actionText={`Borrow ${display}`}
          actionInProgressText={`Borrowing ${display}`}
          blocked={Boolean(error) || (risky && !ack)}
          onAction={() => void flow.run('main', { app: 'standard', kind: 'borrow', marketId: snap.market.id, account, symbol: reserve.symbol, amount, unwrap: isWrapped && unwrap })}
          inlineError={flow.inlineError}
        />
      </Box>
    </>
  );
});

// ---------------------------------------------------------------------------------------------
// Repay
// ---------------------------------------------------------------------------------------------

export const RepayContent = withData(function Repay({ account, snap, user, reserve, ur, idx, onClose }) {
  const flow = useTxFlow();
  const { value, setValue, amount } = useAmount();
  const [method, setMethod] = React.useState<'permit' | 'transaction'>('permit');
  const isWrapped = reserve.symbol === snap.market.wrappedNativeSymbol;
  const options = [
    ...(isWrapped ? [{ value: 'native', symbol: snap.market.nativeSymbol, balance: user.wallet[snap.market.nativeSymbol] ?? 0 }] : []),
    { value: 'wallet', symbol: reserve.symbol, balance: user.wallet[reserve.symbol] ?? 0 },
    ...(ur.supplied > 0 ? [{ value: 'aToken', symbol: reserve.symbol, label: `a${reserve.symbol}`, balance: ur.supplied }] : []),
  ];
  const [source, setSource] = React.useState<string>(options[0].value);
  const opt = options.find((o) => o.value === source) ?? options[0];
  const isNative = source === 'native';
  const max = source === 'aToken' ? Math.min(ur.supplied, ur.borrowed) : maxRepay({ debt: ur.borrowed, walletBalance: opt.balance, isNative, decimals: reserve.decimals });
  const lines = userLines(snap, user);
  const hfAfter = summarizePosition(applyLineChange(lines, { type: 'repay', index: idx, usd: amount * reserve.priceUSD, fromSupplied: source === 'aToken' })).healthFactor;
  const needsApproval = source === 'wallet' && (user.allowances[reserve.symbol] ?? 0) < amount;
  const display = isNative ? snap.market.nativeSymbol : reserve.symbol;
  const dust = amount > 0 && amount === max && max < ur.borrowed;

  if (flow.status.kind === 'success')
    return <TxSuccessView title="Repaid Successfully" description={describeAmount('repaid', flow.status.receipt.record.amount ?? amount, display)} hash={flow.status.receipt.hash} onClose={onClose} />;
  if (flow.status.kind === 'failed') return <TxErrorView message={flow.status.message} onClose={onClose} onRetry={flow.reset} />;

  return (
    <>
      <TxModalTitle title="Repay" symbol={display} />
      <AssetInput
        value={value}
        onChange={setValue}
        symbol={opt.symbol}
        priceUSD={reserve.priceUSD}
        max={max}
        balanceLabel={source === 'aToken' ? 'Supply balance' : 'Wallet balance'}
        decimals={reserve.decimals}
        disabled={flow.busy}
        assets={options}
        selected={source}
        onSelect={setSource}
      />
      {dust && (
        <Typography variant="helperText" component="p" sx={{ color: 'warning.main', mt: 2, fontSize: '0.75rem', lineHeight: '1rem' }}>
          You don&apos;t have enough funds in your wallet to repay the full amount. If you proceed to repay with your current amount of funds, you will still have a small borrowing position in your dashboard.
        </Typography>
      )}
      <TxDetails gasUSD={simulatedGasUSD(needsApproval ? 'approve' : 'repay')}>
        <DetailsRow caption="Remaining debt" align="flex-start">
          <NumberChange before={ur.borrowed} after={amount > 0 ? ur.borrowed - amount : undefined} symbol={reserve.symbol} usdBefore={ur.borrowedUSD} usdAfter={amount > 0 ? (ur.borrowed - amount) * reserve.priceUSD : undefined} />
        </DetailsRow>
        <HFRow before={user.summary.healthFactor} after={amount > 0 ? hfAfter : user.summary.healthFactor} />
      </TxDetails>
      <TxActions
        status={flow.status}
        amount={amount}
        needsApproval={needsApproval}
        approvedNow={flow.approvedNow}
        symbol={display}
        actionText={`Repay ${display}`}
        actionInProgressText={`Repaying ${display}`}
        approvalMethod={method}
        onApprovalMethod={setMethod}
        onApprove={() => void flow.run('approve', { app: 'standard', kind: 'approve', marketId: snap.market.id, account, symbol: reserve.symbol, amount }, { approvalMethod: method })}
        onAction={() => void flow.run('main', { app: 'standard', kind: 'repay', marketId: snap.market.id, account, symbol: reserve.symbol, amount, source: source as 'wallet' | 'native' | 'aToken' })}
        inlineError={flow.inlineError}
      />
    </>
  );
});

// ---------------------------------------------------------------------------------------------
// Collateral toggle
// ---------------------------------------------------------------------------------------------

export const CollateralContent = withData(function Collateral({ account, snap, user, reserve, ur, idx, onClose }) {
  const flow = useTxFlow();
  const enabling = !ur.collateralEnabled;
  const lines = userLines(snap, user);
  const hfAfter = summarizePosition(applyLineChange(lines, { type: 'collateral', index: idx, enabled: enabling })).healthFactor;
  const otherCollateral = user.reserves.some((u, i) => i !== idx && u.collateralEnabled && u.supplied > 0);
  const error =
    ur.supplied <= 0
      ? 'You do not have supplies in this currency'
      : enabling && (!reserve.usageAsCollateralEnabled || reserve.ltv === 0)
        ? 'You can not use this currency as collateral'
        : enabling && reserve.isIsolated && otherCollateral
          ? 'You can only use one isolated asset as collateral, and only on its own. Disable other collateral first.'
          : enabling && !reserve.isIsolated && user.summary.isInIsolationMode
            ? 'You are in isolation mode. Disable the isolated collateral first.'
            : !enabling && user.summary.totalBorrowedUSD > 0 && hfAfter <= 1
              ? 'You can not switch usage as collateral mode for this currency, because it will cause collateral call'
              : null;

  if (flow.status.kind === 'success')
    return (
      <TxSuccessView
        title="All done"
        description={enabling ? `Your ${reserve.symbol} is now used as collateral` : `Your ${reserve.symbol} is no longer used as collateral`}
        hash={flow.status.receipt.hash}
        onClose={onClose}
      />
    );
  if (flow.status.kind === 'failed') return <TxErrorView message={flow.status.message} onClose={onClose} onRetry={flow.reset} />;

  return (
    <>
      <TxModalTitle title="Review tx" symbol={reserve.symbol} />
      {reserve.isIsolated ? (
        <Alert severity={enabling ? 'warning' : 'info'} data-size="small" sx={{ mb: 6 }}>
          {enabling
            ? 'You are entering Isolation mode: you cannot supply other assets as collateral, and a global debt ceiling limits borrowing against this asset.'
            : 'You will exit isolation mode and other tokens can now be used as collateral'}
        </Alert>
      ) : (
        <Alert severity="warning" data-size="small" sx={{ mb: 6 }}>
          {enabling
            ? 'Enabling this asset as collateral increases your borrowing power and Health Factor. However, it can get liquidated if your health factor drops below 1.'
            : 'Disabling this asset as collateral affects your borrowing power and Health Factor.'}
        </Alert>
      )}
      <TxDetails gasUSD={simulatedGasUSD('collateral')}>
        <DetailsRow caption="Supply balance">
          <TokenIcon symbol={reserve.symbol} size={16} sx={{ mr: 1 }} />
          <FormattedNumber value={ur.supplied} variant="h5" symbol={reserve.symbol} />
        </DetailsRow>
        <HFRow before={user.summary.healthFactor} after={hfAfter} />
      </TxDetails>
      {error && <InlineError>{error}</InlineError>}
      <TxActions
        status={flow.status}
        amountRequired={false}
        amount={0}
        needsApproval={false}
        approvedNow={false}
        symbol={reserve.symbol}
        actionText={enabling ? `Enable ${reserve.symbol} as collateral` : `Disable ${reserve.symbol} as collateral`}
        actionInProgressText="Pending..."
        blocked={Boolean(error)}
        onAction={() => void flow.run('main', { app: 'standard', kind: 'collateral', marketId: snap.market.id, account, symbol: reserve.symbol, enabled: enabling })}
        inlineError={flow.inlineError}
      />
    </>
  );
});

// ---------------------------------------------------------------------------------------------
// Faucet (test markets)
// ---------------------------------------------------------------------------------------------

export const FaucetContent = withData(function Faucet({ account, snap, reserve, onClose }) {
  const flow = useTxFlow();
  const amt = reserve.faucetAmount ?? 0;
  if (flow.status.kind === 'success')
    return <TxSuccessView title="Received Successfully" description={describeAmount('received', flow.status.receipt.record.amount ?? amt, reserve.symbol)} hash={flow.status.receipt.hash} onClose={onClose} />;
  if (flow.status.kind === 'failed') return <TxErrorView message={flow.status.message} onClose={onClose} onRetry={flow.reset} />;
  return (
    <>
      <TxModalTitle title="Faucet" symbol={reserve.symbol} />
      <TxDetails gasUSD={simulatedGasUSD('faucet')}>
        <DetailsRow caption="Amount">
          <TokenIcon symbol={reserve.symbol} size={16} sx={{ mr: 1 }} />
          <FormattedNumber value={amt} variant="h5" symbol={reserve.symbol} />
        </DetailsRow>
      </TxDetails>
      <TxActions
        status={flow.status}
        amountRequired={false}
        amount={amt}
        needsApproval={false}
        approvedNow={false}
        symbol={reserve.symbol}
        actionText={`Faucet ${reserve.symbol}`}
        actionInProgressText="Pending..."
        onAction={() => void flow.run('main', { app: 'standard', kind: 'faucet', marketId: snap.market.id, account, symbol: reserve.symbol })}
        inlineError={flow.inlineError}
      />
    </>
  );
});
