/**
 * ILLUSTRATIVE seed data for the Standard (V3-style) clone. Prices, sizes and parameters are
 * plausible round numbers chosen for a demo; they are not live market data.
 */
import type { RateStrategy } from '@/lib/aave-math';
import type { EModeCategory, MarketInfo, ReserveConfig, ReserveState } from '../../types';
import type { RawUserMarket } from '../../derive';

/** Obviously fake, demo-only addresses. They are never sent anywhere. */
export const DEMO_ACCOUNT = '0xde00000000000000000000000000000000000001';
export const FRESH_ACCOUNT = '0xde00000000000000000000000000000000000002';

/**
 * Market list. Mirrors the reference's structure (verified in aave/interface marketsConfig.tsx
 * by Agent 1): "Core" is the default Ethereum market, "Prime" the second Ethereum instance, then
 * L2 networks. The only V3 testnet market with a faucet in the live app is "Base Sepolia"; there
 * is no Ethereum Sepolia market.
 */
export const MARKETS: MarketInfo[] = [
  {
    id: 'core',
    title: 'Core',
    networkName: 'Ethereum',
    chainId: 1,
    description: 'Supply and borrow the widest range of assets in the deepest demo market.',
    isTestnet: false,
    category: 'ethereum',
    nativeSymbol: 'ETH',
    wrappedNativeSymbol: 'WETH',
    badgeColor: '#25292e',
    hasFaucet: false,
  },
  {
    id: 'prime',
    title: 'Prime',
    networkName: 'Ethereum',
    chainId: 1,
    description: 'Supply and borrow ETH-correlated and blue-chip assets.',
    isTestnet: false,
    category: 'ethereum',
    nativeSymbol: 'ETH',
    wrappedNativeSymbol: 'WETH',
    badgeColor: '#5b5f97',
    hasFaucet: false,
  },
  {
    id: 'base',
    title: 'Base',
    networkName: 'Base',
    chainId: 8453,
    description: 'Supply and borrow core assets on Base.',
    isTestnet: false,
    category: 'l2',
    nativeSymbol: 'ETH',
    wrappedNativeSymbol: 'WETH',
    badgeColor: '#0052ff',
    hasFaucet: false,
  },
  {
    id: 'arbitrum',
    title: 'Arbitrum',
    networkName: 'Arbitrum',
    chainId: 42161,
    description: 'Supply and borrow core assets on Arbitrum.',
    isTestnet: false,
    category: 'l2',
    nativeSymbol: 'ETH',
    wrappedNativeSymbol: 'WETH',
    badgeColor: '#28a0f0',
    hasFaucet: false,
  },
  {
    id: 'base_sepolia',
    title: 'Base Sepolia',
    networkName: 'Base Sepolia',
    chainId: 84532,
    // The live app shows no description line for test markets.
    description: '',
    isTestnet: true,
    category: 'testnet',
    nativeSymbol: 'ETH',
    wrappedNativeSymbol: 'WETH',
    badgeColor: '#8594ab',
    hasFaucet: true,
  },
];

// Rate strategies (APR fractions). Shapes follow typical Aave parameters.
const ETH_RATE: RateStrategy = { baseRate: 0, slope1: 0.027, slope2: 0.8, optimalUsage: 0.9 };
const LST_RATE: RateStrategy = { baseRate: 0, slope1: 0.07, slope2: 3, optimalUsage: 0.45 };
const BTC_RATE: RateStrategy = { baseRate: 0, slope1: 0.04, slope2: 3, optimalUsage: 0.8 };
const STABLE_RATE: RateStrategy = { baseRate: 0, slope1: 0.0575, slope2: 0.4, optimalUsage: 0.92 };
const GHO_RATE: RateStrategy = { baseRate: 0.0599, slope1: 0.01, slope2: 0.5, optimalUsage: 0.92 };
const VOLATILE_RATE: RateStrategy = { baseRate: 0, slope1: 0.07, slope2: 3, optimalUsage: 0.45 };
const CRV_RATE: RateStrategy = { baseRate: 0.0, slope1: 0.14, slope2: 3, optimalUsage: 0.7 };

type Base = Omit<ReserveConfig, 'marketId'>;

