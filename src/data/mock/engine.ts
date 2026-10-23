/**
 * The simulated "chain": pure functions that apply one action to the whole state.
 *
 * `applyAction(state, action)` either returns a brand-new state (every affected number updated
 * together) plus a history record, or throws `SimulatedTxError` and changes nothing. Pure
 * functions make that guarantee testable: the caller commits the returned state in one `set()`.
 *
 * Rules mirror on-chain Aave behaviour (simplified). The UI applies the reference's stricter
 * buffers (HF floor 1.01, 1% borrow margin) on top; the engine only enforces protocol rules.
 */
import { summarizePosition } from '@/lib/aave-math';
import {
  deriveMarket,
  deriveProProtocol,
  deriveProPosition,
  positionLines,
  reserveIdOf,
  type RawPosition,
  type RawProUser,
  type RawUserMarket,
} from '../derive';
import {
  SimulatedTxError,
  type MarketSnapshot,
  type ProAction,
  type ProProtocolSnapshot,
  type ProReserveState,
  type ReserveState,
  type StandardAction,
  type TxRecord,
  type LendingAction,
} from '../types';
import { EMODES, MARKETS, RESERVES, RESERVE_STATES } from './seed/standard';
import { CHAINS, HUBS, HUB_ASSETS, PRO_RESERVES, PRO_RESERVE_STATES, SPOKES } from './seed/pro';

export interface ChainState {
  version: number;
  nonce: number;
  standard: {
    reserves: Record<string, ReserveState>;
    users: Record<string, Record<string, RawUserMarket>>;
  };
  pro: {
    reserves: Record<string, ProReserveState>;
    users: Record<string, RawProUser>;
  };
  txLog: TxRecord[];
}

export const STATE_VERSION = 7;
const EPS = 1e-9;

export function initialChainState(): ChainState {
  return {
    version: STATE_VERSION,
    nonce: 0,
    standard: { reserves: structuredClone(RESERVE_STATES), users: {} },
    pro: { reserves: structuredClone(PRO_RESERVE_STATES), users: {} },
    txLog: [],
  };
}

export const proSeed = { chains: CHAINS, hubs: HUBS, spokes: SPOKES, hubAssets: HUB_ASSETS, reserves: PRO_RESERVES };

export function marketSnapshot(state: ChainState, marketId: string): MarketSnapshot {
  const market = MARKETS.find((m) => m.id === marketId);
  if (!market) throw new SimulatedTxError(`Unknown market "${marketId}"`, 'validation');
  return deriveMarket(
    market,
    RESERVES.filter((r) => r.marketId === marketId),
    state.standard.reserves,
    EMODES[marketId] ?? []
  );
}

export function proSnapshot(state: ChainState): ProProtocolSnapshot {
  return deriveProProtocol(proSeed, state.pro.reserves);
}

const fail = (msg: string): never => {
  throw new SimulatedTxError(msg, 'validation');
};

/** Deterministic, obviously-fake hash: "0xdemo" + counter, padded. */
export const fakeHash = (nonce: number) => `0xdemo${nonce.toString(16).padStart(58, '0')}`;

// ---------------------------------------------------------------------------------------------

export function applyAction(state: ChainState, action: LendingAction, now = Date.now()): { state: ChainState; record: TxRecord } {
  const next = structuredClone(state);
  next.nonce += 1;
  const record =
    action.app === 'standard' ? applyStandard(next, action, now) : applyPro(next, action, now);
  record.hash = fakeHash(next.nonce);
  record.id = `tx-${next.nonce}`;
  next.txLog = [record, ...next.txLog].slice(0, 500);
  return { state: next, record };
}

function positionOf(user: RawUserMarket, symbol: string): RawPosition {
  if (!user.positions[symbol]) user.positions[symbol] = { supplied: 0, borrowed: 0, collateralEnabled: false };
  return user.positions[symbol];
}

