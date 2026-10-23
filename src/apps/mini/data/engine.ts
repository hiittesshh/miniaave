/**
 * Mini-Aave MOCK ENGINE: a pure, deterministic model of the LendingPool, the two MockERC20 tokens
 * and the MockOracle. Every read returns exactly the shape the real contract returns (§6), every
 * write throws the real error names (§5, §9) and emits the real events (§10).
 *
 * Simplifications (documented in docs/MINI_README.md): no time-based interest accrual (rates are
 * computed live from utilization, balances do not grow); one block per transaction.
 *
 * Pure: every write takes a state and returns a NEW state (structuredClone), so a failed call never
 * changes anything and "simulate" is just "run on the current state and discard".
 */
import { MiniContractError } from '../lib/errors';
import { MAX_UINT256, minBig, pow10 } from '../lib/units';
import { ADDR, CLOSE_FACTOR_BPS, FAUCET_AMOUNT, RESERVE_CONFIG, TOKENS, accountByRole } from './config';
import { borrowersFromEventsList } from './derive';
import type { Address, MiniEvent, ReserveConfig, ReserveView, UserAccountData, UserReserveData, WriteCall } from './types';

const WAD = 10n ** 18n;
const BPS = 10000n;
const halfUpDiv = (a: bigint, b: bigint) => (a * 2n + b) / (2n * b);
/** WAD maths with half-up rounding, like the contracts' math library. */
const wadMul = (a: bigint, b: bigint) => halfUpDiv(a * b, WAD);
const wadDiv = (a: bigint, b: bigint) => halfUpDiv(a * WAD, b);
const percentMul = (a: bigint, bps: bigint) => halfUpDiv(a * bps, BPS);

const key = (a: string) => a.toLowerCase();

export interface MiniState {
  owner: Address;
  /** asset → USD price, 8 decimals */
  prices: Record<string, bigint>;
  /** asset → pool totals, token units */
  reserves: Record<string, { totalSupplied: bigint; totalBorrowed: bigint }>;
  /** user → asset → supplied / borrowed */
  positions: Record<string, Record<string, { supplied: bigint; borrowed: bigint }>>;
  /** token → holder → wallet balance */
  balances: Record<string, Record<string, bigint>>;
  /** token → owner → allowance for the pool */
  allowances: Record<string, Record<string, bigint>>;
  events: MiniEvent[];
  blockNumber: bigint;
  /** mock clock (ms), advanced per block */
  time: number;
}

export const RESERVE_LIST: Address[] = [ADDR.usdc, ADDR.weth];

const isListed = (asset: string) => RESERVE_LIST.some((a) => key(a) === key(asset));
const requireListed = (asset: string) => {
  if (!isListed(asset)) throw new MiniContractError('AssetNotListed');
};
const cfg = (asset: string): ReserveConfig => RESERVE_CONFIG[RESERVE_LIST.find((a) => key(a) === key(asset))!];
const decimalsOf = (asset: string) => TOKENS[RESERVE_LIST.find((a) => key(a) === key(asset))!].decimals;

const pos = (s: MiniState, user: string, asset: string) => s.positions[key(user)]?.[key(asset)] ?? { supplied: 0n, borrowed: 0n };
const setPos = (s: MiniState, user: string, asset: string, p: { supplied: bigint; borrowed: bigint }) => {
  s.positions[key(user)] = { ...(s.positions[key(user)] ?? {}), [key(asset)]: p };
};
const bal = (s: MiniState, token: string, who: string) => s.balances[key(token)]?.[key(who)] ?? 0n;
const setBal = (s: MiniState, token: string, who: string, v: bigint) => {
  s.balances[key(token)] = { ...(s.balances[key(token)] ?? {}), [key(who)]: v };
};
const allow = (s: MiniState, token: string, owner: string) => s.allowances[key(token)]?.[key(owner)] ?? 0n;
const setAllow = (s: MiniState, token: string, owner: string, v: bigint) => {
  s.allowances[key(token)] = { ...(s.allowances[key(token)] ?? {}), [key(owner)]: v };
};
const reserve = (s: MiniState, asset: string) => s.reserves[key(asset)] ?? { totalSupplied: 0n, totalBorrowed: 0n };

