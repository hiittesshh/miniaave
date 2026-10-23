/**
 * ================================================================================================
 *  Reconstructed from FRONTEND-GUIDE.md, then VERIFIED against the real
 *  aave/handoff/abis/LendingPool.json on 2026-10-14 (abi-check passes; real copy in ./real/).
 *  Only fix needed: getReserveData's struct output is named `v` in the real ABI.
 * ================================================================================================
 * Originally written before the real ABI files were available. This file
 * is rebuilt from the guide's §5 (actions), §6 (read functions and structs, fields in the guide's
 * table order), §9 (errors) and §10 (events, indexed fields in bold there). Every guess is listed in
 * docs/MINI_INTEGRATION.md ("ABI assumptions"). When the real JSON arrives, drop it in
 * `src/apps/mini/abis/real/` and run `npx vitest run abi-check`: it compares every signature and
 * selector below with the real one and prints the differences.
 *
 * Only what the frontend uses is here. Admin functions (listing / configuring reserves, setting the
 * oracle) and their events (ReserveListed, ReserveConfigured, OracleUpdated) are left out: the
 * guide names those events but not their fields, and guessing would only add noise.
 */

const reserveViewComponents = [
  { name: 'asset', type: 'address' },
  { name: 'decimals', type: 'uint8' },
  { name: 'price', type: 'uint256' },
  { name: 'totalSupplied', type: 'uint256' },
  { name: 'totalBorrowed', type: 'uint256' },
  { name: 'availableLiquidity', type: 'uint256' },
  { name: 'utilization', type: 'uint256' },
  { name: 'supplyRate', type: 'uint256' },
  { name: 'borrowRate', type: 'uint256' },
  { name: 'ltv', type: 'uint16' },
  { name: 'liquidationThreshold', type: 'uint16' },
  { name: 'liquidationBonus', type: 'uint16' },
] as const;

const userAccountDataComponents = [
  { name: 'totalCollateralUsd', type: 'uint256' },
  { name: 'totalDebtUsd', type: 'uint256' },
  { name: 'borrowLimitUsd', type: 'uint256' },
  { name: 'availableBorrowsUsd', type: 'uint256' },
  { name: 'liquidationLimitUsd', type: 'uint256' },
  { name: 'healthFactor', type: 'uint256' },
] as const;

const reserveConfigComponents = [
  { name: 'ltv', type: 'uint16' },
  { name: 'liquidationThreshold', type: 'uint16' },
  { name: 'liquidationBonus', type: 'uint16' },
  { name: 'reserveFactor', type: 'uint16' },
  { name: 'baseRate', type: 'uint256' },
  { name: 'slope1', type: 'uint256' },
  { name: 'slope2', type: 'uint256' },
  { name: 'optimalUtilization', type: 'uint256' },
] as const;

const assetAmount = [
  { name: 'asset', type: 'address' },
  { name: 'amount', type: 'uint256' },
] as const;

/** The four user events share one shape: asset and user indexed, amount not (§10). */
const userEventInputs = [
  { name: 'asset', type: 'address', indexed: true },
  { name: 'user', type: 'address', indexed: true },
  { name: 'amount', type: 'uint256', indexed: false },
] as const;

export const poolAbi = [
  // --- §5 actions --------------------------------------------------------------------------------
  { type: 'function', name: 'supply', stateMutability: 'nonpayable', inputs: assetAmount, outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: assetAmount, outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'borrow', stateMutability: 'nonpayable', inputs: assetAmount, outputs: [] },
  { type: 'function', name: 'repay', stateMutability: 'nonpayable', inputs: assetAmount, outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function',
    name: 'liquidate',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'collateralAsset', type: 'address' },
      { name: 'debtAsset', type: 'address' },
      { name: 'user', type: 'address' },
      { name: 'debtToCover', type: 'uint256' },
    ],
    outputs: [
      { name: 'debtCovered', type: 'uint256' },
      { name: 'collateralSeized', type: 'uint256' },
    ],
  },

  // --- §6 reads ----------------------------------------------------------------------------------
  { type: 'function', name: 'getReserveList', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address[]' }] },
  { type: 'function', name: 'getReserveData', stateMutability: 'view', inputs: [{ name: 'asset', type: 'address' }], outputs: [{ name: 'v', type: 'tuple', components: reserveViewComponents }] },
  {
    type: 'function',
    name: 'getUserReserveData',
    stateMutability: 'view',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'supplied', type: 'uint256' },
      { name: 'borrowed', type: 'uint256' },
    ],
  },
  { type: 'function', name: 'getUserAccountData', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: userAccountDataComponents }] },
  { type: 'function', name: 'getReserveConfig', stateMutability: 'view', inputs: [{ name: 'asset', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: reserveConfigComponents }] },
  { type: 'function', name: 'oracle', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },

  // --- §10 events --------------------------------------------------------------------------------
  { type: 'event', name: 'Supply', inputs: userEventInputs, anonymous: false },
  { type: 'event', name: 'Withdraw', inputs: userEventInputs, anonymous: false },
  { type: 'event', name: 'Borrow', inputs: userEventInputs, anonymous: false },
  { type: 'event', name: 'Repay', inputs: userEventInputs, anonymous: false },
  {
    type: 'event',
    name: 'Liquidation',
    anonymous: false,
    inputs: [
      { name: 'collateralAsset', type: 'address', indexed: true },
      { name: 'debtAsset', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'debtCovered', type: 'uint256', indexed: false },
      { name: 'collateralSeized', type: 'uint256', indexed: false },
      { name: 'liquidator', type: 'address', indexed: false },
    ],
  },

  // --- §9 errors (pool) ----------------------------------------------------------------------------
  { type: 'error', name: 'ZeroAmount', inputs: [] },
  { type: 'error', name: 'AssetNotListed', inputs: [] },
  { type: 'error', name: 'InsufficientBalance', inputs: [] },
  { type: 'error', name: 'InsufficientLiquidity', inputs: [] },
  { type: 'error', name: 'BorrowLimitExceeded', inputs: [] },
  { type: 'error', name: 'HealthFactorTooLow', inputs: [] },
  { type: 'error', name: 'PositionHealthy', inputs: [] },
  { type: 'error', name: 'NoDebt', inputs: [] },
  { type: 'error', name: 'NoCollateral', inputs: [] },
  // OpenZeppelin v5 (Ownable, SafeERC20, ReentrancyGuard): these signatures are OZ's own.
  { type: 'error', name: 'OwnableUnauthorizedAccount', inputs: [{ name: 'account', type: 'address' }] },
  { type: 'error', name: 'OwnableInvalidOwner', inputs: [{ name: 'owner', type: 'address' }] },
  { type: 'error', name: 'SafeERC20FailedOperation', inputs: [{ name: 'token', type: 'address' }] },
  { type: 'error', name: 'ReentrancyGuardReentrantCall', inputs: [] },
] as const;
