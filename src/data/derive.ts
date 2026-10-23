/**
 * Pure derivation: raw state (what a contract stores) → everything the UI displays.
 *
 * The mock source calls these after every read. A future chain-backed source can call the same
 * functions on data it reads from contracts, which keeps every number on screen computed one way.
 */
import {
  reserveRates,
  riskPremium,
  summarizePosition,
  type PositionLine,
  utilization as utilizationOf,
  aprToApy,
  variableBorrowRate,
  supplyRate,
  capacityFilled,
  effectiveBorrowRate,
  HF_INFINITE,
} from '@/lib/aave-math';
import type {
  ChainInfo,
  EModeCategory,
  HubAssetConfig,
  HubInfo,
  MarketInfo,
  MarketSnapshot,
  ProHubAsset,
  ProHubSummary,
  ProPosition,
  ProProtocolSnapshot,
  ProReserve,
  ProReserveConfig,
  ProReserveState,
  ProSpokeSummary,
  ProUserState,
  Reserve,
  ReserveConfig,
  ReserveState,
  SpokeInfo,
  UserMarketState,
  UserReserve,
} from './types';

export const reserveIdOf = (marketId: string, symbol: string) => `${marketId}:${symbol}`;

// ---------------------------------------------------------------------------------------------
// Standard
// ---------------------------------------------------------------------------------------------

export function deriveReserve(config: ReserveConfig, state: ReserveState): Reserve {
  const rates = reserveRates(state.totalBorrowed, state.totalSupplied, config.rateStrategy, config.reserveFactor);
  const availableLiquidity = Math.max(state.totalSupplied - state.totalBorrowed, 0);
  return {
    ...config,
    ...state,
    id: reserveIdOf(config.marketId, config.symbol),
    availableLiquidity,
    utilization: rates.utilization,
    supplyAPR: rates.supplyAPR,
    supplyAPY: rates.supplyAPY,
    variableBorrowAPR: rates.variableBorrowAPR,
    variableBorrowAPY: rates.variableBorrowAPY,
    totalSuppliedUSD: state.totalSupplied * config.priceUSD,
    totalBorrowedUSD: state.totalBorrowed * config.priceUSD,
    availableLiquidityUSD: availableLiquidity * config.priceUSD,
  };
}

export function deriveMarket(
  market: MarketInfo,
  configs: ReserveConfig[],
  states: Record<string, ReserveState>,
  eModes: EModeCategory[]
): MarketSnapshot {
  const empty = { totalSupplied: 0, totalBorrowed: 0, isolationModeTotalDebtUSD: 0 };
  const reserves = configs.map((c) => deriveReserve(c, states[reserveIdOf(c.marketId, c.symbol)] ?? empty));
  const marketSizeUSD = reserves.reduce((s, r) => s + r.totalSuppliedUSD, 0);
  const borrowsUSD = reserves.reduce((s, r) => s + r.totalBorrowedUSD, 0);
  return {
    market,
    reserves,
    eModes,
    totals: { marketSizeUSD, borrowsUSD, availableUSD: marketSizeUSD - borrowsUSD },
  };
}

export interface RawPosition {
  supplied: number;
  borrowed: number;
  collateralEnabled: boolean;
}

export interface RawUserMarket {
  eModeCategoryId: number;
  positions: Record<string, RawPosition>;
  wallet: Record<string, number>;
  allowances: Record<string, number>;
}

/** LTV / liquidation threshold for this reserve given the user's E-Mode category. */
export function effectiveParams(reserve: Reserve, eModeId: number, eModes: EModeCategory[]) {
  const cat = eModeId ? eModes.find((e) => e.id === eModeId) : undefined;
  if (cat && cat.collateralSymbols.includes(reserve.symbol)) {
    return { ltv: cat.ltv, liquidationThreshold: cat.liquidationThreshold, liquidationBonus: cat.liquidationBonus };
  }
  return { ltv: reserve.ltv, liquidationThreshold: reserve.liquidationThreshold, liquidationBonus: reserve.liquidationBonus };
}

