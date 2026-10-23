'use client';

/**
 * Data for "Fund your wallet" (Base Sepolia, test funds only; everything happens in the user's
 * wallet: no server, no keys).
 *
 * chain mode  native ETH on Base Sepolia and Ethereum Sepolia via wagmi getBalance; USDC / WETH via
 *             the pool's tokens. The bridge: switch the wallet to Ethereum Sepolia → depositETH on the
 *             official L1StandardBridge → wait for the receipt; then the Base Sepolia balance is
 *             polled until it goes up.
 * mock mode   the same screens over SIMULATED balances (useMockFunding), labelled as simulated,
 *             so the flow can be shown without a wallet. Tokens use the mock engine's real faucet.
 */
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getBalance, switchChain, waitForTransactionReceipt, writeContract } from 'wagmi/actions';
import { bridgeCall, bridgeErrorMessage, FUNDING_POLL_MS, type FundingBalances } from '../lib/funding';
import { parseUnits } from '../lib/units';
import { BASE_SEPOLIA_CHAIN_ID, ETH_SEPOLIA_CHAIN_ID } from './config';
import { useMarkets, useSourceKey } from './hooks';
import { useSourceMode } from './settings';
import { miniSource } from './source';
import type { Address } from './types';
import { useReadChainId } from './useWallet';
import { wagmiConfig } from './wagmi';

// ---------------------------------------------------------------------------------------------
// The modal and the bridge's progress (kept while the modal is closed)
// ---------------------------------------------------------------------------------------------

export type BridgeStatus = 'idle' | 'switching' | 'signing' | 'confirming' | 'sent' | 'arrived' | 'error';

interface FundModalState {
  open: boolean;
  show: () => void;
  hide: () => void;
  bridge: { status: BridgeStatus; hash?: `0x${string}`; baseline?: bigint | null; amount?: bigint; message?: string };
  setBridge: (b: FundModalState['bridge']) => void;
  /** low-gas banner dismissed for this session */
  lowGasDismissed: boolean;
  dismissLowGas: () => void;
}

export const useFundModal = create<FundModalState>()((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  bridge: { status: 'idle' },
  setBridge: (bridge) => set({ bridge }),
  lowGasDismissed: false,
  dismissLowGas: () => set({ lowGasDismissed: true }),
}));

// ---------------------------------------------------------------------------------------------
// Mock mode: simulated native balances (wei as decimal strings, so they persist as JSON)
// ---------------------------------------------------------------------------------------------

interface MockFundingState {
  baseEth: string;
  sepoliaEth: string;
  add: (chain: 'base' | 'sepolia', wei: bigint) => void;
  reset: () => void;
}

export const useMockFunding = create<MockFundingState>()(
  persist(
    (set) => ({
      baseEth: '0',
      sepoliaEth: '0',
      add: (chain, wei) => set((s) => (chain === 'base' ? { baseEth: (BigInt(s.baseEth) + wei).toString() } : { sepoliaEth: (BigInt(s.sepoliaEth) + wei).toString() })),
      reset: () => set({ baseEth: '0', sepoliaEth: '0' }),
    }),
    { name: 'mini-aave-funding-mock-v1', skipHydration: true }, // hydrated by MiniProviders
  ),
);

/** Simulated faucet amounts in mock mode (what the real faucets typically give). */
export const MOCK_FAUCET = { base: parseUnits('0.1', 18), sepolia: parseUnits('0.05', 18) };

// ---------------------------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------------------------

