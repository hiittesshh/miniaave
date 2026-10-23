'use client';

/**
 * Pro token page (/explore/token/{symbol}), rebuilt from the live page (captured 2026-10-14;
 * reference/pro-capture/real-a3/token-usdc-*, token-eth-*; measurements in docs/PROGRESS_A3.md).
 *
 * Layout (1440 desktop): sticky header (Back, 56px logo, "USD Coin USDC" 28/500, "Asset on <chain
 * picker>", Deposit/Borrow pills) that compacts linearly over the first 72px of scroll → stats
 * strip (Total Deposits | Total Borrows | Price) → rule → Deposit section (APY range + summary in a
 * 308px column, rate chart in the 768px column) → Deposit Markets table → rule → Borrow section
 * ("Base APY" chart) → Borrow Markets table. Sections are 48px apart.
 * All figures come from the shared Pro snapshot; chart history is simulated (proB_history).
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import NumberFlow from '@number-flow/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { rateHistory } from '@/data/mock/seed/proB_history';
import type { ChainInfo, ProHubAsset } from '@/data/types';
import { formatLowerCompact, formatPercent } from '@/shared/format';
import { DARK, tv, onAccent } from '@/shared/theme/tokens';
import { TokenIcon } from '@/shared/ui/TokenIcon';
import { ProButton, USD } from '../../ui';
import { proRoutes, useProContext, useProModal } from '../../state';
import { PIBack, PIBorrow, PIDeposit, PIInfo } from '../../icons';
import { useRequireWallet } from '../Dashboard';
import { CapacityRing } from '../Explore';
import { BICheck, BIChevronDown, RewardBadge } from './icons';
import { ChainLogo, MarketsTable, type MarketColumn } from './MarketsTable';
import { MultiLineChart, paletteColor, type ChartSeries } from './MultiLineChart';
import { CardBody, CardTitle, Dropdown, HoverCard, InfoHint, type MenuEntry } from './popovers';
import { filterSide, spikinessOf, tokenModel, type TokenRow, type TokenSide } from './model';
import { WethNotice } from './WethNotice';
import { NotFoundView } from '../notfound/NotFoundView';

// ---------------------------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------------------------

/** 2×2 cluster of chain logos (live "All Chains" glyph). */
export function ChainCluster({ chains, size = 16 }: { chains: ChainInfo[]; size?: number }) {
  const cell = (size - 1) / 2;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `${cell}px ${cell}px`, gap: '1px', width: size, height: size, flexShrink: 0 }} aria-hidden>
      {chains.slice(0, 4).map((c) => (
        <Box key={c.id} component="img" src={`/chain-icons/${c.slug}.svg`} alt="" sx={{ width: cell, height: cell, borderRadius: '50%', display: 'block' }} />
      ))}
    </Box>
  );
}

const fmtAmt = (n: number) => formatLowerCompact(n);
const fmtUsd = (n: number) => formatLowerCompact(n, { usd: true });
const pct = (v: number) => formatPercent(v);

/** Live: "0.69% - 6.12%", or one value when every market pays the same. */
const apyRange = (s: TokenSide) => (Math.abs(s.apyMax - s.apyMin) < 5e-5 ? pct(s.apyMax) : `${pct(s.apyMin)} - ${pct(s.apyMax)}`);

function TwoLine({ top, bottom }: { top: React.ReactNode; bottom: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      <Box sx={{ fontWeight: 500, whiteSpace: 'nowrap', lineHeight: '16.8px' }}>{top}</Box>
      <Box sx={{ color: 'fg-3', whiteSpace: 'nowrap', lineHeight: '14px' }}>{bottom}</Box>
    </Box>
  );
}

const Muted = ({ children }: { children: React.ReactNode }) => (
  <Box component="h4" sx={{ m: 0, fontSize: 14, fontWeight: 400, lineHeight: '16.8px', color: 'fg-4', whiteSpace: 'nowrap' }}>
    {children}
  </Box>
);

/** Live asset group: 24px logos overlapping by 5px (19px step) with a 2px cut-out ring, then "+N". */
function AssetStack({ symbols, size = 24, max = 4 }: { symbols: string[]; size?: number; max?: number }) {
  const shown = symbols.slice(0, max);
  const step = size === 24 ? 19 : 16;
  const r = size / 2 + 2;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {shown.map((s, i) => (
          <Box
            key={s}
            sx={{
              ml: i ? `${step - size}px` : 0,
              borderRadius: '50%',
              bgcolor: 'bg-2',
              display: 'flex',
              zIndex: shown.length - i,
              // Each logo is cut where the previous (left, on top) one overlaps it.
              maskImage: i ? `radial-gradient(circle at ${size / 2 - step}px 50%, transparent ${r}px, #000 ${r}px)` : undefined,
            }}
          >
            <TokenIcon symbol={s} size={size} />
          </Box>
        ))}
      </Box>
      {symbols.length > shown.length && (
        <Box component="span" sx={{ color: 'fg-3', fontSize: 14 }}>
          +{symbols.length - shown.length}
        </Box>
      )}
    </Box>
  );
}

