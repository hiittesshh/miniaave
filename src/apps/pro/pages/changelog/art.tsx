'use client';

/**
 * Changelog illustrations (610×343 cards, 12px radius, 1px inset white-6% ring; live, 2026-10-14).
 * The live images are Aave's own artwork; these are our own compositions with the same framing,
 * built from open-licensed logos (TokenIcon / web3icons chain logos, see docs/ICONS.md) and
 * neutral geometry. Logged as INTENTIONAL in PRO_DISCREPANCY_LOG_A3.
 */
import Box from '@mui/material/Box';
import * as React from 'react';
import type { ChangelogEntry } from '@/data/mock/seed/proB_changelog';
import { tv } from '@/shared/theme/tokens';
import { TokenIcon } from '@/shared/ui/TokenIcon';

const W = 610;
const H = 343;

function Rings({ cx, cy, radii, color = 'currentColor', opacity = 0.14 }: { cx: number; cy: number; radii: number[]; color?: string; opacity?: number }) {
  return (
    <Box component="svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: 'fg-1' }}>
      {radii.map((r, i) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeOpacity={opacity - i * 0.015} strokeWidth="1" />
      ))}
    </Box>
  );
}

/** A logo disc positioned in card coordinates (percentages keep it responsive). */
function Disc({ x, y, size, children, bg = '#fff' }: { x: number; y: number; size: number; children: React.ReactNode; bg?: string }) {
  return (
    <Box sx={{ position: 'absolute', left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(size / W) * 100}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
      {children}
    </Box>
  );
}

function Stocks() {
  const logo = (s: string, size: number) => (
    <Box sx={{ width: '100%', height: '100%', '& > *': { width: '100% !important', height: '100% !important' } }}>
      <TokenIcon symbol={s} size={size} />
    </Box>
  );
  return (
    <>
      <Rings cx={305} cy={175} radii={[80, 138, 210, 290]} />
      <Disc x={305} y={175} size={72} bg="linear-gradient(145deg, #e8e8e8, #8a8a8a)">
        <Box sx={{ width: '38%', aspectRatio: '1', borderRadius: '3px', bgcolor: '#2a2828' }} />
      </Disc>
      <Disc x={146} y={58} size={92}>{logo('METAc', 92)}</Disc>
      <Disc x={351} y={104} size={42}>{logo('TSLAc', 42)}</Disc>
      <Disc x={506} y={95} size={72}>{logo('NVDAc', 72)}</Disc>
      <Disc x={30} y={228} size={112}>{logo('MSFTc', 112)}</Disc>
      <Disc x={195} y={247} size={62}>{logo('AMZNc', 62)}</Disc>
      <Disc x={449} y={217} size={62}>{logo('AAPLc', 62)}</Disc>
      <Disc x={578} y={273} size={112}>{logo('GOOGLc', 112)}</Disc>
    </>
  );
}

function ChainHero({ slug, from, to }: { slug: string; from: string; to: string }) {
  return (
    <>
      <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)` }} />
      <Box component="img" src={`/chain-icons/${slug}.svg`} alt="" sx={{ position: 'absolute', left: '50%', top: '50%', width: `${(160 / W) * 100}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%' }} />
    </>
  );
}

function Rewards() {
  return (
    <>
      <Rings cx={305} cy={172} radii={[70, 120, 180]} color={tv('purple-1')} opacity={0.22} />
      <Box component="svg" viewBox="0 0 120 120" aria-hidden sx={{ position: 'absolute', left: '50%', top: '50%', width: `${(120 / W) * 100}%`, transform: 'translate(-50%, -50%)' }}>
        <circle cx="60" cy="60" r="48" fill="none" stroke={tv('purple-1')} strokeWidth="5" />
        <path d="M36 66l14 13 34-36" fill="none" stroke={tv('purple-2')} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </Box>
    </>
  );
}

