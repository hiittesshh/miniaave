'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import * as React from 'react';
import { FormattedNumber } from '@/shared/ui/FormattedNumber';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { useSettings } from '@/shared/state/settings';
import { useStdContext, useStdModal } from '../state';
import { ContentContainer, PageHeader } from '../components/PageHeader';
import { MarketSwitcher } from '../components/MarketSwitcher';
import { ConnectWalletPaper, EmptyStatePaper } from '../components/Bits';
import { ListColumn, ListHeaderTitle, ListHeaderWrapper, ListItem, ListLoaderRows, ListWrapper } from '../components/Lists';
import { ROUTES } from '../layout/nav';
import { assetDisplay } from '../display';

export function FaucetPage() {
  const { account, market, user, hydrated, testnetMode, markets } = useStdContext();
  const open = useStdModal((s) => s.open);
  const set = useSettings((s) => s.set);
  const snap = market.data;
  const rows = (snap?.reserves ?? []).filter((r) => !r.isFrozen && (r.faucetAmount ?? 0) > 0);

  return (
    <>
      <PageHeader
        title={<MarketSwitcher hideDescription />}
        description="With the testnet Faucet you can get free test assets to try the protocol flows. Select an asset and click 'Faucet' to get tokens added to your demo wallet. Test assets have no monetary value, and in this demo nothing is minted on any network."
      />
      <ContentContainer>
        {!testnetMode ? (
          <EmptyStatePaper
            title="The Faucet is only available in Test Mode"
            description="Turn on Test Mode to switch to the Base Sepolia test market, where you can mint free (simulated) test assets."
            action={
              <Button
                variant="contained"
                onClick={() => {
                  const t = markets.find((m) => m.isTestnet);
                  set({ testnetMode: true, marketId: t?.id ?? 'base_sepolia' });
                }}
              >
                Enable Test Mode
              </Button>
            }
          />
        ) : !hydrated ? null : !account ? (
          <ConnectWalletPaper description="Please connect your wallet to get free testnet assets." />
        ) : (
          <ListWrapper title="Test Assets">
            <ListHeaderWrapper>
              <ListColumn isRow align="left" maxWidth={280}>
                <ListHeaderTitle>Asset</ListHeaderTitle>
              </ListColumn>
              <ListColumn sx={{ display: { xs: 'none', xsm: 'flex' } }}>
                <ListHeaderTitle>Wallet balance</ListHeaderTitle>
              </ListColumn>
              <ListColumn maxWidth={280} align="right" sx={{ flex: { xs: '0 0 auto', xsm: 1 } }}>{null}</ListColumn>
            </ListHeaderWrapper>
            {!snap || !user.data ? (
              <ListLoaderRows columns={2} rows={5} withButtons={1} />
            ) : (
              rows.map((r, i) => {
                const d = assetDisplay({ ...r, symbol: r.symbol }, { wrappedNativeSymbol: '', nativeSymbol: '' });
                return (
                  <ListItem key={r.id} last={i === rows.length - 1}>
                    <ListColumn isRow align="left" maxWidth={280}>
                      <Box component={Link} href={ROUTES.reserve(r.symbol, snap.market.id)} sx={{ display: 'flex', alignItems: 'center' }}>
                        <TokenIcon symbol={d.symbol} size={32} />
                        <Box sx={{ pl: 3.5 }}>
                          <Typography variant="h4">{d.name}</Typography>
                          <Typography variant="subheader2" color="fg-3">
                            {d.symbol}
                          </Typography>
                        </Box>
                      </Box>
                    </ListColumn>
                    <ListColumn sx={{ display: { xs: 'none', xsm: 'flex' } }}>
                      <FormattedNumber value={user.data!.wallet[r.symbol] ?? 0} compact variant="h4" animate />
                    </ListColumn>
                    <ListColumn maxWidth={280} align="right" sx={{ flex: { xs: '0 0 auto', xsm: 1 } }}>
                      <Button variant="contained" onClick={() => open({ type: 'faucet', symbol: r.symbol, marketId: snap.market.id })}>
                        Faucet
                      </Button>
                    </ListColumn>
                  </ListItem>
                );
              })
            )}
          </ListWrapper>
        )}
        {testnetMode && (
          <Typography variant="caption" color="fg-4" sx={{ mt: 4, textAlign: 'center' }}>
            Faucet mints are simulated balance updates in your browser.
          </Typography>
        )}
      </ContentContainer>
    </>
  );
}
