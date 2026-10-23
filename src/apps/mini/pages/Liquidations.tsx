'use client';

/**
 * Liquidations (§11) in Pro's table style. There is no borrower list on-chain, so: all Borrow events
 * → unique users → getUserAccountData(user) each → health factor below 1 = can be liquidated.
 * At-risk summary (NumberFlow), an "At risk / All borrowers" toggle, Pro's ScrollTable sorted by
 * health factor (lowest first) with a health-coloured HF badge per borrower; Liquidate on row hover
 * (desktop) or on the card (mobile). The modal repays up to 50% of the debt (§5).
 */
import Box from '@mui/material/Box';
import NumberFlow from '@number-flow/react';
import * as React from 'react';
import { SectionHeading } from '@/apps/pro/components/Entity';
import { ScrollTable, type ScrollColumn } from '@/apps/pro/components/ScrollTable';
import { PISecurity } from '@/apps/pro/icons';
import { rowIconSx } from '@/apps/pro/pages/Explore';
import { InfoLabel, reserveCard } from '@/apps/pro/pages/ReservePage';
import { SegmentedToggle } from '@/apps/pro/pages/preferences/controls';
import { PageTitle, ProButton, ProEmpty, USD } from '@/apps/pro/ui';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { tv } from '@/shared/theme/tokens';
import { AddressAvatar } from '@/apps/standard/layout/WalletButton';
import { TOKENS, roleOf } from '../data/config';
import { useAtRisk, type AtRiskRow } from '../data/hooks';
import { useWallet } from '../data/useWallet';
import { fmtHealth, fmtToken, shortAddr } from '../lib/format';
import { MAX_UINT256 } from '../lib/units';
import { useMiniTx } from '../tx/store';
import { HEALTH_TOKEN } from '../ui/health';
import { ActionGate, Notice } from '../ui/parts';

const WAD = 10n ** 18n;
const usd = (v: bigint) => Number(v) / 1e8;
const hfNum = (hf: bigint) => (hf === MAX_UINT256 ? Infinity : Number(hf) / 1e18);
const band = (hf: number) => (hf >= 1.5 ? 'safe' : hf >= 1.1 ? 'warn' : 'danger');

/** Health-coloured pill: dot + value; "Can be liquidated" under 1 (§7 colours). */
export function HfBadge({ hf, label = false }: { hf: bigint; label?: boolean }) {
  const v = hfNum(hf);
  const color = tv(HEALTH_TOKEN[band(v)]);
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: 24, px: '9px', borderRadius: '999px', bgcolor: `color-mix(in srgb, ${color} 14%, transparent)`, color, fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', transition: 'color 300ms ease, background-color 300ms ease' }}>
        <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />
        {fmtHealth(hf)}
      </Box>
      {label && v < 1 && (
        <Box component="span" sx={{ fontSize: 12, fontWeight: 500, color: 'health-1' }}>
          Can be liquidated
        </Box>
      )}
    </Box>
  );
}

function UserCell({ r, me }: { r: AtRiskRow; me: string | null }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
      <AddressAvatar address={r.user} size={36} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, lineHeight: '16px' }}>
        <Box component="span" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{shortAddr(r.user)}</Box>
        <Box component="span" sx={{ color: 'fg-3', whiteSpace: 'nowrap' }}>
          {roleOf(r.user) ?? 'Borrower'}
          {me && me.toLowerCase() === r.user.toLowerCase() && <Box component="span" sx={{ color: 'purple-1' }}> · You</Box>}
        </Box>
      </Box>
    </Box>
  );
}

function Holdings({ r, kind }: { r: AtRiskRow; kind: 'supplied' | 'borrowed' }) {
  const list = r.positions.filter((p) => p[kind] > 0n);
  if (!list.length) return <Box component="span" sx={{ color: 'fg-4' }}>–</Box>;
  return (
    <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px 10px' }}>
      {list.map((p) => (
        <Box key={p.asset} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
          <TokenIcon symbol={TOKENS[p.asset]?.symbol ?? '?'} size={16} />
          {fmtToken(p[kind], TOKENS[p.asset]?.decimals ?? 18)} {TOKENS[p.asset]?.symbol}
        </Box>
      ))}
    </Box>
  );
}

function Summary({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <InfoLabel label={label} tooltip={tooltip} />
      <Box sx={{ mt: '10px', fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: '28.8px', whiteSpace: 'nowrap' }}>{children}</Box>
    </Box>
  );
}

