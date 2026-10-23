/**
 * Contract config keyed by chain id (guide §2), the chains and their RPCs, the deploy block for
 * event queries (§10), the demo test accounts (§3, addresses only, never keys) and the demo reserve
 * settings (§6).
 *
 * To go to Base Sepolia: fill CONTRACTS[84532] (from aave/deployments/84532.json) and
 * DEPLOY_BLOCK[84532], then set NEXT_PUBLIC_MINI_CHAIN_ID=84532. Nothing else changes.
 */
import { anvil, baseSepolia, sepolia } from 'viem/chains';
import type { Address, ReserveConfig, TokenInfo } from './types';

export const LOCAL_CHAIN_ID = 31337;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
/** Ethereum Sepolia: only for "Fund your wallet" (the bridge to Base Sepolia and its balance). No pool here. */
export const ETH_SEPOLIA_CHAIN_ID = 11155111;

export interface ContractSet {
  pool: Address;
  oracle: Address;
  usdc: Address;
  weth: Address;
}

export const CONTRACTS: Record<number, Partial<ContractSet>> = {
  31337: {
    pool: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    oracle: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // 6 decimals
    weth: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // 18 decimals
  },
  84532: {
    // Base Sepolia: live, source verified on Basescan (aave/deployments/84532.json, 2026-10-14).
    // Owner (oracle + pool): the senior developer's deployer 0x99788e1d8b0fb55693587804049DE698839d98B0.
    pool: '0xB9b209a874cf566076dA34c5930AC4A348e7a107',
    oracle: '0x73BD29D3041206b21426f5C7126e5065195BC099',
    usdc: '0xcbd96F714186C1Ba1a84883b7170FA104716A2a3', // 6 decimals
    weth: '0x18Ce51aC4482E23103992e878804a06bEC8F6B20', // 18 decimals
  },
};

/** The full address set for a chain, or null when the chain is unknown or not filled in yet. */
export function contractsFor(chainId: number | undefined | null): ContractSet | null {
  const c = chainId == null ? undefined : CONTRACTS[chainId];
  return c?.pool && c.oracle && c.usdc && c.weth ? (c as ContractSet) : null;
}

/** "Supported" = we have the contract addresses for it. Anything else gets "Switch network". */
export const isSupportedChain = (chainId: number | undefined | null) => contractsFor(chainId) !== null;

/** The local chain's addresses (the mock engine uses these). */
export const ADDR = contractsFor(LOCAL_CHAIN_ID)!;

/**
 * RPC per chain (§2). The local URL can be overridden for the "anvil on another machine" case
 * (see docs/MINI_INTEGRATION.md, Known limitations). NEXT_PUBLIC_* values are inlined at build time,
 * so each one is spelled out in full here.
 */
export const RPC_URL: Record<number, string> = {
  [LOCAL_CHAIN_ID]: process.env.NEXT_PUBLIC_MINI_RPC_31337 || 'http://127.0.0.1:8545',
  [BASE_SEPOLIA_CHAIN_ID]: process.env.NEXT_PUBLIC_MINI_RPC_84532 || 'https://sepolia.base.org',
  [ETH_SEPOLIA_CHAIN_ID]: process.env.NEXT_PUBLIC_MINI_RPC_11155111 || 'https://ethereum-sepolia-rpc.publicnode.com',
};

/** viem chain objects (from viem/chains), with the RPC above so MetaMask's "add network" matches. */
export const anvilChain = { ...anvil, rpcUrls: { default: { http: [RPC_URL[LOCAL_CHAIN_ID]] } } } as const;
export const baseSepoliaChain = { ...baseSepolia, rpcUrls: { default: { http: [RPC_URL[BASE_SEPOLIA_CHAIN_ID]] } } } as const;
export const ethSepoliaChain = { ...sepolia, rpcUrls: { default: { http: [RPC_URL[ETH_SEPOLIA_CHAIN_ID]] } } } as const;

/** `short` fits the wordmark chip in the sidebar (about 80px). */
export const CHAIN_INFO: Record<number, { name: string; short: string; explorer: string | null }> = {
  [LOCAL_CHAIN_ID]: { name: 'Anvil (local)', short: 'Anvil', explorer: null },
  [BASE_SEPOLIA_CHAIN_ID]: { name: 'Base Sepolia', short: 'Base Sepolia', explorer: 'https://sepolia.basescan.org' },
  [ETH_SEPOLIA_CHAIN_ID]: { name: 'Ethereum Sepolia', short: 'Sepolia', explorer: 'https://sepolia.etherscan.io' },
};

export const chainName = (chainId: number | undefined | null) => (chainId != null && CHAIN_INFO[chainId]?.name) || (chainId != null ? `Chain ${chainId}` : 'No network');
export const chainShortName = (chainId: number | undefined | null) => (chainId != null && CHAIN_INFO[chainId]?.short) || chainName(chainId);

/** §8: "Show the transaction hash with an explorer link" (Base Sepolia only; local has none). */
export function explorerTxUrl(chainId: number, hash: `0x${string}`): string | null {
  const base = CHAIN_INFO[chainId]?.explorer;
  return base ? `${base}/tx/${hash}` : null;
}