/** Builds the position lines the maths library works with. */
export function positionLines(snapshot: MarketSnapshot, raw: RawUserMarket, eModeId = raw.eModeCategoryId): PositionLine[] {
  return snapshot.reserves.map((r) => {
    const p = raw.positions[r.symbol] ?? { supplied: 0, borrowed: 0, collateralEnabled: false };
    const eff = effectiveParams(r, eModeId, snapshot.eModes);
    return {
      suppliedUSD: p.supplied * r.priceUSD,
      borrowedUSD: p.borrowed * r.priceUSD,
      collateralEnabled: p.collateralEnabled && r.usageAsCollateralEnabled,
      ltv: eff.ltv,
      liquidationThreshold: eff.liquidationThreshold,
      supplyAPY: r.supplyAPY,
      borrowAPY: r.variableBorrowAPY,
    };
  });
}

export function deriveUserMarketState(snapshot: MarketSnapshot, account: string, raw: RawUserMarket): UserMarketState {
  const lines = positionLines(snapshot, raw);
  const reserves: UserReserve[] = snapshot.reserves.map((r, i) => {
    const p = raw.positions[r.symbol] ?? { supplied: 0, borrowed: 0, collateralEnabled: false };
    return {
      reserveId: r.id,
      symbol: r.symbol,
      supplied: p.supplied,
      borrowed: p.borrowed,
      collateralEnabled: p.collateralEnabled && r.usageAsCollateralEnabled,
      suppliedUSD: lines[i].suppliedUSD,
      borrowedUSD: lines[i].borrowedUSD,
      effectiveLTV: lines[i].ltv,
      effectiveLiquidationThreshold: lines[i].liquidationThreshold,
    };
  });
  const isolated = reserves.find((ur, i) => ur.collateralEnabled && ur.supplied > 0 && snapshot.reserves[i].isIsolated);
  return {
    account,
    marketId: snapshot.market.id,
    eModeCategoryId: raw.eModeCategoryId,
    reserves,
    wallet: { ...raw.wallet },
    allowances: { ...raw.allowances },
    summary: {
      ...summarizePosition(lines),
      isInIsolationMode: Boolean(isolated),
      isolatedSymbol: isolated?.symbol,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Pro
// ---------------------------------------------------------------------------------------------

export interface ProSeedConfig {
  chains: ChainInfo[];
  hubs: HubInfo[];
  spokes: SpokeInfo[];
  hubAssets: HubAssetConfig[];
  reserves: ProReserveConfig[];
}

const spokeLiq = (hub: number, drawCap: number | undefined, borrowed: number) => (drawCap === undefined ? hub : Math.max(0, Math.min(hub, drawCap - borrowed)));

export const hubAssetIdOf = (hubId: string, symbol: string) => `${hubId}:${symbol}`;

export function deriveProProtocol(seed: ProSeedConfig, states: Record<string, ProReserveState>): ProProtocolSnapshot {
  const hubAssets: ProHubAsset[] = seed.hubAssets.map((a) => {
    const related = seed.reserves.filter((r) => r.hubId === a.hubId && r.symbol === a.symbol);
    const totalSupplied = related.reduce((s, r) => s + (states[r.id]?.supplied ?? 0), 0);
    const totalBorrowed = related.reduce((s, r) => s + (states[r.id]?.borrowed ?? 0), 0);
    // Live utilisation = (supplied − available) / supplied, i.e. it counts held-back liquidity as used.
    const u = utilizationOf(totalBorrowed + (a.lockedLiquidity ?? 0), totalSupplied);
    const borrowApr = variableBorrowRate(u, a.rateStrategy);
    const supplyApr = supplyRate(borrowApr, u, a.liquidityFee);
    return {
      ...a,
      id: hubAssetIdOf(a.hubId, a.symbol),
      totalSupplied,
      totalBorrowed,
      availableLiquidity: Math.max(totalSupplied - totalBorrowed - (a.lockedLiquidity ?? 0), 0),
      utilization: u,
      supplyAPY: aprToApy(supplyApr),
      borrowAPY: aprToApy(borrowApr),
      totalSuppliedUSD: totalSupplied * a.priceUSD,
      totalBorrowedUSD: totalBorrowed * a.priceUSD,
    };
  });
  const assetById = new Map(hubAssets.map((a) => [a.id, a]));
  const hubById = new Map(seed.hubs.map((h) => [h.id, h]));
  const spokeById = new Map(seed.spokes.map((s) => [s.id, s]));

  const reserves: ProReserve[] = seed.reserves.map((r) => {
    const asset = assetById.get(hubAssetIdOf(r.hubId, r.symbol));
    if (!asset) throw new Error(`Missing hub asset for ${r.id}`);
    const st = states[r.id] ?? { supplied: 0, borrowed: 0 };
    const hub = hubById.get(r.hubId)!;
    const spoke = spokeById.get(r.spokeId)!;
    return {
      ...r,
      ...st,
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      category: asset.category,
      icon: asset.icon,
      chainId: hub.chainId,
      hubName: hub.name,
      spokeName: spoke.name,
      priceUSD: asset.priceUSD,
      suppliedUSD: st.supplied * asset.priceUSD,
      borrowedUSD: st.borrowed * asset.priceUSD,
      supplyAPY: asset.supplyAPY,
      borrowAPY: asset.borrowAPY,
      underlyingYieldAPY: asset.underlyingYieldAPY,
      underlyingNote: asset.underlyingNote ?? false,
      incentiveAPY: asset.incentiveAPY ?? 0,
      availableLiquidity: asset.availableLiquidity,
      availableLiquidityUSD: asset.availableLiquidity * asset.priceUSD,
      spokeLiquidity: spokeLiq(asset.availableLiquidity, r.drawCap, st.borrowed),
      spokeLiquidityUSD: spokeLiq(asset.availableLiquidity, r.drawCap, st.borrowed) * asset.priceUSD,
      capacityFilled: capacityFilled(st.supplied, r.supplyCap),
    };
  });

  const hubs: ProHubSummary[] = seed.hubs.map((h) => {
    const assets = hubAssets.filter((a) => a.hubId === h.id);
    const sup = assets.reduce((s, a) => s + a.totalSuppliedUSD, 0);
    const bor = assets.reduce((s, a) => s + a.totalBorrowedUSD, 0);
    return {
      ...h,
      totalSuppliedUSD: sup,
      totalBorrowedUSD: bor,
      availableLiquidityUSD: sup - bor,
      utilization: sup > 0 ? bor / sup : 0,
      assetCount: assets.length,
      connectedSpokes: new Set(seed.reserves.filter((r) => r.hubId === h.id).map((r) => r.spokeId)).size,
    };
  });

  const spokes: ProSpokeSummary[] = seed.spokes.map((s) => {
    const rs = reserves.filter((r) => r.spokeId === s.id);
    return {
      ...s,
      totalSuppliedUSD: rs.reduce((t, r) => t + r.suppliedUSD, 0),
      totalBorrowedUSD: rs.reduce((t, r) => t + r.borrowedUSD, 0),
      assetCount: rs.length,
      hubIds: [...new Set(rs.map((r) => r.hubId))],
    };
  });

  return {
    chains: seed.chains,
    hubs,
    spokes,
    hubAssets,
    reserves,
    totals: {
      depositsUSD: hubs.reduce((t, h) => t + h.totalSuppliedUSD, 0),
      borrowsUSD: hubs.reduce((t, h) => t + h.totalBorrowedUSD, 0),
    },
  };
}

export interface RawProUser {
  /** Positions keyed by reserve id. */
  positions: Record<string, RawPosition>;
  wallet: Record<number, Record<string, number>>;
  allowances: Record<string, number>;
}

export function deriveProPosition(snapshot: ProProtocolSnapshot, account: string, spokeId: string, raw: RawProUser): ProPosition {
  const reserves = snapshot.reserves.filter((r) => r.spokeId === spokeId);
  const base = reserves.map((r) => {
    const p = raw.positions[r.id] ?? { supplied: 0, borrowed: 0, collateralEnabled: false };
    return { r, p, collateral: p.collateralEnabled && r.collateral };
  });
  const debtUSD = base.reduce((s, b) => s + b.p.borrowed * b.r.priceUSD, 0);
  const premium = riskPremium(
    base.filter((b) => b.collateral).map((b) => ({ valueUSD: b.p.supplied * b.r.priceUSD, collateralRisk: b.r.collateralRisk })),
    debtUSD
  );
  const lines = base.map(({ r, p, collateral }) => ({
    reserveId: r.id,
    symbol: r.symbol,
    supplied: p.supplied,
    borrowed: p.borrowed,
    collateralEnabled: collateral,
    suppliedUSD: p.supplied * r.priceUSD,
    borrowedUSD: p.borrowed * r.priceUSD,
    collateralFactor: r.collateralFactor,
    supplyAPY: r.supplyAPY + r.underlyingYieldAPY,
    effectiveBorrowAPY: effectiveBorrowRate(r.borrowAPY, premium),
  }));
  const summary = summarizePosition(
    lines.map((l) => ({
      suppliedUSD: l.suppliedUSD,
      borrowedUSD: l.borrowedUSD,
      collateralEnabled: l.collateralEnabled,
      ltv: l.collateralFactor,
      liquidationThreshold: l.collateralFactor,
      supplyAPY: l.supplyAPY,
      borrowAPY: l.effectiveBorrowAPY,
    }))
  );
  return { id: proPositionId(account, spokeId), spokeId, lines, summary: { ...summary, riskPremium: premium } };
}

export const proPositionId = (account: string, spokeId: string) => `${account.toLowerCase()}~${spokeId.replace(':', '-')}`;

export function deriveProUser(snapshot: ProProtocolSnapshot, account: string, raw: RawProUser): ProUserState {
  const spokeIds = [
    ...new Set(
      Object.entries(raw.positions)
        .filter(([, p]) => p.supplied > 0 || p.borrowed > 0)
        .map(([id]) => snapshot.reserves.find((r) => r.id === id)?.spokeId)
        .filter((s): s is string => Boolean(s))
    ),
  ];
  const positions = spokeIds.map((s) => deriveProPosition(snapshot, account, s, raw));
  const depositedUSD = positions.reduce((t, p) => t + p.summary.totalSuppliedUSD, 0);
  const borrowedUSD = positions.reduce((t, p) => t + p.summary.totalBorrowedUSD, 0);
  const balanceUSD = depositedUSD - borrowedUSD;
  const earned = positions.reduce((t, p) => t + p.lines.reduce((s, l) => s + l.suppliedUSD * l.supplyAPY, 0), 0);
  const paid = positions.reduce((t, p) => t + p.lines.reduce((s, l) => s + l.borrowedUSD * l.effectiveBorrowAPY, 0), 0);
  const hfs = positions.map((p) => p.summary.healthFactor).filter((h) => Number.isFinite(h));
  const priceOf = (chainId: number, symbol: string) => {
    const r = snapshot.reserves.find((x) => x.chainId === chainId && x.symbol === symbol);
    if (r) return r.priceUSD;
    const wrapped = snapshot.reserves.find((x) => x.chainId === chainId && x.symbol === `W${symbol}`);
    return wrapped?.priceUSD ?? 0;
  };
  let walletUSD = 0;
  for (const [chainId, balances] of Object.entries(raw.wallet)) {
    for (const [sym, amt] of Object.entries(balances)) walletUSD += amt * priceOf(Number(chainId), sym);
  }
  return {
    account,
    positions,
    wallet: JSON.parse(JSON.stringify(raw.wallet)),
    allowances: { ...raw.allowances },
    summary: {
      balanceUSD,
      depositedUSD,
      borrowedUSD,
      netAPY: balanceUSD > 0 ? (earned - paid) / balanceUSD : 0,
      lowestHealthFactor: hfs.length ? Math.min(...hfs) : HF_INFINITE,
      walletUSD,
    },
  };
}
