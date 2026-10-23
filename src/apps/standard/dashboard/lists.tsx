'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { MarketSnapshot, Reserve, UserMarketState, UserReserve } from '@/data/types';
import { maxBorrow, maxSupply } from '@/lib/aave-math';
import { FormattedNumber } from '@/shared/ui/FormattedNumber';
import { InfoTooltip } from '@/shared/ui/InfoTooltip';
import { CheckIcon, DotsIcon, InfoIcon, SwapIcon, WarningIcon } from '@/shared/ui/Icons';
import { CategorySelect } from '../components/CategorySelect';
import type { AssetCategory } from '@/data/types';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useNotice } from '@/shared/state/notice';
import { useSettings } from '@/shared/state/settings';
import { tv } from '@/shared/theme/tokens';
import { ListColumn, ListEmpty, ListHeaderTitle, ListHeaderWrapper, ListItem, ListTopInfoItem, ListValue, ListWrapper, MobileCard, Row, sortRows, useSort } from '../components/Lists';
import { ROUTES } from '../layout/nav';
import { useStdModal } from '../state';
import { assetDisplay } from '../display';
import { EModeButton } from './EModeButton';

const BUTTONS_W = 160;

function AssetCell({ symbol, name, href }: { symbol: string; name: string; href: string; isolated?: boolean }) {
  return (
    <ListColumn isRow align="left" maxWidth={130} minWidth={100}>
      <Box component={Link} href={href} sx={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, '&:hover .sym': { textDecoration: 'underline' } }}>
        <TokenIcon symbol={symbol} size={32} />
        <Tooltip title={`${name} (${symbol})`} placement="top">
          <Typography className="sym" variant="subheader1" noWrap sx={{ ml: 3 }}>
            {symbol}
          </Typography>
        </Tooltip>
      </Box>
    </ListColumn>
  );
}

function IsolatedBadge() {
  return (
    <Tooltip title="Isolated assets have limited borrowing power and other assets cannot be used as collateral.">
      <Typography component="span" variant="helperText" sx={{ mt: '2px', px: 1, py: '1px', borderRadius: '4px', bgcolor: `color-mix(in srgb, ${tv('yellow-1')} 18%, transparent)`, color: 'fg-2', whiteSpace: 'nowrap' }}>
        Isolated
      </Typography>
    </Tooltip>
  );
}

function Buttons({ children }: { children: React.ReactNode }) {
  return (
    <ListColumn isRow minWidth={BUTTONS_W} maxWidth={BUTTONS_W} flex={0} sx={{ gap: '0.62rem', justifyContent: 'flex-end' }}>
      {children}
    </ListColumn>
  );
}

const MobileHeader = ({ symbol, name, href }: { symbol: string; name: string; href: string }) => (
  <Box component={Link} href={href} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <TokenIcon symbol={symbol} size={40} />
    <Box>
      <Typography variant="h4">{name}</Typography>
      <Typography variant="subheader2" color="fg-3">
        {symbol}
      </Typography>
    </Box>
  </Box>
);

interface ListProps {
  snap: MarketSnapshot;
  user: UserMarketState;
}

const pairs = (snap: MarketSnapshot, user: UserMarketState) => snap.reserves.map((r, i) => ({ r, u: user.reserves[i] }));

// ---------------------------------------------------------------------------------------------

