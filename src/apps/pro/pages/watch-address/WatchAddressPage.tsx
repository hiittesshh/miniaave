'use client';

/**
 * Pro /watch-address (live, 2026-10-14, not connected):
 * - heading "Watch Address" + "Track wallets to monitor their positions and activity", a secondary
 *   "+ Add Address" pill on the right (wraps under the title at 390px); 32px below, the empty state:
 *   a 10px-radius box with a dotted outline (white 8%), 48px/32px padding, centred 14/500 title and
 *   14/18.9 fg-3 line, 8px apart
 * - "Add Address" opens a 528px dialog (mobile: bottom sheet): a 64px bg-4 tile with binoculars,
 *   "Watch Address" (18/500), a 14/19 fg-3 explainer, then "Wallet Address" (focused on open) and
 *   "Name  Optional" fields (40px, 10px radius; focused = bg-2 + 12% ring, else 8% ring) split by a
 *   rule 20px above and below, and Cancel / Watch Address buttons (40px; mobile: stacked, full width).
 *   Watch Address stays disabled (30%) until the address is a 0x… address.
 * - Live resolves ENS names ("Resolves to 0x…") over the network; the clone has no network, so it
 *   says so and keeps the button disabled (logged INTENTIONAL).
 * - Submitting while not connected closes the dialog and saves nothing (live, verified twice; its
 *   watch list storage stayed empty). The populated list is wallet-gated and was not observable, so
 *   the clone does not invent it (logged BLOCKED).
 */
import Box from '@mui/material/Box';
import * as React from 'react';
import { DARK, tv } from '@/shared/theme/tokens';
import { ProButton } from '../../ui';
import { BIPlus, BIWatch } from '../token/icons';
import { SettingsHeading, SettingsPage } from '../preferences/SettingsLayout';
import { DialogFrame } from './DialogFrame';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ENS = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i;

// Our own dotted outline: a 3px stroke centred on the box edge (half clipped = 1.5px visible), 4px
// dashes 4px apart, following the 10px radius.
const DOTTED = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'><rect width='100%' height='100%' rx='10' fill='none' stroke='black' stroke-width='3' stroke-dasharray='4 4'/></svg>")}")`;

function EmptyState() {
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: '10px',
        p: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        textAlign: 'center',
        '&::before': { content: '""', position: 'absolute', inset: 0, bgcolor: 'fg-1', opacity: 0.08, maskImage: DOTTED, WebkitMaskImage: DOTTED, pointerEvents: 'none' },
      }}
    >
      <Box component="h3" sx={{ m: 0, fontSize: 14, fontWeight: 500, lineHeight: '18px', color: 'fg-1' }}>
        No watched addresses
      </Box>
      <Box component="p" sx={{ m: 0, fontSize: 14, lineHeight: '18.9px', color: 'fg-3' }}>
        Add an address to start tracking its positions and activity.
      </Box>
    </Box>
  );
}

