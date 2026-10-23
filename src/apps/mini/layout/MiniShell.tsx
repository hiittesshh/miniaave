'use client';

/**
 * The Mini-Aave mode of the Pro app: Pro's shell (sidebar, topbar, mobile menu) through its
 * `variant` prop, with only the guide's screens in the sidebar, a "Mini-Aave" text wordmark with a
 * clickable chip ("Mock data", or the network name in chain mode; it switches the data source),
 * the wallet on the right of the topbar,
 * the "Contracts not reachable" banner and the Mini transaction modal.
 *
 * Wallet menu:
 *  - both modes: "Data: Mock / Chain" (saved in this browser)
 *  - mock mode: the §3 test accounts, a wrong-network toggle, Reset demo data, Disconnect
 *  - chain mode: Connect MetaMask, the network, Switch network, Disconnect
 */
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { ProShell, type NavGroup, type SearchItem, type ShellVariant } from '@/apps/pro/layout/ProShell';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { ProButton } from '@/apps/pro/ui';
import { PIActivity, PIDashboard, PIDeposit, PIGovernance, PISecurity } from '@/apps/pro/icons';
import { AddressAvatar } from '@/shared/ui/AddressAvatar';
import { tv } from '@/shared/theme/tokens';
import { ACCOUNTS, LOCAL_CHAIN_ID, SUPPORTED_CHAINS, chainName, chainShortName, isSupportedChain, roleOf } from '../data/config';
import { useMarkets, useMiniLiveRefresh, useOracleOwner } from '../data/hooks';
import { useMiniSettings, useSourceMode, type SourceMode } from '../data/settings';
import { miniSource } from '../data/source';
import { useReadChainId, useWallet } from '../data/useWallet';
import { useMiniWallet, WRONG_CHAIN_ID } from '../data/wallet';
import { shortAddr } from '../lib/format';
import { MiniTxModalHost } from '../tx/MiniTxModal';
import { ChainBanner, LowGasBanner, MiniWordmark, ScanNotice, useReadChainName } from '../ui/parts';
import { ToastHost } from '../ui/toasts';
import { MIFaucet } from '../ui/icons';
import { useFundModal } from '../data/funding';
import { BRAND } from '../brand';
import { FundModalHost } from '../tx/FundModal';

export { miniRoutes } from './routes';
import { miniRoutes } from './routes';

const MenuLabel = ({ children }: { children: React.ReactNode }) => <Typography sx={{ px: 2, pt: 1, pb: 0.5, fontSize: 11, fontWeight: 600, color: 'fg-4', textTransform: 'uppercase' }}>{children}</Typography>;
const MenuNote = ({ children }: { children: React.ReactNode }) => <Typography sx={{ px: 2, pt: 1, pb: 1, fontSize: 11, color: 'fg-4', maxWidth: 300 }}>{children}</Typography>;

const SOURCES: { mode: SourceMode; label: string; note: string }[] = [
  { mode: 'mock', label: 'Mock data', note: 'In-browser demo, no wallet or chain' },
  { mode: 'chain', label: 'Chain', note: 'Real contracts, MetaMask signs' },
];

/** "Data: Mock / Chain": switches every screen between the mock engine and the real contracts. */
function SourceItems({ close }: { close: () => void }) {
  const mode = useSourceMode();
  const setSource = useMiniSettings((s) => s.setSource);
  return (
    <>
      <MenuLabel>Data</MenuLabel>
      {SOURCES.map((s) => (
        <MenuItem
          key={s.mode}
          selected={mode === s.mode}
          onClick={() => {
            setSource(s.mode);
            close();
          }}
        >
          <Box>
            <Box sx={{ fontSize: 14, fontWeight: 500 }}>
              {s.label}
              {mode === s.mode && <Box component="span" sx={{ ml: 1, color: 'fg-3', fontWeight: 400 }}>· in use</Box>}
            </Box>
            <Box sx={{ fontSize: 12, color: 'fg-3' }}>{s.note}</Box>
          </Box>
        </MenuItem>
      ))}
    </>
  );
}