export function SuppliedPositionsList({ snap, user }: ListProps) {
  const open = useStdModal((s) => s.open);
  const { sort, toggle } = useSort();
  const [showSmall, setShowSmall] = React.useState(false);
  const all = pairs(snap, user).filter(({ u }) => u.supplied > 0);
  const small = all.filter(({ u }) => u.suppliedUSD < 0.001);
  const rows = sortRows(
    all.filter(({ u }) => showSmall || u.suppliedUSD >= 0.001),
    sort,
    { symbol: ({ r }) => assetDisplay(r, snap.market).symbol.toUpperCase(), balance: ({ u }) => u.suppliedUSD, apy: ({ r }) => r.supplyAPY, collateral: ({ u }) => Number(u.collateralEnabled) }
  );
  const s = user.summary;
  const id = snap.market.id;

  return (
    <ListWrapper
      title="Your supplies"
      storageKey="suppliedAssetsDashboardTableCollapse"
      noData={all.length === 0}
      topInfo={
        all.length > 0 && (
          <>
            <ListTopInfoItem title="Balance" value={s.totalSuppliedUSD} usd />
            <ListTopInfoItem title="APY" value={s.earnedAPY} percent tooltip="The weighted average of APY for all supplied assets, including incentives." />
            <ListTopInfoItem title="Collateral" value={s.totalCollateralUSD} usd tooltip="The total amount of your assets denominated in USD that can be used as collateral for borrowing assets." />
          </>
        )
      }
      subChildren={
        small.length > 0 && (
          <FormControlLabel sx={{ ml: 1 }} control={<Checkbox size="small" checked={showSmall} onChange={(e) => setShowSmall(e.target.checked)} />} label={<Typography variant="description">Show assets with small balance</Typography>} />
        )
      }
    >
      {all.length === 0 ? (
        <ListEmpty>Nothing supplied yet</ListEmpty>
      ) : (
        <>
          <ListHeaderWrapper>
            <ListColumn isRow align="left" maxWidth={130} minWidth={100}>
              <ListHeaderTitle sortKey="symbol" sort={sort} onSort={toggle}>
                Asset
              </ListHeaderTitle>
            </ListColumn>
            <ListColumn>
              <ListHeaderTitle sortKey="balance" sort={sort} onSort={toggle}>
                Balance
              </ListHeaderTitle>
            </ListColumn>
            <ListColumn>
              <ListHeaderTitle sortKey="apy" sort={sort} onSort={toggle}>
                APY
              </ListHeaderTitle>
            </ListColumn>
            <ListColumn>
              <ListHeaderTitle sortKey="collateral" sort={sort} onSort={toggle} tooltip="Allows you to decide whether to use a supplied asset as collateral. An asset used as collateral will affect your borrowing power and health factor.">
                Collateral
              </ListHeaderTitle>
            </ListColumn>
            <Buttons>{null}</Buttons>
          </ListHeaderWrapper>
          {rows.map(({ r, u }, i) => {
            const d = assetDisplay(r, snap.market);
            const href = ROUTES.reserve(r.symbol, id);
            const canToggle = !r.isPaused && r.usageAsCollateralEnabled && r.ltv > 0;
            const toggleCollateral = () => open({ type: 'collateral', symbol: r.symbol, marketId: id });
            return (
              <React.Fragment key={r.id}>
                <Box sx={{ display: { xs: 'none', xsm: 'block' } }}>
                  <ListItem last={i === rows.length - 1}>
                    <AssetCell symbol={d.symbol} name={d.name} href={href} isolated={r.isIsolated} />
                    <ListColumn>
                      <ListValue value={u.supplied} usdValue={u.suppliedUSD} />
                    </ListColumn>
                    <ListColumn>
                      <FormattedNumber value={r.supplyAPY} percent variant="h5" />
                    </ListColumn>
                    <ListColumn>
                      <Switch checked={u.collateralEnabled} disabled={!canToggle} onChange={toggleCollateral} slotProps={{ input: { 'aria-label': `Use ${d.symbol} as collateral` } }} />
                      {r.isIsolated && <IsolatedBadge />}
                    </ListColumn>
                    <Buttons>
                      <Button variant="contained" size="small" disabled={r.isFrozen || r.isPaused} onClick={() => open({ type: 'supply', symbol: r.symbol, marketId: id })}>
                        Supply
                      </Button>
                      <Button variant="tertiary" size="small" disabled={r.isPaused} onClick={() => open({ type: 'withdraw', symbol: r.symbol, marketId: id })}>
                        Withdraw
                      </Button>
                    </Buttons>
                  </ListItem>
                </Box>
                <MobileCard
                  first={i === 0}
                  header={<MobileHeader symbol={d.symbol} name={d.name} href={href} />}
                  actions={
                    <>
                      <Button variant="contained" fullWidth disabled={r.isFrozen || r.isPaused} onClick={() => open({ type: 'supply', symbol: r.symbol, marketId: id })}>
                        Supply
                      </Button>
                      <Button variant="tertiary" fullWidth onClick={() => open({ type: 'withdraw', symbol: r.symbol, marketId: id })}>
                        Withdraw
                      </Button>
                    </>
                  }
                >
                  <Row caption="Supply balance">
                    <FormattedNumber value={u.supplied} variant="h5" />
                    <FormattedNumber value={u.suppliedUSD} usd compact variant="description" color="fg-2" />
                  </Row>
                  <Row caption="Supply APY">
                    <FormattedNumber value={r.supplyAPY} percent variant="h5" />
                  </Row>
                  <Row caption="Used as collateral" mb={0}>
                    <Switch checked={u.collateralEnabled} disabled={!canToggle} onChange={toggleCollateral} slotProps={{ input: { 'aria-label': `Use ${d.symbol} as collateral` } }} />
                  </Row>
                </MobileCard>
              </React.Fragment>
            );
          })}
        </>
      )}
    </ListWrapper>
  );
}