function RingLarge({ value }: { value: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(value, 0), 1);
  return (
    <Box component="svg" viewBox="0 0 48 48" sx={{ width: 48, height: 48, transform: 'rotate(-90deg)', flexShrink: 0 }} aria-hidden>
      <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" style={{ stroke: tv('border-2') }} />
      <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(p, 0.001))} style={{ stroke: p > 0.98 ? tv('red-1') : tv('purple-1') }} />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Hover cards
// ---------------------------------------------------------------------------------------------

function CapacityCard({ row }: { row: TokenRow }) {
  const sym = row.r.symbol;
  return (
    <>
      <CardTitle>Capacity Filled</CardTitle>
      <CardBody>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', p: '8px 4px' }}>
          <RingLarge value={row.capacityFilled} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Box sx={{ fontWeight: 500, lineHeight: '18px', whiteSpace: 'nowrap' }}>
              {fmtUsd(row.amountUSD)}{' '}
              <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>
                of
              </Box>{' '}
              {fmtUsd(row.cap * row.r.priceUSD)}
            </Box>
            <Box sx={{ color: 'fg-3', lineHeight: '14px', whiteSpace: 'nowrap' }}>
              {fmtAmt(row.amount)} of {fmtAmt(row.cap)} {sym}
            </Box>
          </Box>
        </Box>
      </CardBody>
    </>
  );
}

function HubAssetsCard({ row }: { row: TokenRow }) {
  const [mode, setMode] = React.useState<'assets' | 'cf'>('assets');
  const total = row.hubAssets.reduce((s, a) => s + a.totalSuppliedUSD, 0) || 1;
  const { protocol } = useProContext();
  const cfOf = (a: ProHubAsset) => protocol.data?.reserves.find((x) => x.spokeId === row.r.spokeId && x.hubId === a.hubId && x.symbol === a.symbol && x.collateral)?.collateralFactor;
  return (
    <>
      <Box sx={{ p: '10px 5.2px 10px 8px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', height: 18 }}>
          <Box sx={{ fontSize: 14, fontWeight: 500 }}>Hub Assets</Box>
          <Box role="group" sx={{ position: 'relative', display: 'flex', p: '3px', borderRadius: '8px', bgcolor: 'bg-4' }}>
            {(['assets', 'cf'] as const).map((m) => (
              <Box
                key={m}
                component="button"
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                sx={{ height: 22, px: '8px', border: 0, borderRadius: '6px', bgcolor: mode === m ? 'bg-3' : 'transparent', color: 'fg-1', opacity: mode === m ? 1 : 0.3, fontFamily: 'inherit', fontSize: 12, fontWeight: mode === m ? 500 : 400, lineHeight: '12px', cursor: 'pointer', transition: 'opacity 150ms, background-color 150ms' }}
              >
                {m === 'assets' ? 'Assets' : 'CF'}
              </Box>
            ))}
          </Box>
        </Box>
        <Typography sx={{ fontSize: 12, lineHeight: '16.2px', color: 'fg-3', p: '8px 0 2px' }}>
          {mode === 'assets' ? `Asset exposure is based on all the collateral assets deposited in the ${row.r.hubName} Hub` : `Collateral factor of each hub asset in the ${row.r.spokeName} market (illustrative)`}
        </Typography>
      </Box>
      <CardBody>
        {row.hubAssets.map((a) => {
          const cf = cfOf(a);
          return (
            <Box key={a.id} component={Link} href={proRoutes.token(a.symbol)} sx={{ display: 'flex', alignItems: 'center', gap: '8px', p: '8px 4px', color: 'fg-1', textDecoration: 'none', borderRadius: '6px', '&:hover': { bgcolor: 'bg-5' } }}>
              <TokenIcon symbol={a.symbol} size={20} />
              <Box component="span" sx={{ fontSize: 14, lineHeight: '14px' }}>{a.symbol}</Box>
              <Box component="span" sx={{ fontSize: 14, color: 'fg-3', flex: 1 }}>{mode === 'assets' ? formatPercent(a.totalSuppliedUSD / total) : ''}</Box>
              <Box component="span" sx={{ fontSize: 14, fontWeight: 500 }}>{mode === 'assets' ? fmtUsd(a.totalSuppliedUSD) : cf ? `${Math.round(cf * 100)}%` : '–'}</Box>
            </Box>
          );
        })}
      </CardBody>
    </>
  );
}

