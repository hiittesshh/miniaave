import type { MarketInfo, Reserve } from '@/data/types';

const TEST_CHAINS = ['Sepolia', 'Fuji', 'Testnet', 'Goerli', 'Mumbai'];

/**
 * Splits a market title the way the reference MarketSwitcher does: test-chain words are removed
 * from the title and shown as a small badge instead ("Base Sepolia" → "Base" + "S" badge).
 */
export function marketDisplay(m: Pick<MarketInfo, 'title'>) {
  const words = m.title.split(' ');
  const testChain = words.find((w) => TEST_CHAINS.includes(w));
  return { name: words.filter((w) => w !== testChain).join(' '), testChain };
}

/** The wrapped native reserve is presented as the native asset ("Ethereum · ETH"), as in the reference. */
export function assetDisplay(r: Pick<Reserve, 'symbol' | 'name'>, m: Pick<MarketInfo, 'wrappedNativeSymbol' | 'nativeSymbol'>) {
  if (r.symbol === m.wrappedNativeSymbol) return { symbol: m.nativeSymbol, name: 'Ethereum' };
  return { symbol: r.symbol, name: r.name };
}
