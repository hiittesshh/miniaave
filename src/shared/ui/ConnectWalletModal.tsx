'use client';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { BasicModal } from './BasicModal';
import { ChevronRightIcon, WalletIcon } from './Icons';
import { DEMO_ACCOUNTS, shortAddress, useWallet, type DemoAccountKind } from '@/shared/state/wallet';
import { surfaceShadow, tv } from '@/shared/theme/tokens';
import { transition } from '@/shared/theme/motion';

/**
 * Mock "Connect wallet" modal. Picking an option sets a fake demo address in local state.
 * No wallet extension is detected, no signature is requested, and nothing leaves the browser.
 */
export function ConnectWalletModal({ variant = 'standard' }: { variant?: 'standard' | 'pro' }) {
  const { connectOpen, closeConnect, connect } = useWallet();
  const pill = variant === 'pro';

  return (
    <BasicModal open={connectOpen} onClose={closeConnect} labelledBy="connect-wallet-title" maxWidth={pill ? 432 : 420}>
      <Typography id="connect-wallet-title" component="h2" sx={{ fontSize: '1rem', fontWeight: 500, lineHeight: '1.5rem', color: 'fg-1', mb: 2, pr: '2rem' }}>
        {pill ? 'Choose Wallet' : 'Connect a wallet'}
      </Typography>
      <Typography variant="description" color="fg-3" sx={{ mb: 5 }}>
        This is a demo, so no real wallet is used. Pick a demo account below. Nothing is signed, and nothing leaves your browser.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(Object.keys(DEMO_ACCOUNTS) as DemoAccountKind[]).map((kind) => {
          const acc = DEMO_ACCOUNTS[kind];
          return (
            <ButtonBase
              key={kind}
              onClick={() => connect(kind)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                width: '100%',
                textAlign: 'left',
                p: '0.875rem 1rem',
                borderRadius: pill ? '1rem' : '0.625rem',
                bgcolor: 'bg-3',
                boxShadow: surfaceShadow(),
                transition: transition(['background-color', 'transform', 'box-shadow']),
                '&:hover': { bgcolor: 'bg-4-hover' },
                '&:active': { transform: 'scale(0.99)' },
                '&.Mui-focusVisible': { outline: `2px solid ${tv('fg-1')}`, outlineOffset: '2px' },
                '&:hover .chev': { transform: 'translateX(2px)', color: 'fg-1' },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: pill ? '50%' : '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: kind === 'demo' ? `color-mix(in srgb, ${tv('purple-1')} 14%, transparent)` : 'bg-5',
                  color: kind === 'demo' ? 'purple-1' : 'fg-2',
                  flexShrink: 0,
                }}
              >
                <WalletIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subheader1" color="fg-1">
                  {acc.label}
                </Typography>
                <Typography variant="caption" color="fg-3" component="p">
                  {acc.description}
                </Typography>
                <Typography variant="caption" color="fg-4" component="p" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', mt: '2px' }}>
                  {shortAddress(acc.address)} · demo address
                </Typography>
              </Box>
              <ChevronRightIcon className="chev" sx={{ fontSize: 20, color: 'fg-3', transition: transition(['transform', 'color']) }} />
            </ButtonBase>
          );
        })}
      </Box>

      <Typography variant="caption" color="fg-4" component="p" sx={{ mt: 5, textAlign: 'center' }}>
        Demo · simulated data · not affiliated with Aave
      </Typography>
    </BasicModal>
  );
}
