/**
 * "Fund your wallet" logic (Base Sepolia only, test funds only). Pure, so it's unit-tested:
 *   step 1  test ETH for fees: done when the Base Sepolia ETH balance > GAS_MIN_WEI; until then show
 *           a direct faucet, and the bridge route whose shape depends on the Ethereum Sepolia balance
 *   step 2  test tokens: done when the USDC or WETH balance is > 0
 *   step 3  start using the app
 * plus the bridge amounts and the bridge's error messages.
 */
import { encodeFunctionData } from 'viem';
import { BRIDGE_MIN_GAS_LIMIT, L1_STANDARD_BRIDGE_BASE_SEPOLIA, l1StandardBridgeAbi } from '../abis/l1StandardBridge';
import { parseUnits } from './units';

/** Enough ETH on Base Sepolia to pay fees for a few transactions. */
export const GAS_MIN_WEI = parseUnits('0.0002', 18);
/** Kept back on Ethereum Sepolia for the bridge transaction's own fee. */
export const BRIDGE_GAS_RESERVE_WEI = parseUnits('0.002', 18);
export const BRIDGE_DEFAULT_WEI = parseUnits('0.02', 18);
/** How often the modal re-reads balances while it's open. */
export const FUNDING_POLL_MS = 10_000;

export const FAUCETS = {
  cdp: { label: 'Coinbase Developer Platform faucet', href: 'https://portal.cdp.coinbase.com/products/faucet', note: 'Requires a free Coinbase developer account. Pick Base Sepolia → ETH.' },
  alchemy: { label: 'Alchemy Base Sepolia faucet', href: 'https://www.alchemy.com/faucets/base-sepolia', note: 'Another free option; may ask you to sign in.' },
  google: { label: 'Google Cloud Sepolia faucet', href: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia', note: 'Sign in with a personal Gmail account; work accounts may need real ETH.' },
} as const;

export interface FundingBalances {
  /** native ETH on Base Sepolia (null = not read yet) */
  baseEth: bigint | null;
  /** native ETH on Ethereum Sepolia (null = not read yet) */
  sepoliaEth: bigint | null;
  /** the pool's tokens in the wallet */
  tokens: { symbol: string; balance: bigint }[] | null;
}

export type EthRoute = 'loading' | 'get-sepolia' | 'bridge';

export interface FundingState {
  gasDone: boolean;
  tokensDone: boolean;
  /** which bridge route step 1 shows */
  ethRoute: EthRoute;
  /** the step to open: 1, 2 or 3 */
  current: 1 | 2 | 3;
}

export function fundingState(b: FundingBalances): FundingState {
  const gasDone = b.baseEth !== null && b.baseEth > GAS_MIN_WEI;
  const tokensDone = Boolean(b.tokens?.some((t) => t.balance > 0n));
  const ethRoute: EthRoute = b.sepoliaEth === null ? 'loading' : b.sepoliaEth > 0n ? 'bridge' : 'get-sepolia';
  return { gasDone, tokensDone, ethRoute, current: !gasDone ? 1 : !tokensDone ? 2 : 3 };
}

/** The most that can be bridged: the Sepolia balance minus a reserve for the fee (never below 0). */
export const bridgeMax = (sepoliaEth: bigint) => (sepoliaEth > BRIDGE_GAS_RESERVE_WEI ? sepoliaEth - BRIDGE_GAS_RESERVE_WEI : 0n);

/** The amount the input starts with: 0.02 ETH, or the max if that's less. */
export const bridgeDefault = (sepoliaEth: bigint) => {
  const max = bridgeMax(sepoliaEth);
  return max < BRIDGE_DEFAULT_WEI ? max : BRIDGE_DEFAULT_WEI;
};

/** Has a bridged deposit arrived? The Base Sepolia balance went up from where it was when we sent it. */
export const bridgeArrived = (baselineBaseEth: bigint | null, nowBaseEth: bigint | null) => baselineBaseEth !== null && nowBaseEth !== null && nowBaseEth > baselineBaseEth;

/** The exact call the "Move to Base Sepolia" button sends (on Ethereum Sepolia, with value = amount). */
export function bridgeCall(amount: bigint) {
  return {
    address: L1_STANDARD_BRIDGE_BASE_SEPOLIA,
    abi: l1StandardBridgeAbi,
    functionName: 'depositETH' as const,
    args: [BRIDGE_MIN_GAS_LIMIT, '0x'] as const,
    value: amount,
    data: encodeFunctionData({ abi: l1StandardBridgeAbi, functionName: 'depositETH', args: [BRIDGE_MIN_GAS_LIMIT, '0x'] }),
  };
}

/** Bridge / switch errors → one plain sentence. The raw error goes to the console only. */
export function bridgeErrorMessage(err: unknown): string {
  const chain: { name?: unknown; code?: unknown; message?: unknown; shortMessage?: unknown; details?: unknown }[] = [];
  let cur: unknown = err;
  for (let i = 0; cur && typeof cur === 'object' && i < 8; i++) {
    chain.push(cur as never);
    cur = (cur as { cause?: unknown }).cause;
  }
  const text = chain.map((e) => [e.message, e.shortMessage, e.details].filter((x) => typeof x === 'string').join(' ')).join(' | ');
  if (chain.some((e) => e.code === 4001 || e.name === 'UserRejectedRequestError') || /user (rejected|denied)/i.test(text)) return 'Transaction cancelled.';
  if (chain.some((e) => e.name === 'InsufficientFundsError') || /insufficient funds|exceeds (the )?balance/i.test(text)) return 'Not enough Sepolia ETH (keep a little for the fee).';
  if (chain.some((e) => e.name === 'SwitchChainError' || e.name === 'SwitchChainNotSupportedError' || e.code === 4902)) return "Couldn't switch the wallet to Ethereum Sepolia. Switch in MetaMask, then try again.";
  return 'Something went wrong. Please try again.';
}
