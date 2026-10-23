/**
 * WriteCall (what the screens build) → the exact viem call: which contract address, which ABI,
 * which function, which args. Pure, so it's unit-tested.
 *
 * Pool calls use `poolDecodingAbi` (pool + token + oracle errors): a token error thrown inside
 * supply / repay / liquidate then decodes by name (§9).
 */
import type { Abi } from 'viem';
import { erc20Abi, oracleAbi, poolDecodingAbi } from '../abis';
import type { ContractSet } from './config';
import type { Address, WriteCall } from './types';

export interface ViemCall {
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
}

export function toViemCall(call: WriteCall, c: ContractSet): ViemCall {
  switch (call.contract) {
    case 'pool':
      return { address: c.pool, abi: poolDecodingAbi as unknown as Abi, functionName: call.functionName, args: call.args };
    case 'token':
      return { address: call.address, abi: erc20Abi as unknown as Abi, functionName: call.functionName, args: call.args };
    case 'oracle':
      return { address: c.oracle, abi: oracleAbi as unknown as Abi, functionName: call.functionName, args: call.args };
  }
}