const R = (o: Partial<Base> & Pick<Base, 'symbol' | 'name' | 'decimals' | 'category' | 'priceUSD' | 'rateStrategy'>): Base => ({
  icon: undefined,
  ltv: 0,
  liquidationThreshold: 0,
  liquidationBonus: 0,
  reserveFactor: 0.1,
  supplyCap: 0,
  borrowCap: 0,
  usageAsCollateralEnabled: true,
  borrowingEnabled: true,
  isFrozen: false,
  isPaused: false,
  isIsolated: false,
  debtCeilingUSD: 0,
  borrowableInIsolation: false,
  eModeCategoryIds: [],
  ...o,
});

// Prices (illustrative).
export const PRICES: Record<string, number> = {
  ETH: 3250,
  WETH: 3250,
  wstETH: 3910,
  weETH: 3470,
  WBTC: 98_500,
  cbBTC: 98_450,
  cbETH: 3_540,
  USDC: 1,
  USDT: 1,
  DAI: 1,
  GHO: 1,
  USDe: 1,
  EURC: 1.08,
  LINK: 17.8,
  AAVE: 265,
  CRV: 0.82,
  BAL: 1.9,
  ARB: 0.52,
};

const WETH = R({ symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, category: 'eth-correlated', icon: 'eth', priceUSD: PRICES.WETH, rateStrategy: ETH_RATE, ltv: 0.805, liquidationThreshold: 0.83, liquidationBonus: 0.05, reserveFactor: 0.15, supplyCap: 1_800_000, borrowCap: 1_600_000, eModeCategoryIds: [1] });
const WSTETH = R({ symbol: 'wstETH', name: 'Wrapped liquid staked Ether 2.0', decimals: 18, category: 'eth-correlated', priceUSD: PRICES.wstETH, rateStrategy: LST_RATE, ltv: 0.785, liquidationThreshold: 0.81, liquidationBonus: 0.06, reserveFactor: 0.05, supplyCap: 1_200_000, borrowCap: 12_000_000, eModeCategoryIds: [1] });
const WEETH = R({ symbol: 'weETH', name: 'Wrapped eETH', decimals: 18, category: 'eth-correlated', priceUSD: PRICES.weETH, rateStrategy: LST_RATE, ltv: 0.725, liquidationThreshold: 0.75, liquidationBonus: 0.07, reserveFactor: 0.45, supplyCap: 1_500_000, borrowCap: 25_000, eModeCategoryIds: [1] });
const WBTC = R({ symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, category: 'btc-correlated', icon: 'wbtc', priceUSD: PRICES.WBTC, rateStrategy: BTC_RATE, ltv: 0.73, liquidationThreshold: 0.78, liquidationBonus: 0.05, reserveFactor: 0.2, supplyCap: 43_000, borrowCap: 28_000 });
const CBBTC = R({ symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', decimals: 8, category: 'btc-correlated', priceUSD: PRICES.cbBTC, rateStrategy: BTC_RATE, ltv: 0.73, liquidationThreshold: 0.78, liquidationBonus: 0.075, reserveFactor: 0.2, supplyCap: 15_000, borrowCap: 1_500 });
const USDC = R({ symbol: 'USDC', name: 'USD Coin', decimals: 6, category: 'stablecoin', icon: 'usdc', priceUSD: PRICES.USDC, rateStrategy: STABLE_RATE, ltv: 0.75, liquidationThreshold: 0.78, liquidationBonus: 0.045, reserveFactor: 0.1, supplyCap: 6_000_000_000, borrowCap: 5_500_000_000, borrowableInIsolation: true, eModeCategoryIds: [2] });
const USDT = R({ symbol: 'USDT', name: 'Tether USD', decimals: 6, category: 'stablecoin', icon: 'usdt', priceUSD: PRICES.USDT, rateStrategy: STABLE_RATE, ltv: 0.75, liquidationThreshold: 0.78, liquidationBonus: 0.045, reserveFactor: 0.1, supplyCap: 7_000_000_000, borrowCap: 6_500_000_000, borrowableInIsolation: true, eModeCategoryIds: [2] });
const DAI = R({ symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, category: 'stablecoin', icon: 'dai', priceUSD: PRICES.DAI, rateStrategy: STABLE_RATE, ltv: 0.63, liquidationThreshold: 0.77, liquidationBonus: 0.05, reserveFactor: 0.25, supplyCap: 338_000_000, borrowCap: 271_000_000, borrowableInIsolation: true, eModeCategoryIds: [2] });
const GHO = R({ symbol: 'GHO', name: 'Gho Token', decimals: 18, category: 'stablecoin', priceUSD: PRICES.GHO, rateStrategy: GHO_RATE, ltv: 0, liquidationThreshold: 0, usageAsCollateralEnabled: false, reserveFactor: 0.1, supplyCap: 400_000_000, borrowCap: 350_000_000, borrowableInIsolation: true, eModeCategoryIds: [2] });
const USDE = R({ symbol: 'USDe', name: 'USDe', decimals: 18, category: 'stablecoin', priceUSD: PRICES.USDe, rateStrategy: { ...STABLE_RATE, slope1: 0.09 }, ltv: 0.72, liquidationThreshold: 0.75, liquidationBonus: 0.085, reserveFactor: 0.1, supplyCap: 2_000_000_000, borrowCap: 1_200_000_000, eModeCategoryIds: [2] });
const LINK = R({ symbol: 'LINK', name: 'ChainLink Token', decimals: 18, category: 'other', icon: 'link', priceUSD: PRICES.LINK, rateStrategy: VOLATILE_RATE, ltv: 0.66, liquidationThreshold: 0.71, liquidationBonus: 0.07, reserveFactor: 0.2, supplyCap: 15_000_000, borrowCap: 13_000_000 });
const AAVE_TOKEN = R({ symbol: 'AAVE', name: 'Aave Token', decimals: 18, category: 'other', priceUSD: PRICES.AAVE, rateStrategy: VOLATILE_RATE, ltv: 0.66, liquidationThreshold: 0.73, liquidationBonus: 0.075, reserveFactor: 0, borrowingEnabled: false, supplyCap: 2_000_000 });
const CRV = R({ symbol: 'CRV', name: 'Curve DAO Token', decimals: 18, category: 'other', icon: 'crv', priceUSD: PRICES.CRV, rateStrategy: CRV_RATE, ltv: 0.35, liquidationThreshold: 0.41, liquidationBonus: 0.083, reserveFactor: 0.35, supplyCap: 80_000_000, borrowCap: 7_500_000, isIsolated: true, debtCeilingUSD: 5_000_000 });
const BAL = R({ symbol: 'BAL', name: 'Balancer', decimals: 18, category: 'other', icon: 'bal', priceUSD: PRICES.BAL, rateStrategy: VOLATILE_RATE, ltv: 0.57, liquidationThreshold: 0.59, liquidationBonus: 0.083, reserveFactor: 0.2, supplyCap: 2_000_000, borrowCap: 400_000, isFrozen: true });
const EURC = R({ symbol: 'EURC', name: 'Euro Coin', decimals: 6, category: 'stablecoin', priceUSD: PRICES.EURC, rateStrategy: STABLE_RATE, ltv: 0.75, liquidationThreshold: 0.78, liquidationBonus: 0.05, reserveFactor: 0.1, supplyCap: 50_000_000, borrowCap: 45_000_000 });

const ARB = R({ symbol: 'ARB', name: 'Arbitrum', decimals: 18, category: 'other', priceUSD: PRICES.ARB, rateStrategy: VOLATILE_RATE, ltv: 0.58, liquidationThreshold: 0.63, liquidationBonus: 0.1, reserveFactor: 0.2, supplyCap: 50_000_000, borrowCap: 26_000_000 });

const CBETH = R({ symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', decimals: 18, category: 'eth-correlated', priceUSD: PRICES.cbETH, rateStrategy: LST_RATE, ltv: 0.75, liquidationThreshold: 0.79, liquidationBonus: 0.075, reserveFactor: 0.15 });
/** Testnet stablecoin curve, tuned so USDC shows ~1.1% borrow APY at ~21% utilization (live screenshot). */
const TESTNET_STABLE: RateStrategy = { baseRate: 0, slope1: 0.048, slope2: 0.6, optimalUsage: 0.9 };

const inMarket = (marketId: string, list: Base[]): ReserveConfig[] => list.map((r) => ({ ...r, marketId }));
const FAUCET_MINT: Record<string, number> = { WETH: 10, WBTC: 1, cbETH: 10, LINK: 1_000 };
const testnet = (r: Base): Base => ({ ...r, supplyCap: 0, borrowCap: 0, eModeCategoryIds: [], faucetAmount: FAUCET_MINT[r.symbol] ?? 10_000 });

export const RESERVES: ReserveConfig[] = [
  ...inMarket('core', [WETH, WSTETH, WEETH, WBTC, CBBTC, USDC, USDT, DAI, GHO, USDE, LINK, AAVE_TOKEN, CRV, BAL]),
  ...inMarket('prime', [
    { ...WETH, supplyCap: 500_000, borrowCap: 450_000 },
    { ...WSTETH, ltv: 0.81, liquidationThreshold: 0.83, supplyCap: 900_000 },
    { ...WEETH, supplyCap: 400_000 },
    { ...USDC, supplyCap: 350_000_000, borrowCap: 320_000_000 },
    { ...GHO, supplyCap: 60_000_000, borrowCap: 55_000_000 },
  ]),
  ...inMarket('base', [
    WETH,
    { ...WSTETH, supplyCap: 46_000 },
    { ...WEETH, supplyCap: 32_000 },
    { ...CBBTC, supplyCap: 9_000 },
    { ...USDC, supplyCap: 900_000_000, borrowCap: 820_000_000 },
    { ...GHO, supplyCap: 25_000_000, borrowCap: 22_000_000 },
    EURC,
  ]),
  ...inMarket('arbitrum', [
    { ...WETH, supplyCap: 160_000, borrowCap: 140_000 },
    { ...WBTC, supplyCap: 4_000, borrowCap: 1_200 },
    { ...USDC, supplyCap: 900_000_000, borrowCap: 800_000_000 },
    { ...USDT, supplyCap: 300_000_000, borrowCap: 270_000_000 },
    { ...LINK, supplyCap: 2_500_000, borrowCap: 1_000_000 },
    ARB,
  ]),
  // Live Base Sepolia lists USDC, USDT, WBTC (not borrowable), cbETH, ETH and LINK.
  ...inMarket('base_sepolia', [
    { ...USDC, rateStrategy: TESTNET_STABLE },
    { ...USDT, rateStrategy: TESTNET_STABLE },
    { ...WBTC, borrowingEnabled: false },
    CBETH,
    WETH,
    LINK,
  ]
    .map(testnet)
    // Live screenshot: WBTC shows a supply-cap warning on Base Sepolia.
    .map((r) => (r.symbol === 'WBTC' ? { ...r, supplyCap: 175 } : r))),
];

export const EMODES: Record<string, EModeCategory[]> = {
  core: [
    { id: 1, label: 'ETH correlated', ltv: 0.93, liquidationThreshold: 0.95, liquidationBonus: 0.01, collateralSymbols: ['WETH', 'wstETH', 'weETH'], borrowableSymbols: ['WETH', 'wstETH', 'weETH'] },
    { id: 2, label: 'Stablecoins', ltv: 0.93, liquidationThreshold: 0.95, liquidationBonus: 0.01, collateralSymbols: ['USDC', 'USDT', 'DAI', 'USDe'], borrowableSymbols: ['USDC', 'USDT', 'DAI', 'GHO', 'USDe'] },
  ],
  prime: [
    { id: 1, label: 'ETH correlated', ltv: 0.935, liquidationThreshold: 0.955, liquidationBonus: 0.01, collateralSymbols: ['WETH', 'wstETH', 'weETH'], borrowableSymbols: ['WETH', 'wstETH'] },
  ],
  base: [
    { id: 1, label: 'ETH correlated', ltv: 0.9, liquidationThreshold: 0.93, liquidationBonus: 0.01, collateralSymbols: ['WETH', 'wstETH', 'weETH'], borrowableSymbols: ['WETH', 'wstETH', 'weETH'] },
  ],
  arbitrum: [
    { id: 1, label: 'Stablecoins', ltv: 0.93, liquidationThreshold: 0.95, liquidationBonus: 0.01, collateralSymbols: ['USDC', 'USDT'], borrowableSymbols: ['USDC', 'USDT'] },
  ],
  base_sepolia: [
    { id: 1, label: 'ETH correlated', ltv: 0.9, liquidationThreshold: 0.93, liquidationBonus: 0.01, collateralSymbols: ['WETH', 'cbETH'], borrowableSymbols: ['WETH', 'cbETH'] },
  ],
};

const st = (totalSupplied: number, totalBorrowed: number, isolationModeTotalDebtUSD = 0): ReserveState => ({ totalSupplied, totalBorrowed, isolationModeTotalDebtUSD });

/** Initial totals (token units). Utilizations are chosen to give realistic-looking APYs. */
export const RESERVE_STATES: Record<string, ReserveState> = {
  'core:WETH': st(1_350_000, 1_175_000),
  'core:wstETH': st(1_020_000, 18_000),
  'core:weETH': st(1_480_000, 2_500),
  'core:WBTC': st(31_500, 1_150),
  'core:cbBTC': st(14_200, 1_900),
  'core:USDC': st(4_250_000_000, 3_610_000_000),
  'core:USDT': st(5_100_000_000, 4_420_000_000),
  'core:DAI': st(210_000_000, 150_000_000),
  'core:GHO': st(180_000_000, 140_000_000),
  'core:USDe': st(1_800_000_000, 720_000_000),
  'core:LINK': st(14_500_000, 820_000),
  'core:AAVE': st(1_250_000, 0),
  'core:CRV': st(72_000_000, 4_200_000, 1_850_000),
  'core:BAL': st(1_400_000, 120_000),

  'prime:WETH': st(410_000, 352_000),
  'prime:wstETH': st(820_000, 9_000),
  'prime:weETH': st(296_000, 600),
  'prime:USDC': st(260_000_000, 214_000_000),
  'prime:GHO': st(41_000_000, 33_000_000),

  'base:WETH': st(118_000, 96_000),
  'base:wstETH': st(41_000, 1_200),
  'base:weETH': st(30_900, 300),
  'base:cbBTC': st(7_400, 520),
  'base:USDC': st(610_000_000, 498_000_000),
  'base:GHO': st(14_000_000, 9_800_000),
  'base:EURC': st(21_000_000, 12_500_000),

  'arbitrum:WETH': st(121_000, 98_000),
  'arbitrum:WBTC': st(2_900, 310),
  'arbitrum:USDC': st(520_000_000, 431_000_000),
  'arbitrum:USDT': st(180_000_000, 151_000_000),
  'arbitrum:LINK': st(1_900_000, 120_000),
  'arbitrum:ARB': st(38_000_000, 9_500_000),

  'base_sepolia:USDC': st(30_710_000, 6_440_000),
  'base_sepolia:USDT': st(30_360_000, 4_960_000),
  'base_sepolia:WBTC': st(175, 0),
  'base_sepolia:cbETH': st(4_140, 704.43),
  'base_sepolia:WETH': st(1_580, 1_090),
  'base_sepolia:LINK': st(164_720, 18_420),
};

const emptyMarket = (wallet: Record<string, number> = {}): RawUserMarket => ({
  eModeCategoryId: 0,
  positions: {},
  wallet,
  allowances: {},
});

export function emptyUserMarkets(): Record<string, RawUserMarket> {
  return Object.fromEntries(MARKETS.map((m) => [m.id, emptyMarket()]));
}

/**
 * The demo user. On Core: ~$25.8k supplied (WETH, wstETH, USDC as collateral) and $12k borrowed
 * (USDC + GHO), which gives a health factor of about 1.88.
 */
export function demoUserMarkets(): Record<string, RawUserMarket> {
  return {
    ...emptyUserMarkets(),
    core: {
      eModeCategoryId: 0,
      positions: {
        WETH: { supplied: 4, borrowed: 0, collateralEnabled: true },
        wstETH: { supplied: 2.5, borrowed: 0, collateralEnabled: true },
        USDC: { supplied: 5_000, borrowed: 9_000, collateralEnabled: true },
        GHO: { supplied: 0, borrowed: 3_000, collateralEnabled: false },
      },
      wallet: { ETH: 1.25, WETH: 0.5, USDC: 2_500, USDT: 1_200, DAI: 800, LINK: 150, AAVE: 3.2, GHO: 450, WBTC: 0.015, CRV: 1_200 },
      allowances: { USDC: 0, GHO: 0 },
    },
    prime: emptyMarket({ ETH: 1.25, WETH: 0.5, USDC: 2_500, GHO: 450 }),
    base: emptyMarket({ ETH: 0.42, USDC: 600, EURC: 250 }),
    arbitrum: emptyMarket({ ETH: 0.3, USDC: 900, ARB: 1_500 }),
    base_sepolia: emptyMarket({ ETH: 0.5 }),
  };
}

/** A fresh account: wallet funds but no positions, for the empty states. */
export function freshUserMarkets(): Record<string, RawUserMarket> {
  return {
    ...emptyUserMarkets(),
    core: emptyMarket({ ETH: 2, USDC: 5_000, DAI: 1_000, LINK: 80 }),
    base: emptyMarket({ ETH: 0.3, USDC: 1_000 }),
    base_sepolia: emptyMarket({ ETH: 0.2 }),
  };
}