function RewardsCard({ row }: { row: TokenRow }) {
  const base = row.r.supplyAPY + row.r.underlyingYieldAPY;
  return (
    <>
      <CardTitle right={<Box component="span" sx={{ color: 'purple-2' }}>{pct(row.apy)}</Box>}>Your APY</CardTitle>
      <CardBody>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '8px 4px' }}>
          <span>Base APY</span>
          <Box component="span" sx={{ fontWeight: 500 }}>{pct(base)}</Box>
        </Box>
      </CardBody>
      <Box sx={{ p: '0 4px', mt: '5px' }}>
        <Box sx={{ p: '8px 4px', color: 'purple-1' }}>
          <Box component="span" sx={{ color: 'purple-2', fontWeight: 500 }}>1</Box> Available Reward
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', p: '8px 4px' }}>
          <Box component="span" sx={{ fontWeight: 500 }}>Incentives</Box>
          <Box component="span" sx={{ color: 'purple-2', fontWeight: 500 }}>{pct(row.r.incentiveAPY)}</Box>
        </Box>
      </Box>
      <Box sx={{ p: '12px 6px 6px', fontSize: 12, lineHeight: '16.2px', color: 'fg-4' }}>Demo: the reward rate is illustrative. Nothing here is a real incentive program.</Box>
    </>
  );
}

function RatesCard({ side, title }: { side: TokenSide; title: string }) {
  const rows = [...side.rows].sort((a, b) => b.apy - a.apy);
  return (
    <>
      <CardTitle>{title}</CardTitle>
      <CardBody>
        {rows.map((x) => (
          <Box key={x.r.id} component={Link} href={proRoutes.reserve(x.r.id)} sx={{ display: 'flex', alignItems: 'center', gap: '10px', p: '8px 4px', color: 'fg-1', textDecoration: 'none', borderRadius: '6px', '&:hover': { bgcolor: 'bg-5' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, fontSize: 14, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <Box sx={{ mr: '6px', display: 'flex' }}>
                <ChainLogo chain={x.chain} />
              </Box>
              <Box component="span" sx={{ fontWeight: 500 }}>{x.r.spokeName}</Box>
              <Box component="span" sx={{ color: 'fg-3', mx: '6px' }}>·</Box>
              <Box component="span" sx={{ color: 'fg-3', overflow: 'hidden', textOverflow: 'ellipsis', maskImage: 'linear-gradient(90deg, #000 80%, transparent)' }}>{x.r.hubName}</Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 14, fontWeight: 500 }}>
              {x.hasRewards && <RewardBadge />}
              {pct(x.apy)}
            </Box>
          </Box>
        ))}
      </CardBody>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Header (sticky, compacts over the first 72px of scroll)
// ---------------------------------------------------------------------------------------------

function useScrollProgress(ref: React.RefObject<HTMLElement | null>, distance = 72) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      el.style.setProperty('--t', String(Math.min(1, Math.max(0, window.scrollY / distance))));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, distance]);
}

