/**
 * Chain-integration unit tests (no chain needed): §9 error decoding from fabricated viem errors,
 * §8 Max / approve amounts, the viem call each action sends, config lookups, the source switch,
 * §10 chunked log queries, and the shape normalisers / receipt decoding of chainSource.
 */
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  HttpRequestError,
  UserRejectedRequestError,
  decodeFunctionData,
  encodeAbiParameters,
  encodeErrorResult,
  encodeEventTopics,
  encodeFunctionData,
  getAddress,
  type Abi,
  type Log,
} from 'viem';
import { describe, expect, it } from 'vitest';
import { erc20Abi, oracleAbi, poolAbi, poolDecodingAbi } from '../abis';
import { toViemCall } from '../data/calls';
import { decodeChainError } from '../data/chainErrors';
import { logsToEvents, normalizeAccountData, normalizeReserveView, resultFromReceiptLogs } from '../data/chainSource';
import { ADDR, BASE_SEPOLIA_CHAIN_ID, DEPLOY_BLOCK, LOCAL_CHAIN_ID, TARGET_CHAIN_ID, TOKENS, accountByRole, contractsFor, explorerTxUrl, isSupportedChain, pickReadChain } from '../data/config';
import { fetchInChunks, isRangeError, isRateLimitError, scanLogs } from '../data/logs';
import { resolveSourceMode, useMiniSettings } from '../data/settings';
import { miniSource } from '../data/source';
import { MESSAGES, MiniContractError, TxRevertedError, UserRejectedError, messageFor } from '../lib/errors';
import { MAX_UINT256, parseUnits } from '../lib/units';
import { buildAmountTx, buildLiquidateTx } from '../tx/build';

const borrower = accountByRole('Borrower');
const usdc = (s: string) => parseUnits(s, 6);

/** What viem throws from simulateContract when the pool reverts with `data`. */
function revertFrom(abi: Abi, data: `0x${string}`, functionName = 'withdraw') {
  const revert = new ContractFunctionRevertedError({ abi: poolDecodingAbi as unknown as Abi, data, functionName });
  return new ContractFunctionExecutionError(revert, { abi, functionName, args: [], contractAddress: ADDR.pool, sender: borrower });
}

describe('§9 error decoding (fabricated viem errors)', () => {
  it('a pool error comes back by name, with the guide message', () => {
    const err = decodeChainError(revertFrom(poolAbi as unknown as Abi, encodeErrorResult({ abi: poolAbi, errorName: 'HealthFactorTooLow' })));
    expect(err).toBeInstanceOf(MiniContractError);
    expect((err as MiniContractError).errorName).toBe('HealthFactorTooLow');
    expect(messageFor(err)).toBe(MESSAGES.HealthFactorTooLow);
  });

  it('every pool / token / oracle error name in the §9 table decodes by name', () => {
    const all = [...(poolAbi as unknown as Abi), ...(erc20Abi as unknown as Abi), ...(oracleAbi as unknown as Abi)].filter((x) => x.type === 'error' && x.name in MESSAGES);
    for (const e of all) {
      if (e.type !== 'error') continue;
      const args = e.inputs.map((i) => (i.type === 'address' ? borrower : 1n));
      const data = encodeErrorResult({ abi: [e], errorName: e.name, args } as Parameters<typeof encodeErrorResult>[0]);
      const out = decodeChainError(revertFrom(poolAbi as unknown as Abi, data));
      expect(out instanceof MiniContractError ? out.errorName : String(out), e.name).toBe(e.name);
    }
    // …and together the three ABIs cover every name in the §9 table.
    expect(new Set(all.map((e) => (e.type === 'error' ? e.name : '')))).toEqual(new Set(Object.keys(MESSAGES)));
  });

  it('a token error thrown inside a pool call decodes (pool ABI + token errors)', () => {
    const data = encodeErrorResult({ abi: erc20Abi, errorName: 'ERC20InsufficientAllowance', args: [ADDR.pool, 0n, usdc('100')] });
    const err = decodeChainError(revertFrom(poolAbi as unknown as Abi, data, 'supply'));
    expect(messageFor(err)).toBe('Please approve the token first.');
  });

  it('a non-owner setPrice → "Only the admin can do this."', () => {
    const data = encodeErrorResult({ abi: oracleAbi, errorName: 'OwnableUnauthorizedAccount', args: [borrower] });
    expect(messageFor(decodeChainError(revertFrom(oracleAbi as unknown as Abi, data, 'setPrice')))).toBe('Only the admin can do this.');
  });

  it('a wallet rejection (nested UserRejectedRequestError) → "Transaction cancelled."', () => {
    const rejected = new UserRejectedRequestError(new Error('User denied transaction signature.'));
    const wrapped = new ContractFunctionExecutionError(rejected, { abi: poolAbi as unknown as Abi, functionName: 'supply', args: [], contractAddress: ADDR.pool });
    expect(decodeChainError(wrapped)).toBeInstanceOf(UserRejectedError);
    expect(messageFor(decodeChainError(wrapped))).toBe('Transaction cancelled.');
    // Some wallets reject with a bare EIP-1193 object.
    expect(messageFor(decodeChainError({ code: 4001, message: 'User rejected the request.' }))).toBe('Transaction cancelled.');
  });

  it('an unknown revert → "Transaction failed."; an RPC failure → the generic message', () => {
    const unknown = decodeChainError(revertFrom(poolAbi as unknown as Abi, '0xdeadbeef'));
    expect(unknown).toBeInstanceOf(TxRevertedError);
    expect(messageFor(unknown)).toBe('Transaction failed.');
    const rpcDown = decodeChainError(new HttpRequestError({ url: 'http://127.0.0.1:8545', details: 'fetch failed' }));
    expect(messageFor(rpcDown)).toBe('Something went wrong. Please try again.');
  });

  it('errors already in the mock classes pass through unchanged', () => {
    const e = new MiniContractError('NoDebt');
    expect(decodeChainError(e)).toBe(e);
  });
});

