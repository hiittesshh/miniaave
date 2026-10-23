'use client';

/**
 * Markets (§7) in Pro's explore style: page heading with the pool totals (NumberFlow), a group
 * heading with stacked token icons, and Pro's ScrollTable (sorting, hover plate, sticky first column,
 * scroll arrows when the columns overflow, utilization rings, mobile cards). A row opens the asset's
 * Reserve page; hovering a row shows Supply / Borrow buttons.
 * Columns per §7: Price, Total supplied, Total borrowed, Available, Supply APY, Borrow APY,
 * Utilization, Max LTV.
 */
import Box from '@mui/material/Box';
import { useRouter } from 'next/navigation';
import { ScrollTable, type ScrollColumn } from '@/apps/pro/components/ScrollTable';
import { AssetDisplay, CapacityRing, HeaderStat, IconStack, rowIconSx, TwoLine } from '@/apps/pro/pages/Explore';
import { PIBorrow, PIDeposit, PIMore } from '@/apps/pro/icons';
import { PageTitle, ProButton, USD } from '@/apps/pro/ui';
import { formatLowerCompact } from '@/shared/format';
import { useMarkets, type MarketRow } from '../data/hooks';
import { useWallet } from '../data/useWallet';
import { aprToApyPercent, fmtBps, fmtPercent, fmtToken, fmtUsd } from '../lib/format';
import { miniRoutes } from '../layout/MiniShell';
import { useMiniTx } from '../tx/store';
import { useReadChainName } from '../ui/parts';
import { BRAND } from '../brand';

export const tokens = (v: bigint, decimals: number) => Number(v) / 10 ** decimals;
export const usdOf = (v: bigint, r: Pick<MarketRow, 'price' | 'decimals'>) => tokens(v, r.decimals) * (Number(r.price) / 1e8);

/** Pool totals in USD (for the header and the group heading). */
export function poolTotals(rows: MarketRow[] | undefined) {
  const list = rows ?? [];
  return {
    deposits: list.reduce((s, r) => s + usdOf(r.totalSupplied, r), 0),
    borrows: list.reduce((s, r) => s + usdOf(r.totalBorrowed, r), 0),
  };
}

const strong = (s: string) => <Box component="span" sx={{ fontWeight: 500 }}>{s}</Box>;
const amountCell = (v: bigint, r: MarketRow) => <TwoLine top={`${fmtToken(v, r.decimals, 2)} ${r.token.symbol}`} bottom={formatLowerCompact(usdOf(v, r), { usd: true })} />;