function TokenHeader({ symbol, name, chains, chainId, onChain, actions }: { symbol: string; name: string; chains: ChainInfo[]; chainId: number | null; onChain: (id: number | null) => void; actions: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  useScrollProgress(ref);
  const router = useRouter();
  const S = 'calc(1 - 0.2358 * var(--t, 0))'; // live: logo and title scale 1 → 0.7642
  const current = chains.find((c) => c.id === chainId);
  const entries: MenuEntry[] = [
    { label: 'All Chains', icon: <ChainCluster chains={chains} size={20} />, selected: chainId === null, onClick: () => onChain(null) },
    ...chains.map((c) => ({ label: c.name, icon: <ChainLogo chain={c} />, selected: c.id === chainId, onClick: () => onChain(c.id) })),
  ];
  return (
    <Box
      ref={ref}
      sx={{
        position: 'sticky',
        top: { xs: 0, md: '-72px' },
        // Above the shell topbar's scrim (as live), but transparent and click-through over the topbar itself.
        zIndex: 1101,
        pointerEvents: 'none',
        '& > *': { pointerEvents: 'auto' },
        isolation: 'isolate',
        mt: { xs: '-80px', md: '-152px' },
        mx: { xs: '-16px', md: '-16px' },
        pt: { xs: '80px', md: '152px' },
        px: '16px',
        pb: 'calc(8px + 10.9229px * var(--t, 0))',
        '&::after': { content: '""', position: 'absolute', left: 0, right: 0, bottom: 0, top: { xs: 60, md: 144 }, bgcolor: 'bg-1', zIndex: -1 },
        '&::before': { content: '""', position: 'absolute', left: 0, right: 0, top: '100%', height: 32, pointerEvents: 'none', background: `linear-gradient(${tv('bg-1')} 0%, color-mix(in srgb, ${tv('bg-1')} 73.8%, transparent) 19%, color-mix(in srgb, ${tv('bg-1')} 54.1%, transparent) 34%, color-mix(in srgb, ${tv('bg-1')} 38.2%, transparent) 47%, color-mix(in srgb, ${tv('bg-1')} 27.8%, transparent) 56.5%, color-mix(in srgb, ${tv('bg-1')} 19.4%, transparent) 65%, color-mix(in srgb, ${tv('bg-1')} 12.6%, transparent) 73%, color-mix(in srgb, ${tv('bg-1')} 7.5%, transparent) 80.2%, color-mix(in srgb, ${tv('bg-1')} 4.2%, transparent) 86.1%, color-mix(in srgb, ${tv('bg-1')} 2.1%, transparent) 91%, color-mix(in srgb, ${tv('bg-1')} 0.8%, transparent) 95.2%, transparent 100%)` },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Box component="button" type="button" onClick={() => router.back()} sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: 16, p: 0, border: 0, background: 'none', color: 'fg-3', fontFamily: 'inherit', fontSize: 14, lineHeight: '14px', cursor: 'pointer', transition: `color 200ms cubic-bezier(0.4, 0, 0.2, 1)`, '&:hover': { color: 'fg-1' }, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2, borderRadius: '4px' } }}>
            <PIBack size={16} />
            Back
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '16px', pb: '2px', minWidth: 0, overflow: 'hidden', maskImage: 'linear-gradient(90deg, #000 calc(100% - 24px), transparent)' }}>
            <Box sx={{ width: 56, height: `calc(56px * ${S})`, flexShrink: 0, transform: 'translateY(2px)' }}>
              <Box sx={{ transform: `scale(${S})`, transformOrigin: 'top left', width: 56, height: 56 }}>
                <TokenIcon symbol={symbol} size={56} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0, transform: 'translateX(calc(-19.2048px * var(--t, 0)))' }}>
              <Box sx={{ height: `calc(33.6px * ${S})` }}>
                <Box sx={{ display: 'flex', gap: '6px', transform: `scale(${S})`, transformOrigin: 'top left', whiteSpace: 'nowrap' }}>
                  <Typography component="h1" sx={{ fontSize: 28, fontWeight: 500, lineHeight: '33.6px', letterSpacing: 'normal', color: 'fg-1' }}>
                    {name}
                  </Typography>
                  <Box component="span" sx={{ fontSize: 28, fontWeight: 500, lineHeight: '33.6px', color: 'fg-3' }}>
                    {symbol}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', height: 16, transform: 'translateY(calc(-3px * var(--t, 0)))', mb: 'calc(-3px * var(--t, 0))' }}>
                <Box component="span" sx={{ fontSize: 14, lineHeight: '14px', color: 'fg-3' }}>Asset on</Box>
                <Dropdown
                  placement="bottom-start"
                  width={220}
                  separators="afterFirst"
                  entries={entries.map((e) => ({ ...e, sub: e.selected ? <SelectedCheck /> : undefined }))}
                  trigger={(p) => (
                    <Box component="button" type="button" aria-label="Select chain" {...p} sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', p: 0, border: 0, background: 'none', color: 'fg-1', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, lineHeight: '14px', cursor: 'pointer', '& .chev': { color: 'fg-3', transition: 'color 100ms, transform 200ms' }, '&:hover .chev': { color: 'fg-1' }, '&:focus-visible': { outline: `2px solid ${tv('fg-3')}`, outlineOffset: 2, borderRadius: '4px' } }}>
                      {current ? <ChainLogo chain={current} size={16} /> : <ChainCluster chains={chains} />}
                      {current ? current.name : 'All Chains'}
                      <Box component="span" className="chev" sx={{ display: 'flex' }}>
                        <BIChevronDown size={14} />
                      </Box>
                    </Box>
                  )}
                />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: '6px', alignItems: 'center', flexShrink: 0 }}>{actions}</Box>
        </Box>
      </Box>
    </Box>
  );
}

