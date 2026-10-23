'use client';

/**
 * Faucet (/mini/faucet), like Aave's testnet faucet page: every pool token with your wallet balance
 * and a Faucet button (the token's own faucet(): 10,000 USDC or 5 WETH per call, no approve needed,
 * §5). Test ETH for fees isn't a pool token: that's "Fund your wallet".
 */
import Box from '@mui/material/Box';
import { PageTitle, ProButton } from '@/apps/pro/ui';
import { FAUCET_BY_SYMBOL } from '../data/config';
import { useFundModal } from '../data/funding';
import { useAccountData, useMarkets, type MarketRow } from '../data/hooks';
import { useWallet } from '../data/useWallet';
import { fmtToken } from '../lib/format';
import { useMiniTx } from '../tx/store';
import { MIFaucet } from '../ui/icons';
import { MiniTable } from '../ui/MiniTable';
import { ActionGate, Notice, TokenCell, useReadChainName } from '../ui/parts';
import { BRAND } from '../brand';

export function FaucetPage() {
  const markets = useMarkets();
  const { account, mode } = useWallet();
  const user = useAccountData(account);
  const open = useMiniTx((s) => s.open);
  const showFund = useFundModal((s) => s.show);
  const network = useReadChainName();
  const balanceOf = (m: MarketRow) => user.data?.rows.find((r) => r.asset === m.asset)?.balance;
  const amount = (m: MarketRow) => FAUCET_BY_SYMBOL[m.token.symbol] ?? 0n;

  return (
    <>
      <PageTitle size={28} title="Faucet" subtitle={`Free test tokens for the ${BRAND} pool on ${mode === 'mock' ? 'the mock chain' : network}. They have no value.`} />
      <Notice title="Need test ETH for fees first?">
        Getting tokens is a transaction, and every transaction costs a small fee in test ETH.{' '}
        <Box component="span" sx={{ display: 'inline-flex', mt: { xs: 1, sm: 0 } }}>
          <ProButton size="sm" variant="secondary" prefixIcon={<MIFaucet />} onClick={showFund}>
            Fund your wallet
          </ProButton>
        </Box>
      </Notice>
      <MiniTable
        ariaLabel="Test tokens"
        rows={markets.data ?? []}
        loading={!markets.data}
        rowKey={(m) => m.asset}
        first={{ key: 'asset', label: 'Asset', render: (m) => <TokenCell asset={m.asset} /> }}
        columns={[
          {
            key: 'balance',
            label: 'Wallet balance',
            render: (m) => {
              const b = balanceOf(m);
              return (
                <Box component="span" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {account ? (b === undefined ? '…' : fmtToken(b, m.decimals)) : '–'} <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{m.token.symbol}</Box>
                </Box>
              );
            },
          },
          {
            key: 'per',
            label: 'Per click',
            render: (m) => (
              <Box component="span" sx={{ color: 'fg-2', whiteSpace: 'nowrap' }}>
                {fmtToken(amount(m), m.decimals)} {m.token.symbol}
              </Box>
            ),
            hideOnMobile: true,
          },
        ]}
        mobileAside={(m) => `${fmtToken(amount(m), m.decimals)} per click`}
        actions={(m) => (
          <ActionGate compact>
            <ProButton size="sm" variant="primary" onClick={() => open({ kind: 'faucet', asset: m.asset })}>
              Faucet
            </ProButton>
          </ActionGate>
        )}
        empty="No tokens listed."
      />
    </>
  );
}
