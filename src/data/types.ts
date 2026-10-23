/**
 * Domain types shared by both clones.
 *
 * These describe what the UI needs, not how any particular backend stores it. The mock data
 * source produces them today; a future on-chain data source must produce the same shapes, so the
 * UI never changes when the source is swapped. Amounts are plain JS numbers in token units
 * (1.5 = 1.5 ETH). Rates and ratios are fractions (0.05 = 5%).
 */
import type { PositionSummary, RateStrategy } from '@/lib/aave-math';

export type AppKind = 'standard' | 'pro';

export type AssetCategory = 'stablecoin' | 'eth-correlated' | 'btc-correlated' | 'stock' | 'other';

export interface TokenMeta {
  symbol: string;
  name: string;
  decimals: number;
  category: AssetCategory;
  /** File name (without extension) in /public/token-icons, or undefined for a letter avatar. */
  icon?: string;
}

// =============================================================================================
// Standard app (Aave V3-style markets)
// =============================================================================================

export interface MarketInfo {
  id: string;
  /** Display title, e.g. "Core". */
  title: string;
  networkName: string;
  chainId: number;
  description: string;
  isTestnet: boolean;
  /** Section in the market switcher (reference groups: Ethereum, L1 Networks, L2 Networks). */
  category: 'ethereum' | 'l1' | 'l2' | 'testnet';
  nativeSymbol: string;
  wrappedNativeSymbol: string;
  /** Neutral colour for the market badge (no third-party logos are used). */
  badgeColor: string;
  /** Testnet markets mint free test tokens. */
  hasFaucet: boolean;
}

export interface EModeCategory {
  id: number;
  label: string;
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  collateralSymbols: string[];
  borrowableSymbols: string[];
}

export interface ReserveConfig extends TokenMeta {
  marketId: string;
  priceUSD: number;
  ltv: number;
  liquidationThreshold: number;
  /** Bonus paid to liquidators, e.g. 0.05 = 5%. */
  liquidationBonus: number;
  reserveFactor: number;
  /** Supply cap in tokens; 0 means no cap. */
  supplyCap: number;
  /** Borrow cap in tokens; 0 means no cap. */
  borrowCap: number;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  isFrozen: boolean;
  isPaused: boolean;
  isIsolated: boolean;
  /** Isolation-mode debt ceiling in USD (0 when not isolated). */
  debtCeilingUSD: number;
  borrowableInIsolation: boolean;
  rateStrategy: RateStrategy;
  eModeCategoryIds: number[];
  /** Test markets only: tokens minted per faucet click. */
  faucetAmount?: number;
}

/** The mutable, "on-chain" part of a reserve. */
export interface ReserveState {
  totalSupplied: number;
  totalBorrowed: number;
  /** Debt (USD) currently borrowed against this asset in isolation mode. */
  isolationModeTotalDebtUSD: number;
}

/** A reserve with every derived figure the UI shows. */
export interface Reserve extends ReserveConfig, ReserveState {
  id: string;
  availableLiquidity: number;
  utilization: number;
  supplyAPR: number;
  supplyAPY: number;
  variableBorrowAPR: number;
  variableBorrowAPY: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  availableLiquidityUSD: number;
}

export interface MarketSnapshot {
  market: MarketInfo;
  reserves: Reserve[];
  eModes: EModeCategory[];
  totals: { marketSizeUSD: number; availableUSD: number; borrowsUSD: number };
}

export interface UserReserve {
  reserveId: string;
  symbol: string;
  supplied: number;
  borrowed: number;
  collateralEnabled: boolean;
  suppliedUSD: number;
  borrowedUSD: number;
  /** LTV and liquidation threshold that apply to this user (E-Mode aware). */
  effectiveLTV: number;
  effectiveLiquidationThreshold: number;
}

export interface UserSummary extends PositionSummary {
  isInIsolationMode: boolean;
  isolatedSymbol?: string;
}