// ---------------------------------------------------------------------------------------------
// Reads (§6)
// ---------------------------------------------------------------------------------------------

export const getReserveList = (): Address[] => [...RESERVE_LIST];

export function getReserveConfig(asset: Address): ReserveConfig {
  requireListed(asset);
  return { ...cfg(asset) };
}

/** Two-slope rate curve (§6): base + slope1·U/optimal below the kink, + slope2 above it. */
export function borrowRateFor(utilization: bigint, c: ReserveConfig): bigint {
  if (utilization <= c.optimalUtilization) return c.baseRate + wadMul(c.slope1, wadDiv(utilization, c.optimalUtilization));
  const excess = wadDiv(utilization - c.optimalUtilization, WAD - c.optimalUtilization);
  return c.baseRate + c.slope1 + wadMul(c.slope2, excess);
}

export function getReserveData(s: MiniState, asset: Address): ReserveView {
  requireListed(asset);
  const c = cfg(asset);
  const r = reserve(s, asset);
  const utilization = r.totalSupplied > 0n ? wadDiv(r.totalBorrowed, r.totalSupplied) : 0n;
  const borrowRate = r.totalBorrowed > 0n ? borrowRateFor(utilization, c) : 0n;
  const supplyRate = percentMul(wadMul(borrowRate, utilization), BPS - BigInt(c.reserveFactor));
  return {
    asset: RESERVE_LIST.find((a) => key(a) === key(asset))!,
    decimals: decimalsOf(asset),
    price: s.prices[key(asset)] ?? 0n,
    totalSupplied: r.totalSupplied,
    totalBorrowed: r.totalBorrowed,
    availableLiquidity: r.totalSupplied - r.totalBorrowed,
    utilization,
    supplyRate,
    borrowRate,
    ltv: c.ltv,
    liquidationThreshold: c.liquidationThreshold,
    liquidationBonus: c.liquidationBonus,
  };
}

export function getUserReserveData(s: MiniState, asset: Address, user: Address): UserReserveData {
  requireListed(asset);
  const p = pos(s, user, asset);
  return [p.supplied, p.borrowed] as const;
}

export function getUserAccountData(s: MiniState, user: Address): UserAccountData {
  let collateral = 0n;
  let debt = 0n;
  let limit = 0n;
  let liqLimit = 0n;
  for (const asset of RESERVE_LIST) {
    const p = pos(s, user, asset);
    const price = s.prices[key(asset)] ?? 0n;
    const d = pow10(decimalsOf(asset));
    const c = cfg(asset);
    const cUsd = (p.supplied * price) / d;
    collateral += cUsd;
    debt += (p.borrowed * price) / d;
    limit += (cUsd * BigInt(c.ltv)) / BPS;
    liqLimit += (cUsd * BigInt(c.liquidationThreshold)) / BPS;
  }
  return {
    totalCollateralUsd: collateral,
    totalDebtUsd: debt,
    borrowLimitUsd: limit,
    availableBorrowsUsd: limit > debt ? limit - debt : 0n,
    liquidationLimitUsd: liqLimit,
    healthFactor: debt === 0n ? MAX_UINT256 : wadDiv(liqLimit, debt),
  };
}

export const balanceOf = (s: MiniState, token: Address, who: Address) => bal(s, token, who);
export const allowance = (s: MiniState, token: Address, owner: Address) => allow(s, token, owner);
export const oracleOwner = (s: MiniState) => s.owner;
export const getPrice = (s: MiniState, token: Address) => {
  const p = s.prices[key(token)];
  if (p === undefined) throw new MiniContractError('PriceNotSet');
  return p;
};

// ---------------------------------------------------------------------------------------------
// Writes (§5): (state, from, call) → { state, result, events }. Throws named errors.
// ---------------------------------------------------------------------------------------------