function SelectedCheck() {
  return (
    <Box component="span" sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'purple-1', color: onAccent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>
      <BICheck size={11} strokeWidth={2} />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Stats strip + sections
// ---------------------------------------------------------------------------------------------

function StatItem({ label, hint, value, sub, divider }: { label: string; hint: string; value: React.ReactNode; sub?: React.ReactNode; divider?: boolean }) {
  return (
    <Box sx={{ pr: '32px', flexShrink: 0, boxShadow: { xs: 'none', md: divider ? `inset -1px 0 0 ${tv('border-0')}` : 'none' }, minWidth: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', height: 18, fontSize: 14, lineHeight: '14px', color: 'fg-3', whiteSpace: 'nowrap' }}>
          {label}
          <InfoHint label={label} text={hint} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Box component="h2" sx={{ m: 0, height: { xs: 23, md: 29 }, display: 'flex', alignItems: 'center', fontSize: { xs: 19, md: 24 }, fontWeight: 500, lineHeight: { xs: '22.8px', md: '28.8px' }, whiteSpace: 'nowrap', '& number-flow-react': { lineHeight: 'inherit' } }}>{value}</Box>
          {sub && <Box sx={{ minHeight: 24, display: 'flex', alignItems: 'center', fontSize: 14, lineHeight: '14px', color: 'fg-3', whiteSpace: 'nowrap' }}>{sub}</Box>}
        </Box>
      </Box>
    </Box>
  );
}

function SummaryRow({ label, hint, value, sub }: { label: string; hint: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: '4px', height: 14, fontSize: 14, lineHeight: '14px', color: 'fg-3', whiteSpace: 'nowrap' }}>
        {label}
        <InfoHint label={label} text={hint} />
      </Box>
      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', fontSize: 14, lineHeight: '14px', textAlign: 'right' }}>
        <Box component="span" sx={{ fontWeight: 500, height: sub ? 17 : 14, display: 'flex', alignItems: 'center', '& number-flow-react': { lineHeight: '14px' } }}>{value}</Box>
        {sub && <Box component="span" sx={{ color: 'fg-3', height: 17, lineHeight: '17px', whiteSpace: 'nowrap' }}>{sub}</Box>}
      </Box>
    </Box>
  );
}

const groupSx = { display: 'flex', flexDirection: 'column', gap: '24px', p: '20px 0 18px', boxShadow: `inset 0 1px 0 ${tv('border-1')}` } as const;

function SectionHead({ title, description, level = 2 }: { title: string; description?: string; level?: 2 | 3 }) {
  return (
    <Box>
      <Typography component={level === 2 ? 'h2' : 'h3'} sx={{ fontSize: level === 2 ? { xs: 19, md: 24 } : 18, fontWeight: 500, lineHeight: level === 2 ? { xs: '22.8px', md: '28.8px' } : '21.6px', letterSpacing: 'normal', color: 'fg-1' }}>
        {title}
      </Typography>
      {description && <Typography sx={{ mt: '8px', fontSize: 14, lineHeight: '18.9px', letterSpacing: 'normal', color: 'fg-3' }}>{description}</Typography>}
    </Box>
  );
}

function SideSection({ kind, side, symbol, chainSelected }: { kind: 'deposit' | 'borrow'; side: TokenSide; symbol: string; chainSelected: boolean }) {
  const isDep = kind === 'deposit';
  // Legend order is the reverse of the table's default order (live).
  const legendRows = React.useMemo(() => [...side.rows].reverse(), [side.rows]);
  const series: ChartSeries[] = React.useMemo(
    () =>
      legendRows.map((x, i) => ({
        key: x.r.id,
        label: x.r.spokeName,
        color: paletteColor(i),
        chain: x.chain,
        // Markets drawing from the same hub asset share one rate curve (as on live).
        values: (range) => rateHistory(`${x.r.hubId}:${x.r.symbol}:${kind}`, range, x.apy, { spikiness: spikinessOf(x) }),
      })),
    [legendRows, kind],
  );
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <SectionHead title={isDep ? 'Deposit' : 'Borrow'} description={isDep ? `Deposit ${symbol} to earn yield and use it as collateral for borrowing` : `Borrow ${symbol} against your deposited collateral`} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '308px minmax(0, 1fr)' }, gap: { xs: '24px', lg: '40px' }, alignItems: 'start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', py: '4px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', height: 16, fontSize: 14, lineHeight: '14px', color: 'fg-3' }}>
              {isDep ? 'Deposit APY' : 'Borrow APY'}
              <InfoHint label={isDep ? 'Deposit APY' : 'Borrow APY'} text="Range of APYs currently offered across markets" />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', height: 29 }}>
              <Box component="span" sx={{ fontSize: { xs: 24, md: 24 }, fontWeight: 500, lineHeight: '28.8px', whiteSpace: 'nowrap' }}>{side.rows.length ? apyRange(side) : '–'}</Box>
              {side.rows.length > 0 && (
                <HoverCard width={278} placement="top-start" card={<RatesCard side={side} title={isDep ? 'Deposit Rates' : 'Borrow Rates'} />}>
                  <RewardBadge size={24} />
                </HoverCard>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={groupSx}>
              <SummaryRow label={isDep ? 'Total Deposits' : 'Total Borrows'} hint={isDep ? 'Total amount currently deposited for this asset' : 'Total amount currently borrowed for this asset'} value={<USD value={side.totalUSD} />} sub={`${fmtAmt(side.totalTokens)} ${symbol}`} />
              <SummaryRow label={isDep ? 'Deposit Capacity' : 'Borrow Capacity'} hint={isDep ? 'Maximum total deposits allowed before the cap is reached' : 'Maximum total borrows allowed before the cap is reached'} value={<USD value={side.capUSD} />} sub={`${fmtAmt(side.capTokens)} ${symbol}`} />
            </Box>
            {!chainSelected && (
              <Box sx={groupSx}>
                <SummaryRow label="Chains" hint="The number of chains this asset is available on" value={side.chains} />
                <SummaryRow label={isDep ? 'Deposit Markets' : 'Borrow Markets'} hint={isDep ? 'The number of markets where this asset can be deposited across all chains' : 'The number of markets where this asset can be borrowed across all chains'} value={side.rows.length} />
              </Box>
            )}
          </Box>
        </Box>
        <MultiLineChart series={series} title={isDep ? undefined : 'Base APY'} />
      </Box>
    </Box>
  );
}