describe('§8 Max and approve amounts', () => {
  const debt = usdc('1500');

  it('supply approves the amount; borrow and withdraw need no approve', () => {
    expect(buildAmountTx('supply', ADDR.usdc, usdc('100'), false, 0n)).toEqual({ call: { contract: 'pool', functionName: 'supply', args: [ADDR.usdc, usdc('100')] }, approval: { token: ADDR.usdc, amount: usdc('100') } });
    expect(buildAmountTx('borrow', ADDR.usdc, usdc('50'), true, 0n)).toEqual({ call: { contract: 'pool', functionName: 'borrow', args: [ADDR.usdc, usdc('50')] } });
    expect(buildAmountTx('withdraw', ADDR.weth, 1n, false, 0n).approval).toBeUndefined();
  });

  it('Withdraw Max sends maxUint256', () => {
    expect(buildAmountTx('withdraw', ADDR.weth, parseUnits('1', 18), true, 0n).call.args[1]).toBe(MAX_UINT256);
  });

  it('Repay Max sends maxUint256 and approves debt + 0.1% (+1)', () => {
    const tx = buildAmountTx('repay', ADDR.usdc, debt, true, debt);
    expect(tx.call.args[1]).toBe(MAX_UINT256);
    expect(tx.approval).toEqual({ token: ADDR.usdc, amount: debt + debt / 1000n + 1n });
    expect(tx.approval!.amount).toBe(1_501_500_001n); // 1,501.500001 USDC
  });

  it('a typed repay approves exactly the typed amount', () => {
    expect(buildAmountTx('repay', ADDR.usdc, usdc('10'), false, debt).approval!.amount).toBe(usdc('10'));
  });

  it('liquidate approves debtToCover of the debt token (§11: approve 750, liquidate 750)', () => {
    const tx = buildLiquidateTx(ADDR.weth, ADDR.usdc, borrower, 750_000_000n);
    expect(tx).toEqual({ call: { contract: 'pool', functionName: 'liquidate', args: [ADDR.weth, ADDR.usdc, borrower, 750_000_000n] }, approval: { token: ADDR.usdc, amount: 750_000_000n } });
  });
});

