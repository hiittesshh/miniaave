'use client';

/**
 * ONE wallet hook for every screen, whatever the data source:
 *  - mock mode: the mock wallet (data/wallet.ts): pick a §3 test account, fake "wrong network".
 *  - chain mode: wagmi + MetaMask (useConnection / useConnect / useDisconnect / useSwitchChain).
 *    "Wrong network" = the wallet's chain has no contracts in CONTRACTS (§8 "Switch network").
 * The wallet never gives the app a private key; MetaMask signs.
 */
import * as React from 'react';
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from 'wagmi';
import { LOCAL_CHAIN_ID, isSupportedChain, pickReadChain } from './config';
import { usePreferredChain, useSourceMode, type SourceMode } from './settings';
import type { Address } from './types';
import { useMiniWallet } from './wallet';
import type { MiniChainId } from './wagmi';

export interface MiniWallet {
  mode: SourceMode;
  account: Address | null;
  /** The chain the wallet is on (mock: the mock wallet's chain). */
  chainId: number | undefined;
  wrongChain: boolean;
  connecting: boolean;
  /** A short, user-facing reason the last connect / switch failed. */
  error: string | null;
  /** Is there an injected browser wallet (window.ethereum)? Always true in mock mode. */
  hasBrowserWallet: boolean;
  /** Mock mode: connect as one of the test accounts. */
  connectMock: (account: Address) => void;
  /** Chain mode: ask MetaMask to connect. */
  connectBrowser: () => void;
  disconnect: () => void;
  switchNetwork: () => void;
  /** Chain mode: ask the wallet to switch to this chain. */
  switchTo: (chainId: number) => void;
  switching: boolean;
}

/** The chain the screens read from: mock → the local chain; chain → wallet / picked / target. */
export function useReadChainId(): number {
  const mode = useSourceMode();
  const { chainId } = useConnection();
  const preferred = usePreferredChain();
  return mode === 'mock' ? LOCAL_CHAIN_ID : pickReadChain(chainId, preferred);
}

const subscribeNothing = () => () => {};
/** Hydration-safe: false on the server and during hydration, then the real value. */
function useHasInjected() {
  return React.useSyncExternalStore(subscribeNothing, () => typeof window !== 'undefined' && Boolean((window as { ethereum?: unknown }).ethereum), () => false);
}

/** Wallet errors → one plain sentence (never the raw RPC text). */
export function walletErrorMessage(err: unknown): string | null {
  if (!err) return null;
  const chain: { name?: string; code?: number; cause?: unknown }[] = [];
  let cur: unknown = err;
  for (let i = 0; cur && typeof cur === 'object' && i < 6; i++) {
    chain.push(cur as { name?: string; code?: number });
    cur = (cur as { cause?: unknown }).cause;
  }
  if (chain.some((e) => e.name === 'ProviderNotFoundError')) return 'No browser wallet found. Install MetaMask, then reload this page.';
  if (chain.some((e) => e.code === 4001 || e.name === 'UserRejectedRequestError')) return 'Request cancelled in the wallet.';
  if (chain.some((e) => e.code === -32002)) return 'MetaMask is already asking you something. Open it to continue.';
  if (chain.some((e) => e.name === 'SwitchChainNotSupportedError')) return "This wallet can't switch networks from here. Switch in MetaMask.";
  return "Couldn't reach the wallet. Please try again.";
}

export function useWallet(): MiniWallet {
  const mode = useSourceMode();
  const mock = useMiniWallet();
  const conn = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const hasInjected = useHasInjected();
  const preferred = usePreferredChain();

  if (mode === 'mock') {
    return {
      mode,
      account: mock.account,
      chainId: mock.chainId,
      wrongChain: mock.chainId !== LOCAL_CHAIN_ID,
      connecting: false,
      error: null,
      hasBrowserWallet: true,
      connectMock: mock.connect,
      connectBrowser: () => {},
      disconnect: mock.disconnect,
      switchNetwork: () => mock.setChain(LOCAL_CHAIN_ID),
      switchTo: () => mock.setChain(LOCAL_CHAIN_ID),
      switching: false,
    };
  }

  const account = conn.status === 'connected' ? (conn.address ?? null) : null;
  return {
    mode,
    account,
    chainId: conn.chainId,
    wrongChain: Boolean(account) && !isSupportedChain(conn.chainId),
    connecting: connect.isPending || conn.status === 'connecting' || conn.status === 'reconnecting',
    error: walletErrorMessage(connect.error ?? switchChain.error),
    hasBrowserWallet: hasInjected,
    connectMock: () => {},
    connectBrowser: () => {
      const injected = connectors[0];
      if (injected) connect.mutate({ connector: injected });
    },
    disconnect: () => disconnect.mutate({}),
    switchNetwork: () => switchChain.mutate({ chainId: pickReadChain(null, preferred) as MiniChainId }),
    switchTo: (chainId: number) => switchChain.mutate({ chainId: chainId as MiniChainId }),
    switching: switchChain.isPending,
  };
}
