'use client';

/** Small Mini-Aave UI parts on Pro's tokens: wordmark, health factor, token cell, notices. */
import Box from '@mui/material/Box';
import * as React from 'react';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { tv } from '@/shared/theme/tokens';
import { ProButton } from '@/apps/pro/ui';
import { fmtHealth, healthBand } from '../lib/format';
import { MAX_UINT256 } from '../lib/units';
import { TOKENS, chainName, explorerTxUrl } from '../data/config';
import { useSourceStatus } from '../data/hooks';
import { useScanProgress } from '../data/scanProgress';
import { useBaseGas, useFundModal } from '../data/funding';
import { GAS_MIN_WEI } from '../lib/funding';
import { useMiniSettings, useSourceMode } from '../data/settings';
import type { Address } from '../data/types';
import { useReadChainId, useWallet } from '../data/useWallet';

/** The network the chain source reads from (the wallet's chain if supported, else the target). */
export function useReadChainName() {
  return chainName(useReadChainId());
}

/**
 * Text wordmark (no Aave logo). The mode chip next to it ("Mock data" / the network) is a separate
 * button, ModeChip in MiniShell, because the wordmark sits inside the home link.
 */
export function MiniWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Box component="span" sx={{ fontSize: compact ? 16 : 18, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', color: 'fg-1' }}>
      Mini-Aave
    </Box>
  );
}

const BAND_TOKEN = { safe: 'health-6', warn: 'health-3', danger: 'health-1' } as const;

/** Health factor coloured per §7 (≥1.5 green, 1.1–1.5 amber, <1.1 red); "∞" with no debt. */
export function HealthValue({ hf, size = 14, showLabel = false }: { hf: bigint; size?: number; showLabel?: boolean }) {
  const band = healthBand(hf);
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px' }}>
      <Box component="span" sx={{ color: BAND_TOKEN[band], fontSize: size, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
        {fmtHealth(hf)}
      </Box>
      {showLabel && hf !== MAX_UINT256 && hf < 10n ** 18n && (
        <Box component="span" sx={{ fontSize: 12, fontWeight: 500, color: 'health-1' }}>
          Can be liquidated
        </Box>
      )}
    </Box>
  );
}

export function TokenCell({ asset, size = 32 }: { asset: Address; size?: number }) {
  const t = TOKENS[asset];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
      <TokenIcon symbol={t?.symbol ?? '?'} size={size} />
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ fontWeight: 500, lineHeight: '17px' }}>{t?.symbol}</Box>
        <Box sx={{ color: 'fg-3', lineHeight: '17px' }}>{t?.name}</Box>
      </Box>
    </Box>
  );
}

/**
 * Wraps action buttons: on the wrong chain they become one "Switch network" button (§8), and with
 * no wallet a "Connect wallet" hint.
 */
export function ActionGate({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  const wallet = useWallet();
  if (!wallet.account) return <Box component="span" sx={{ color: 'fg-4', fontSize: 13 }}>Connect a wallet</Box>;
  if (wallet.wrongChain)
    return (
      <ProButton variant="secondary" size={compact ? 'sm' : 'md'} disabled={wallet.switching} onClick={wallet.switchNetwork}>
        Switch network
      </ProButton>
    );
  return <>{children}</>;
}

/**
 * The transaction hash after success (§8): mock → labelled fake hash; chain → the real hash, with a
 * Basescan link on Base Sepolia (none on the local chain).
 */
export function TxHashNote({ hash }: { hash: `0x${string}` }) {
  const mode = useSourceMode();
  const chainId = useReadChainId();
  const url = mode === 'chain' ? explorerTxUrl(chainId, hash) : null;
  const short = `${hash.slice(0, 18)}…${hash.slice(-6)}`;
  return (
    <Box sx={{ mt: 4, p: '0.625rem 0.875rem', borderRadius: '0.75rem', bgcolor: 'bg-2', textAlign: 'left' }}>
      <Box sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'fg-1' }}>{mode === 'mock' ? 'Simulated transaction confirmed' : `Confirmed on ${chainName(chainId)}`}</Box>
      <Box sx={{ fontSize: '0.75rem', color: 'fg-3' }}>
        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-all' }}>
          {short}
        </Box>{' '}
        {url ? (
          <Box component="a" href={url} target="_blank" rel="noreferrer" sx={{ color: 'purple-1', whiteSpace: 'nowrap' }}>
            View on Basescan
          </Box>
        ) : mode === 'mock' ? (
          '(fake hash, no explorer)'
        ) : (
          '(local chain, no explorer)'
        )}
      </Box>
    </Box>
  );
}

