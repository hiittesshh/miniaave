'use client';

import Box, { type BoxProps } from '@mui/material/Box';

/**
 * One shared token icon for both apps: symbol → openly licensed logo in /public/tokens → fallback.
 * Sources and licences per token are listed in docs/ICONS.md:
 * - web3icons (MIT) SVGs, "background" variant (logo on its brand square, cropped to a circle)
 * - Trust Wallet assets (MIT) PNGs for tokens web3icons lacks
 * - simple-icons (CC0) glyphs on a white disc for tokenised stocks
 * - cryptocurrency-icons (CC0) for BAL
 * Tokens no open set covers render as a plain circle in the token's brand colour (logged as a
 * known difference) — never a copied Aave asset.
 */
const SOURCES: Record<string, string> = {
  // web3icons (MIT)
  ETH: 'eth.svg',
  BTC: 'btc.svg',
  'BTC.B': 'btc.svg',
  WBTC: 'wbtc.svg',
  USDC: 'usdc.svg',
  USDT: 'usdt.svg',
  DAI: 'dai.svg',
  EURC: 'eurc.svg',
  LINK: 'link.svg',
  XAUT: 'xaut.svg',
  AVAX: 'avax.svg',
  USDE: 'usde.svg',
  PYUSD: 'pyusd.svg',
  TBTC: 'tbtc.svg',
  RETH: 'reth.svg',
  CBETH: 'cbeth.svg',
  LDO: 'ldo.svg',
  ARB: 'arb.svg',
  OP: 'op.svg',
  GHO: 'gho.svg',
  AAVE: 'aave.svg',
  CRV: 'crv.svg',
  // cryptocurrency-icons (CC0)
  BAL: 'bal.svg',
  // Trust Wallet assets (MIT)
  WETH: 'weth.png',
  'WETH.E': 'weth.png',
  WSTETH: 'wsteth.png',
  WEETH: 'weeth.png',
  SUSDE: 'susde.png',
  USDG: 'usdg.png',
  PAXG: 'paxg.png',
  SAVAX: 'savax.png',
  // simple-icons (CC0) on a white disc
  AAPLC: 'aaplc.svg',
  GOOGLC: 'googlc.svg',
  METAC: 'metac.svg',
  NVDAC: 'nvdac.svg',
  TSLAC: 'tslac.svg',
};

/** Brand colours for tokens no open icon set covers (plain circle, no letters). */
const BRAND: Record<string, string> = {
  CBBTC: '#0052ff',
  LBTC: '#1f5c55',
  RLUSD: '#1e6cf5',
  FRXUSD: '#0b0b0b',
  SYRUPUSDC: '#ff6a13',
  SYRUPUSDG: '#ff6a13',
  CIRBTC: '#f7931a',
  MSFTC: '#00a4ef',
  AMZNC: '#ff9900',
};

export interface TokenIconProps extends Omit<BoxProps, 'children'> {
  symbol: string;
  size?: number | string;
}

/** True when a real logo file exists for the symbol (used by docs/tests). */
export const hasTokenLogo = (symbol: string) => Boolean(SOURCES[symbol.toUpperCase()]);

export function TokenIcon({ symbol, size = 24, sx, ...rest }: TokenIconProps) {
  const key = symbol.toUpperCase();
  const file = SOURCES[key];
  const dimension = typeof size === 'number' ? `${size}px` : size;
  if (file) {
    return (
      <Box
        component="img"
        src={`/tokens/${file}`}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        sx={{ width: dimension, height: dimension, borderRadius: '50%', display: 'block', flexShrink: 0, objectFit: 'cover', ...sx }}
        {...rest}
      />
    );
  }
  return (
    <Box
      aria-hidden
      sx={{
        width: dimension,
        height: dimension,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-block',
        bgcolor: BRAND[key] ?? '#6b6b6b',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
        ...sx,
      }}
      {...rest}
    />
  );
}