function MarketsSection({ kind, side }: { kind: 'deposit' | 'borrow'; side: TokenSide }) {
  const isDep = kind === 'deposit';
  const open = useProModal((s) => s.open);
  const requireWallet = useRequireWallet();
  const act = (x: TokenRow) => requireWallet(() => open({ type: isDep ? 'deposit' : 'borrow', reserveId: x.r.id }));
  const sym = (x: TokenRow) => x.r.symbol; // live shows WETH on Arc rows of the ETH page
  const amount = (n: number, x: TokenRow) => `${fmtAmt(n)} ${sym(x)}`;
  const apyCell = (x: TokenRow) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>
      {pct(x.apy)}
      {x.hasRewards && (
        <HoverCard width={311} placement="top" card={<RewardsCard row={x} />}>
          <RewardBadge />
        </HoverCard>
      )}
    </Box>
  );
  const capCell = (x: TokenRow) => (
    <HoverCard width={290} card={<CapacityCard row={x} />} sx={{ fontWeight: 500, textDecoration: 'underline dotted', textDecorationColor: 'transparent', textUnderlineOffset: '4px', transition: 'text-decoration-color 30ms', '&:hover': { textDecorationColor: tv('fg-3') } }}>
      <CapacityRing value={x.capacityFilled} />
    </HoverCard>
  );
  const stack = (symbols: string[]) => (symbols.length ? <AssetStack symbols={symbols} /> : <Muted>None</Muted>);
  const columns: MarketColumn<TokenRow>[] = isDep
    ? [
        { key: 'apy', label: 'APY', render: apyCell, sortValue: (x) => x.apy, hideOnMobile: true },
        { key: 'total', label: 'Total Deposits', render: (x) => <TwoLine top={amount(x.amount, x)} bottom={fmtUsd(x.amountUSD)} />, mobile: (x) => <Inline a={amount(x.amount, x)} b={fmtUsd(x.amountUSD)} />, sortValue: (x) => x.amountUSD },
        { key: 'cap', label: 'Capacity Filled', render: capCell, sortValue: (x) => x.capacityFilled },
        { key: 'rem', label: 'Remaining Capacity', width: 133, render: (x) => <TwoLine top={amount(x.remaining, x)} bottom={fmtUsd(x.remaining * x.r.priceUSD)} />, mobile: (x) => <Inline a={amount(x.remaining, x)} b={fmtUsd(x.remaining * x.r.priceUSD)} />, sortValue: (x) => x.remaining * x.r.priceUSD },
        { key: 'liq', label: 'Available Liquidity', width: 129, render: (x) => <TwoLine top={amount(x.r.availableLiquidity, x)} bottom={fmtUsd(x.r.availableLiquidityUSD)} />, mobile: (x) => <Inline a={amount(x.r.availableLiquidity, x)} b={fmtUsd(x.r.availableLiquidityUSD)} />, sortValue: (x) => x.r.availableLiquidityUSD },
        { key: 'coll', label: 'Use as Collateral', width: 126, render: (x) => (x.r.collateral ? <TwoLine top="Supported" bottom={`CF ${Math.round(x.r.collateralFactor * 100)}%`} /> : <Muted>Not eligible</Muted>), mobile: (x) => (x.r.collateral ? <span>Supported <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>CF {Math.round(x.r.collateralFactor * 100)}%</Box></span> : <Muted>Not eligible</Muted>), sortValue: (x) => (x.r.collateral ? x.r.collateralFactor : -1) },
        { key: 'hub', label: 'Hub Assets', render: (x) => <HoverCard width={278} placement="bottom-end" card={<HubAssetsCard row={x} />}><AssetStack symbols={x.hubAssets.map((a) => a.symbol)} /></HoverCard>, mobile: (x) => <AssetStack symbols={x.hubAssets.map((a) => a.symbol)} size={20} /> },
        { key: 'brw', label: 'Borrowable Assets', width: 154, render: (x) => stack(x.borrowable), mobile: (x) => (x.borrowable.length ? <AssetStack symbols={x.borrowable} size={20} /> : <Muted>None</Muted>) },
      ]
    : [
        { key: 'apy', label: 'APY', render: apyCell, sortValue: (x) => x.apy, mobileBlank: true },
        { key: 'total', label: 'Total Borrowed', render: (x) => <TwoLine top={amount(x.amount, x)} bottom={fmtUsd(x.amountUSD)} />, mobile: (x) => <Inline a={amount(x.amount, x)} b={fmtUsd(x.amountUSD)} />, sortValue: (x) => x.amountUSD },
        { key: 'cap', label: 'Capacity Filled', render: capCell, sortValue: (x) => x.capacityFilled },
        { key: 'liq', label: 'Available Liquidity', render: (x) => <TwoLine top={amount(x.r.availableLiquidity, x)} bottom={fmtUsd(x.r.availableLiquidityUSD)} />, mobile: (x) => <Inline a={amount(x.r.availableLiquidity, x)} b={fmtUsd(x.r.availableLiquidityUSD)} />, sortValue: (x) => x.r.availableLiquidityUSD },
        { key: 'coll', label: 'Supp. Collateral', render: (x) => (x.collateral.length ? <AssetStack symbols={x.collateral} /> : <Muted>–</Muted>), mobile: (x) => (x.collateral.length ? <AssetStack symbols={x.collateral} size={20} /> : <Muted>–</Muted>) },
      ];
  const actions = (x: TokenRow): MenuEntry[] => [
    { label: 'View Details', icon: <PIInfo size={20} />, href: proRoutes.reserve(x.r.id) },
    { label: isDep ? 'Deposit' : 'Borrow', icon: isDep ? <PIDeposit size={20} /> : <PIBorrow size={20} />, onClick: () => act(x) },
    { label: 'More Information', items: [{ label: `${x.r.spokeName} Market`, icon: <MarketGlyph />, href: proRoutes.market(x.r.spokeId) }, { label: `${x.r.hubName} Hub`, icon: <HubGlyph />, href: proRoutes.hub(x.r.hubId) }] },
  ];
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <SectionHead title={isDep ? 'Deposit Markets' : 'Borrow Markets'} level={3} />
      <MarketsTable
        rows={side.rows}
        rowKey={(x) => x.r.id}
        chainOf={(x) => x.chain}
        market={(x) => x.r.spokeName}
        hub={(x) => x.r.hubName}
        columns={columns}
        rowHref={(x) => proRoutes.reserve(x.r.id)}
        actions={actions}
        mobileAside={(x) => <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{x.hasRewards && <RewardBadge />}{pct(x.apy)}</Box>}
        mobileAction={(x) => ({ label: isDep ? 'Deposit' : 'Borrow', onClick: () => act(x) })}
      />
    </Box>
  );
}