/**
 * The chip next to the wordmark: "Mock data", or the network name in chain mode. Clicking it opens
 * the Data menu (the same items as at the bottom of the wallet menu), so the mode is switched where
 * it's shown.
 */
function ModeChip() {
  const mode = useSourceMode();
  const readChain = useReadChainId();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  // The sidebar slot fits about 80px of chip: short network name, and for long ones ("Base Sepolia")
  // 9px type with tighter spacing, so the label + caret aren't clipped by the collapsing header.
  const label = mode === 'mock' ? 'Mock data' : chainShortName(readChain);
  const long = label.length > 9;
  const purple = tv('purple-1');
  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-label={`Data source: ${mode === 'mock' ? 'mock data' : chainName(readChain)}. Change data source`}
        title="Switch between mock data and the real contracts"
        sx={{ px: long ? '4px' : '6px', height: 18, display: 'inline-flex', alignItems: 'center', gap: long ? '1px' : '3px', flexShrink: 0, border: 0, borderRadius: '6px', bgcolor: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: long ? 9 : 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: long ? '0' : '0.04em', color: 'purple-1', boxShadow: `inset 0 0 0 1px ${purple}`, whiteSpace: 'nowrap', transition: 'background-color 150ms ease', '&:hover': { bgcolor: `color-mix(in srgb, ${purple} 14%, transparent)` }, '&:focus-visible': { outline: `2px solid ${purple}`, outlineOffset: '-1px' } }}
      >
        {label}
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
          <path d="M1.5 3 4 5.5 6.5 3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Box>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} slotProps={{ paper: { sx: { minWidth: 260 } } }}>
        <SourceItems close={close} />
      </Menu>
    </>
  );
}