export interface WriteOutcome {
  state: MiniState;
  /** Return value: withdraw/repay → amount, liquidate → [debtCovered, collateralSeized] */
  result?: bigint | readonly [bigint, bigint];
}

const clone = (s: MiniState): MiniState => structuredClone(s);

function emit(s: MiniState, hash: `0x${string}`, e: Omit<MiniEvent, 'blockNumber' | 'transactionHash' | 'logIndex' | 'timestamp'>) {
  s.events.push({ ...(e as MiniEvent), blockNumber: s.blockNumber, transactionHash: hash, logIndex: s.events.filter((x) => x.blockNumber === s.blockNumber).length, timestamp: s.time });
}

/** Moves `amount` of `token` from `from` into the pool, checking allowance then balance (ERC-20 order). */
function pull(s: MiniState, token: Address, from: Address, amount: bigint) {
  if (allow(s, token, from) < amount) throw new MiniContractError('ERC20InsufficientAllowance');
  if (bal(s, token, from) < amount) throw new MiniContractError('ERC20InsufficientBalance');
  if (allow(s, token, from) !== MAX_UINT256) setAllow(s, token, from, allow(s, token, from) - amount);
  setBal(s, token, from, bal(s, token, from) - amount);
}
const push = (s: MiniState, token: Address, to: Address, amount: bigint) => setBal(s, token, to, bal(s, token, to) + amount);

/** Deterministic fake hash for block n (clearly fake: no explorer). */
export const fakeHash = (block: bigint, salt = 0): `0x${string}` => `0x${(block * 2654435761n + BigInt(salt)).toString(16).padStart(8, '0').repeat(8)}` as `0x${string}`;

