/**
 * OP Stack L1StandardBridge, the official ETH bridge from Ethereum Sepolia to Base Sepolia.
 *
 * Address (Ethereum Sepolia, chain 11155111): 0xfd0Bf71F60660E2f608ed56e1659C450eB113120
 *   Source: docs.base.org, "Base Contracts" → L1 contract addresses → Ethereum Sepolia →
 *   L1StandardBridge (Base Sepolia's bridge), checked by Agent 1 on 2026-10-19; and the OP source
 *   (optimism/packages/contracts-bedrock/src/L1/L1StandardBridge.sol).
 *
 * Only the one function we call: depositETH(uint32 _minGasLimit, bytes _extraData), payable. It
 * deposits msg.value to the SAME address on L2, like the bridge's receive(); both are EOA-only
 * (onlyEOA), so it works from a normal MetaMask account. The ETH arrives on Base Sepolia after the
 * deposit is relayed (usually 2–5 minutes).
 */
export const L1_STANDARD_BRIDGE_BASE_SEPOLIA = '0xfd0Bf71F60660E2f608ed56e1659C450eB113120' as const;

export const l1StandardBridgeAbi = [
  {
    type: 'function',
    name: 'depositETH',
    stateMutability: 'payable',
    inputs: [
      { name: '_minGasLimit', type: 'uint32' },
      { name: '_extraData', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

/** Gas the L2 side may use to credit the deposit (OP docs use 200,000 for plain ETH deposits). */
export const BRIDGE_MIN_GAS_LIMIT = 200_000;
