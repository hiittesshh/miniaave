/**
 * "Fund your wallet": step states (thresholds, which bridge route shows), bridge amounts, the exact
 * bridge call (depositETH on Base's L1StandardBridge) and the error messages.
 */
import { ContractFunctionExecutionError, InsufficientFundsError, UserRejectedRequestError, decodeFunctionData, getAddress, toFunctionSelector, type Abi } from 'viem';
import { describe, expect, it } from 'vitest';
import { L1_STANDARD_BRIDGE_BASE_SEPOLIA, l1StandardBridgeAbi } from '../abis/l1StandardBridge';
import { CHAIN_INFO, ETH_SEPOLIA_CHAIN_ID, RPC_URL, isSupportedChain } from '../data/config';
import { BRIDGE_DEFAULT_WEI, BRIDGE_GAS_RESERVE_WEI, FAUCETS, GAS_MIN_WEI, bridgeArrived, bridgeCall, bridgeDefault, bridgeErrorMessage, bridgeMax, fundingState } from '../lib/funding';
import { parseUnits } from '../lib/units';

const e = (s: string) => parseUnits(s, 18);
const tok = (usdc: bigint, weth: bigint) => [
  { symbol: 'USDC', balance: usdc },
  { symbol: 'WETH', balance: weth },
];

describe('step states', () => {
  it('step 1 is done only above 0.0002 ETH on Base Sepolia', () => {
    expect(GAS_MIN_WEI).toBe(e('0.0002'));
    expect(fundingState({ baseEth: null, sepoliaEth: null, tokens: null }).gasDone).toBe(false);
    expect(fundingState({ baseEth: e('0.0002'), sepoliaEth: 0n, tokens: null }).gasDone).toBe(false);
    expect(fundingState({ baseEth: e('0.00021'), sepoliaEth: 0n, tokens: null }).gasDone).toBe(true);
  });

  it('step 2 is done when USDC or WETH is above 0', () => {
    expect(fundingState({ baseEth: e('1'), sepoliaEth: 0n, tokens: tok(0n, 0n) }).tokensDone).toBe(false);
    expect(fundingState({ baseEth: e('1'), sepoliaEth: 0n, tokens: tok(0n, 1n) }).tokensDone).toBe(true);
    expect(fundingState({ baseEth: e('1'), sepoliaEth: 0n, tokens: null }).tokensDone).toBe(false);
  });

  it('the open step follows progress: 1 → 2 → 3', () => {
    expect(fundingState({ baseEth: 0n, sepoliaEth: 0n, tokens: tok(5n, 0n) }).current).toBe(1); // tokens but no gas: still 1
    expect(fundingState({ baseEth: e('0.1'), sepoliaEth: 0n, tokens: tok(0n, 0n) }).current).toBe(2);
    expect(fundingState({ baseEth: e('0.1'), sepoliaEth: 0n, tokens: tok(0n, 5n) }).current).toBe(3);
  });

  it('bridge route: loading → get Sepolia ETH (balance 0) → bridge form (balance > 0)', () => {
    expect(fundingState({ baseEth: 0n, sepoliaEth: null, tokens: null }).ethRoute).toBe('loading');
    expect(fundingState({ baseEth: 0n, sepoliaEth: 0n, tokens: null }).ethRoute).toBe('get-sepolia');
    expect(fundingState({ baseEth: 0n, sepoliaEth: 1n, tokens: null }).ethRoute).toBe('bridge');
  });
});

describe('bridge amounts', () => {
  it('Max keeps 0.002 ETH back for the fee; the default is 0.02 or the max if less', () => {
    expect(BRIDGE_GAS_RESERVE_WEI).toBe(e('0.002'));
    expect(bridgeMax(e('0.01'))).toBe(e('0.008'));
    expect(bridgeMax(e('0.001'))).toBe(0n);
    expect(bridgeDefault(e('1'))).toBe(BRIDGE_DEFAULT_WEI);
    expect(bridgeDefault(e('0.01'))).toBe(e('0.008'));
    expect(bridgeDefault(0n)).toBe(0n);
  });

  it('arrival = the Base Sepolia balance went up from the one at sending', () => {
    expect(bridgeArrived(e('0.0001'), e('0.0001'))).toBe(false);
    expect(bridgeArrived(e('0.0001'), e('0.0201'))).toBe(true);
    expect(bridgeArrived(null, e('1'))).toBe(false);
  });
});

describe('the bridge call', () => {
  it('depositETH(200000, 0x) with value = amount, on the official bridge address', () => {
    const c = bridgeCall(e('0.02'));
    expect(c.address).toBe('0xfd0Bf71F60660E2f608ed56e1659C450eB113120');
    expect(getAddress(L1_STANDARD_BRIDGE_BASE_SEPOLIA)).toBe(L1_STANDARD_BRIDGE_BASE_SEPOLIA); // valid checksum
    expect(c.value).toBe(e('0.02'));
    expect(c.data.slice(0, 10)).toBe(toFunctionSelector('depositETH(uint32,bytes)'));
    expect(c.data.slice(0, 10)).toBe('0xb1a1a882'); // the known OP Stack selector
    expect(decodeFunctionData({ abi: l1StandardBridgeAbi, data: c.data })).toEqual({ functionName: 'depositETH', args: [200_000, '0x'] });
  });

  it('Ethereum Sepolia is configured for the bridge only, never as a pool network', () => {
    expect(RPC_URL[ETH_SEPOLIA_CHAIN_ID]).toBe('https://ethereum-sepolia-rpc.publicnode.com');
    expect(CHAIN_INFO[ETH_SEPOLIA_CHAIN_ID].explorer).toBe('https://sepolia.etherscan.io');
    expect(isSupportedChain(ETH_SEPOLIA_CHAIN_ID)).toBe(false);
  });

  it('faucet links are the ones in the brief', () => {
    expect(FAUCETS.cdp.href).toBe('https://portal.cdp.coinbase.com/products/faucet');
    expect(FAUCETS.alchemy.href).toBe('https://www.alchemy.com/faucets/base-sepolia');
    expect(FAUCETS.google.href).toBe('https://cloud.google.com/application/web3/faucet/ethereum/sepolia');
  });
});

describe('bridge error messages', () => {
  it('user rejection → "Transaction cancelled."', () => {
    const wrapped = new ContractFunctionExecutionError(new UserRejectedRequestError(new Error('User denied')), { abi: l1StandardBridgeAbi as unknown as Abi, functionName: 'depositETH', args: [] });
    expect(bridgeErrorMessage(wrapped)).toBe('Transaction cancelled.');
    expect(bridgeErrorMessage({ code: 4001, message: 'User rejected the request.' })).toBe('Transaction cancelled.');
  });

  it('not enough Sepolia ETH → the "keep a little for the fee" message', () => {
    expect(bridgeErrorMessage(new InsufficientFundsError())).toBe('Not enough Sepolia ETH (keep a little for the fee).');
    expect(bridgeErrorMessage(new Error('insufficient funds for gas * price + value'))).toBe('Not enough Sepolia ETH (keep a little for the fee).');
  });

  it('a failed network switch and anything else get plain messages', () => {
    expect(bridgeErrorMessage({ code: 4902, message: 'Unrecognized chain' })).toMatch(/Couldn't switch/);
    expect(bridgeErrorMessage(new Error('fetch failed'))).toBe('Something went wrong. Please try again.');
  });
});
