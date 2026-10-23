'use client';

/**
 * "Fund your wallet" (Base Sepolia, TEST funds only): the path you'd follow by hand on a testnet,
 * as three steps that tick themselves off by re-reading balances every 10 s while this is open.
 *   1  test ETH for fees   ✅ when Base Sepolia ETH > 0.0002. Routes: a direct faucet, or bridge
 *                           Ethereum Sepolia ETH through the official L1StandardBridge.
 *   2  test tokens         ✅ when USDC or WETH > 0 (the pool's own faucet(), inline)
 *   3  start               Supply, or open Markets
 * Mock mode shows the same flow over simulated balances, clearly labelled.
 * Everything happens in the user's wallet: no server, no keys.
 */
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { CheckIcon } from '@/shared/ui/Icons';
import { BasicModal } from '@/shared/ui/BasicModal';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { surfaceShadow, tv } from '@/shared/theme/tokens';
import { motion } from '@/shared/theme/motion';
import { PIExternal } from '@/apps/pro/icons';
import { TX_MODAL_PAPER_SX } from '@/apps/pro/transactions/ProTxModal';
import { ProButton, Tag } from '@/apps/pro/ui';
import { BASE_SEPOLIA_CHAIN_ID, CHAIN_INFO, ETH_SEPOLIA_CHAIN_ID, FAUCET_BY_SYMBOL, TOKENS } from '../data/config';
import { MOCK_FAUCET, runBridge, switchToBaseSepolia, useFundingBalances, useFundModal, useMockFunding } from '../data/funding';
import { useMarkets } from '../data/hooks';
import { useMiniSettings } from '../data/settings';
import type { Address } from '../data/types';
import { useWallet } from '../data/useWallet';
import { bridgeArrived, bridgeDefault, bridgeMax, FAUCETS, fundingState, GAS_MIN_WEI } from '../lib/funding';
import { fmtToken } from '../lib/format';
import { formatUnits, parseUnits, sanitizeDecimalInput } from '../lib/units';
import { miniRoutes } from '../layout/routes';
import { ActionGate } from '../ui/parts';
import { useToasts } from '../ui/toasts';
import { runTx } from './runTx';
import { useMiniTx } from './store';

const eth = (v: bigint | null) => (v === null ? '…' : `${fmtToken(v, 18, 4)} ETH`);
const etherscanTx = (hash: string) => `${CHAIN_INFO[ETH_SEPOLIA_CHAIN_ID].explorer}/tx/${hash}`;

// ---------------------------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------------------------

function StepCard({ n, title, done, open, summary, onToggle, children }: { n: number; title: string; done: boolean; open: boolean; summary: React.ReactNode; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Box sx={{ borderRadius: '14px', bgcolor: 'bg-2', boxShadow: surfaceShadow('shadow-stroke-1'), transition: 'box-shadow 200ms ease', ...(open && !done ? { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } : {}) }}>
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', p: '14px 16px', border: 0, background: 'none', color: 'fg-1', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', borderRadius: '14px', '&:focus-visible': { outline: `2px solid ${tv('fg-3')}` } }}
      >
        <Box
          aria-hidden
          sx={{
            width: 26,
            height: 26,
            flexShrink: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            bgcolor: done ? 'data-green' : open ? 'fg-1' : 'bg-5',
            color: done ? '#fff' : open ? 'bg-1' : 'fg-2',
            transition: `background-color 200ms ease, transform ${motion.duration.snappy}ms ${motion.easing.snappy}`,
            transform: done ? 'scale(1.05)' : 'none',
          }}
        >
          {done ? <CheckIcon sx={{ fontSize: 15 }} /> : n}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontSize: 15, fontWeight: 500 }}>{title}</Box>
          <Box sx={{ mt: '2px', fontSize: 13, color: done ? 'data-green' : 'fg-3' }}>{summary}</Box>
        </Box>
        <Box aria-hidden component="svg" viewBox="0 0 12 12" sx={{ width: 12, height: 12, color: 'fg-4', transform: open ? 'rotate(180deg)' : 'none', transition: `transform ${motion.duration.smooth}ms ${motion.easing.smooth}` }}>
          <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </Box>
      </Box>
      {open && <Box sx={{ p: { xs: '0 14px 14px', sm: '0 16px 16px 54px' }, display: 'flex', flexDirection: 'column', gap: '12px', animation: 'clone-fade-up 220ms ease both' }}>{children}</Box>}
    </Box>
  );
}