describe('the viem call each action sends', () => {
  const c = contractsFor(LOCAL_CHAIN_ID)!;

  it('pool calls go to the pool, with the decoding ABI, and encode against the reconstructed ABI', () => {
    const v = toViemCall(buildLiquidateTx(ADDR.weth, ADDR.usdc, borrower, 750_000_000n).call, c);
    expect(v.address).toBe(c.pool);
    expect(v.abi.some((x) => x.type === 'error' && x.name === 'ERC20InsufficientAllowance')).toBe(true);
    const data = encodeFunctionData({ abi: v.abi, functionName: v.functionName, args: v.args });
    expect(decodeFunctionData({ abi: poolAbi, data })).toEqual({ functionName: 'liquidate', args: [ADDR.weth, ADDR.usdc, borrower, 750_000_000n] });
  });

  it('approve / faucet go to the token; setPrice goes to the oracle', () => {
    expect(toViemCall({ contract: 'token', address: c.usdc, functionName: 'approve', args: [c.pool, 1n] }, c).address).toBe(c.usdc);
    expect(toViemCall({ contract: 'token', address: c.weth, functionName: 'faucet', args: [] }, c).address).toBe(c.weth);
    const sp = toViemCall({ contract: 'oracle', functionName: 'setPrice', args: [c.weth, 170000000000n] }, c);
    expect(sp.address).toBe(c.oracle);
    expect(encodeFunctionData({ abi: sp.abi, functionName: sp.functionName, args: sp.args }).slice(0, 10)).toBe(encodeFunctionData({ abi: oracleAbi, functionName: 'setPrice', args: [c.weth, 170000000000n] }).slice(0, 10));
  });
});

describe('read network precedence', () => {
  it('wallet chain (if supported) → the network picked in the menu (if supported) → the target', () => {
    expect(pickReadChain(LOCAL_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID)).toBe(LOCAL_CHAIN_ID);
    expect(pickReadChain(undefined, BASE_SEPOLIA_CHAIN_ID)).toBe(BASE_SEPOLIA_CHAIN_ID);
    expect(pickReadChain(1, BASE_SEPOLIA_CHAIN_ID)).toBe(BASE_SEPOLIA_CHAIN_ID);
    expect(pickReadChain(undefined, 1)).toBe(TARGET_CHAIN_ID);
    expect(pickReadChain(undefined)).toBe(TARGET_CHAIN_ID);
  });
});