export function MarketsPage() {
  const markets = useMarkets();
  const open = useMiniTx((s) => s.open);
  const router = useRouter();
  const wallet = useWallet();
  const network = useReadChainName();
  const totals = poolTotals(markets.data);
  // Without a wallet (or on the wrong chain) the buttons take you to the asset page instead.
  const act = (kind: 'supply' | 'borrow', r: MarketRow) => (wallet.account && !wallet.wrongChain ? open({ kind, asset: r.asset }) : router.push(miniRoutes.reserve(r.token.symbol)));

  const first: ScrollColumn<MarketRow> = { key: 'asset', label: 'Asset', render: (r) => <AssetDisplay symbol={r.token.symbol} name={r.token.name} />, sortValue: (r) => r.token.symbol };
  const columns: ScrollColumn<MarketRow>[] = [
    { key: 'price', label: 'Price', render: (r) => strong(fmtUsd(r.price)), sortValue: (r) => Number(r.price) },
    { key: 'supplied', label: 'Total Supplied', render: (r) => amountCell(r.totalSupplied, r), mobile: (r) => `${fmtToken(r.totalSupplied, r.decimals, 2)} ${r.token.symbol}`, sortValue: (r) => usdOf(r.totalSupplied, r) },
    { key: 'borrowed', label: 'Total Borrowed', render: (r) => amountCell(r.totalBorrowed, r), mobile: (r) => `${fmtToken(r.totalBorrowed, r.decimals, 2)} ${r.token.symbol}`, sortValue: (r) => usdOf(r.totalBorrowed, r) },
    { key: 'available', label: 'Available', render: (r) => amountCell(r.availableLiquidity, r), mobile: (r) => `${fmtToken(r.availableLiquidity, r.decimals, 2)} ${r.token.symbol}`, sortValue: (r) => usdOf(r.availableLiquidity, r) },
    { key: 'supplyApy', label: 'Supply APY', render: (r) => strong(fmtPercent(aprToApyPercent(r.supplyRate))), sortValue: (r) => aprToApyPercent(r.supplyRate) },
    { key: 'borrowApy', label: 'Borrow APY', render: (r) => strong(fmtPercent(aprToApyPercent(r.borrowRate))), sortValue: (r) => aprToApyPercent(r.borrowRate) },
    { key: 'utilization', label: 'Utilization', render: (r) => <CapacityRing value={tokens(r.utilization, 18)} />, sortValue: (r) => Number(r.utilization) },
    { key: 'ltv', label: 'Max LTV', render: (r) => strong(fmtBps(r.ltv)), sortValue: (r) => r.ltv, hideOnMobile: true },
  ];

  return (
    <>
      <PageTitle
        size={28}
        title="Markets"
        subtitle="Supply assets to earn interest and use them as collateral, or borrow against your collateral."
        right={
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'flex-start', gap: '32px', pt: '4px' }}>
            <HeaderStat label="Total Deposits" tooltip={`Everything supplied to the ${BRAND} pool, in USD at oracle prices`} value={totals.deposits} />
            <Box sx={{ width: '1px', height: 65, borderRadius: '2px', bgcolor: 'border-0' }} />
            <HeaderStat label="Total Borrows" tooltip={`Everything borrowed from the ${BRAND} pool, in USD at oracle prices`} value={totals.borrows} />
          </Box>
        }
      />
      {/* Mobile: the two totals as a compact row (Pro hides its header stats below md). */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: '24px', mt: '-8px' }}>
        {[
          ['Total Deposits', totals.deposits],
          ['Total Borrows', totals.borrows],
        ].map(([label, v]) => (
          <Box key={label as string}>
            <Box sx={{ fontSize: 13, color: 'fg-3' }}>{label}</Box>
            <Box sx={{ mt: '4px', fontSize: 19, fontWeight: 500 }}>
              <USD value={v as number} />
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ pb: '32px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IconStack symbols={(markets.data ?? []).map((r) => r.token.symbol)} />
            <Box component="span" sx={{ fontSize: '1.5rem', fontWeight: 500, lineHeight: '28.8px' }}>
              {BRAND} Pool
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', columnGap: '24px', rowGap: 1, flexWrap: 'wrap', mt: '8px' }}>
            <Box sx={{ color: 'fg-3', fontSize: '0.875rem', lineHeight: '19.6px' }}>One lending pool on {network}: supply, borrow and liquidate.</Box>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: '8px', fontSize: '0.875rem', lineHeight: '18px', color: 'fg-3' }}>
              <span>Assets</span>
              <IconStack symbols={(markets.data ?? []).map((r) => r.token.symbol)} />
              <Box component="span" sx={{ width: '1px', height: 10, borderRadius: '2px', bgcolor: 'border-1', mx: '2px' }} />
              <span>Total Deposits</span>
              <Box component="b" sx={{ color: 'fg-1', fontWeight: 500 }}>
                {formatLowerCompact(totals.deposits, { usd: true })}
              </Box>
            </Box>
          </Box>
        </Box>
        <ScrollTable
          rows={markets.data ?? []}
          first={first}
          columns={columns}
          rowKey={(r) => r.asset}
          loading={!markets.data}
          defaultSort={{ key: 'supplied', desc: true }}
          rowHref={(r) => miniRoutes.reserve(r.token.symbol)}
          mobileAside={(r) => fmtPercent(aprToApyPercent(r.supplyRate))}
          rowActions={(r) => (
            <>
              <Box component="button" type="button" aria-label={`Supply ${r.token.symbol}`} onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); act('supply', r); }} sx={rowIconSx}>
                <PIDeposit />
              </Box>
              <Box component="button" type="button" aria-label={`Borrow ${r.token.symbol}`} onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); act('borrow', r); }} sx={rowIconSx}>
                <PIBorrow />
              </Box>
            </>
          )}
          mobileActions={(r) => (
            <>
              <ProButton variant="tertiary" sx={{ flex: 1 }} onClick={() => act('supply', r)}>
                Supply
              </ProButton>
              <ProButton variant="tertiary" sx={{ flex: 1 }} onClick={() => act('borrow', r)}>
                Borrow
              </ProButton>
              <ProButton variant="tertiary" size="square" aria-label={`${r.token.symbol} details`} href={miniRoutes.reserve(r.token.symbol)}>
                <PIMore />
              </ProButton>
            </>
          )}
        />
      </Box>
    </>
  );
}