function applyStandard(s: ChainState, a: StandardAction, now: number): TxRecord {
  const account = a.account.toLowerCase();
  const markets = s.standard.users[account];
  if (!markets || !markets[a.marketId]) fail('Account not initialised in the demo.');
  const user = markets[a.marketId];
  const snap = marketSnapshot(s, a.marketId);
  const market = snap.market;
  const base: TxRecord = { id: '', hash: '', app: 'standard', account, timestamp: now, kind: a.kind, status: 'confirmed', marketId: a.marketId };

  if (a.kind === 'emode') {
    const cat = snap.eModes.find((e) => e.id === a.categoryId);
    if (a.categoryId !== 0 && !cat) fail('Unknown E-Mode category.');
    if (cat) {
      const blocked = Object.entries(user.positions).filter(([sym, p]) => p.borrowed > EPS && !cat.borrowableSymbols.includes(sym));
      if (blocked.length) fail(`Repay your ${blocked.map(([s2]) => s2).join(', ')} borrow to use this category.`);
    }
    const hf = summarizePosition(positionLines(snap, user, a.categoryId)).healthFactor;
    if (hf < 1) fail('This E-Mode change would make your position liquidatable.');
    const from = snap.eModes.find((e) => e.id === user.eModeCategoryId)?.label ?? 'Disabled';
    user.eModeCategoryId = a.categoryId;
    return { ...base, eModeFrom: from, eModeTo: cat?.label ?? 'Disabled' };
  }

  const reserve = snap.reserves.find((r) => r.symbol === a.symbol);
  if (!reserve) return fail(`${a.symbol} is not listed in this market.`);
  const rs = s.standard.reserves[reserveIdOf(a.marketId, a.symbol)];
  const pos = positionOf(user, a.symbol);
  const price = reserve.priceUSD;
  const isNativeWrapped = a.symbol === market.wrappedNativeSymbol;

  const after = (mutate: (u: RawUserMarket) => void) => {
    const copy = structuredClone(user);
    mutate(copy);
    return summarizePosition(positionLines(snap, copy));
  };

  switch (a.kind) {
    case 'approve': {
      if (!(a.amount >= 0)) fail('Invalid approval amount.');
      user.allowances[a.symbol] = a.amount;
      return { ...base, symbol: a.symbol, amount: a.amount, amountUSD: a.amount * price };
    }
    case 'faucet': {
      if (!market.isTestnet) fail('The faucet is only available on test networks.');
      const amt = reserve.faucetAmount ?? 0;
      if (!(amt > 0)) fail(`No faucet for ${a.symbol}.`);
      user.wallet[a.symbol] = (user.wallet[a.symbol] ?? 0) + amt;
      return { ...base, symbol: a.symbol, amount: amt, amountUSD: amt * price };
    }
    case 'supply': {
      if (!(a.amount > 0)) fail('Enter an amount greater than zero.');
      if (reserve.isFrozen || reserve.isPaused) fail(`${a.symbol} is ${reserve.isPaused ? 'paused' : 'frozen'}; supplying is disabled.`);
      if (a.native && !isNativeWrapped) fail('Native supply is only possible for the wrapped native asset.');
      const walletSymbol = a.native ? market.nativeSymbol : a.symbol;
      if ((user.wallet[walletSymbol] ?? 0) + EPS < a.amount) fail(`Not enough ${walletSymbol} in your demo wallet.`);
      if (reserve.supplyCap > 0 && rs.totalSupplied + a.amount > reserve.supplyCap + EPS) fail('Supply cap exceeded.');
      if (!a.native && (user.allowances[a.symbol] ?? 0) + EPS < a.amount) fail(`Approve ${a.symbol} first.`);
      if (pos.supplied <= EPS) {
        // First supply: enable as collateral by default, unless isolation rules forbid it
        // (an isolated asset must be the only collateral, and nothing else can join it).
        const otherCollateral = Object.entries(user.positions).some(
          ([sym, p]) => sym !== a.symbol && p.collateralEnabled && p.supplied > EPS
        );
        const inIsolation = snap.reserves.some(
          (r) => r.isIsolated && user.positions[r.symbol]?.collateralEnabled && (user.positions[r.symbol]?.supplied ?? 0) > EPS
        );
        pos.collateralEnabled =
          reserve.usageAsCollateralEnabled && reserve.ltv > 0 && (reserve.isIsolated ? !otherCollateral : !inIsolation);
      }
      user.wallet[walletSymbol] = (user.wallet[walletSymbol] ?? 0) - a.amount;
      if (!a.native) user.allowances[a.symbol] = Math.max((user.allowances[a.symbol] ?? 0) - a.amount, 0);
      pos.supplied += a.amount;
      rs.totalSupplied += a.amount;
      return { ...base, symbol: a.native ? market.nativeSymbol : a.symbol, amount: a.amount, amountUSD: a.amount * price };
    }
    case 'withdraw': {
      if (!(a.amount > 0)) fail('Enter an amount greater than zero.');
      if (reserve.isPaused) fail(`${a.symbol} is paused.`);
      if (a.amount > pos.supplied + EPS) fail('Amount exceeds your supply balance.');
      if (a.amount > rs.totalSupplied - rs.totalBorrowed + EPS) fail('These funds have been borrowed and are not available for withdrawal at this time.');
      const hf = after((u) => (u.positions[a.symbol].supplied = Math.max(u.positions[a.symbol].supplied - a.amount, 0))).healthFactor;
      if (hf < 1) fail('You can not withdraw this amount because it will cause collateral call.');
      const to = a.unwrap && isNativeWrapped ? market.nativeSymbol : a.symbol;
      pos.supplied = clampDust(pos.supplied - a.amount);
      rs.totalSupplied = Math.max(rs.totalSupplied - a.amount, 0);
      user.wallet[to] = (user.wallet[to] ?? 0) + a.amount;
      return { ...base, symbol: to, amount: a.amount, amountUSD: a.amount * price };
    }
    case 'borrow': {
      if (!(a.amount > 0)) fail('Enter an amount greater than zero.');
      if (!reserve.borrowingEnabled || reserve.isFrozen || reserve.isPaused) fail(`Borrowing is currently unavailable for ${a.symbol}.`);
      const cat = snap.eModes.find((e) => e.id === user.eModeCategoryId);
      if (cat && !cat.borrowableSymbols.includes(a.symbol)) fail(`${a.symbol} is not borrowable in E-Mode (${cat.label}).`);
      const summary = summarizePosition(positionLines(snap, user));
      const isolated = snap.reserves.find((r) => r.isIsolated && user.positions[r.symbol]?.collateralEnabled && (user.positions[r.symbol]?.supplied ?? 0) > EPS);
      if (isolated) {
        if (!reserve.borrowableInIsolation) fail(`${a.symbol} can not be borrowed in isolation mode.`);
        const irs = s.standard.reserves[reserveIdOf(a.marketId, isolated.symbol)];
        if (irs.isolationModeTotalDebtUSD + a.amount * price > isolated.debtCeilingUSD + EPS) fail('Isolation mode debt ceiling exceeded.');
      }
      // Protocol rule (no UI margin): debt after must fit within Σ(collateral × LTV), and the
      // pool must have the liquidity and cap room.
      const capRoom = reserve.borrowCap > 0 ? reserve.borrowCap - rs.totalBorrowed : Number.POSITIVE_INFINITY;
      const liquidity = Math.min(rs.totalSupplied - rs.totalBorrowed, capRoom);
      if (a.amount > liquidity + EPS) fail(`There are not enough funds in the ${a.symbol} reserve to borrow`);
      if (a.amount * price > summary.availableBorrowsUSD + EPS) fail('Amount exceeds your borrowing power.');
      const hf = after((u) => (positionOf(u, a.symbol).borrowed += a.amount)).healthFactor;
      if (hf < 1) fail('This borrow would make your position liquidatable.');
      const to = a.unwrap && isNativeWrapped ? market.nativeSymbol : a.symbol;
      pos.borrowed += a.amount;
      rs.totalBorrowed += a.amount;
      if (isolated) s.standard.reserves[reserveIdOf(a.marketId, isolated.symbol)].isolationModeTotalDebtUSD += a.amount * price;
      user.wallet[to] = (user.wallet[to] ?? 0) + a.amount;
      return { ...base, symbol: to, amount: a.amount, amountUSD: a.amount * price };
    }
    case 'repay': {
      if (!(a.amount > 0)) fail('Enter an amount greater than zero.');
      if (reserve.isPaused) fail(`${a.symbol} is paused.`);
      if (pos.borrowed <= EPS) fail(`You have no ${a.symbol} debt.`);
      const amount = Math.min(a.amount, pos.borrowed);
      if (a.source === 'aToken') {
        if (pos.supplied + EPS < amount) fail(`Not enough supplied ${a.symbol}.`);
        const hf = after((u) => {
          u.positions[a.symbol].supplied -= amount;
          u.positions[a.symbol].borrowed -= amount;
        }).healthFactor;
        if (hf < 1) fail('Repaying with this collateral would make your position liquidatable.');
        pos.supplied = clampDust(pos.supplied - amount);
        rs.totalSupplied = Math.max(rs.totalSupplied - amount, 0);
      } else {
        const walletSymbol = a.source === 'native' ? market.nativeSymbol : a.symbol;
        if (a.source === 'native' && !isNativeWrapped) fail('Native repay is only possible for the wrapped native asset.');
        if ((user.wallet[walletSymbol] ?? 0) + EPS < amount) fail(`Not enough ${walletSymbol} in your demo wallet.`);
        if (a.source === 'wallet' && (user.allowances[a.symbol] ?? 0) + EPS < amount) fail(`Approve ${a.symbol} first.`);
        user.wallet[walletSymbol] -= amount;
        if (a.source === 'wallet') user.allowances[a.symbol] = Math.max((user.allowances[a.symbol] ?? 0) - amount, 0);
      }
      pos.borrowed = clampDust(pos.borrowed - amount);
      rs.totalBorrowed = Math.max(rs.totalBorrowed - amount, 0);
      const isolated = snap.reserves.find((r) => r.isIsolated && user.positions[r.symbol]?.collateralEnabled);
      if (isolated) {
        const irs = s.standard.reserves[reserveIdOf(a.marketId, isolated.symbol)];
        irs.isolationModeTotalDebtUSD = Math.max(irs.isolationModeTotalDebtUSD - amount * price, 0);
      }
      return { ...base, symbol: a.source === 'native' ? market.nativeSymbol : a.symbol, amount, amountUSD: amount * price, repaySource: a.source };
    }
    case 'collateral': {
      if (pos.supplied <= EPS) fail('You do not have supplies in this currency');
      if (a.enabled) {
        if (!reserve.usageAsCollateralEnabled || reserve.ltv === 0) fail('You can not use this currency as collateral');
        const others = Object.entries(user.positions).filter(([sym, p]) => sym !== a.symbol && p.collateralEnabled && p.supplied > EPS);
        if (reserve.isIsolated && others.length) fail('An isolated asset can only be collateral on its own. Disable other collateral first.');
        if (!reserve.isIsolated && others.some(([sym]) => snap.reserves.find((r) => r.symbol === sym)?.isIsolated))
          fail('You are in isolation mode. Disable the isolated collateral first.');
      } else {
        const hf = after((u) => (u.positions[a.symbol].collateralEnabled = false)).healthFactor;
        if (hf <= 1) fail('You can not switch usage as collateral mode for this currency, because it will cause collateral call');
      }
      pos.collateralEnabled = a.enabled;
      return { ...base, symbol: a.symbol, collateralEnabled: a.enabled };
    }
  }
}