export interface UserMarketState {
  account: string;
  marketId: string;
  eModeCategoryId: number;
  /** Every reserve of the market (including zero rows), in market order. */
  reserves: UserReserve[];
  /** Wallet balances keyed by token symbol (includes the native token). */
  wallet: Record<string, number>;
  /** Token approvals given to the (simulated) pool, keyed by symbol. */
  allowances: Record<string, number>;
  summary: UserSummary;
}

// =============================================================================================
// Pro app (Aave V4-style hubs and spokes)
// =============================================================================================

export interface ChainInfo {
  id: number;
  slug: string;
  name: string;
  color: string;
}

export interface HubInfo {
  /** `${chainSlug}:${hubSlug}` */
  id: string;
  slug: string;
  name: string;
  chainId: number;
  description: string;
}

export interface SpokeInfo {
  /** `${chainSlug}:${spokeSlug}` */
  id: string;
  slug: string;
  name: string;
  chainId: number;
  description: string;
  liquidationTargetHF: number;
}

/** An asset listed on a hub. Rates are set here, from the hub-wide utilization. */
export interface HubAssetConfig extends TokenMeta {
  hubId: string;
  priceUSD: number;
  rateStrategy: RateStrategy;
  /** Hub's cut of interest paid by borrowers (V4's "liquidity fee"). */
  liquidityFee: number;
  /** Extra yield from the token itself (e.g. staking), shown as "Est. Underlying Yield". */
  underlyingYieldAPY: number;
  /** Live marks these APYs with "*" ("Includes estimated underlying yield"). */
  underlyingNote?: boolean;
  /** Illustrative rewards APY (shown as a badge next to the APY, like the live app). */
  incentiveAPY?: number;
  /** Liquidity the hub holds back from borrowers (live hubs show less than supplied − borrowed). */
  lockedLiquidity?: number;
}

export interface ProReserveConfig {
  /** `${chainSlug}:${hubSlug}:${spokeSlug}:${symbol}` */
  id: string;
  hubId: string;
  spokeId: string;
  symbol: string;
  collateralFactor: number;
  maxLiquidationBonus: number;
  liquidationFee: number;
  /** Governance-set risk of this collateral, feeding the borrower's risk premium. */
  collateralRisk: number;
  suppliable: boolean;
  borrowable: boolean;
  collateral: boolean;
  supplyCap: number;
  borrowCap: number;
  /** The spoke's draw limit on the hub for this asset (live borrow tables show what is left). */
  drawCap?: number;
  /** Live borrow tables show the rewards badge on this reserve (merit programme). */
  borrowMerit?: boolean;
  frozen: boolean;
  paused: boolean;
}

export interface ProReserveState {
  supplied: number;
  borrowed: number;
}

export interface ProHubAsset extends HubAssetConfig {
  id: string;
  totalSupplied: number;
  totalBorrowed: number;
  availableLiquidity: number;
  utilization: number;
  supplyAPY: number;
  borrowAPY: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
}

export interface ProReserve extends ProReserveConfig, ProReserveState, TokenMeta {
  chainId: number;
  hubName: string;
  spokeName: string;
  priceUSD: number;
  suppliedUSD: number;
  borrowedUSD: number;
  /** Rates come from the hub asset (shared by every spoke drawing from it). */
  supplyAPY: number;
  borrowAPY: number;
  underlyingYieldAPY: number;
  underlyingNote: boolean;
  incentiveAPY: number;
  /** Hub-level liquidity this reserve can draw from. */
  availableLiquidity: number;
  availableLiquidityUSD: number;
  /** What this spoke can still borrow: min(hub liquidity, draw cap − borrowed). Live borrow and market tables. */
  spokeLiquidity: number;
  spokeLiquidityUSD: number;
  capacityFilled: number;
}

export interface ProHubSummary extends HubInfo {
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  availableLiquidityUSD: number;
  utilization: number;
  assetCount: number;
  connectedSpokes: number;
}

export interface ProSpokeSummary extends SpokeInfo {
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  assetCount: number;
  hubIds: string[];
}

export interface ProProtocolSnapshot {
  chains: ChainInfo[];
  hubs: ProHubSummary[];
  spokes: ProSpokeSummary[];
  hubAssets: ProHubAsset[];
  reserves: ProReserve[];
  totals: { depositsUSD: number; borrowsUSD: number };
}

