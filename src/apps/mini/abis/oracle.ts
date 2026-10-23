/**
 * ================================================================================================
 *  Reconstructed from FRONTEND-GUIDE.md, then VERIFIED against the real
 *  aave/handoff/abis/MockOracle.json on 2026-10-14 (abi-check passes; real copy in ./real/).
 * ================================================================================================
 * MockOracle (§5 "Oracle", §9, §10): getPrice / setPrice / owner, the PriceSet event and its errors.
 * Fixed after the check: getPrice's output is named `price`; PriceNotSet takes (address asset).
 */
export const oracleAbi = [
  { type: 'function', name: 'getPrice', stateMutability: 'view', inputs: [{ name: 'asset', type: 'address' }], outputs: [{ name: 'price', type: 'uint256' }] },
  { type: 'function', name: 'setPrice', stateMutability: 'nonpayable', inputs: [{ name: 'asset', type: 'address' }, { name: 'price', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'event', name: 'PriceSet', anonymous: false, inputs: [{ name: 'asset', type: 'address', indexed: true }, { name: 'price', type: 'uint256', indexed: false }] },
  { type: 'error', name: 'ZeroPrice', inputs: [] },
  { type: 'error', name: 'PriceNotSet', inputs: [{ name: 'asset', type: 'address' }] },
  // OpenZeppelin v5 Ownable, exact OZ signatures.
  { type: 'error', name: 'OwnableUnauthorizedAccount', inputs: [{ name: 'account', type: 'address' }] },
  { type: 'error', name: 'OwnableInvalidOwner', inputs: [{ name: 'owner', type: 'address' }] },
] as const;