function clampDust(n: number) {
  return n < 1e-9 ? 0 : n;
}

// ---------------------------------------------------------------------------------------------

function applyPro(s: ChainState, a: ProAction, now: number): TxRecord {
  const account = a.account.toLowerCase();
  const user = s.pro.users[account];
  if (!user) return fail('Account not initialised in the demo.');
  const snap = proSnapshot(s);
  const reserve = snap.reserves.find((r) => r.id === a.reserveId);
  if (!reserve) return fail('Unknown reserve.');
  const rs = s.pro.reserves[a.reserveId] ?? (s.pro.reserves[a.reserveId] = { supplied: 0, borrowed: 0 });
  const pos = user.positions[a.reserveId] ?? (user.positions[a.reserveId] = { supplied: 0, borrowed: 0, collateralEnabled: false });
  const wallet = user.wallet[reserve.chainId] ?? (user.wallet[reserve.chainId] = {});
  const price = reserve.priceUSD;
  const hubAsset = snap.hubAssets.find((h) => h.hubId === reserve.hubId && h.symbol === reserve.symbol)!;
  const base: TxRecord = {
    id: '',
    hash: '',
    app: 'pro',
    account,
    timestamp: now,
    kind: a.kind,
    status: 'confirmed',
    reserveId: a.reserveId,
    spokeId: reserve.spokeId,
    chainId: reserve.chainId,
    symbol: reserve.symbol,
  };
  const hfAfter = (mutate: (u: RawProUser) => void) => {
    const copy = structuredClone(user);
    mutate(copy);
    return deriveProPosition(snap, account, reserve.spokeId, copy).summary;
  };

  if (a.kind === 'approve') {
    user.allowances[a.reserveId] = a.amount;
    return { ...base, amount: a.amount, amountUSD: a.amount * price };
  }
  if (a.kind === 'collateral') {
    if (pos.supplied <= EPS) fail('Deposit this asset before using it as collateral.');
    if (a.enabled && !reserve.collateral) fail('This asset is not eligible as collateral in this market.');
    if (!a.enabled) {
      const sum = hfAfter((u) => (u.positions[a.reserveId].collateralEnabled = false));
      if (sum.healthFactor < 1) fail('Collateral cannot be disabled: it would make your position liquidatable.');
    }
    pos.collateralEnabled = a.enabled;
    return { ...base, collateralEnabled: a.enabled };
  }
  if (!(a.amount > 0)) fail('Enter an amount greater than zero.');
  if (reserve.paused) fail('This reserve is paused due to a governance decision.');

  switch (a.kind) {
    case 'deposit': {
      if (reserve.frozen) fail('This reserve is frozen.');
      if (!reserve.suppliable) fail(`Depositing ${reserve.symbol} is not supported in this reserve`);
      if ((wallet[reserve.symbol] ?? 0) + EPS < a.amount) fail(`Not enough ${reserve.symbol} in your demo wallet.`);
      if (reserve.supplyCap > 0 && rs.supplied + a.amount > reserve.supplyCap + EPS) fail('Deposit capacity reached.');
      if ((user.allowances[a.reserveId] ?? 0) + EPS < a.amount) fail(`Approve ${reserve.symbol} first.`);
      if (pos.supplied <= EPS) pos.collateralEnabled = reserve.collateral;
      wallet[reserve.symbol] = (wallet[reserve.symbol] ?? 0) - a.amount;
      user.allowances[a.reserveId] = Math.max((user.allowances[a.reserveId] ?? 0) - a.amount, 0);
      pos.supplied += a.amount;
      rs.supplied += a.amount;
      return { ...base, kind: 'deposit', amount: a.amount, amountUSD: a.amount * price };
    }
    case 'withdraw': {
      if (a.amount > pos.supplied + EPS) fail('Amount exceeds your deposited balance.');
      if (a.amount > hubAsset.availableLiquidity + EPS) fail('Not enough liquidity in the hub right now.');
      const sum = hfAfter((u) => (u.positions[a.reserveId].supplied -= a.amount));
      if (sum.healthFactor < 1) fail('This withdrawal would trigger liquidation');
      pos.supplied = clampDust(pos.supplied - a.amount);
      rs.supplied = Math.max(rs.supplied - a.amount, 0);
      wallet[reserve.symbol] = (wallet[reserve.symbol] ?? 0) + a.amount;
      return { ...base, amount: a.amount, amountUSD: a.amount * price };
    }
    case 'borrow': {
      if (!reserve.borrowable || reserve.frozen) fail(`Borrowing ${reserve.symbol} is not supported in this reserve`);
      if (a.amount > hubAsset.availableLiquidity + EPS) fail('Not enough liquidity in the hub.');
      if (a.amount > reserve.spokeLiquidity + EPS) fail('Not enough liquidity left for this market.');
      if (reserve.borrowCap > 0 && rs.borrowed + a.amount > reserve.borrowCap + EPS) fail('Borrow capacity reached.');
      const before = deriveProPosition(snap, account, reserve.spokeId, user).summary;
      if (a.amount * price > before.availableBorrowsUSD + EPS) fail('Amount exceeds your borrowing power.');
      const sum = hfAfter((u) => (u.positions[a.reserveId].borrowed += a.amount));
      if (sum.healthFactor < 1) fail('This borrow would trigger liquidation');
      pos.borrowed += a.amount;
      rs.borrowed += a.amount;
      wallet[reserve.symbol] = (wallet[reserve.symbol] ?? 0) + a.amount;
      return { ...base, amount: a.amount, amountUSD: a.amount * price };
    }
    case 'repay': {
      if (pos.borrowed <= EPS) fail(`You have no ${reserve.symbol} debt in this market.`);
      const amount = Math.min(a.amount, pos.borrowed);
      if ((wallet[reserve.symbol] ?? 0) + EPS < amount) fail(`Not enough ${reserve.symbol} in your demo wallet.`);
      if ((user.allowances[a.reserveId] ?? 0) + EPS < amount) fail(`Approve ${reserve.symbol} first.`);
      wallet[reserve.symbol] -= amount;
      user.allowances[a.reserveId] = Math.max((user.allowances[a.reserveId] ?? 0) - amount, 0);
      pos.borrowed = clampDust(pos.borrowed - amount);
      rs.borrowed = Math.max(rs.borrowed - amount, 0);
      return { ...base, amount, amountUSD: amount * price };
    }
  }
  return fail('Unsupported action.');
}
