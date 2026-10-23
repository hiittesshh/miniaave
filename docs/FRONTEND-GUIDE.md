# Mini-Aave — Frontend Integration Guide

For the frontend developer. Everything you need to build the website on top of the Mini-Aave contracts.
Last updated: 2026-10-14.

## Contents

1. [Overview](#1-overview)
2. [Networks, addresses and ABIs](#2-networks-addresses-and-abis)
3. [Run everything on your laptop](#3-run-everything-on-your-laptop)
4. [Units and number formatting](#4-units-and-number-formatting)
5. [Contract reference: actions](#5-contract-reference-actions)
6. [Contract reference: read functions](#6-contract-reference-read-functions)
7. [Screens: what to call for each part of the UI](#7-screens-what-to-call-for-each-part-of-the-ui)
8. [Sending transactions (with code)](#8-sending-transactions-with-code)
9. [Errors and the messages to show](#9-errors-and-the-messages-to-show)
10. [Events and transaction history](#10-events-and-transaction-history)
11. [Demo: crash the price and liquidate](#11-demo-crash-the-price-and-liquidate)
12. [Mock data to build with](#12-mock-data-to-build-with)
13. [Common mistakes and the PR checklist](#13-common-mistakes-and-the-pr-checklist)
14. [What's next and who to ask](#14-whats-next-and-who-to-ask)

---

## 1. Overview

You're building the website for **Mini-Aave**: a lending pool where people deposit USDC or WETH to earn interest, borrow against their deposits, and liquidate loans that became unsafe. The smart contracts are finished, tested (97 automated tests) and **live on the Base Sepolia testnet**, with their source code verified on Basescan. Develop against a local blockchain; demo and share on Base Sepolia.

| Item | Status | Where |
|---|---|---|
| Contracts: lending pool, 2 test tokens, price oracle | Done and tested | `aave/src/` |
| ABI files | Ready | `aave/handoff/abis/` |
| Local chain addresses | Ready, never change | [Section 2](#2-networks-addresses-and-abis) |
| Base Sepolia (public testnet) | **Live, source verified on Basescan** | [Section 2](#2-networks-addresses-and-abis) |

**Suggested stack:** Next.js + wagmi + viem + RainbowKit. The code samples below use viem directly; the matching wagmi hooks are `useReadContract` / `useReadContracts`, `useSimulateContract`, `useWriteContract` and `useWaitForTransactionReceipt`.

**Screens to build:**

1. **Markets:** every token with price, totals, APYs and utilization.
2. **Dashboard:** the user's collateral, debt, health factor, supplies and borrows.
3. **Action modals:** Supply, Withdraw, Borrow, Repay, each with a Max button.
4. **Faucet buttons:** free test USDC and WETH.
5. **Liquidations (for the demo):** unsafe positions with a Liquidate button.
6. **Admin box (for the demo):** set the WETH price. Show it only to the owner wallet.

**Five words you'll see everywhere:**

| Word | Meaning |
|---|---|
| Supply | Deposit tokens into the pool. They earn interest and count as collateral. |
| Collateral | What you supplied, which backs your loans. |
| Borrow limit | The most you may borrow: 80% of your collateral's value. |
| Health factor | Safety score of a loan. Above 1 is safe. Below 1, anyone may liquidate part of it. |
| Liquidation | Someone repays part of an unsafe loan and receives the borrower's collateral at a 5% discount. |

---

## 2. Networks, addresses and ABIs

Develop on the local chain: it's instant, free and resets on restart. Demo and share on Base Sepolia. Switching between them only changes the chain and the four addresses.

| | Local (anvil) | Base Sepolia |
|---|---|---|
| Chain id | `31337` | `84532` |
| RPC | `http://127.0.0.1:8545` | `https://sepolia.base.org` |
| Block explorer | none | `https://sepolia.basescan.org` |
| Gas token | fake ETH (pre-funded) | test ETH from a Base Sepolia faucet |
| viem chain | `anvil` (from `viem/chains`) | `baseSepolia` (from `viem/chains`) |
| Addresses file | `aave/deployments/31337.json` | `aave/deployments/84532.json` |
| Deployment block (start event queries here) | `0` | `48102059` |

**Contract addresses.** Keep them in one config file keyed by chain id:

```ts
// contracts.ts
export const CONTRACTS = {
  31337: {
    pool:   "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    oracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    usdc:   "0x5FbDB2315678afecb367f032d93F642f64180aa3", // 6 decimals
    weth:   "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // 18 decimals
  },
  84532: {
    pool:   "0xB9b209a874cf566076dA34c5930AC4A348e7a107",
    oracle: "0x73BD29D3041206b21426f5C7126e5065195BC099",
    usdc:   "0xcbd96F714186C1Ba1a84883b7170FA104716A2a3", // 6 decimals
    weth:   "0x18Ce51aC4482E23103992e878804a06bEC8F6B20", // 18 decimals
  },
} as const;
```

**On Basescan** (source verified, so you can read the code and call functions from the "Contract" tab):

| Contract | Basescan |
|---|---|
| Pool | [0xB9b2…a107](https://sepolia.basescan.org/address/0xB9b209a874cf566076dA34c5930AC4A348e7a107) |
| Oracle | [0x73BD…C099](https://sepolia.basescan.org/address/0x73BD29D3041206b21426f5C7126e5065195BC099) |
| USDC (mock) | [0xcbd9…A2a3](https://sepolia.basescan.org/address/0xcbd96F714186C1Ba1a84883b7170FA104716A2a3) |
| WETH (mock) | [0x18Ce…6B20](https://sepolia.basescan.org/address/0x18Ce51aC4482E23103992e878804a06bEC8F6B20) |

The pool started with 100,000 USDC and 10 WETH supplied. The owner (admin) on Base Sepolia is `0x99788e1d8b0fb55693587804049DE698839d98B0`, the senior developer's deployer wallet.

**Using Base Sepolia:** add the network to MetaMask (RPC `https://sepolia.base.org`, chain id `84532`, symbol `ETH`, explorer `https://sepolia.basescan.org`). Each wallet needs a little test ETH for gas. The **Coinbase Developer Platform faucet** (portal.cdp.coinbase.com → Faucets → Base Sepolia → ETH) works with empty wallets; most other faucets require real mainnet ETH. Test USDC and WETH come from the app's `faucet()` buttons.

The local addresses are the same every time someone deploys to a fresh local chain. A contract address is calculated from the deployer's address and its transaction count, and both start the same.

**ABI files** (in `aave/handoff/abis/`):

| File | Use it for |
|---|---|
| `LendingPool.json` | **The pool.** Every function, event and error. |
| `MockERC20.json` | USDC and WETH: the standard ERC-20 functions plus `faucet()` and `mint()`. |
| `MockOracle.json` | Prices: `getPrice(token)`, plus `setPrice` and `owner()` for the admin box. |
| `ILendingPool.json` | The original agreement shared earlier. It is fully contained, unchanged, in `LendingPool.json`. Switch to `LendingPool.json`. |

**Type safety tip:** a plain `.json` import gives viem no types. Paste each ABI into a `.ts` file and end it with `as const`:

```ts
// abis/pool.ts
export const poolAbi = [ /* contents of LendingPool.json */ ] as const;
```

Then function names, arguments and return values are all type-checked. The `@wagmi/cli` Foundry plugin can also generate these files for you.

---

## 3. Run everything on your laptop

You can run the full stack locally in about 10 minutes, with free fake money.

1. **Install Foundry.** On Windows, use Git Bash.
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```
2. **Get the `aave` project folder** from the senior developer.
3. **Terminal 1:** start the local blockchain and leave it running.
   ```bash
   anvil
   ```
4. **Terminal 2, inside the `aave` folder:** deploy everything. This also puts 100,000 USDC and 10 WETH into the pool as starting money.
   ```bash
   forge script script/Deploy.s.sol --rpc-url local --broadcast \
     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
5. **MetaMask:** add a network.
   - Name: `Anvil`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain id: `31337`
   - Currency symbol: `ETH`
6. **MetaMask:** import the test accounts you need from the table below. Each has 10,000 fake ETH for gas.
7. **In your app:** call `faucet()` on USDC (10,000 USDC per call) or WETH (5 WETH per call) to get test tokens.

**Test accounts.** These are anvil's built-in accounts. Their keys are public: they only work on your laptop. Never send real funds to them.

| Role | Address | Private key |
|---|---|---|
| Owner (deployed everything; can set prices) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| Borrower | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| Liquidator | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

**When you restart anvil:**
- Everything is wiped. Deploy again (step 4); the addresses come back the same.
- MetaMask still remembers the old transactions, so new ones fail with a "nonce" error. Fix it in MetaMask: Settings → Advanced → **Clear activity tab data**, for each account.

**Quick end-to-end check.** `bash script/rehearse-local.sh` starts its own fresh chain, plays the whole story (borrow → price drop → liquidation), and prints `REHEARSAL PASSED`. Run it with no other anvil running, because both use port 8545.

---

## 4. Units and number formatting

Every number from the contracts is a whole number (a **BigInt**) with hidden decimals. Format it with the right number of decimals, or the UI will be wrong by up to a factor of 10¹².

| Value | Unit | Display with viem |
|---|---|---|
| Token amounts (`supplied`, `borrowed`, `totalSupplied`, `availableLiquidity`, wallet balances) | the token's decimals: **USDC 6, WETH 18** | `formatUnits(x, decimals)` |
| Prices and every field ending in `Usd` | 8 decimals | `formatUnits(x, 8)` |
| `ltv`, `liquidationThreshold`, `liquidationBonus`, `reserveFactor` | basis points: 10,000 = 100% | `Number(x) / 100` then add `%` |
| `supplyRate`, `borrowRate`, `utilization` | WAD: 10¹⁸ = 100% | `formatUnits(x, 16)` then add `%` |
| `healthFactor` | WAD: 10¹⁸ = 1.0 | `formatUnits(x, 18)`; if it equals `maxUint256`, show **∞** |

**Examples:**

| Raw value from the contract | What it is | Show |
|---|---|---|
| `12500000` | USDC amount | 12.5 USDC |
| `1000000000000000000` | WETH amount | 1 WETH |
| `200000000000` | USD value | $2,000.00 |
| `8000` | LTV | 80% |
| `22222222222222222` | borrow rate (APR) | 2.22% |
| `1133333333333333333` | health factor | 1.13 |
| `115792…639935` (`maxUint256`) | health factor with no debt | ∞ |

**Rules:**
- **User input → contract:** `parseUnits("12.5", decimals)` with **that token's** decimals. Never `parseEther` for USDC.
- **Never do math with JS `Number`.** It loses precision above about 9 × 10¹⁵, and 1 WETH is 10¹⁸. Use BigInt for math and for anything you send. Convert to `Number` only at the very end, for display.
- **Read `decimals` per token**, from the reserve data or the token. Don't hard-code 18.

**Helpers you can copy:**

```ts
import { formatUnits, maxUint256 } from "viem";

// Token amount → "1,234.5678"
export const fmtToken = (v: bigint, decimals: number, dp = 4) =>
  Number(formatUnits(v, decimals)).toLocaleString("en-US", { maximumFractionDigits: dp });

// USD (8 decimals) → "$1,234.56"
export const fmtUsd = (v: bigint) =>
  "$" + Number(formatUnits(v, 8)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Health factor → "1.13" or "∞"
export const fmtHealth = (hf: bigint) =>
  hf === maxUint256 ? "∞" : Number(formatUnits(hf, 18)).toFixed(2);

// Rate (WAD APR) → APY in percent, as Aave's UI shows it
export const aprToApyPercent = (rateWad: bigint) => {
  const apr = Number(formatUnits(rateWad, 18));
  return (Math.pow(1 + apr / 31536000, 31536000) - 1) * 100;
};
```

**Rates are APR** (simple yearly rate). Show APY in the UI, like Aave does, using `aprToApyPercent`.

---

## 5. Contract reference: actions

There are five write functions on the pool. Supply, repay and liquidate need an ERC-20 **approve** first. Withdraw and repay accept **`maxUint256` to mean "all of it"**.

| Function | Approve first? | What it does | Returns | Can fail with |
|---|---|---|---|---|
| `supply(asset, amount)` | **Yes**, `amount` of `asset` | Deposits tokens. They earn interest and count as collateral immediately. | nothing | `ZeroAmount`, `AssetNotListed`, token `ERC20InsufficientAllowance` / `ERC20InsufficientBalance` |
| `withdraw(asset, amount)` | No | Takes supplied tokens back. `maxUint256` = everything. | exact amount sent | `ZeroAmount`, `AssetNotListed`, `InsufficientBalance`, `InsufficientLiquidity`, `HealthFactorTooLow` |
| `borrow(asset, amount)` | No | Borrows against collateral, variable rate. | nothing | `ZeroAmount`, `AssetNotListed`, `InsufficientLiquidity`, `BorrowLimitExceeded` |
| `repay(asset, amount)` | **Yes**, at least the amount | Pays back debt. `maxUint256` = all of it. Never takes more than is owed. | exact amount taken | `ZeroAmount`, `AssetNotListed`, `NoDebt`, token allowance/balance errors |
| `liquidate(collateralAsset, debtAsset, user, debtToCover)` | **Yes**, `debtToCover` of `debtAsset` | Repays part of an unsafe loan (health below 1) and receives collateral worth that amount + 5%. At most 50% of the debt per call. | `(debtCovered, collateralSeized)` | `ZeroAmount`, `AssetNotListed`, `PositionHealthy`, `NoDebt`, `NoCollateral`, `InsufficientLiquidity` |

All amounts are in the token's own units (see section 4). `asset` is the token's address.

**Notes per action:**
- **Supply:** a tiny amount can fail with `ZeroAmount` once interest has accrued (it would be worth less than one internal unit). It only happens with dust amounts.
- **Withdraw:** fails with `InsufficientLiquidity` when the money is currently lent out; savers wait until borrowers repay. It fails with `HealthFactorTooLow` if the withdrawal would make the user's loans unsafe.
- **Borrow:** allowed while total debt stays at or below the borrow limit (80% of collateral value).
- **Repay:** use `maxUint256` to clear the debt completely. Interest grows every second, so any exact number leaves dust behind.
- **Liquidate:** `debtCovered` can be less than `debtToCover`, because of the 50% cap or because the borrower ran out of collateral.

**Token contracts** (USDC and WETH, `MockERC20.json`):

| Function | Use |
|---|---|
| `faucet()` | Gives the caller free test tokens: 10,000 USDC or 5 WETH per call. No approve needed. |
| `balanceOf(user)` | Wallet balance, in token units |
| `allowance(owner, spender)` | How much the pool may currently take |
| `approve(spender, amount)` | Let the pool take up to `amount` |
| `decimals()`, `symbol()`, `name()` | Token info (USDC: 6, WETH: 18) |

**Oracle** (`MockOracle.json`):

| Function | Use |
|---|---|
| `getPrice(token)` | USD price of one whole token, 8 decimals (`200000000000` = $2000) |
| `owner()` | The admin address. Show the admin box only if the connected wallet equals this. |
| `setPrice(token, price)` | Owner only. Used in the demo to drop the WETH price. |

---

## 6. Contract reference: read functions

Six free read functions cover every screen. All values are **live**: interest is counted up to the current second, even if nobody has used the pool for hours.

| Function | Returns | Use it for |
|---|---|---|
| `getReserveList()` | `address[]`: [USDC, WETH] | Which tokens exist |
| `getReserveData(asset)` | `ReserveView` (object, below) | Markets page, one row per token |
| `getUserReserveData(asset, user)` | `[supplied, borrowed]` (array, token units) | Dashboard rows |
| `getUserAccountData(user)` | `UserAccountData` (object, below) | Dashboard header, borrow limits, health |
| `getReserveConfig(asset)` | `ReserveConfig` (object, below) | Optional: settings and interest curve details |
| `oracle()` | `address` | The oracle contract the pool uses |

viem returns a struct as an object with named fields (`data.healthFactor`). A function with several plain outputs comes back as an array: `const [supplied, borrowed] = data`.

**JS types:** the small integer fields arrive as JS `number`. These are `decimals` (uint8) and `ltv`, `liquidationThreshold`, `liquidationBonus`, `reserveFactor` (uint16). Every other number arrives as `bigint`.

**`ReserveView`** (from `getReserveData`):

| Field | Unit | Meaning |
|---|---|---|
| `asset` | address | The token |
| `decimals` | number | Token decimals (6 or 18) |
| `price` | USD, 8 dec | Price of one whole token |
| `totalSupplied` | token units | Everything supplied, interest included |
| `totalBorrowed` | token units | Everything borrowed, interest included |
| `availableLiquidity` | token units | Cash in the pool that can be borrowed or withdrawn right now |
| `utilization` | WAD | Share of the supplied money that is borrowed |
| `supplyRate` | WAD, APR | What savers earn per year |
| `borrowRate` | WAD, APR | What borrowers pay per year |
| `ltv` | BPS | Borrow limit as a share of collateral (8000 = 80%) |
| `liquidationThreshold` | BPS | Danger line (8500 = 85%) |
| `liquidationBonus` | BPS | Liquidator's discount (500 = 5%) |

**`UserAccountData`** (from `getUserAccountData`):

| Field | Unit | Meaning |
|---|---|---|
| `totalCollateralUsd` | USD, 8 dec | Value of everything the user supplied |
| `totalDebtUsd` | USD, 8 dec | Value of everything the user owes |
| `borrowLimitUsd` | USD, 8 dec | Maximum total debt allowed: collateral × LTV |
| `availableBorrowsUsd` | USD, 8 dec | Borrow limit minus debt (0 if over) |
| `liquidationLimitUsd` | USD, 8 dec | Danger line: collateral × liquidation threshold |
| `healthFactor` | WAD | `liquidationLimitUsd ÷ totalDebtUsd`. Below 1 = liquidatable. `maxUint256` when there's no debt. |

**`ReserveConfig`** (from `getReserveConfig`, optional):

| Field | Unit | Demo value (USDC / WETH) |
|---|---|---|
| `ltv` | BPS | 8000 / 8000 |
| `liquidationThreshold` | BPS | 8500 / 8500 |
| `liquidationBonus` | BPS | 500 / 500 |
| `reserveFactor` | BPS | 1000 / 1000 (pool keeps 10% of interest) |
| `baseRate` | WAD | 0 / 0 |
| `slope1` | WAD | 4% / 3% |
| `slope2` | WAD | 60% / 80% |
| `optimalUtilization` | WAD | 90% / 80% (where the rate curve bends) |

---

## 7. Screens: what to call for each part of the UI

### Markets page

Call `getReserveList()` once, then `getReserveData(asset)` for each token. Batch them with `useReadContracts`, which sends one request.

| Column | From | Format |
|---|---|---|
| Token | `asset` → token `symbol()` | text |
| Price | `price` | `fmtUsd` |
| Total supplied | `totalSupplied` | `fmtToken(…, decimals)` |
| Total borrowed | `totalBorrowed` | `fmtToken(…, decimals)` |
| Available | `availableLiquidity` | `fmtToken(…, decimals)` |
| Supply APY | `supplyRate` | `aprToApyPercent` |
| Borrow APY | `borrowRate` | `aprToApyPercent` |
| Utilization | `utilization` | `formatUnits(x, 16)` + `%` |
| Max LTV | `ltv` | `/ 100` + `%` |

### Dashboard

**Header** (one call: `getUserAccountData(user)`):

| Item | Calculation |
|---|---|
| Collateral | `totalCollateralUsd` |
| Debt | `totalDebtUsd` |
| Net worth | `totalCollateralUsd − totalDebtUsd` |
| Available to borrow | `availableBorrowsUsd` |
| Borrow power used | `totalDebtUsd / borrowLimitUsd` as a percent (0 if the limit is 0) |
| Health factor | `fmtHealth(healthFactor)`, coloured: ≥ 1.5 green · 1.1–1.5 amber · below 1.1 red · below 1 label it "Can be liquidated" |

**Rows** (per token: `getUserReserveData(asset, user)` plus the token's `balanceOf(user)`):

| Section | Show when | Columns | Button |
|---|---|---|---|
| Your supplies | `supplied > 0` | token, amount, supply APY | Withdraw |
| Your borrows | `borrowed > 0` | token, amount, borrow APY | Repay |
| Assets to supply | always | token, wallet balance, supply APY | Supply · Faucet |
| Assets to borrow | always | token, max you can borrow, borrow APY | Borrow |

**Max you can borrow, in tokens:**

```ts
const maxByLimit = (availableBorrowsUsd * 10n ** BigInt(decimals)) / price; // USD → token units
const withMargin = maxByLimit * 99n / 100n;                                 // 1% margin: interest moves
const maxBorrow  = withMargin < availableLiquidity ? withMargin : availableLiquidity; // can't exceed pool cash
```

### Health factor preview in the modals (recommended)

Show "health factor after this action" before the user signs. Use `liquidationLimitUsd` and `totalDebtUsd` from `getUserAccountData`, and the token's `price` and `liquidationThreshold` from `getReserveData`:

| Action | New health factor |
|---|---|
| Supply X | (liquidationLimit + X·price·threshold) ÷ debt |
| Withdraw X | (liquidationLimit − X·price·threshold) ÷ debt |
| Borrow Y | liquidationLimit ÷ (debt + Y·price) |
| Repay Y | liquidationLimit ÷ (debt − Y·price) |

Do these in BigInt: `X·price` = `X * price / 10n ** BigInt(decimals)` (USD, 8 dec) and `·threshold` = `* BigInt(liquidationThreshold) / 10000n`. Warn the user if the result is below 1.1, and disable the button if it would be below 1 (for withdraw and borrow).

### When to refresh

- After **every confirmed** transaction: refetch everything on the screen.
- Every ~15 seconds while the page is open, because interest changes the numbers.
- After the user switches account or network.

---

## 8. Sending transactions (with code)

Every write follows the same steps:

```
1. Check the allowance ──(enough)──────────────────────────────┐
        │ (too low)                                             │
        ▼                                                       ▼
2. approve(pool, amount) → WAIT for the receipt  →  3. simulate the call
                                                        │ reverts → show the error message, stop
                                                        ▼ ok
                                                    4. send it
                                                        ▼
                                                    5. WAIT for the receipt
                                                        │ status "reverted" → show error
                                                        ▼ "success"
                                                    6. show success, refetch everything
```

Steps 1–2 only apply to supply, repay and liquidate. Borrow and withdraw start at step 3.

**Supply, in viem:**

```ts
import { parseUnits, erc20Abi } from "viem";
import { poolAbi } from "./abis/pool";

const amount = parseUnits("100", 6); // 100 USDC → 100000000n

// 1. How much may the pool already take?
const allowance = await publicClient.readContract({
  address: USDC, abi: erc20Abi, functionName: "allowance", args: [account, POOL],
});

// 2. Approve only if needed, and WAIT until it is mined.
if (allowance < amount) {
  const approveHash = await walletClient.writeContract({
    address: USDC, abi: erc20Abi, functionName: "approve", args: [POOL, amount], account,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
}

// 3. Simulate: a revert shows up here, decoded, before the user pays gas.
const { request } = await publicClient.simulateContract({
  address: POOL, abi: poolAbi, functionName: "supply", args: [USDC, amount], account,
});

// 4. Send it.
const hash = await walletClient.writeContract(request);

// 5. Wait for the receipt and check it.
const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error("Transaction reverted");

// 6. Show success, then refetch everything on screen.
```

**The other actions:**

| Action | Approve | Call |
|---|---|---|
| Withdraw | no | `withdraw(asset, amount)`; Max button → `withdraw(asset, maxUint256)` |
| Borrow | no | `borrow(asset, amount)` |
| Repay | yes | `repay(asset, amount)`; Max button → `repay(asset, maxUint256)` |
| Liquidate | yes, the debt token | `liquidate(collateralAsset, debtAsset, user, debtToCover)` |
| Faucet | no | `faucet()` on the token contract |

**Max buttons:**
- **Withdraw Max:** show `supplied` from `getUserReserveData` as the amount, but **send `maxUint256`**. The balance grows every second, so the shown number would leave dust behind.
- **Repay Max:** show `borrowed`, and **send `maxUint256`**. Approve a little more than the debt, because it grows while the user signs:
  ```ts
  const approveAmount = borrowed + borrowed / 1000n + 1n; // +0.1%
  ```
  The pool only takes the exact debt at that second. It's exactly what `getUserReserveData` would return then, and a test proves this.

**Also:**
- Disable the button while a transaction is pending, so a double click can't send twice.
- Show the transaction hash with an explorer link once you have it (Base Sepolia: `https://sepolia.basescan.org/tx/<hash>`).
- If the wallet is on the wrong chain, show "Switch network" instead of the action buttons (wagmi: `useSwitchChain`).

---

## 9. Errors and the messages to show

Pass the pool ABI to viem and reverts come back as **named errors**. Map each name to a message.

| Error name | Comes from | Message to show |
|---|---|---|
| `ZeroAmount` | pool | Enter an amount greater than 0 (or the amount is too small). |
| `AssetNotListed` | pool | This token isn't supported. |
| `InsufficientBalance` | pool | You can't withdraw more than you supplied. |
| `InsufficientLiquidity` | pool | Not enough liquidity in the pool right now. Try a smaller amount or later. |
| `BorrowLimitExceeded` | pool | This would exceed your borrow limit. |
| `HealthFactorTooLow` | pool | This withdrawal would put your loan at risk of liquidation. |
| `PositionHealthy` | pool | This position is healthy and can't be liquidated. |
| `NoDebt` | pool | There's no debt to repay here. |
| `NoCollateral` | pool | This user has no collateral in that token. |
| `OwnableUnauthorizedAccount` | pool / oracle | Only the admin can do this. |
| `SafeERC20FailedOperation` | pool | The token transfer failed. |
| `ReentrancyGuardReentrantCall` | pool | Transaction failed. (Shouldn't happen in normal use.) |
| `ERC20InsufficientAllowance` | token | Please approve the token first. |
| `ERC20InsufficientBalance` | token | Not enough tokens in your wallet. |
| `ZeroPrice`, `PriceNotSet` | oracle | Price not available. |
| user rejected the request | wallet | Transaction cancelled. |

**Decoding in viem:**

```ts
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

try {
  // simulate + write, as in section 8
} catch (err) {
  if (err instanceof BaseError) {
    if (err.walk(e => e instanceof UserRejectedRequestError)) return toast("Transaction cancelled.");
    const revert = err.walk(e => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? "";
      return toast(MESSAGES[name] ?? "Transaction failed.");
    }
  }
  toast("Something went wrong. Please try again.");
}
```

**Token errors** (`ERC20Insufficient…`) are thrown by the token contract inside the pool call. To decode them by name, simulate with the pool ABI plus the token's errors:

```ts
const abiForDecoding = [...poolAbi, ...mockErc20Abi.filter(x => x.type === "error")];
```

---

## 10. Events and transaction history

Five events cover the user's history. Filter by the indexed `user` field.

| Event | Fields (indexed in bold) |
|---|---|
| `Supply` | **asset**, **user**, amount |
| `Withdraw` | **asset**, **user**, amount |
| `Borrow` | **asset**, **user**, amount |
| `Repay` | **asset**, **user**, amount |
| `Liquidation` | **collateralAsset**, **debtAsset**, **user**, debtCovered, collateralSeized, liquidator |

Admin events: `ReserveListed`, `ReserveConfigured` and `OracleUpdated` on the pool, and `PriceSet(asset, price)` on the oracle.

```ts
const supplies = await publicClient.getContractEvents({
  address: POOL, abi: poolAbi, eventName: "Supply",
  args: { user: account },          // only works on indexed fields
  fromBlock: DEPLOY_BLOCK,          // local: 0n; Base Sepolia: 48102059n
});
```

On Base Sepolia, the public RPC may limit how many blocks one log query can cover. Start from the deployment block and query in chunks if you get a range error.

---

## 11. Demo: crash the price and liquidate

To show a liquidation, the owner wallet lowers the WETH price. Here is the script for the demo, with the numbers you should see:

| Step | Who | Action | Expected |
|---|---|---|---|
| 1 | Borrower | Faucet WETH, supply 1 WETH | Collateral $2,000, borrow limit $1,600 |
| 2 | Borrower | Borrow 1,500 USDC | Health factor 1.13 |
| 3 | Owner | `oracle.setPrice(WETH, 170000000000)` ($1,700) | Borrower's health factor 0.96, can be liquidated |
| 4 | Liquidator | Faucet USDC, approve 750 USDC, `liquidate(WETH, USDC, borrower, 750000000)` | Receives about 0.4632 WETH (worth $787.50) |
| 5 | — | Refresh the borrower | 0.5368 WETH left, 750 USDC debt, health 1.03 |

**Admin box:** a price input in dollars → `parseUnits(value, 8)` → `setPrice(WETH, price)` on the oracle. Show the box only when the connected wallet equals `oracle.owner()`. Locally that's the Owner test account; on Base Sepolia it's the senior developer's deployer wallet. Any other wallet gets `OwnableUnauthorizedAccount`.

**Liquidations page:** there's no list of borrowers on-chain. Build it like this:
1. Read all `Borrow` events and collect the unique `user` addresses.
2. Call `getUserAccountData(user)` for each.
3. Show the ones with `healthFactor` below 10¹⁸ (1.0), with their collateral and debt.
4. The Liquidate button repays up to 50% of the debt. The liquidator chooses the collateral token and the debt token.

---

## 12. Mock data to build with

Build the screens before connecting a wallet, using these exact shapes. BigInts are written as strings here; in your app they are `bigint`.

```jsonc
// getReserveList()
["0x5FbDB2315678afecb367f032d93F642f64180aa3", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"]

// getReserveData(USDC): 100,000 supplied, 50,000 borrowed
{
  "asset": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "decimals": 6,
  "price": "100000000",                       // $1.00
  "totalSupplied": "100000000000",            // 100,000 USDC
  "totalBorrowed": "50000000000",             // 50,000 USDC
  "availableLiquidity": "50000000000",        // 50,000 USDC
  "utilization": "500000000000000000",        // 50%
  "supplyRate": "10000000000000000",          // 1.00% APR
  "borrowRate": "22222222222222222",          // 2.22% APR
  "ltv": 8000, "liquidationThreshold": 8500, "liquidationBonus": 500
}

// getReserveData(WETH): 10 supplied, nothing borrowed
{
  "asset": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "decimals": 18,
  "price": "200000000000",                    // $2,000.00
  "totalSupplied": "10000000000000000000",    // 10 WETH
  "totalBorrowed": "0",
  "availableLiquidity": "10000000000000000000",
  "utilization": "0",
  "supplyRate": "0",
  "borrowRate": "0",
  "ltv": 8000, "liquidationThreshold": 8500, "liquidationBonus": 500
}

// getUserAccountData(borrower): 1 WETH supplied, 1,500 USDC borrowed
{
  "totalCollateralUsd":  "200000000000",        // $2,000
  "totalDebtUsd":        "150000000000",        // $1,500
  "borrowLimitUsd":      "160000000000",        // $1,600
  "availableBorrowsUsd": "10000000000",         // $100
  "liquidationLimitUsd": "170000000000",        // $1,700
  "healthFactor":        "1133333333333333333"  // 1.13
}

// getUserAccountData(someone with no loans)
{ "totalCollateralUsd": "0", "totalDebtUsd": "0", "borrowLimitUsd": "0",
  "availableBorrowsUsd": "0", "liquidationLimitUsd": "0",
  "healthFactor": "115792089237316195423570985008687907853269984665640564039457584007913129639935" } // ∞

// getUserReserveData(WETH, borrower) → [supplied, borrowed]
["1000000000000000000", "0"]                  // 1 WETH supplied

// getUserReserveData(USDC, borrower)
["0", "1500000000"]                           // 1,500 USDC borrowed
```

---

## 13. Common mistakes and the PR checklist

Most first-dApp bugs come from number handling and from not waiting for transactions.

| Mistake | Why it breaks | Do this instead |
|---|---|---|
| `Number(amount)` or `parseFloat` on token amounts | JS numbers lose precision on numbers as large as 10¹⁸ | BigInt, `parseUnits`, `formatUnits` |
| 18 decimals used for USDC | Amounts are off by 10¹² | Use each token's own decimals |
| Sending supply right after approve | The approve isn't mined yet, so supply fails | Wait for the approve's receipt |
| Max sends the number shown on screen | The balance grows every second: dust is left or it reverts | Send `maxUint256` |
| "Success" shown when the transaction is sent | It can still fail on-chain | Wait for the receipt; check `status === "success"` |
| Raw hex errors shown to users | The error wasn't decoded | Decode with the ABI; map names to messages |
| A private key or API secret in frontend code | Everything in the browser is public | Secrets only on a server, never in the app |
| No wrong-network handling | Calls go to a chain where the contracts don't exist | Check the chain id; offer "Switch network" |

**Before you open a pull request:**

- [ ] All token math is BigInt; `parseUnits` / `formatUnits` use each token's decimals
- [ ] Approve → wait for receipt → simulate → send → wait for receipt → refetch
- [ ] Max buttons send `maxUint256` for withdraw and repay
- [ ] Repay Max approves debt + 0.1%
- [ ] Every write is simulated first; errors show the messages from section 9
- [ ] User-rejected transactions show "Transaction cancelled", not an error
- [ ] The wrong network is detected and a switch is offered
- [ ] Health factor shows ∞ with no debt, and is coloured by risk
- [ ] Buttons are disabled while a transaction is pending
- [ ] Data refetches after each confirmed transaction and every ~15 s
- [ ] Contract addresses come from one config keyed by chain id
- [ ] No private keys or secret API keys anywhere in the frontend

---

## 14. What's next and who to ask

- **Base Sepolia is live.** The four addresses are in section 2 and in `aave/deployments/84532.json`. Point wagmi at the `baseSepolia` chain with the RPC `https://sepolia.base.org`. If that public RPC rate-limits you, a free Alchemy or Infura Base Sepolia RPC URL works the same way.
- **Hosting:** the app is a plain website with no backend and no secrets, so Vercel or Netlify are enough.
- **Nothing in the contract API will change.** New functions might be added later, but existing names, arguments, return values, events and errors stay the same.
- **Questions:** ask the senior developer who sent you this guide.
- **Useful files in the `aave` project:**
  - `handoff/abis/`: the ABI files
  - `deployments/`: contract addresses per chain
  - `script/rehearse-local.sh`: the full story on a local chain
  - `src/interfaces/ILendingPool.sol`: the contract API, with a comment on every function