// ---------------------------------------------------------------------------------------------

function SupplyMoreMenu({ href, symbol }: { href: string; symbol: string }) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const router = useRouter();
  const notice = useNotice();
  return (
    <>
      <Button
        variant="tertiary"
        size="small"
        aria-label={`More actions for ${symbol}`}
        aria-haspopup="true"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ minWidth: 0, p: '0.25rem', aspectRatio: '1', borderRadius: '0.5rem' }}
      >
        <DotsIcon sx={{ fontSize: 20, color: 'fg-3' }} />
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: '120px !important' } } }} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            notice.showNotIncluded('Swap');
          }}
        >
          <ListItemIcon>
            <SwapIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          Swap
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            router.push(href);
          }}
        >
          <ListItemIcon>
            <InfoIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          Details
        </MenuItem>
      </Menu>
    </>
  );
}

export function SupplyAssetsList({ snap, user }: ListProps) {
  const open = useStdModal((s) => s.open);
  const testnet = useSettings((s) => s.testnetMode);
  const { sort, toggle } = useSort();
  const [showZero, setShowZero] = React.useState(false);
  const [categories, setCategories] = React.useState<AssetCategory[]>([]);
  const id = snap.market.id;
  const isolatedOn = user.summary.isInIsolationMode;

  type SupplyRow = { r: Reserve; u: UserReserve; symbol: string; name: string; native: boolean; balance: number; max: number; usd: number };
  const all: SupplyRow[] = [];
  pairs(snap, user).forEach(({ r, u }) => {
    if (r.isFrozen || r.isPaused) return;
    if (categories.length && !categories.includes(r.category)) return;
    const make = (native: boolean): SupplyRow => {
      const walletSym = native ? snap.market.nativeSymbol : r.symbol;
      const balance = user.wallet[walletSym] ?? 0;
      const max = maxSupply({ walletBalance: balance, isNative: native, supplyCap: r.supplyCap, totalSupplied: r.totalSupplied, decimals: r.decimals });
      return { r, u, symbol: native ? snap.market.nativeSymbol : r.symbol, name: native ? 'Ethereum' : r.name, native, balance, max, usd: balance * r.priceUSD };
    };
    if (r.symbol === snap.market.wrappedNativeSymbol) all.push(make(true));
    all.push(make(false));
  });
  const withBalance = all.filter((x) => x.usd >= 0.01);
  const base = showZero || withBalance.length === 0 ? all : withBalance;
  const rows = sortRows(
    [...base].sort((a, b) => b.usd - a.usd),
    sort,
    { symbol: (x) => x.symbol.toUpperCase(), balance: (x) => x.usd, apy: (x) => x.r.supplyAPY, collateral: (x) => Number(x.r.usageAsCollateralEnabled && x.r.ltv > 0) }
  );

  const canBeCollateral = (r: Reserve) => r.usageAsCollateralEnabled && r.ltv > 0 && (!isolatedOn || r.isIsolated);

  return (
    <ListWrapper
      title="Assets to supply"
      titleExtra={<CategorySelect value={categories} onChange={setCategories} />}
      withTopMargin
      storageKey="supplyAssetsDashboardTableCollapse"
      subChildren={
        <>
          {isolatedOn && (
            <Alert severity="warning" data-size="small" sx={{ mb: 6 }}>
              Collateral usage is limited because of isolation mode.
            </Alert>
          )}
          {withBalance.length === 0 && (
            <Alert severity="info" data-size="small" sx={{ mb: 6 }}>
              {testnet ? `Your ${snap.market.title} wallet is empty. Get free test assets at the ` : `Your ${snap.market.networkName} demo wallet is empty for this market. `}
              {testnet ? (
                <Box component={Link} href={ROUTES.faucet} sx={{ textDecoration: 'underline' }}>
                  {snap.market.title} Faucet
                </Box>
              ) : (
                'Switch to the funded demo account, or try another market.'
              )}
            </Alert>
          )}
          {withBalance.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', xsm: 'center' }, flexDirection: { xs: 'column-reverse', xsm: 'row' }, justifyContent: 'space-between', px: { xs: 4, xsm: 6 }, pl: { xs: '18px', xsm: '0.25rem' } }}>
              <FormControlLabel control={<Checkbox size="small" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} />} label={<Typography variant="description">Show assets with 0 balance</Typography>} />
              {testnet && (
                <Button component={Link} href={ROUTES.faucet} variant="tertiary" size="small">
                  Faucet
                </Button>
              )}
            </Box>
          )}
        </>
      }
    >
      <ListHeaderWrapper>
        <ListColumn isRow align="left" maxWidth={130} minWidth={100}>
          <ListHeaderTitle sortKey="symbol" sort={sort} onSort={toggle}>
            Assets
          </ListHeaderTitle>
        </ListColumn>
        <ListColumn>
          <ListHeaderTitle sortKey="balance" sort={sort} onSort={toggle}>
            Balance
          </ListHeaderTitle>
        </ListColumn>
        <ListColumn>
          <ListHeaderTitle sortKey="apy" sort={sort} onSort={toggle}>
            APY
          </ListHeaderTitle>
        </ListColumn>
        <ListColumn>
          <ListHeaderTitle sortKey="collateral" sort={sort} onSort={toggle}>
            Can be collateral
          </ListHeaderTitle>
        </ListColumn>
        <Buttons>{null}</Buttons>
      </ListHeaderWrapper>
      {rows.map((x, i) => {
        const href = ROUTES.reserve(x.r.symbol, id);
        const disabled = x.max <= 0;
        const supply = () => open({ type: 'supply', symbol: x.r.symbol, marketId: id, native: x.native });
        const capUsed = x.r.supplyCap > 0 ? x.r.totalSupplied / x.r.supplyCap : 0;
        const capMaxed = capUsed >= 0.9999;
        const col = canBeCollateral(x.r) ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <CheckIcon sx={{ fontSize: { xs: 20, xsm: 24 }, color: 'success.main' }} />
            {x.r.isIsolated && <IsolatedBadge />}
          </Box>
        ) : (
          <Typography variant="subheader1" color="fg-4">—</Typography>
        );
        return (
          <React.Fragment key={`${x.r.id}${x.native ? ':native' : ''}`}>
            <Box sx={{ display: { xs: 'none', xsm: 'block' } }}>
              <ListItem last={i === rows.length - 1}>
                <AssetCell symbol={x.symbol} name={x.name} href={href} isolated={x.r.isIsolated} />
                <ListColumn isRow>
                  <Tooltip title={<FormattedNumber value={x.usd} usd variant="h5" />} placement="top">
                    <Box>
                      <FormattedNumber value={x.balance} compact variant="h5" sx={{ color: x.balance === 0 || capMaxed ? 'fg-4' : 'fg-1' }} />
                    </Box>
                  </Tooltip>
                  {capUsed >= 0.98 && (
                    <Tooltip title={capMaxed ? 'This asset has reached its supply cap. Nothing is available to be supplied from this market.' : 'This asset has almost reached its supply cap. Only a small amount can still be supplied to this market.'}>
                      <WarningIcon tabIndex={0} sx={{ fontSize: 14, color: 'red-1', ml: 1 }} />
                    </Tooltip>
                  )}
                </ListColumn>
                <ListColumn>
                  <FormattedNumber value={x.r.supplyAPY} percent variant="h5" />
                </ListColumn>
                <ListColumn>{col}</ListColumn>
                <Buttons>
                  <Button variant="contained" size="small" disabled={disabled} onClick={supply}>
                    Supply
                  </Button>
                  <SupplyMoreMenu href={href} symbol={x.symbol} />
                </Buttons>
              </ListItem>
            </Box>
            <MobileCard
              first={i === 0}
              header={<MobileHeader symbol={x.symbol} name={x.name} href={href} />}
              actions={
                <>
                  <Button variant="contained" fullWidth disabled={disabled} onClick={supply}>
                    Supply
                  </Button>
                  <Button variant="tertiary" fullWidth component={Link} href={href}>
                    Details
                  </Button>
                </>
              }
            >
              <Row caption="Supply balance">
                <FormattedNumber value={x.balance} compact variant="h5" />
              </Row>
              <Row caption="Supply APY">
                <FormattedNumber value={x.r.supplyAPY} percent variant="h5" />
              </Row>
              <Row caption="Can be collateral" mb={0}>
                {col}
              </Row>
            </MobileCard>
          </React.Fragment>
        );
      })}
    </ListWrapper>
  );
}