const Inline = ({ a, b }: { a: string; b: string }) => (
  <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
    {a}{' '}
    <Box component="span" sx={{ color: 'fg-3', fontWeight: 400 }}>{b}</Box>
  </Box>
);

const MarketGlyph = () => <Box sx={{ width: 10, height: 10, border: `1.25px solid currentColor`, borderRadius: '2px', transform: 'rotate(45deg)' }} />;
const HubGlyph = () => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '5px 5px', gap: '2px' }}>
    {[0, 1, 2].map((i) => <Box key={i} sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'currentColor' }} />)}
  </Box>
);

const Rule = () => <Box component="hr" sx={{ m: 0, border: 0, height: '1px', bgcolor: 'border-0' }} />;

function Skeleton({ w, h, r = 160 }: { w: number | string; h: number; r?: number }) {
  return <Box sx={{ width: w, height: h, borderRadius: `${r}px`, bgcolor: 'border-1', animation: 'a3-skel 1.5s ease-in-out infinite', '@keyframes a3-skel': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />;
}

/** Live loading state: header and stats as pill skeletons (border-1 fill). */
function TokenSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Skeleton w={56} h={56} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton w={182} h={26} />
          <Skeleton w={94} h={12} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: '46px' }}>
        {['Total Deposits', 'Total Borrows', 'Price'].map((l) => (
          <Box key={l} sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Box sx={{ fontSize: 14, color: 'fg-3' }}>{l}</Box>
            <Skeleton w={100} h={22} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------

export function TokenPage({ symbol: rawSymbol }: { symbol: string }) {
  const { protocol } = useProContext();
  const snap = protocol.data;
  const router = useRouter();
  const params = useSearchParams();
  const chainParam = params.get('chain');
  const chainId = chainParam ? Number(chainParam) : null;
  const model = React.useMemo(() => (snap ? tokenModel(snap, rawSymbol) : null), [snap, rawSymbol]);

  if (!snap) return <TokenSkeleton />;
  if (!model) return <NotFoundView />;

  const validChain = chainId !== null && model.chains.some((c) => c.id === chainId) ? chainId : null;
  const dep = filterSide(model.deposit, validChain);
  const bor = filterSide(model.borrow, validChain);
  const inChain = validChain === null ? null : snap.reserves.filter((r) => model.aliases.includes(r.symbol) && r.chainId === validChain);
  const totals = inChain
    ? { dep: inChain.reduce((s, r) => s + r.supplied, 0), depUSD: inChain.reduce((s, r) => s + r.suppliedUSD, 0), bor: inChain.reduce((s, r) => s + r.borrowed, 0), borUSD: inChain.reduce((s, r) => s + r.borrowedUSD, 0) }
    : { dep: model.totalDeposits, depUSD: model.totalDepositsUSD, bor: model.totalBorrows, borUSD: model.totalBorrowsUSD };
  const setChain = (id: number | null) => {
    const q = new URLSearchParams(params.toString());
    if (id === null) q.delete('chain');
    else q.set('chain', String(id));
    const s = q.toString();
    router.replace(`${proRoutes.token(rawSymbol)}${s ? `?${s}` : ''}`, { scroll: false });
  };
  const actionButtons = (
    <>
      <ProButton variant="secondary" prefixIcon={<PIDeposit size={20} />} href={proRoutes.deposit} sx={{ pl: '12px', pr: '14px', [DARK]: { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } }}>
        Deposit
      </ProButton>
      <ProButton variant="secondary" prefixIcon={<PIBorrow size={20} />} href={proRoutes.borrow} sx={{ pl: '12px', pr: '14px', [DARK]: { boxShadow: `0 0 0 1px ${tv('shadow-stroke-2')}` } }}>
        Borrow
      </ProButton>
    </>
  );

  return (
    <>
      {model.aliases.some((s) => s.toUpperCase() === 'WETH') && <WethNotice />}
      <TokenHeader symbol={model.symbol} name={model.name} chains={model.chains} chainId={validChain} onChain={setChain} actions={actionButtons} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '32px', md: '48px' }, mt: { xs: '-6px', md: '-10px' } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '44px', md: '32px' }, pb: { xs: 0, md: '9.6px' } }}>
          <Box sx={{ display: 'flex', gap: { xs: 0, md: '32px' } }}>
            <StatItem label="Total Deposits" hint="The total amount deposited for this asset across all chains" value={<USD value={totals.depUSD} />} sub={`${fmtAmt(totals.dep)} ${model.symbol}`} divider />
            <StatItem label="Total Borrows" hint="The total amount borrowed for this asset across all chains" value={<USD value={totals.borUSD} />} sub={`${fmtAmt(totals.bor)} ${model.symbol}`} divider />
            <StatItem label="Price" hint="Current asset price" value={<NumberFlow value={model.priceUSD} locales="en-US" format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }} />} />
          </Box>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <ProButton variant="secondary" wide prefixIcon={<PIDeposit size={20} />} href={proRoutes.deposit}>Deposit</ProButton>
            <ProButton variant="secondary" wide prefixIcon={<PIBorrow size={20} />} href={proRoutes.borrow}>Borrow</ProButton>
          </Box>
        </Box>
        <Rule />
        <SideSection kind="deposit" side={dep} symbol={model.symbol} chainSelected={validChain !== null} />
        <MarketsSection kind="deposit" side={dep} />
        <Rule />
        <SideSection kind="borrow" side={bor} symbol={model.symbol} chainSelected={validChain !== null} />
        <MarketsSection kind="borrow" side={bor} />
      </Box>
    </>
  );
}