function Field({ id, label, optional, value, onChange, placeholder, strong, autoFocus, helper }: { id: string; label: string; optional?: boolean; value: string; onChange: (v: string) => void; placeholder: string; strong?: boolean; autoFocus?: boolean; helper?: string }) {
  return (
    <Box>
      <Box sx={{ height: 34, display: 'flex', alignItems: 'flex-start' }}>
        <Box component="label" htmlFor={id} sx={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 14, fontWeight: 500, lineHeight: '18px', color: 'fg-1' }}>
          {label}
          {optional && (
            <Box component="span" sx={{ fontWeight: 400, color: 'fg-4' }}>
              Optional
            </Box>
          )}
        </Box>
      </Box>
      <Box
        sx={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          borderRadius: '10px',
          bgcolor: 'transparent',
          boxShadow: `0 0 0 1px ${tv('border-1')}`,
          transition: 'background 0.1s, box-shadow 0.1s',
          '&:focus-within': { bgcolor: 'bg-2', boxShadow: `0 0 0 1px ${tv('border-2')}` },
        }}
      >
        <Box
          component="input"
          id={id}
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{
            width: '100%',
            height: '100%',
            p: strong ? '0 12px' : '0 16px',
            border: 0,
            outline: 'none',
            background: 'none',
            color: 'fg-1',
            fontFamily: 'inherit',
            // Live: 16px below 600px (avoids the iOS focus zoom), 14px above.
            fontSize: { xs: 16, sm: 14 },
            lineHeight: { xs: '16px', sm: '14px' },
            fontWeight: strong ? 500 : 400,
            '&::placeholder': { color: 'fg-4', fontWeight: 400, opacity: 1 },
          }}
        />
      </Box>
      {/* Helper line under the field; opens with the live height ease (0.4s). */}
      <Box sx={{ display: 'grid', gridTemplateRows: helper ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s cubic-bezier(0.19, 1, 0.22, 1)' }}>
        <Box sx={{ overflow: 'hidden' }}>
          <Box component="p" aria-live="polite" sx={{ m: 0, pt: '8px', fontSize: 14, lineHeight: '19px', color: 'fg-3' }}>
            {helper}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function WatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [address, setAddress] = React.useState('');
  const [name, setName] = React.useState('');
  const value = address.trim();
  const valid = ADDRESS.test(value);
  const helper = !valid && ENS.test(value) ? 'ENS names can’t be resolved in this demo. Paste a 0x address instead.' : undefined;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Live (not connected): the dialog closes and nothing is stored.
    if (valid) onClose();
  };
  const btnSx = { height: 40, px: '18px', flexShrink: 0, width: { xs: '100%', sm: 'auto' } } as const;
  return (
    <DialogFrame open={open} onClose={onClose} labelledBy="watch-dialog-title" width={528}>
      <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', p: { xs: '28px 24px', sm: '24px 28px 28px' } }}>
          <Box aria-hidden sx={{ width: 64, height: 64, borderRadius: '19.2px', bgcolor: 'bg-4', color: 'fg-2', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 0 0 1px ${tv('border-0')}` }}>
            <BIWatch size={34} strokeWidth={1.5} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Box component="h3" id="watch-dialog-title" sx={{ m: 0, fontSize: 18, fontWeight: 500, lineHeight: '21.6px' }}>
              Watch Address
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: 14, lineHeight: '19px', color: 'fg-3', maxWidth: 410 }}>
              Watch any Ethereum address to track positions, transactions, and protocol activity in read-only mode. You won’t be able to perform transactions.
            </Box>
          </Box>
          <Box sx={{ pt: '4px' }}>
            <Field id="watch-address" label="Wallet Address" value={address} onChange={setAddress} placeholder="Search Ethereum address or ENS name" strong autoFocus helper={helper} />
            <Box sx={{ height: '1px', bgcolor: 'border-0', my: '20px' }} />
            <Field id="watch-name" label="Name" optional value={name} onChange={setName} placeholder="Wallet Name" />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row-reverse' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'flex-start', gap: { xs: '16px', sm: '12px' }, p: '4px 24px 24px' }}>
          <ProButton type="submit" variant="primary" disabled={!valid} sx={btnSx}>
            Watch Address
          </ProButton>
          <ProButton type="button" variant="tertiary" onClick={onClose} sx={{ ...btnSx, boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` }}>
            Cancel
          </ProButton>
        </Box>
      </Box>
    </DialogFrame>
  );
}

export function WatchAddressPage() {
  const [open, setOpen] = React.useState(false);
  // A new key per opening remounts the dialog, so its fields start empty every time (live).
  const [session, setSession] = React.useState(0);
  return (
    <SettingsPage>
      <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <SettingsHeading
          title="Watch Address"
          subtitle="Track wallets to monitor their positions and activity"
          action={
            <ProButton variant="secondary" prefixIcon={<BIPlus size={20} />} onClick={() => {
                setSession((n) => n + 1);
                setOpen(true);
              }} sx={{ pl: '12px', pr: '14px', [DARK]: { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } }}>
              Add Address
            </ProButton>
          }
        />
        <EmptyState />
      </Box>
      <WatchDialog key={session} open={open} onClose={() => setOpen(false)} />
    </SettingsPage>
  );
}