export interface ProPositionLine {
  reserveId: string;
  symbol: string;
  supplied: number;
  borrowed: number;
  collateralEnabled: boolean;
  suppliedUSD: number;
  borrowedUSD: number;
  collateralFactor: number;
  supplyAPY: number;
  /** Borrow APY including the user's risk premium. */
  effectiveBorrowAPY: number;
}

export interface ProPosition {
  /** `${account}:${spokeId}` (URL-safe form used in /pro/position/[id]). */
  id: string;
  spokeId: string;
  lines: ProPositionLine[];
  summary: PositionSummary & { riskPremium: number };
}

export interface ProUserState {
  account: string;
  positions: ProPosition[];
  /** Wallet balances by chain id, then symbol. */
  wallet: Record<number, Record<string, number>>;
  allowances: Record<string, number>;
  summary: {
    balanceUSD: number;
    depositedUSD: number;
    borrowedUSD: number;
    netAPY: number;
    lowestHealthFactor: number;
    walletUSD: number;
  };
}

export interface ProtocolTotals {
  depositsUSD: number;
  loansUSD: number;
  byVersion: { label: string; depositsUSD: number; loansUSD: number }[];
}

// =============================================================================================
// Transactions (simulated)
// =============================================================================================

export type StandardAction =
  | { app: 'standard'; kind: 'approve'; marketId: string; account: string; symbol: string; amount: number }
  | { app: 'standard'; kind: 'supply'; marketId: string; account: string; symbol: string; amount: number; native?: boolean }
  | { app: 'standard'; kind: 'withdraw'; marketId: string; account: string; symbol: string; amount: number; unwrap?: boolean }
  | { app: 'standard'; kind: 'borrow'; marketId: string; account: string; symbol: string; amount: number; unwrap?: boolean }
  | {
      app: 'standard';
      kind: 'repay';
      marketId: string;
      account: string;
      symbol: string;
      amount: number;
      source: 'wallet' | 'native' | 'aToken';
    }
  | { app: 'standard'; kind: 'collateral'; marketId: string; account: string; symbol: string; enabled: boolean }
  | { app: 'standard'; kind: 'emode'; marketId: string; account: string; categoryId: number }
  | { app: 'standard'; kind: 'faucet'; marketId: string; account: string; symbol: string };

export type ProAction =
  | { app: 'pro'; kind: 'approve'; account: string; reserveId: string; amount: number }
  | { app: 'pro'; kind: 'deposit' | 'withdraw' | 'borrow' | 'repay'; account: string; reserveId: string; amount: number }
  | { app: 'pro'; kind: 'collateral'; account: string; reserveId: string; enabled: boolean };

export type LendingAction = StandardAction | ProAction;

/** Lifecycle of a simulated transaction as the UI sees it. */
export type TxPhase = 'awaiting-signature' | 'pending';

export interface TxReceipt {
  /** Fake, clearly-labelled hash ("0xdemo…"). Never links to an explorer. */
  hash: string;
  record: TxRecord;
}

export type TxRecordKind =
  | 'approve'
  | 'supply'
  | 'withdraw'
  | 'borrow'
  | 'repay'
  | 'collateral'
  | 'emode'
  | 'faucet'
  | 'deposit';

export interface TxRecord {
  id: string;
  hash: string;
  app: AppKind;
  account: string;
  timestamp: number;
  kind: TxRecordKind;
  status: 'confirmed' | 'failed';
  marketId?: string;
  reserveId?: string;
  spokeId?: string;
  chainId?: number;
  symbol?: string;
  amount?: number;
  amountUSD?: number;
  collateralEnabled?: boolean;
  eModeFrom?: string;
  eModeTo?: string;
  repaySource?: 'wallet' | 'native' | 'aToken';
}

export class SimulatedTxError extends Error {
  constructor(
    message: string,
    public readonly code: 'validation' | 'simulated-failure' | 'user-rejected'
  ) {
    super(message);
    this.name = 'SimulatedTxError';
  }
}