/** The three numbers the steps need, re-read every 10 s while `polling`. */
export function useFundingBalances(account: Address | null, polling: boolean): FundingBalances & { simulated: boolean; onBaseSepolia: boolean } {
  const mode = useSourceMode();
  const key = useSourceKey();
  const readChain = useReadChainId();
  const markets = useMarkets();
  const mock = useMockFunding();
  const onBaseSepolia = mode === 'mock' || readChain === BASE_SEPOLIA_CHAIN_ID;
  const tokens = useQuery({
    queryKey: ['mini', key, 'funding-tokens', account],
    enabled: Boolean(account && markets.data && onBaseSepolia),
    refetchInterval: polling ? FUNDING_POLL_MS : false,
    queryFn: async () => Promise.all((markets.data ?? []).map(async (m) => ({ symbol: m.token.symbol, asset: m.asset, decimals: m.decimals, balance: await miniSource.balanceOf(m.asset, account!) }))),
  });
  const native = useQuery({
    queryKey: ['mini', 'funding-native', account],
    enabled: mode === 'chain' && Boolean(account),
    refetchInterval: polling ? FUNDING_POLL_MS : false,
    queryFn: async () => {
      const [base, sep] = await Promise.all([
        getBalance(wagmiConfig, { address: account!, chainId: BASE_SEPOLIA_CHAIN_ID }).then((b) => b.value).catch(() => null),
        getBalance(wagmiConfig, { address: account!, chainId: ETH_SEPOLIA_CHAIN_ID }).then((b) => b.value).catch(() => null),
      ]);
      return { base, sep };
    },
  });
  if (mode === 'mock') return { simulated: true, onBaseSepolia, baseEth: BigInt(mock.baseEth), sepoliaEth: BigInt(mock.sepoliaEth), tokens: tokens.data ?? null };
  return { simulated: false, onBaseSepolia, baseEth: native.data?.base ?? null, sepoliaEth: native.data?.sep ?? null, tokens: tokens.data ?? null };
}

/** Base Sepolia ETH of the connected wallet, for the low-gas banner (chain mode only). */
export function useBaseGas(account: Address | null) {
  const mode = useSourceMode();
  const readChain = useReadChainId();
  return useQuery({
    queryKey: ['mini', 'base-gas', account],
    enabled: mode === 'chain' && readChain === BASE_SEPOLIA_CHAIN_ID && Boolean(account),
    refetchInterval: 30_000,
    queryFn: () => getBalance(wagmiConfig, { address: account!, chainId: BASE_SEPOLIA_CHAIN_ID }).then((b) => b.value),
  });
}

// ---------------------------------------------------------------------------------------------
// The bridge
// ---------------------------------------------------------------------------------------------

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Ethereum Sepolia → Base Sepolia. Chain mode: switch the wallet, send depositETH, wait for the L1
 * receipt. Mock mode: the same states on simulated balances. The arrival on Base Sepolia is detected
 * later by polling (bridgeArrived), not here.
 */
export async function runBridge(opts: { account: Address; amount: bigint; baseline: bigint | null; simulated: boolean }) {
  const { setBridge } = useFundModal.getState();
  const { account, amount, baseline, simulated } = opts;
  try {
    if (simulated) {
      setBridge({ status: 'switching', amount, baseline });
      await wait(600);
      setBridge({ status: 'signing', amount, baseline });
      await wait(800);
      setBridge({ status: 'confirming', amount, baseline });
      await wait(900);
      const mock = useMockFunding.getState();
      mock.add('sepolia', -(amount + parseUnits('0.0004', 18)));
      setBridge({ status: 'sent', amount, baseline, hash: `0x${'5e'.repeat(32)}` });
      await wait(4000); // "2–5 minutes" on the real network
      useMockFunding.getState().add('base', amount);
      return;
    }
    setBridge({ status: 'switching', amount, baseline });
    await switchChain(wagmiConfig, { chainId: ETH_SEPOLIA_CHAIN_ID });
    setBridge({ status: 'signing', amount, baseline });
    const call = bridgeCall(amount);
    const hash = await writeContract(wagmiConfig, { address: call.address, abi: call.abi, functionName: call.functionName, args: call.args, value: call.value, account, chainId: ETH_SEPOLIA_CHAIN_ID });
    setBridge({ status: 'confirming', amount, baseline, hash });
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId: ETH_SEPOLIA_CHAIN_ID });
    if (receipt.status !== 'success') throw new Error('Bridge transaction reverted');
    setBridge({ status: 'sent', amount, baseline, hash });
  } catch (e) {
    console.error('[mini] bridge failed:', e);
    setBridge({ status: 'error', amount, baseline, message: bridgeErrorMessage(e) });
  }
}

/** Ask the wallet to go back to Base Sepolia after bridging. */
export const switchToBaseSepolia = () => switchChain(wagmiConfig, { chainId: BASE_SEPOLIA_CHAIN_ID }).catch((e) => console.error('[mini] switch back failed:', e));
