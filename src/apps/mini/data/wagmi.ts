/**
 * wagmi config for Mini-Aave chain mode: the two chains from §2 (anvil, Base Sepolia), one HTTP
 * transport each and ONE connector, the injected browser wallet (MetaMask). No RainbowKit and no
 * WalletConnect (so no project ID).
 *
 * - `batch: { multicall: true }`: reads issued in the same tick are merged into one Multicall3 call
 *   (§7 "batch them"). Base Sepolia has Multicall3; plain anvil doesn't, and viem then falls back to
 *   separate eth_calls, which the transport's `batch: true` still sends as ONE JSON-RPC request.
 * - `multiInjectedProviderDiscovery: false`: only our injected connector, no auto-added wallets.
 * - `ssr: true`: no wallet access during server rendering; the provider reconnects after mount.
 */
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors/injected';
import { BASE_SEPOLIA_CHAIN_ID, ETH_SEPOLIA_CHAIN_ID, LOCAL_CHAIN_ID, RPC_URL, anvilChain, baseSepoliaChain, ethSepoliaChain } from './config';

export const wagmiConfig = createConfig({
  // Ethereum Sepolia is only for Fund your wallet (bridge + balance); the pool is on the other two.
  chains: [anvilChain, baseSepoliaChain, ethSepoliaChain],
  connectors: [injected()],
  transports: {
    [LOCAL_CHAIN_ID]: http(RPC_URL[LOCAL_CHAIN_ID], { batch: true, retryCount: 1, timeout: 10_000 }),
    // batchSize 20: the public RPC rejects bigger bursts (25 requests / second).
    [BASE_SEPOLIA_CHAIN_ID]: http(RPC_URL[BASE_SEPOLIA_CHAIN_ID], { batch: { batchSize: 20 }, retryCount: 2, timeout: 15_000 }),
    [ETH_SEPOLIA_CHAIN_ID]: http(RPC_URL[ETH_SEPOLIA_CHAIN_ID], { retryCount: 2, timeout: 15_000 }),
  },
  batch: { multicall: true },
  multiInjectedProviderDiscovery: false,
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}

export type MiniChainId = (typeof wagmiConfig)['chains'][number]['id'];