// ---------------------------------------------------------------------------------------------

export function BorrowedPositionsList({ snap, user }: ListProps) {
  const open = useStdModal((s) => s.open);
  const { sort, toggle } = useSort();
  const id = snap.market.id;
  const all = pairs(snap, user)
    .filter(({ u }) => u.borrowed > 0)
    .sort((a, b) => (a.r.symbol === 'GHO' ? -1 : b.r.symbol === 'GHO' ? 1 : 0));
  const rows = sortRows(all, sort, { symbol: ({ r }) => assetDisplay(r, snap.market).symbol.toUpperCase(), debt: ({ u }) => u.borrowedUSD, apy: ({ r }) => r.variableBorrowAPY });
  const s = user.summary;
  const hasEModes = snap.eModes.length > 0;

  return (
    <ListWrapper
      title="Your borrows"
      storageKey="borrowedAssetsDashboardTableCollapse"
      noData={all.length === 0}
      subtitle={hasEModes ? <EModeButton snap={snap} user={user} /> : undefined}
      topInfo={
        all.length > 0 && (
          <>
            <ListTopInfoItem title="Balance" value={s.totalBorrowedUSD} usd />
            <ListTopInfoItem title="APY" value={s.debtAPY} percent tooltip="The weighted average of APY for all borrowed assets, including incentives." />
            <ListTopInfoItem
              title="Borrow power used"
              value={s.totalBorrowedUSD + s.availableBorrowsUSD > 0 ? s.totalBorrowedUSD / (s.totalBorrowedUSD + s.availableBorrowsUSD) : 0}
              percent
              tooltip="The % of your total borrowing power used. This is based on the amount of your collateral supplied and the total amount that you can borrow."
            />
          </>
        )
      }
    >
      {all.length === 0 ? (
        <ListEmpty>Nothing borrowed yet</ListEmpty>
      ) : (
        <>
          <ListHeaderWrapper>
            <ListColumn isRow align="left" maxWidth={130} minWidth={100}>
              <ListHeaderTitle sortKey="symbol" sort={sort} onSort={toggle}>
                Asset
              </ListHeaderTitle>
            </ListColumn>
            <ListColumn>
              <ListHeaderTitle sortKey="debt" sort={sort} onSort={toggle}>
                Debt
              </ListHeaderTitle>
            </ListColumn>
            <ListColumn>
              <ListHeaderTitle sortKey="apy" sort={sort} onSort={toggle}>
                APY
              </ListHeaderTitle>
            </ListColumn>
            <Buttons>{null}</Buttons>
          </ListHeaderWrapper>
          {rows.map(({ r, u }, i) => {
            const d = assetDisplay(r, snap.market);
            const href = ROUTES.reserve(r.symbol, id);
            return (
              <React.Fragment key={r.id}>
                <Box sx={{ display: { xs: 'none', xsm: 'block' } }}>
                  <ListItem last={i === rows.length - 1}>
                    <AssetCell symbol={d.symbol} name={d.name} href={href} />
                    <ListColumn>
                      <ListValue value={u.borrowed} usdValue={u.borrowedUSD} />
                    </ListColumn>
                    <ListColumn>
                      <FormattedNumber value={r.variableBorrowAPY} percent variant="h5" />
                    </ListColumn>
                    <Buttons>
                      <Button variant="contained" size="small" disabled={!r.borrowingEnabled || r.isFrozen || r.isPaused} onClick={() => open({ type: 'borrow', symbol: r.symbol, marketId: id })}>
                        Borrow
                      </Button>
                      <Button variant="tertiary" size="small" disabled={r.isPaused} onClick={() => open({ type: 'repay', symbol: r.symbol, marketId: id })}>
                        Repay
                      </Button>
                    </Buttons>
                  </ListItem>
                </Box>
                <MobileCard
                  first={i === 0}
                  header={<MobileHeader symbol={d.symbol} name={d.name} href={href} />}
                  actions={
                    <>
                      <Button variant="contained" fullWidth onClick={() => open({ type: 'borrow', symbol: r.symbol, marketId: id })}>
                        Borrow
                      </Button>
                      <Button variant="tertiary" fullWidth onClick={() => open({ type: 'repay', symbol: r.symbol, marketId: id })}>
                        Repay
                      </Button>
                    </>
                  }
                >
                  <Row caption="Debt">
                    <FormattedNumber value={u.borrowed} variant="h5" />
                    <FormattedNumber value={u.borrowedUSD} usd compact variant="description" color="fg-2" />
                  </Row>
                  <Row caption="APY" mb={0}>
                    <FormattedNumber value={r.variableBorrowAPY} percent variant="h5" />
                  </Row>
                </MobileCard>
              </React.Fragment>
            );
          })}
        </>
      )}
    </ListWrapper>
  );
}