/** Mock mode: exactly the earlier mock wallet (test accounts, wrong-network toggle, reset). */
function MockItems({ close }: { close: () => void }) {
  const { account, connect, disconnect, setChain, chainId } = useMiniWallet();
  const wrong = chainId !== LOCAL_CHAIN_ID;
  return (
    <>
      <MenuLabel>Mock wallet: test accounts</MenuLabel>
      {ACCOUNTS.map((a) => (
        <MenuItem
          key={a.address}
          selected={account === a.address}
          onClick={() => {
            connect(a.address);
            close();
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AddressAvatar address={a.address} size={24} />
            <Box>
              <Box sx={{ fontSize: 14, fontWeight: 500 }}>
                {a.role} <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{shortAddr(a.address)}</Box>
              </Box>
              <Box sx={{ fontSize: 12, color: 'fg-3' }}>{a.note}</Box>
            </Box>
          </Box>
        </MenuItem>
      ))}
      <Divider />
      <MenuItem onClick={() => setChain(wrong ? LOCAL_CHAIN_ID : WRONG_CHAIN_ID)}>
        <Box sx={{ fontSize: 14 }}>{wrong ? 'Back to the local chain (31337)' : 'Simulate wrong network'}</Box>
      </MenuItem>
      <MenuItem
        onClick={() => {
          miniSource.resetDemo();
          close();
        }}
      >
        <Box sx={{ fontSize: 14 }}>Reset demo data</Box>
      </MenuItem>
      {account && (
        <MenuItem
          onClick={() => {
            disconnect();
            close();
          }}
        >
          <Box sx={{ fontSize: 14, color: 'fg-2' }}>Disconnect</Box>
        </MenuItem>
      )}
      <MenuNote>Addresses only: the app never holds a private key.</MenuNote>
    </>
  );
}

/** Chain mode: MetaMask through wagmi's injected connector, plus the network to read from. */
function ChainItems({ close }: { close: () => void }) {
  const w = useWallet();
  const readChain = useReadChainId();
  const setReadChain = useMiniSettings((s) => s.setReadChain);
  const walletOnSupported = Boolean(w.account) && isSupportedChain(w.chainId);
  return (
    <>
      <MenuLabel>Browser wallet</MenuLabel>
      {!w.account ? (
        <MenuItem disabled={w.connecting} onClick={w.connectBrowser}>
          <Box>
            <Box sx={{ fontSize: 14, fontWeight: 500 }}>{w.connecting ? 'Connecting… check MetaMask' : 'Connect MetaMask'}</Box>
            <Box sx={{ fontSize: 12, color: 'fg-3' }}>{w.hasBrowserWallet ? 'Opens your browser wallet' : 'No browser wallet detected in this browser'}</Box>
          </Box>
        </MenuItem>
      ) : (
        <>
          <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AddressAvatar address={w.account} size={24} />
            <Box>
              <Box sx={{ fontSize: 14, fontWeight: 500 }}>
                {shortAddr(w.account)} {roleOf(w.account) && <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{roleOf(w.account)}</Box>}
              </Box>
              <Box sx={{ fontSize: 12, color: w.wrongChain ? 'health-1' : 'fg-3' }}>{w.wrongChain ? `${chainName(w.chainId)}: not supported` : chainName(w.chainId)}</Box>
            </Box>
          </Box>
          {w.wrongChain && (
            <MenuItem disabled={w.switching} onClick={w.switchNetwork}>
              <Box sx={{ fontSize: 14 }}>Switch to {chainName(readChain)}</Box>
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              w.disconnect();
              close();
            }}
          >
            <Box sx={{ fontSize: 14, color: 'fg-2' }}>Disconnect</Box>
          </MenuItem>
        </>
      )}
      {w.error && (
        <Typography role="alert" sx={{ px: 2, pb: 1, fontSize: 12, color: 'health-1', maxWidth: 300 }}>
          {w.error}
        </Typography>
      )}
      <MenuNote>MetaMask signs every transaction. The app never sees a private key.</MenuNote>
      <Divider />
      <MenuLabel>Network</MenuLabel>
      {SUPPORTED_CHAINS.map((id) => (
        <MenuItem
          key={id}
          selected={readChain === id}
          onClick={() => {
            setReadChain(id);
            // With a connected wallet on a supported chain, the wallet's chain decides: ask it to switch.
            if (walletOnSupported && w.chainId !== id) w.switchTo(id);
            close();
          }}
        >
          <Box sx={{ fontSize: 14 }}>
            {chainName(id)}
            {readChain === id && <Box component="span" sx={{ ml: 1, color: 'fg-3' }}>· reading</Box>}
          </Box>
        </MenuItem>
      ))}
    </>
  );
}

function WalletButton() {
  const w = useWallet();
  const showFund = useFundModal((s) => s.show);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Desktop only: on phones it's in the wallet menu and on the dashboard. */}
      <ProButton variant="secondary" prefixIcon={<MIFaucet />} onClick={showFund} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
        Fund your wallet
      </ProButton>
      {w.wrongChain && w.account && (
        <ProButton variant="secondary" disabled={w.switching} onClick={w.switchNetwork} sx={{ color: 'health-1' }}>
          Switch network
        </ProButton>
      )}
      {w.account ? (
        <ProButton variant="secondary" onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu" prefixIcon={<AddressAvatar address={w.account} size={20} />}>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{shortAddr(w.account)}</Box>
          {roleOf(w.account) && <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{roleOf(w.account)}</Box>}
        </ProButton>
      ) : (
        <ProButton variant="primary" onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu">
          Connect wallet
        </ProButton>
      )}
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { minWidth: 280 } } }}>
        {w.mode === 'mock' ? <MockItems close={close} /> : <ChainItems close={close} />}
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            showFund();
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <MIFaucet />
            <Box>
              <Box sx={{ fontSize: 14, fontWeight: 500 }}>Fund your wallet</Box>
              <Box sx={{ fontSize: 12, color: 'fg-3' }}>Test ETH for fees, then test tokens</Box>
            </Box>
          </Box>
        </MenuItem>
        <Divider />
        <SourceItems close={close} />
      </Menu>
    </Box>
  );
}