/**
 * First block to read events from (§10: "local: 0n; Base Sepolia: the deployment block"). Fill
 * 84532 after the deploy (the block of the pool's deploy tx on Basescan), or set the env value.
 */
export const DEPLOY_BLOCK: Record<number, bigint | undefined> = {
  [LOCAL_CHAIN_ID]: 0n,
  // Deployment txs are in blocks 48102059–48102060 (backend team, 2026-10-14).
  [BASE_SEPOLIA_CHAIN_ID]: process.env.NEXT_PUBLIC_MINI_DEPLOY_BLOCK_84532 ? BigInt(process.env.NEXT_PUBLIC_MINI_DEPLOY_BLOCK_84532) : 48102059n,
};

/** Largest block span per log query (public RPCs cap it); halved automatically on a range error. */
export const LOG_CHUNK_BLOCKS: Record<number, bigint> = {
  [LOCAL_CHAIN_ID]: 50_000n,
  // public sepolia.base.org: "eth_getLogs is limited to a 200 range" (measured 2026-10-19)
  [BASE_SEPOLIA_CHAIN_ID]: 200n,
};

/**
 * How fast to scan: windows per wave (sent together as one JSON-RPC batch) and the minimum time per
 * wave. Public sepolia.base.org allows 25 requests / second (measured 2026-10-19): 20 per 1.1 s.
 * With a private RPC (NEXT_PUBLIC_MINI_RPC_84532) these can go up.
 */
export const LOG_SCAN: Record<number, { perWave: number; waveMs: number }> = {
  [LOCAL_CHAIN_ID]: { perWave: 4, waveMs: 0 },
  [BASE_SEPOLIA_CHAIN_ID]: { perWave: 20, waveMs: 1_100 },
};

/** The chain chain-mode reads from before a wallet is connected, and offers in "Switch network". */
export const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_MINI_CHAIN_ID || LOCAL_CHAIN_ID);

/**
 * Chain-mode reads go to the wallet's chain when we have contracts there, else to the network the
 * user picked in the wallet menu (if supported), else to the target.
 */
export const pickReadChain = (walletChainId: number | undefined | null, preferred: number | null = null) =>
  walletChainId != null && isSupportedChain(walletChainId) ? walletChainId : preferred != null && isSupportedChain(preferred) ? preferred : TARGET_CHAIN_ID;

/** Chains with a full address set (what the network picker offers). */
export const SUPPORTED_CHAINS = Object.keys(CONTRACTS).map(Number).filter(isSupportedChain);

/**
 * Display metadata per token address, for every configured chain (USDC 6 / WETH 18 per §2). Markets
 * and the Dashboard read decimals from the chain (ReserveView.decimals / token.decimals()); this
 * table is the label fallback for History, Liquidations and the modals.
 */
export const TOKENS: Record<Address, TokenInfo> = {};
for (const chainId of Object.keys(CONTRACTS)) {
  const c = contractsFor(Number(chainId));
  if (!c) continue;
  TOKENS[c.usdc] = { address: c.usdc, symbol: 'USDC', name: 'USD Coin', decimals: 6 };
  TOKENS[c.weth] = { address: c.weth, symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 };
}

/** anvil's public test accounts (§3). Private keys are deliberately NOT in the app. */
export const ACCOUNTS = [
  { role: 'Owner', address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address, note: 'Deployed everything; can set prices' },
  { role: 'Borrower', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address, note: 'Has 1 WETH supplied and 1,500 USDC borrowed' },
  { role: 'Liquidator', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address, note: 'Liquidates unsafe loans' },
] as const;
export type AccountRole = (typeof ACCOUNTS)[number]['role'];
export const accountByRole = (role: AccountRole) => ACCOUNTS.find((a) => a.role === role)!.address;
export const roleOf = (addr: Address | null | undefined) => ACCOUNTS.find((a) => a.address.toLowerCase() === addr?.toLowerCase())?.role;

const WAD = 10n ** 18n;
const pct = (n: number) => (BigInt(Math.round(n * 100)) * WAD) / 10000n;

/** Demo reserve settings (§6 ReserveConfig table). */
export const RESERVE_CONFIG: Record<Address, ReserveConfig> = {
  [ADDR.usdc]: { ltv: 8000, liquidationThreshold: 8500, liquidationBonus: 500, reserveFactor: 1000, baseRate: 0n, slope1: pct(4), slope2: pct(60), optimalUtilization: pct(90) },
  [ADDR.weth]: { ltv: 8000, liquidationThreshold: 8500, liquidationBonus: 500, reserveFactor: 1000, baseRate: 0n, slope1: pct(3), slope2: pct(80), optimalUtilization: pct(80) },
};

/** Faucet amounts per call (§5): 10,000 USDC or 5 WETH. Keyed by symbol so it works on any chain. */
export const FAUCET_BY_SYMBOL: Record<string, bigint> = { USDC: 10_000n * 10n ** 6n, WETH: 5n * 10n ** 18n };
export const FAUCET_AMOUNT: Record<Address, bigint> = {
  [ADDR.usdc]: FAUCET_BY_SYMBOL.USDC,
  [ADDR.weth]: FAUCET_BY_SYMBOL.WETH,
};

/** At most 50% of a borrower's debt in one liquidation call (§5). */
export const CLOSE_FACTOR_BPS = 5000n;