// ---------------------------------------------------------------------------------------------

export function BorrowAssetsList({ snap, user }: ListProps) {
  const open = useStdModal((s) => s.open);
  const { sort, toggle } = useSort();
  const id = snap.market.id;
  const s = user.summary;
  const [categories, setCategories] = React.useState<AssetCategory[]>([]);
  const cat = snap.eModes.find((e) => e.id === user.eModeCategoryId);
  const noCollateral = s.totalCollateralUSD <= 0;
  const all = pairs(snap, user)
    .filter(({ r }) => r.borrowingEnabled && !r.isFrozen && !r.isPaused)
    .filter(({ r }) => !cat || cat.borrowableSymbols.includes(r.symbol))
    .filter(({ r }) => !s.isInIsolationMode || r.borrowableInIsolation)
    .filter(({ r }) => !categories.length || categories.includes(r.category))
    .map(({ r, u }) => {
      const available = maxBorrow({ availableBorrowsUSD: s.availableBorrowsUSD, priceUSD: r.priceUSD, availableLiquidity: r.availableLiquidity, borrowCap: r.borrowCap, totalBorrowed: r.totalBorrowed, decimals: r.decimals });
      return { r, u, available, availableUSD: available * r.priceUSD };
    });
  const filtered = noCollateral || s.borrowPowerUsed >= 0.98 ? all : all.filter((x) => x.availableUSD >= 0.01 || x.r.symbol === 'GHO');
  const rows = sortRows(
    [...filtered].sort((a, b) => (a.r.symbol === 'GHO' ? -1 : b.r.symbol === 'GHO' ? 1 : 0)),
    sort,
    { symbol: (x) => assetDisplay(x.r, snap.market).symbol.toUpperCase(), available: (x) => x.availableUSD, apy: (x) => x.r.variableBorrowAPY }
  );
  const hf = s.healthFactor;
  const availableTooltip = 'This is the total amount available for you to borrow. You can borrow based on your collateral and until the borrow cap is reached.';
  const apyTooltip = (
    <>
      Variable interest rate will <b>fluctuate</b> based on the market conditions.
    </>
  );

  return (
    <ListWrapper
      title="Assets to borrow"
      titleExtra={<CategorySelect value={categories} onChange={setCategories} />}
      withTopMargin
      storageKey="borrowAssetsDashboardTableCollapse"
      subChildren={
        <>
          {Number.isFinite(hf) && hf <= 1.1 && (
            <Alert severity="error" data-size="small" sx={{ mb: 6 }}>
              Be careful - You are very close to liquidation. Consider depositing more collateral or paying down some of your borrowed positions
            </Alert>
          )}
          {s.isInIsolationMode && (
            <Alert severity="warning" data-size="small" sx={{ mb: 6 }}>
              Borrowing power and assets are limited due to Isolation mode.
            </Alert>
          )}
          {cat && (
            <Alert severity="warning" data-size="small" sx={{ mb: 6 }}>
              In E-Mode some assets are not borrowable. Exit E-Mode to get access to all assets
            </Alert>
          )}
          {noCollateral && (
            <Alert severity="info" data-size="small" sx={{ mb: 6 }}>
              To borrow you need to supply any asset to be used as collateral.
            </Alert>
          )}
        </>
      }
    >
      <ListHeaderWrapper>
        <ListColumn isRow align="left" maxWidth={130} minWidth={100}>
          <ListHeaderTitle sortKey="symbol" sort={sort} onSort={toggle}>
            Asset
          </ListHeaderTitle>
        </ListColumn>
        <ListColumn>
          <ListHeaderTitle sortKey="available" sort={sort} onSort={toggle} tooltip={availableTooltip}>
            Available
          </ListHeaderTitle>
        </ListColumn>
        <ListColumn>
          <ListHeaderTitle sortKey="apy" sort={sort} onSort={toggle} tooltip={apyTooltip}>
            APY, variable
          </ListHeaderTitle>
        </ListColumn>
        <Buttons>{null}</Buttons>
      </ListHeaderWrapper>
      {rows.map((x, i) => {
        const d = assetDisplay(x.r, snap.market);
        const href = ROUTES.reserve(x.r.symbol, id);
        const borrow = () => open({ type: 'borrow', symbol: x.r.symbol, marketId: id });
        return (
          <React.Fragment key={x.r.id}>
            <Box sx={{ display: { xs: 'none', xsm: 'block' } }}>
              <ListItem last={i === rows.length - 1}>
                <AssetCell symbol={d.symbol} name={d.name} href={href} />
                <ListColumn>
                  <ListValue value={x.available} usdValue={x.availableUSD} disabled={x.available <= 0} />
                </ListColumn>
                <ListColumn>
                  <FormattedNumber value={x.r.variableBorrowAPY} percent variant="h5" />
                </ListColumn>
                <Buttons>
                  <Button variant="tertiary" size="small" disabled={x.available <= 0} onClick={borrow}>
                    Borrow
                  </Button>
                  <Button variant="tertiary" size="small" component={Link} href={href}>
                    Details
                  </Button>
                </Buttons>
              </ListItem>
            </Box>
            <MobileCard
              first={i === 0}
              header={<MobileHeader symbol={d.symbol} name={d.name} href={href} />}
              actions={
                <>
                  <Button variant="tertiary" fullWidth disabled={x.available <= 0} onClick={borrow}>
                    Borrow
                  </Button>
                  <Button variant="tertiary" fullWidth component={Link} href={href}>
                    Details
                  </Button>
                </>
              }
            >
              <Row caption={<InfoTooltip title={availableTooltip}>Available to borrow</InfoTooltip>}>
                <FormattedNumber value={x.available} compact variant="h5" />
              </Row>
              <Row caption={<InfoTooltip title={apyTooltip}>APY, variable</InfoTooltip>} mb={0}>
                <FormattedNumber value={x.r.variableBorrowAPY} percent variant="h5" />
              </Row>
            </MobileCard>
          </React.Fragment>
        );
      })}
    </ListWrapper>
  );
}