describe('config lookups', () => {
  it('31337 and 84532 have the four addresses from aave/deployments/*.json', () => {
    expect(contractsFor(LOCAL_CHAIN_ID)).toEqual({ pool: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707', oracle: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3', weth: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' });
    expect(contractsFor(BASE_SEPOLIA_CHAIN_ID)).toEqual({ pool: '0xB9b209a874cf566076dA34c5930AC4A348e7a107', oracle: '0x73BD29D3041206b21426f5C7126e5065195BC099', usdc: '0xcbd96F714186C1Ba1a84883b7170FA104716A2a3', weth: '0x18Ce51aC4482E23103992e878804a06bEC8F6B20' });
    expect(DEPLOY_BLOCK[BASE_SEPOLIA_CHAIN_ID]).toBe(48102059n);
    expect(contractsFor(1)).toBeNull();
    expect(contractsFor(undefined)).toBeNull();
  });

  it('supported = has addresses; reads fall back to the target chain', () => {
    expect(isSupportedChain(LOCAL_CHAIN_ID)).toBe(true);
    expect(isSupportedChain(BASE_SEPOLIA_CHAIN_ID)).toBe(true);
    expect(TARGET_CHAIN_ID).toBe(LOCAL_CHAIN_ID);
    expect(pickReadChain(LOCAL_CHAIN_ID)).toBe(LOCAL_CHAIN_ID);
    expect(pickReadChain(1)).toBe(TARGET_CHAIN_ID);
    expect(pickReadChain(undefined)).toBe(TARGET_CHAIN_ID);
  });

  it('explorer links: Basescan on 84532, none locally', () => {
    const h = `0x${'ab'.repeat(32)}` as const;
    expect(explorerTxUrl(BASE_SEPOLIA_CHAIN_ID, h)).toBe(`https://sepolia.basescan.org/tx/${h}`);
    expect(explorerTxUrl(LOCAL_CHAIN_ID, h)).toBeNull();
  });

  it('addresses are EIP-55 checksummed, so they equal what viem returns', () => {
    for (const a of Object.values(contractsFor(LOCAL_CHAIN_ID)!)) expect(getAddress(a)).toBe(a);
    for (const a of Object.values(contractsFor(BASE_SEPOLIA_CHAIN_ID)!)) expect(getAddress(a)).toBe(a);
    expect(TOKENS[ADDR.usdc]).toMatchObject({ symbol: 'USDC', decimals: 6 });
    expect(TOKENS[ADDR.weth]).toMatchObject({ symbol: 'WETH', decimals: 18 });
  });
});

describe('source selection', () => {
  it('toggle → env → mock; anything unexpected is mock', () => {
    expect(resolveSourceMode(undefined, null)).toBe('mock');
    expect(resolveSourceMode('chain', null)).toBe('chain');
    expect(resolveSourceMode(' CHAIN ', null)).toBe('chain');
    expect(resolveSourceMode('chain', 'mock')).toBe('mock');
    expect(resolveSourceMode('mock', 'chain')).toBe('chain');
    expect(resolveSourceMode('mainnet', 'whatever')).toBe('mock');
  });

  it('miniSource forwards to the selected source', () => {
    useMiniSettings.setState({ stored: 'chain' });
    expect(miniSource.kind).toBe('chain');
    expect(miniSource.chainId).toBe(TARGET_CHAIN_ID);
    useMiniSettings.setState({ stored: 'mock' });
    expect(miniSource.kind).toBe('mock');
    expect(miniSource.contracts).toEqual(ADDR);
    useMiniSettings.setState({ stored: null });
    expect(miniSource.kind).toBe('mock');
  });
});

describe('§10 chunked log queries', () => {
  it('splits [from, to] and halves the span on a range error', async () => {
    const calls: [bigint, bigint][] = [];
    const fakeRpc = async (a: bigint, b: bigint) => {
      calls.push([a, b]);
      if (b - a + 1n > 1000n) throw new Error('query exceeds max block range 1000');
      return [`${a}-${b}`];
    };
    const out = await fetchInChunks(0n, 2999n, fakeRpc, 4000n);
    expect(out).toEqual(['0-999', '1000-1999', '2000-2999']);
    expect(calls[0]).toEqual([0n, 2999n]);
  });

  it('rethrows errors that are not about the range', async () => {
    await expect(fetchInChunks(0n, 10n, async () => Promise.reject(new Error('connection refused')), 5n)).rejects.toThrow('connection refused');
    expect(isRangeError(new Error('Log response size exceeded'))).toBe(true);
    expect(isRangeError(new Error('Internal error'))).toBe(false);
  });

  it('an empty range costs no request', async () => {
    let n = 0;
    expect(await fetchInChunks(5n, 4n, async () => [n++], 10n)).toEqual([]);
    expect(n).toBe(0);
  });
});

describe('rate-limited log scan (public Base Sepolia: 200 blocks, 25 req/s)', () => {
  it('covers the range in 200-block windows, waves of N, pacing each wave', async () => {
    const ranges: [bigint, bigint][] = [];
    const sleeps: number[] = [];
    let clock = 0;
    const progress: [bigint, number, number, number][] = [];
    const out = await scanLogs({
      from: 1000n,
      to: 1999n,
      span: 200n,
      perWave: 2,
      waveMs: 1100,
      now: () => clock,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
      fetchRange: async (a, b) => {
        ranges.push([a, b]);
        clock += 100;
        return [`${a}`];
      },
      onProgress: (through, found, done, total) => {
        progress.push([through, found.length, done, total]);
      },
    });
    expect(ranges.map(([a, b]) => Number(b - a + 1n))).toEqual([200, 200, 200, 200, 200]);
    expect(out).toEqual(['1000', '1200', '1400', '1600', '1800']);
    expect(progress).toEqual([
      [1399n, 2, 2, 5],
      [1799n, 2, 4, 5],
      [1999n, 1, 5, 5],
    ]);
    expect(sleeps).toEqual([900, 900]); // 1100 ms per wave minus the time the wave took; none after the last
  });

  it('a rate-limited wave waits and is retried; other errors are thrown', async () => {
    let calls = 0;
    const out = await scanLogs({
      from: 0n,
      to: 99n,
      span: 200n,
      perWave: 1,
      waveMs: 10,
      sleep: async () => {},
      fetchRange: async () => {
        calls++;
        if (calls < 3) throw Object.assign(new Error('25/second request limit reached'), { code: -32007 });
        return ['ok'];
      },
    });
    expect(out).toEqual(['ok']);
    expect(calls).toBe(3);
    await expect(scanLogs({ from: 0n, to: 9n, span: 200n, perWave: 1, waveMs: 0, sleep: async () => {}, fetchRange: async () => Promise.reject(new Error('execution reverted')) })).rejects.toThrow('execution reverted');
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError(new Error('eth_getLogs is limited to a 200 range'))).toBe(false);
    expect(isRangeError(new Error('eth_getLogs is limited to a 200 range'))).toBe(true);
  });
});

describe('chain shapes', () => {
  it('normalizeReserveView turns BPS / decimals into numbers whatever their uint width', () => {
    const v = normalizeReserveView({ asset: ADDR.usdc, decimals: 6, price: 100000000n, totalSupplied: 1n, totalBorrowed: 0n, availableLiquidity: 1n, utilization: 0n, supplyRate: 0n, borrowRate: 0n, ltv: 8000n, liquidationThreshold: 8500, liquidationBonus: 500n });
    expect([v.decimals, v.ltv, v.liquidationThreshold, v.liquidationBonus]).toEqual([6, 8000, 8500, 500]);
    expect(normalizeAccountData({ totalCollateralUsd: 1n, totalDebtUsd: 0n, borrowLimitUsd: 0n, availableBorrowsUsd: 0n, liquidationLimitUsd: 0n, healthFactor: MAX_UINT256 }).healthFactor).toBe(MAX_UINT256);
  });

  it('logsToEvents keeps valid events in chain order and skips malformed ones', () => {
    const base = { address: ADDR.pool, data: '0x', topics: [], blockHash: null, transactionIndex: 0, removed: false } as unknown as Log;
    const logs = [
      { ...base, eventName: 'Borrow', args: { asset: ADDR.usdc, user: borrower, amount: 5n }, blockNumber: 7n, logIndex: 1, transactionHash: '0x02' },
      { ...base, eventName: 'Supply', args: { asset: ADDR.weth, user: borrower, amount: 1n }, blockNumber: 7n, logIndex: 0, transactionHash: '0x01' },
      { ...base, eventName: 'Supply', args: { asset: ADDR.weth }, blockNumber: 8n, logIndex: 0, transactionHash: '0x03' }, // ABI mismatch: no user / amount
      { ...base, eventName: 'Borrow', args: { asset: ADDR.usdc, user: borrower, amount: 9n }, blockNumber: null, logIndex: null, transactionHash: null }, // pending
    ] as unknown as Parameters<typeof logsToEvents>[0];
    const out = logsToEvents(logs, new Map([[7n, 1_700_000_000_000]]));
    expect(out.map((e) => `${e.eventName}@${e.blockNumber}:${e.logIndex}`)).toEqual(['Supply@7:0', 'Borrow@7:1']);
    expect(out[0].timestamp).toBe(1_700_000_000_000);
  });

  it('a liquidation receipt yields (debtCovered, collateralSeized) from its event', () => {
    const topics = encodeEventTopics({ abi: poolAbi, eventName: 'Liquidation', args: { collateralAsset: ADDR.weth, debtAsset: ADDR.usdc, user: borrower } });
    const data = encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }, { type: 'address' }], [750_000_000n, 463_235_294_117_647_058n, accountByRole('Liquidator')]);
    const log = { address: ADDR.pool, topics, data, blockNumber: 9n, logIndex: 0, transactionHash: '0x09', blockHash: '0x00', transactionIndex: 0, removed: false } as unknown as Log;
    expect(resultFromReceiptLogs([log], ADDR.pool)).toEqual([750_000_000n, 463_235_294_117_647_058n]);
    // Logs from other contracts (the token's Transfer) are ignored.
    expect(resultFromReceiptLogs([{ ...log, address: ADDR.usdc }], ADDR.pool)).toBeUndefined();
  });
});