export function applyWrite(prev: MiniState, from: Address, call: WriteCall): WriteOutcome {
  const s = clone(prev);
  s.blockNumber += 1n;
  s.time += 12_000;
  const hash = fakeHash(s.blockNumber);

  if (call.contract === 'token') {
    const token = call.address;
    if (!(key(token) in Object.fromEntries(RESERVE_LIST.map((a) => [key(a), 1])))) throw new MiniContractError('AssetNotListed');
    if (call.functionName === 'faucet') {
      push(s, token, from, FAUCET_AMOUNT[RESERVE_LIST.find((a) => key(a) === key(token))!]);
      return { state: s };
    }
    setAllow(s, token, from, call.args[1]);
    return { state: s };
  }

  if (call.contract === 'oracle') {
    if (key(from) !== key(s.owner)) throw new MiniContractError('OwnableUnauthorizedAccount');
    const [asset, price] = call.args;
    if (price === 0n) throw new MiniContractError('ZeroPrice');
    s.prices[key(asset)] = price;
    emit(s, hash, { eventName: 'PriceSet', args: { asset, price } });
    return { state: s };
  }

  if (call.functionName === 'liquidate') {
    const [collateralAsset, debtAsset, user, debtToCover] = call.args;
    if (debtToCover === 0n) throw new MiniContractError('ZeroAmount');
    requireListed(collateralAsset);
    requireListed(debtAsset);
    const acct = getUserAccountData(s, user);
    const dPos = pos(s, user, debtAsset);
    const cPos = pos(s, user, collateralAsset);
    if (dPos.borrowed === 0n) throw new MiniContractError('NoDebt');
    if (acct.healthFactor >= WAD) throw new MiniContractError('PositionHealthy');
    if (cPos.supplied === 0n) throw new MiniContractError('NoCollateral');
    const dPrice = s.prices[key(debtAsset)];
    const cPrice = s.prices[key(collateralAsset)];
    const dDec = pow10(decimalsOf(debtAsset));
    const cDec = pow10(decimalsOf(collateralAsset));
    const bonus = BigInt(cfg(collateralAsset).liquidationBonus);
    let covered = minBig(debtToCover, (dPos.borrowed * CLOSE_FACTOR_BPS) / BPS);
    let seized = (((covered * dPrice) / dDec) * (BPS + bonus) * cDec) / BPS / cPrice;
    if (seized > cPos.supplied) {
      seized = cPos.supplied;
      covered = (((seized * cPrice) / cDec) * BPS * dDec) / (BPS + bonus) / dPrice;
    }
    const cRes = reserve(s, collateralAsset);
    if (cRes.totalSupplied - cRes.totalBorrowed < seized) throw new MiniContractError('InsufficientLiquidity');
    pull(s, debtAsset, from, covered);
    setPos(s, user, debtAsset, { ...dPos, borrowed: dPos.borrowed - covered });
    const dRes = reserve(s, debtAsset);
    s.reserves[key(debtAsset)] = { ...dRes, totalBorrowed: dRes.totalBorrowed - covered };
    const cPos2 = pos(s, user, collateralAsset);
    setPos(s, user, collateralAsset, { ...cPos2, supplied: cPos2.supplied - seized });
    const cRes2 = reserve(s, collateralAsset);
    s.reserves[key(collateralAsset)] = { ...cRes2, totalSupplied: cRes2.totalSupplied - seized };
    push(s, collateralAsset, from, seized);
    emit(s, hash, { eventName: 'Liquidation', args: { collateralAsset, debtAsset, user, debtCovered: covered, collateralSeized: seized, liquidator: from } });
    return { state: s, result: [covered, seized] as const };
  }

  const [asset, amountArg] = call.args;
  if (amountArg === 0n) throw new MiniContractError('ZeroAmount');
  requireListed(asset);
  const p = pos(s, from, asset);
  const r = reserve(s, asset);
  const available = r.totalSupplied - r.totalBorrowed;

  switch (call.functionName) {
    case 'supply': {
      pull(s, asset, from, amountArg);
      setPos(s, from, asset, { ...p, supplied: p.supplied + amountArg });
      s.reserves[key(asset)] = { ...r, totalSupplied: r.totalSupplied + amountArg };
      emit(s, hash, { eventName: 'Supply', args: { asset, user: from, amount: amountArg } });
      return { state: s };
    }
    case 'withdraw': {
      const amount = amountArg === MAX_UINT256 ? p.supplied : amountArg;
      if (amount === 0n) throw new MiniContractError('ZeroAmount');
      if (amount > p.supplied) throw new MiniContractError('InsufficientBalance');
      if (amount > available) throw new MiniContractError('InsufficientLiquidity');
      setPos(s, from, asset, { ...p, supplied: p.supplied - amount });
      s.reserves[key(asset)] = { ...r, totalSupplied: r.totalSupplied - amount };
      if (getUserAccountData(s, from).healthFactor < WAD) throw new MiniContractError('HealthFactorTooLow');
      push(s, asset, from, amount);
      emit(s, hash, { eventName: 'Withdraw', args: { asset, user: from, amount } });
      return { state: s, result: amount };
    }
    case 'borrow': {
      if (amountArg > available) throw new MiniContractError('InsufficientLiquidity');
      setPos(s, from, asset, { ...p, borrowed: p.borrowed + amountArg });
      const acct = getUserAccountData(s, from);
      if (acct.totalDebtUsd > acct.borrowLimitUsd) throw new MiniContractError('BorrowLimitExceeded');
      s.reserves[key(asset)] = { ...r, totalBorrowed: r.totalBorrowed + amountArg };
      push(s, asset, from, amountArg);
      emit(s, hash, { eventName: 'Borrow', args: { asset, user: from, amount: amountArg } });
      return { state: s };
    }
    case 'repay': {
      if (p.borrowed === 0n) throw new MiniContractError('NoDebt');
      const amount = minBig(amountArg, p.borrowed); // never takes more than is owed
      pull(s, asset, from, amount);
      setPos(s, from, asset, { ...p, borrowed: p.borrowed - amount });
      s.reserves[key(asset)] = { ...r, totalBorrowed: r.totalBorrowed - amount };
      emit(s, hash, { eventName: 'Repay', args: { asset, user: from, amount } });
      return { state: s, result: amount };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Starting states
// ---------------------------------------------------------------------------------------------

const usdc = (n: number) => BigInt(n) * 10n ** 6n;
const weth = (n: number) => BigInt(Math.round(n * 1e6)) * 10n ** 12n;

/** Fresh deploy (§3 step 4): prices set, the owner supplies 100,000 USDC and 10 WETH as starting money. */
export function deployState(): MiniState {
  const owner = accountByRole('Owner');
  let s: MiniState = {
    owner,
    prices: { [key(ADDR.usdc)]: 100_000_000n, [key(ADDR.weth)]: 200_000_000_000n },
    reserves: {},
    positions: {},
    balances: { [key(ADDR.usdc)]: { [key(owner)]: usdc(100_000) }, [key(ADDR.weth)]: { [key(owner)]: weth(10) } },
    allowances: {},
    events: [],
    blockNumber: 1n,
    time: Date.UTC(2026, 9, 14, 9, 0, 0),
  };
  const run = (from: Address, call: WriteCall) => (s = applyWrite(s, from, call).state);
  run(owner, { contract: 'token', address: ADDR.usdc, functionName: 'approve', args: [ADDR.pool, usdc(100_000)] });
  run(owner, { contract: 'pool', functionName: 'supply', args: [ADDR.usdc, usdc(100_000)] });
  run(owner, { contract: 'token', address: ADDR.weth, functionName: 'approve', args: [ADDR.pool, weth(10)] });
  run(owner, { contract: 'pool', functionName: 'supply', args: [ADDR.weth, weth(10)] });
  return s;
}

/**
 * The guide's §12 mock data as a live state: USDC 100,000 supplied / 50,000 borrowed, WETH 10
 * supplied, and the Borrower with 1 WETH supplied and 1,500 USDC borrowed (HF 1.13). To make the
 * pool totals add up, the Owner's starting money is 100,000 USDC + 9 WETH and the Owner borrows the
 * other 48,500 USDC (HF 2.07).
 */
export function demoState(): MiniState {
  const owner = accountByRole('Owner');
  const borrower = accountByRole('Borrower');
  let s: MiniState = {
    owner,
    prices: { [key(ADDR.usdc)]: 100_000_000n, [key(ADDR.weth)]: 200_000_000_000n },
    reserves: {},
    positions: {},
    balances: { [key(ADDR.usdc)]: { [key(owner)]: usdc(100_000) }, [key(ADDR.weth)]: { [key(owner)]: weth(9) } },
    allowances: {},
    events: [],
    blockNumber: 1n,
    time: Date.UTC(2026, 9, 14, 9, 0, 0),
  };
  const run = (from: Address, call: WriteCall) => (s = applyWrite(s, from, call).state);
  run(owner, { contract: 'token', address: ADDR.usdc, functionName: 'approve', args: [ADDR.pool, usdc(100_000)] });
  run(owner, { contract: 'pool', functionName: 'supply', args: [ADDR.usdc, usdc(100_000)] });
  run(owner, { contract: 'token', address: ADDR.weth, functionName: 'approve', args: [ADDR.pool, weth(9)] });
  run(owner, { contract: 'pool', functionName: 'supply', args: [ADDR.weth, weth(9)] });
  run(borrower, { contract: 'token', address: ADDR.weth, functionName: 'faucet', args: [] });
  run(borrower, { contract: 'token', address: ADDR.weth, functionName: 'approve', args: [ADDR.pool, weth(1)] });
  run(borrower, { contract: 'pool', functionName: 'supply', args: [ADDR.weth, weth(1)] });
  run(borrower, { contract: 'pool', functionName: 'borrow', args: [ADDR.usdc, usdc(1_500)] });
  run(owner, { contract: 'pool', functionName: 'borrow', args: [ADDR.usdc, usdc(48_500)] });
  return s;
}

/** Unique borrowers from the Borrow events (§11 "Liquidations page" step 1). */
export const borrowersFromEvents = (s: MiniState): Address[] => borrowersFromEventsList(s.events);