function LinkCard({ title, note, href }: { title: string; note: string; href: string }) {
  return (
    <Box component="a" href={href} target="_blank" rel="noreferrer" sx={{ display: 'flex', alignItems: 'center', gap: '12px', p: '10px 12px', borderRadius: '10px', bgcolor: 'bg-3', color: 'fg-1', textDecoration: 'none', boxShadow: `0 0 0 1px ${tv('border-1')}`, transition: 'background-color 120ms ease, transform 120ms ease', '&:hover': { bgcolor: 'bg-4' }, '&:active': { transform: 'scale(0.99)' } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontSize: 14, fontWeight: 500 }}>{title}</Box>
        <Box sx={{ mt: '2px', fontSize: 12, color: 'fg-3' }}>{note}</Box>
      </Box>
      <Box component="span" sx={{ color: 'fg-3', display: 'flex' }}>
        <PIExternal size={16} />
      </Box>
    </Box>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <Box sx={{ fontSize: 11, fontWeight: 600, color: 'fg-4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</Box>;
const Note = ({ children, tone = 'fg-3' }: { children: React.ReactNode; tone?: string }) => <Box sx={{ fontSize: 13, lineHeight: '18px', color: tone }}>{children}</Box>;

// ---------------------------------------------------------------------------------------------
// Step 1, route (b): Ethereum Sepolia → Base Sepolia
// ---------------------------------------------------------------------------------------------

function BridgeForm({ account, sepoliaEth, baseEth, simulated }: { account: Address; sepoliaEth: bigint; baseEth: bigint | null; simulated: boolean }) {
  const bridge = useFundModal((s) => s.bridge);
  const setBridge = useFundModal((s) => s.setBridge);
  const wallet = useWallet();
  const [typed, setTyped] = React.useState<string | null>(null);
  const max = bridgeMax(sepoliaEth);
  const value = typed ?? formatUnits(bridgeDefault(sepoliaEth), 18);
  let amount = 0n;
  try {
    amount = value ? parseUnits(value, 18) : 0n;
  } catch {
    amount = 0n;
  }
  const busy = bridge.status === 'switching' || bridge.status === 'signing' || bridge.status === 'confirming';
  const tooMuch = amount > max;
  const status: Record<string, React.ReactNode> = {
    switching: simulated ? 'Switching the wallet to Ethereum Sepolia (simulated)…' : 'Approve the switch to Ethereum Sepolia in MetaMask…',
    signing: simulated ? 'Confirming in the wallet (simulated)…' : 'Confirm the transaction in MetaMask…',
    confirming: 'Waiting for Ethereum Sepolia to confirm it…',
  };

  if (bridge.status === 'sent' || bridge.status === 'arrived') {
    return (
      <Box sx={{ p: '12px', borderRadius: '10px', bgcolor: `color-mix(in srgb, ${tv(bridge.status === 'arrived' ? 'data-green' : 'purple-1')} 10%, transparent)`, display: 'flex', flexDirection: 'column', gap: '8px', animation: 'clone-fade-up 220ms ease both' }}>
        <Box sx={{ fontSize: 14, fontWeight: 500 }}>{bridge.status === 'arrived' ? `Arrived on Base Sepolia ✓` : `On its way to Base Sepolia… usually 2–5 minutes`}</Box>
        <Note>
          {fmtToken(bridge.amount ?? 0n, 18, 4)} ETH {bridge.status === 'arrived' ? 'is in your wallet on Base Sepolia.' : 'was sent on Ethereum Sepolia. This step ticks itself off when it lands.'}
        </Note>
        {bridge.hash && !simulated && (
          <Box component="a" href={etherscanTx(bridge.hash)} target="_blank" rel="noreferrer" sx={{ fontSize: 13, color: 'purple-1' }}>
            View the transaction on Etherscan
          </Box>
        )}
        {simulated && <Note tone="fg-4">Simulated: no transaction was sent.</Note>}
        {!simulated && wallet.chainId !== BASE_SEPOLIA_CHAIN_ID && (
          <Box>
            <ProButton size="sm" variant="secondary" onClick={() => void switchToBaseSepolia()}>
              Switch back to Base Sepolia
            </ProButton>
          </Box>
        )}
        {bridge.status === 'arrived' && (
          <Box>
            <ProButton size="sm" variant="text" onClick={() => setBridge({ status: 'idle' })}>
              Move more
            </ProButton>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Box sx={{ borderRadius: '12px', bgcolor: 'bg-3', boxShadow: `0 0 0 1px ${tv('border-1')}`, p: '10px 12px', '&:focus-within': { boxShadow: `0 0 0 1px ${tv('fg-4')}` } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InputBase value={value} disabled={busy} onChange={(e) => setTyped(sanitizeDecimalInput(e.target.value, 18))} inputProps={{ 'aria-label': 'Amount of Sepolia ETH to move', inputMode: 'decimal' }} sx={{ flex: 1, fontSize: 22, fontWeight: 500, '& input': { p: 0 } }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 14, fontWeight: 500 }}>
            <TokenIcon symbol="ETH" size={20} /> ETH
          </Box>
        </Box>
        <Box sx={{ mt: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'fg-3' }}>
          <span>On Ethereum Sepolia: {eth(sepoliaEth)}</span>
          <ProButton size="sm" variant="tertiary" disabled={busy || max === 0n} onClick={() => setTyped(formatUnits(max, 18))} sx={{ height: 22, px: '0.5rem', fontSize: '0.75rem' }}>
            Max
          </ProButton>
        </Box>
      </Box>
      {tooMuch && <Note tone="health-1">That&apos;s more than you can move: keep 0.002 ETH for the fee.</Note>}
      {bridge.status === 'error' && <Note tone="health-1">{bridge.message}</Note>}
      {busy && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 13, color: 'fg-2' }} role="status">
          <Box component="span" sx={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${tv('fg-4')}`, borderTopColor: tv('fg-1'), animation: 'clone-spin 800ms linear infinite' }} />
          {status[bridge.status]}
        </Box>
      )}
      <ProButton variant="primary" disabled={busy || amount <= 0n || tooMuch} loading={busy} onClick={() => void runBridge({ account, amount, baseline: baseEth, simulated })}>
        Move to Base Sepolia
      </ProButton>
      <Note tone="fg-4">Uses Base&apos;s official bridge contract on Ethereum Sepolia. The fee is paid in Sepolia ETH.</Note>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Step 2: the pool's token faucet, inline
// ---------------------------------------------------------------------------------------------

function TokenFaucetRow({ account, asset, symbol, decimals, balance }: { account: Address; asset: Address; symbol: string; decimals: number; balance: bigint }) {
  const [state, setState] = React.useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = React.useState('');
  const push = useToasts((s) => s.push);
  const amount = FAUCET_BY_SYMBOL[symbol] ?? 0n;
  const run = async () => {
    setState('running');
    const res = await runTx({ account, label: `faucet() on ${symbol}`, call: { contract: 'token', address: asset, functionName: 'faucet', args: [] }, onSteps: () => {} });
    if (res.ok) {
      setState('done');
      push({ tone: 'success', title: `${symbol} faucet confirmed`, body: `${fmtToken(amount, decimals)} ${symbol} added to your wallet.` });
    } else {
      setState('error');
      setMessage(res.message);
    }
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <TokenIcon symbol={symbol} size={28} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontSize: 14, fontWeight: 500 }}>{symbol}</Box>
          <Box sx={{ fontSize: 12, color: 'fg-3' }}>In wallet: {fmtToken(balance, decimals)}</Box>
        </Box>
        <ActionGate compact>
          <ProButton size="sm" variant={balance > 0n ? 'secondary' : 'primary'} loading={state === 'running'} disabled={state === 'running'} onClick={() => void run()}>
            {state === 'done' ? 'Again' : `Get ${fmtToken(amount, decimals)}`}
          </ProButton>
        </ActionGate>
      </Box>
      {state === 'error' && <Note tone="health-1">{message}</Note>}
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------

export function FundModalHost() {
  const { open, hide } = useFundModal();
  return (
    <BasicModal open={open} onClose={hide} maxWidth={480} labelledBy="fund-title" paperSx={TX_MODAL_PAPER_SX}>
      {open && <FundContent />}
    </BasicModal>
  );
}

function FundContent() {
  const wallet = useWallet();
  const { account } = wallet;
  const hide = useFundModal((s) => s.hide);
  const bridge = useFundModal((s) => s.bridge);
  const setBridge = useFundModal((s) => s.setBridge);
  const openTx = useMiniTx((s) => s.open);
  const markets = useMarkets();
  const setReadChain = useMiniSettings((s) => s.setReadChain);
  const mock = useMockFunding();
  const b = useFundingBalances(account, true);
  const st = fundingState(b);
  const [manual, setManual] = React.useState<number | null>(null);
  const [why, setWhy] = React.useState(false);
  const openStep = manual ?? st.current;

  // The bridged ETH has landed: the Base Sepolia balance went up.
  React.useEffect(() => {
    if (bridge.status === 'sent' && bridgeArrived(bridge.baseline ?? null, b.baseEth)) setBridge({ ...bridge, status: 'arrived' });
  }, [bridge, b.baseEth, setBridge]);

  const tokenRows = (b.tokens ?? []) as { symbol: string; asset: Address; decimals: number; balance: bigint }[];
  const supplyAsset = tokenRows.find((t) => t.balance > 0n)?.asset ?? markets.data?.[0]?.asset;

  return (
    <Box>
      <Typography id="fund-title" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 500, pr: '2rem' }}>
        Fund your wallet
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        <Tag>Test funds only</Tag>
        {b.simulated ? <Tag tone="warning">Mock data · simulated balances</Tag> : <Tag tone="purple">Base Sepolia</Tag>}
      </Box>

      <Box sx={{ mt: 2 }}>
        <Box component="button" type="button" onClick={() => setWhy((v) => !v)} aria-expanded={why} sx={{ p: 0, border: 0, background: 'none', color: 'fg-2', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3, '&:hover': { color: 'fg-1' } }}>
          Why do I need this?
        </Box>
        {why && (
          <Box sx={{ mt: 1, p: '10px 12px', borderRadius: '10px', bgcolor: 'bg-2', fontSize: 13, lineHeight: '19px', color: 'fg-2', animation: 'clone-fade-up 200ms ease both' }}>
            Every action on a blockchain costs a small fee, called <b>gas</b>, paid in the network&apos;s own ETH. On Base Sepolia that ETH is free test money from a faucet. The tokens you lend and borrow here (USDC and WETH) come from Mini-Aave&apos;s own faucet. None of it is real money.
          </Box>
        )}
      </Box>

      {!account ? (
        <Box sx={{ mt: 3, p: '14px', borderRadius: '12px', bgcolor: 'bg-2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Note>{wallet.mode === 'chain' ? 'Connect MetaMask first: the balances come from your wallet.' : 'Pick a test account in the wallet menu first.'}</Note>
          {wallet.mode === 'chain' && (
            <ProButton size="sm" variant="primary" loading={wallet.connecting} onClick={wallet.connectBrowser}>
              Connect
            </ProButton>
          )}
        </Box>
      ) : !b.onBaseSepolia ? (
        <Box sx={{ mt: 3, p: '14px', borderRadius: '12px', bgcolor: 'bg-2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Note>Funding is for Base Sepolia, the public test network. You&apos;re reading another network.</Note>
          <ProButton
            size="sm"
            variant="primary"
            onClick={() => {
              setReadChain(BASE_SEPOLIA_CHAIN_ID);
              if (wallet.account && wallet.chainId !== BASE_SEPOLIA_CHAIN_ID) wallet.switchTo(BASE_SEPOLIA_CHAIN_ID);
            }}
          >
            Use Base Sepolia
          </ProButton>
        </Box>
      ) : (
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <StepCard n={1} title="Get test ETH for fees" done={st.gasDone} open={openStep === 1} onToggle={() => setManual(openStep === 1 ? 0 : 1)} summary={st.gasDone ? `${eth(b.baseEth)} on Base Sepolia` : b.baseEth === null ? 'Checking your balance…' : `You have ${eth(b.baseEth)}; you need a little more than ${fmtToken(GAS_MIN_WEI, 18)} ETH`}>
            {st.gasDone ? (
              <Note>You have enough test ETH on Base Sepolia to pay fees.</Note>
            ) : (
              <>
                <Label>(a) Straight to Base Sepolia</Label>
                <LinkCard title={FAUCETS.cdp.label} note={FAUCETS.cdp.note} href={FAUCETS.cdp.href} />
                <LinkCard title={FAUCETS.alchemy.label} note={FAUCETS.alchemy.note} href={FAUCETS.alchemy.href} />
                {b.simulated && (
                  <ProButton size="sm" variant="secondary" onClick={() => mock.add('base', MOCK_FAUCET.base)} sx={{ whiteSpace: 'normal', height: 'auto', minHeight: 32, py: '6px' }}>
                    Simulate faucet: +0.1 ETH
                  </ProButton>
                )}
                <Box sx={{ mt: '6px' }}>
                  <Label>(b) From Ethereum Sepolia, through the bridge</Label>
                </Box>
                {st.ethRoute === 'loading' ? (
                  <Skeleton variant="rounded" height={64} />
                ) : st.ethRoute === 'get-sepolia' && bridge.status === 'idle' ? (
                  <>
                    <Note>You have no ETH on Ethereum Sepolia yet. Get some first, then move it here:</Note>
                    <LinkCard title={FAUCETS.google.label} note={FAUCETS.google.note} href={FAUCETS.google.href} />
                    {b.simulated && (
                      <ProButton size="sm" variant="secondary" onClick={() => mock.add('sepolia', MOCK_FAUCET.sepolia)} sx={{ whiteSpace: 'normal', height: 'auto', minHeight: 32, py: '6px' }}>
                        Simulate Google faucet: +0.05 Sepolia ETH
                      </ProButton>
                    )}
                  </>
                ) : (
                  <BridgeForm account={account} sepoliaEth={b.sepoliaEth ?? 0n} baseEth={b.baseEth} simulated={b.simulated} />
                )}
              </>
            )}
          </StepCard>

          <StepCard
            n={2}
            title="Get test tokens"
            done={st.tokensDone}
            open={openStep === 2}
            onToggle={() => setManual(openStep === 2 ? 0 : 2)}
            summary={tokenRows.length ? tokenRows.map((t) => `${fmtToken(t.balance, t.decimals, 2)} ${t.symbol}`).join(' · ') : 'Checking your balances…'}
          >
            <Note>Free USDC and WETH from Mini-Aave&apos;s faucet: 10,000 USDC or 5 WETH per click. Each click is a transaction, so it needs step 1.</Note>
            {tokenRows.map((t) => (
              <TokenFaucetRow key={t.asset} account={account} asset={t.asset} symbol={t.symbol} decimals={t.decimals ?? TOKENS[t.asset]?.decimals ?? 18} balance={t.balance} />
            ))}
          </StepCard>

          <StepCard n={3} title="Start using Mini-Aave" done={false} open={openStep === 3} onToggle={() => setManual(openStep === 3 ? 0 : 3)} summary={st.gasDone && st.tokensDone ? "You're ready" : 'After steps 1 and 2'}>
            <Note>Supply tokens to earn interest and use them as collateral, then borrow against them.</Note>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <ProButton
                variant="primary"
                disabled={!supplyAsset}
                onClick={() => {
                  hide();
                  if (supplyAsset) openTx({ kind: 'supply', asset: supplyAsset });
                }}
              >
                Supply
              </ProButton>
              <ProButton variant="secondary" href={miniRoutes.markets} onClick={hide}>
                Open Markets
              </ProButton>
            </Box>
          </StepCard>
        </Box>
      )}

      <Typography sx={{ mt: 3, textAlign: 'center', fontSize: '0.75rem', color: 'fg-4' }}>
        {b.simulated ? (
          <>
            Simulated balances · no wallet, no chain ·{' '}
            <Box component="button" type="button" onClick={() => { mock.reset(); setBridge({ status: 'idle' }); }} sx={{ p: 0, border: 0, background: 'none', color: 'fg-3', fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
              reset simulation
            </Box>
          </>
        ) : (
          'Balances refresh every 10 seconds · test networks only, no real money'
        )}
      </Typography>
    </Box>
  );
}