function Watch() {
  const row = (name: string, addr: string, active?: boolean) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', p: '6px 8px', borderRadius: '6px', bgcolor: active ? 'bg-4' : 'transparent', fontSize: 11 }}>
      <Box sx={{ width: 16, height: 16, borderRadius: '50%', background: active ? `linear-gradient(135deg, ${tv('purple-1')}, ${tv('data-pink')})` : `linear-gradient(135deg, ${tv('data-teal')}, ${tv('data-blue')})` }} />
      <Box component="span" sx={{ color: 'fg-1', fontWeight: 500 }}>{name}</Box>
      <Box component="span" sx={{ color: 'fg-4', ml: 'auto' }}>{addr}</Box>
    </Box>
  );
  return (
    <Box sx={{ position: 'absolute', right: '9%', top: '12%', width: '36%', p: '6px', borderRadius: '10px', bgcolor: 'bg-3', boxShadow: `0 0 0 1px ${tv('border-1')}, 0 16px 32px ${tv('shadow-high')}` }}>
      <Box sx={{ p: '6px 8px', fontSize: 10, color: 'fg-4', textTransform: 'uppercase' }}>Connected</Box>
      {row('My wallet', '0xde00…1a2b', true)}
      <Box sx={{ p: '8px 8px 6px', fontSize: 10, color: 'fg-4', textTransform: 'uppercase' }}>Watching</Box>
      {row('Treasury', '0x51c7…9e04')}
      {row('Research', '0x8a1f…44d0')}
      <Box sx={{ p: '8px', fontSize: 11, color: 'fg-3' }}>+ Add address</Box>
    </Box>
  );
}

function Reserve() {
  const pts = [70, 64, 66, 58, 61, 52, 55, 47, 50, 44, 46, 38, 41, 35];
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * 300},${v}`).join('');
  return (
    <Box sx={{ position: 'absolute', left: '8%', top: '12%', right: '8%', bottom: 0, borderRadius: '10px 10px 0 0', bgcolor: 'bg-1', boxShadow: `0 0 0 1px ${tv('border-1')}`, p: '16px', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TokenIcon symbol="USDC" size={22} />
        <Box sx={{ fontSize: 14, fontWeight: 500, color: 'fg-1' }}>USD Coin <Box component="span" sx={{ color: 'fg-3' }}>USDC</Box></Box>
      </Box>
      <Box sx={{ display: 'flex', gap: '24px', mt: '14px' }}>
        {['Total Deposits', 'Total Borrows', 'Utilisation'].map((l, i) => (
          <Box key={l}>
            <Box sx={{ fontSize: 10, color: 'fg-3' }}>{l}</Box>
            <Box sx={{ fontSize: 15, fontWeight: 500, color: 'fg-1' }}>{['$24.2M', '$19.9M', '82%'][i]}</Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ mt: '14px', borderRadius: '8px', bgcolor: 'bg-2', boxShadow: `0 0 0 1px ${tv('border-1')}`, p: '10px' }}>
        <Box component="svg" viewBox="0 0 300 80" sx={{ width: '100%', display: 'block' }} aria-hidden>
          <path d={d} fill="none" stroke={tv('data-green')} strokeWidth="1.5" />
          <path d={pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * 300},${v + 18}`).join('')} fill="none" stroke={tv('data-orange')} strokeWidth="1.5" />
        </Box>
      </Box>
    </Box>
  );
}

export function ChangelogArt({ art }: { art: NonNullable<ChangelogEntry['art']> }) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${W} / ${H}`,
        borderRadius: '12px',
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${tv('bg-3')} 0%, ${tv('bg-2')} 100%)`,
        '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: `inset 0 0 0 1px ${tv('border-0')}`, transition: 'box-shadow 100ms', zIndex: 2, pointerEvents: 'none' },
      }}
      role="img"
      aria-label="Illustration (demo artwork)"
    >
      {art === 'stocks' && <Stocks />}
      {art === 'arc' && <ChainHero slug="arc" from="#0f1a2c" to="#1b2433" />}
      {art === 'avalanche' && <ChainHero slug="avalanche" from="#2a1213" to="#1b1717" />}
      {art === 'rewards' && <Rewards />}
      {art === 'watch' && <Watch />}
      {art === 'reserve' && <Reserve />}
    </Box>
  );
}