export function LiquidationsPage() {
  const atRisk = useAtRisk();
  const open = useMiniTx((s) => s.open);
  const { account } = useWallet();
  const [view, setView] = React.useState<'risk' | 'all'>('risk');
  const all = atRisk.data?.all ?? [];
  const unsafe = atRisk.data?.unsafe ?? [];
  const rows = view === 'risk' ? unsafe : all;
  const debtAtRisk = unsafe.reduce((s, r) => s + usd(r.account.totalDebtUsd), 0);
  const collAtRisk = unsafe.reduce((s, r) => s + usd(r.account.totalCollateralUsd), 0);
  const nearRisk = all.filter((r) => r.account.healthFactor >= WAD && r.account.healthFactor < 11n * 10n ** 17n).length;

  const liquidate = (r: AtRiskRow) => open({ kind: 'liquidate', user: r.user });
  const first: ScrollColumn<AtRiskRow> = { key: 'user', label: 'Borrower', render: (r) => <UserCell r={r} me={account} />, sortValue: (r) => r.user };
  const columns: ScrollColumn<AtRiskRow>[] = [
    { key: 'hf', label: 'Health Factor', render: (r) => <HfBadge hf={r.account.healthFactor} label />, mobile: (r) => <HfBadge hf={r.account.healthFactor} />, sortValue: (r) => Math.min(hfNum(r.account.healthFactor), 1e9) },
    {
      key: 'coll',
      label: 'Collateral',
      render: (r) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '16px' }}>
          <Box component="span" sx={{ fontWeight: 500 }}>${usd(r.account.totalCollateralUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Box>
          <Box component="span" sx={{ color: 'fg-3', fontSize: 13 }}><Holdings r={r} kind="supplied" /></Box>
        </Box>
      ),
      mobile: (r) => <Holdings r={r} kind="supplied" />,
      sortValue: (r) => usd(r.account.totalCollateralUsd),
    },
    {
      key: 'debt',
      label: 'Debt',
      render: (r) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '16px' }}>
          <Box component="span" sx={{ fontWeight: 500 }}>${usd(r.account.totalDebtUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Box>
          <Box component="span" sx={{ color: 'fg-3', fontSize: 13 }}><Holdings r={r} kind="borrowed" /></Box>
        </Box>
      ),
      mobile: (r) => <Holdings r={r} kind="borrowed" />,
      sortValue: (r) => usd(r.account.totalDebtUsd),
    },
    { key: 'max', label: 'Max Repay (50%)', render: (r) => <Box component="span" sx={{ fontWeight: 500 }}>${(usd(r.account.totalDebtUsd) / 2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Box>, sortValue: (r) => usd(r.account.totalDebtUsd), hideOnMobile: true },
  ];

  return (
    <>
      <PageTitle size={28} title="Liquidations" subtitle="Loans with a health factor below 1 can be liquidated: repay up to 50% of the debt and receive the borrower's collateral at a 5% discount." />

      <Box sx={{ ...reserveCard, p: { xs: '20px 16px', md: '24px' }, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: '24px 16px', md: '24px' }, animation: 'clone-fade-up 300ms ease both' }}>
        <Summary label="Positions at risk" tooltip="Borrowers with a health factor below 1.00">
          <Box component="span" sx={{ color: unsafe.length ? 'health-1' : 'fg-1', transition: 'color 300ms ease' }}>
            <NumberFlow value={unsafe.length} />
          </Box>
        </Summary>
        <Summary label="Debt at risk" tooltip="Total debt of the positions that can be liquidated">
          <USD value={debtAtRisk} compact={false} />
        </Summary>
        <Summary label="Collateral at risk" tooltip="Total collateral of the positions that can be liquidated">
          <USD value={collAtRisk} compact={false} />
        </Summary>
        <Summary label="Close to the line" tooltip="Borrowers with a health factor between 1.00 and 1.10">
          <NumberFlow value={nearRisk} />
          <Box component="span" sx={{ ml: '8px', fontSize: 14, color: 'fg-3', fontWeight: 400 }}>of {all.length} borrowers</Box>
        </Summary>
      </Box>

      <Box>
        <SectionHeading
          title={view === 'risk' ? 'Can be liquidated' : 'All borrowers'}
          description={view === 'risk' ? 'Sorted by health factor, lowest first. Hover a row to liquidate.' : 'Every address with a Borrow event, with its live health factor.'}
          right={
            <Box sx={{ alignSelf: 'center' }}>
              <SegmentedToggle
                label="Show"
                track="surface"
                value={view}
                options={[
                  { value: 'risk', label: `At risk (${unsafe.length})` },
                  { value: 'all', label: `All (${all.length})` },
                ]}
                onChange={setView}
              />
            </Box>
          }
        />
        {atRisk.data && rows.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ProEmpty title="No unsafe positions" description="Every borrower has a health factor of 1 or more." action={<ProButton variant="secondary" onClick={() => setView('all')}>Show all borrowers</ProButton>} />
            <Notice title="How to create one for the demo">All Borrow events → unique borrowers → getUserAccountData for each. As the Owner, open Admin and set the WETH price to $1,700: the Borrower drops to a health factor of about 0.96.</Notice>
          </Box>
        ) : (
          <ScrollTable
            key={view}
            rows={rows}
            first={first}
            columns={columns}
            rowKey={(r) => r.user}
            loading={!atRisk.data}
            defaultSort={{ key: 'hf', desc: false }}
            firstWidth={260}
            mobileAside={(r) => <HfBadge hf={r.account.healthFactor} />}
            rowActions={(r) =>
              r.account.healthFactor < WAD ? (
                <ActionGate compact>
                  <Box component="button" type="button" aria-label={`Liquidate ${shortAddr(r.user)}`} onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); liquidate(r); }} sx={{ ...rowIconSx, color: 'health-1' }}>
                    <PISecurity />
                  </Box>
                </ActionGate>
              ) : null
            }
            mobileActions={(r) =>
              r.account.healthFactor < WAD ? (
                <ActionGate>
                  <ProButton variant="primary" sx={{ flex: 1 }} onClick={() => liquidate(r)}>
                    Liquidate
                  </ProButton>
                </ActionGate>
              ) : null
            }
          />
        )}
      </Box>
    </>
  );
}
