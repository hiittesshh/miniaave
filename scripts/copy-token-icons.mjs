// Builds /public/tokens (token logos) and /public/chain-icons (network logos) from openly licensed
// sources. See docs/ICONS.md for the per-token source and licence list.
// - @web3icons/core (MIT): SVG logos, "background" variant (logo on its brand-colour square,
//   shown as a circle). Extracted from the package's modules at build time.
// - cryptocurrency-icons (CC0-1.0): BAL (missing from web3icons).
// - Trust Wallet assets (MIT) PNGs and simple-icons (CC0) stock badges are committed files in
//   /public/tokens (fetched once; see docs/ICONS.md), not regenerated here.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tokens = join('public', 'tokens');
const chains = join('public', 'chain-icons');
mkdirSync(tokens, { recursive: true });
mkdirSync(chains, { recursive: true });

const w3 = join('node_modules', '@web3icons', 'core', 'dist', 'svgs');
const load = async (file) => (await import(pathToFileURL(file).href)).default;

export const W3_TOKENS = ['ETH', 'BTC', 'WBTC', 'USDC', 'USDT', 'DAI', 'EURC', 'LINK', 'XAUT', 'AVAX', 'USDE', 'PYUSD', 'TBTC', 'RETH', 'CBETH', 'LDO', 'ARB', 'OP', 'GHO', 'AAVE', 'CRV'];
let n = 0;
for (const sym of W3_TOKENS) {
  const file = join(w3, 'tokens', 'background', `${sym}.svg.js`);
  if (!existsSync(file)) throw new Error(`web3icons is missing ${sym}`);
  writeFileSync(join(tokens, `${sym.toLowerCase()}.svg`), await load(file));
  n++;
}
copyFileSync(join('node_modules', 'cryptocurrency-icons', 'svg', 'color', 'bal.svg'), join(tokens, 'bal.svg'));
for (const c of ['base', 'avalanche', 'arc', 'optimism']) {
  writeFileSync(join(chains, `${c}.svg`), await load(join(w3, 'networks', 'background', `${c}.svg.js`)));
}
// Ethereum: the live chain badge is a white ETH glyph on a slate (#434b55) disc, so the badge is
// composed from web3icons' white "mono" glyph on that fill instead of the black "background" tile.
const ethMono = await load(join(w3, 'networks', 'mono', 'ethereum.svg.js'));
writeFileSync(join(chains, 'ethereum.svg'), ethMono.replace(/(<svg[^>]*>)/, '$1<rect width="24" height="24" fill="#434b55"/>'));
console.log(`public/tokens: ${n} web3icons (MIT) + 1 cryptocurrency-icons (CC0); public/chain-icons: 5 web3icons networks`);