const BANNER_TEXT: Record<'no-contracts' | 'unreachable' | 'not-deployed', (network: string) => string> = {
  unreachable: (n) => `The app can't reach ${n} right now. If you're testing locally, start the local chain (anvil) on this computer, then this page reconnects by itself.`,
  'no-contracts': (n) => `There are no Mini-Aave contract addresses for ${n} yet. Switch your wallet to a supported network, or use mock data.`,
  'not-deployed': (n) => `${n} is running, but the Mini-Aave contracts aren't deployed on it. Run the deploy step, then refresh.`,
};

/**
 * Chain mode: while the event log is read for the first time (Base Sepolia's public RPC allows 200
 * blocks per query and 25 queries a second), say so, with progress. Charts, History, Top Addresses
 * and Liquidations fill in when it finishes; later visits only read the new blocks.
 */
export function ScanNotice() {
  const mode = useSourceMode();
  const { active, done, total } = useScanProgress();
  const network = useReadChainName();
  if (mode !== 'chain' || !active || total < 4) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <Box role="status" sx={{ mb: 4, animation: 'clone-fade-up 220ms ease both' }}>
      <Notice title={`Reading the pool's history from ${network}… ${pct}%`}>
        First visit only: {done.toLocaleString('en-US')} of {total.toLocaleString('en-US')} block ranges read. Charts, History, Top Addresses and Liquidations fill in when it&apos;s done; next time only new blocks are read.
        <Box sx={{ mt: 1.25, height: 4, borderRadius: 2, bgcolor: 'bg-6', overflow: 'hidden' }}>
          <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: 'purple-1', borderRadius: 2, transition: 'width 600ms cubic-bezier(0.19, 1, 0.22, 1)' }} />
        </Box>
      </Notice>
    </Box>
  );
}

/**
 * Chain mode, Base Sepolia: the connected wallet has less than GAS_MIN_WEI of ETH, so every
 * transaction would fail for lack of fees. Dismissible for the session.
 */
export function LowGasBanner() {
  const { account } = useWallet();
  const gas = useBaseGas(account);
  const dismissed = useFundModal((s) => s.lowGasDismissed);
  const dismiss = useFundModal((s) => s.dismissLowGas);
  const show = useFundModal((s) => s.show);
  if (dismissed || gas.data === undefined || gas.data > GAS_MIN_WEI) return null;
  return (
    <Box role="status" sx={{ mb: 4, animation: 'clone-fade-up 220ms ease both' }}>
      <Notice tone="warn" title="You need a little test ETH to pay fees">
        Every transaction on Base Sepolia costs a small fee in test ETH, and this wallet has almost none. It&apos;s free from a faucet.
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
          <ProButton size="sm" variant="primary" onClick={show}>
            Fund your wallet
          </ProButton>
          <ProButton size="sm" variant="text" onClick={dismiss}>
            Not now
          </ProButton>
        </Box>
      </Notice>
    </Box>
  );
}

/** Chain mode only: a plain-language banner when the contracts can't be used, instead of a crash. */
export function ChainBanner() {
  const mode = useSourceMode();
  const status = useSourceStatus();
  const network = useReadChainName();
  const setSource = useMiniSettings((s) => s.setSource);
  if (mode !== 'chain' || !status.data || status.data === 'ok') return null;
  return (
    <Box role="status" sx={{ mb: 4 }}>
      <Notice tone="warn" title="Contracts not reachable on this network">
        {BANNER_TEXT[status.data](network)}
        <Box sx={{ mt: 1.5 }}>
          <ProButton size="sm" variant="secondary" onClick={() => setSource('mock')}>
            Use mock data instead
          </ProButton>
        </Box>
      </Notice>
    </Box>
  );
}

/** A tinted notice box (info / warn / danger). */
export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'danger'; title: React.ReactNode; children?: React.ReactNode }) {
  const color = tone === 'danger' ? tv('health-1') : tone === 'warn' ? tv('health-3') : tv('purple-1');
  return (
    <Box sx={{ p: '0.875rem 1rem', borderRadius: '0.875rem', bgcolor: `color-mix(in srgb, ${color} 10%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 25%, transparent)` }}>
      <Box sx={{ fontWeight: 500, fontSize: 14 }}>{title}</Box>
      {children && <Box sx={{ mt: '4px', fontSize: 13, color: 'fg-2' }}>{children}</Box>}
    </Box>
  );
}