function Hosts() {
  useMiniLiveRefresh();
  return (
    <>
      <MiniTxModalHost />
      <FundModalHost />
      <ToastHost />
    </>
  );
}

/** A small rounded tile with the page's nav icon, for the search results. */
const PageIcon = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: 'bg-4', color: 'fg-2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, '& svg': { width: 16, height: 16 } }}>{children}</Box>
);

export function MiniShell({ children }: { children: React.ReactNode }) {
  const { account, mode } = useWallet();
  const owner = useOracleOwner();
  const markets = useMarkets();
  const network = useReadChainName();
  const isOwner = Boolean(account && owner.data && owner.data.toLowerCase() === account.toLowerCase());
  const nav: NavGroup[] = [
    {
      items: [
        { label: 'Dashboard', href: miniRoutes.dashboard, icon: <PIDashboard /> },
        { label: 'Markets', href: miniRoutes.markets, icon: <PIDeposit /> },
      ],
    },
    {
      label: 'Demo',
      items: [
        { label: 'Faucet', href: miniRoutes.faucet, icon: <MIFaucet /> },
        { label: 'Liquidations', href: miniRoutes.liquidations, icon: <PISecurity /> },
        { label: 'History', href: miniRoutes.history, icon: <PIActivity /> },
      ],
    },
    ...(isOwner ? [{ label: 'Owner', items: [{ label: 'Admin', href: miniRoutes.admin, icon: <PIGovernance /> }] }] : []),
  ];
  const pages: SearchItem[] = nav.flatMap((g) => g.items).map((i) => ({ key: `p-${i.label}`, icon: <PageIcon>{i.icon}</PageIcon>, title: i.label, sub: 'Page', href: i.href ?? miniRoutes.dashboard }));
  const assets: SearchItem[] = (markets.data ?? []).map((m) => ({ key: `a-${m.asset}`, icon: <TokenIcon symbol={m.token.symbol} size={28} />, title: m.token.symbol, sub: m.token.name, href: miniRoutes.reserve(m.token.symbol) }));
  const match = (term: string, ...texts: string[]) => !term || texts.some((t) => t.toLowerCase().includes(term));
  const variant: ShellVariant = {
    homeHref: miniRoutes.dashboard,
    nav,
    brand: <MiniWordmark />,
    compactBrand: <MiniWordmark compact />,
    brandAddon: <ModeChip />,
    compactBrandAddon: <ModeChip />,
    brandLabel: BRAND,
    topbarRight: <WalletButton />,
    hosts: <Hosts />,
    navLabel: `${BRAND} navigation`,
    search: {
      placeholder: 'Search assets and pages',
      groups: (term) => [
        { label: 'Assets', items: assets.filter((a) => match(term, a.title, a.sub)) },
        { label: 'Pages', items: pages.filter((p) => match(term, p.title)) },
      ],
    },
    promo: mode === 'chain' ? { title: `${BRAND} · ${network}`, sub: network === 'Base Sepolia' ? 'Testnet: test tokens only' : 'Local chain', href: miniRoutes.markets } : { title: `${BRAND} · Mock data`, sub: 'Simulated in your browser', href: miniRoutes.markets },
    help: {
      title: `About ${BRAND}`,
      body:
        mode === 'chain'
          ? `You're on the real ${BRAND} test contracts (${network}). Every action is a real testnet transaction that MetaMask asks you to sign. Use the faucet for free test tokens. Switch back to mock data with the chip next to the ${BRAND} name.`
          : `Mock data: the ${BRAND} contracts are simulated in your browser (no chain, no real funds). Pick a test account in the wallet menu, use the faucet, and try supply, borrow, the price drop and a liquidation. "Reset demo data" starts over. To use the real test contracts, click the MOCK DATA chip next to the ${BRAND} name and pick Chain.`,
    },
  };
  return (
    <ProShell variant={variant}>
      <ChainBanner />
      <ScanNotice />
      <LowGasBanner />
      {children}
    </ProShell>
  );
}
