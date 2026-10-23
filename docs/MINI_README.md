# Mini-Aave mode (mock data)

The Mini-Aave website from `docs/FRONTEND-GUIDE.md`, built inside the Pro clone as a separate mode
at **/mini**. It reuses Pro's shell, tables, transaction modal and step UI, icons, tokens and fonts.
Everything runs on a deterministic mock of the contracts: no chain, no RPC, no wallet library and no
new dependencies.

## How to view it

- Dev server: http://localhost:3100/mini (LAN: http://192.168.1.6:3100/mini)
- Screens: Dashboard `/mini` · Markets `/mini/markets` · Liquidations `/mini/liquidations` ·
  History `/mini/history` · Admin `/mini/admin` (in the sidebar only for the Owner).
- Mock wallet (top right): pick **Owner**, **Borrower** or **Liquidator** (the §3 test accounts,
  addresses only), **Disconnect**, **Simulate wrong network** (action buttons become "Switch
  network"), and **Reset demo data** (back to the §12 state).
- The §11 demo in the UI: Owner → Admin → Set WETH price 1700 · Liquidator → Dashboard → Faucet USDC
  → Liquidations → Liquidate → Max → Approve & Liquidate · Borrower → Dashboard (HF 1.03).
- During a signature step the modal offers "Reject in wallet (mock)" to show "Transaction cancelled.".
- /pro and / are unchanged.

## Files

| Path | What |
|---|---|
| `src/app/mini/**` | Routes (layout + 5 pages) |
| `src/apps/mini/layout/MiniShell.tsx` | ProShell variant: nav, "Mini-Aave" wordmark + "Mock data" chip, mock wallet menu |
| `src/apps/mini/pages/*` | Dashboard, Markets, Liquidations, History, Admin |
| `src/apps/mini/tx/*` | Modal (Supply/Withdraw/Borrow/Repay/Faucet/Liquidate/Set price) and the §8 step runner |
| `src/apps/mini/lib/*` | BigInt units (formatUnits/parseUnits/MAX_UINT256), §4 formatters, §7 previews, §9 errors |
| `src/apps/mini/data/config.ts` | §2 addresses keyed by chain id, §3 accounts, §6 reserve config |
| `src/apps/mini/data/engine.ts` | The mock contracts (pure) |
| **`src/apps/mini/data/source.ts`** | **The one data-source module** |
| `src/apps/mini/data/hooks.ts` | TanStack Query hooks over the source (15 s refresh + refetch on every block) |
| `src/apps/mini/__tests__/mini.test.ts` | §11 acceptance test, §4/§7/§9/§12 tests |

## How the mock maps to the contracts

The engine returns exactly what viem returns from the real ABIs: `bigint` for uint256, `number` for
the BPS fields, objects for structs and a tuple for `getUserReserveData`.

| Contract call | Mock | Units |
|---|---|---|
| `getReserveList()` | `[USDC, WETH]` | addresses |
| `getReserveData(asset)` | `ReserveView` | amounts in token units, price/USD 8 dec, rates & utilization WAD, ltv/thresholds BPS |
| `getUserReserveData(asset, user)` | `[supplied, borrowed]` | token units |
| `getUserAccountData(user)` | `UserAccountData` | USD 8 dec, `healthFactor` WAD (`MAX_UINT256` with no debt) |
| `getReserveConfig(asset)` | `ReserveConfig` | §6 demo values |
| `oracle.owner()` / `getPrice` / `setPrice` | owner = Owner account | price 8 dec |
| token `faucet` / `approve` / `allowance` / `balanceOf` | 10,000 USDC / 5 WETH per faucet | token units |
| events | `Supply`, `Withdraw`, `Borrow`, `Repay`, `Liquidation`, `PriceSet` | same fields as §10 |
| reverts | `MiniContractError(name)` with the §9 names | mapped by `messageFor()` |

Rules implemented: LTV 80%, liquidation threshold 85%, bonus 5%, reserve factor 10%, the §6 two-slope
rate curve (half-up WAD maths, so §12's 2.22% / 1.00% come out exactly), borrow limit check, HF =
liquidationLimit ÷ debt, liquidation only below HF 1 and at most 50% of the debt per call, collateral
seized = covered × (1 + bonus) at oracle prices, `maxUint256` = "all of it" for withdraw and repay,
repay never takes more than is owed, ERC-20 allowance then balance checks.

Starting state = §12: USDC 100,000 supplied / 50,000 borrowed, WETH 10 supplied, the Borrower with
1 WETH supplied and 1,500 USDC borrowed (HF 1.13). So the totals add up, the Owner holds the rest
(100,000 USDC + 9 WETH supplied, 48,500 USDC borrowed, HF 2.07). The state persists in localStorage
(`mini-aave-state-v1`); "Reset demo data" restores it.

Simplifications: no time-based interest accrual (rates are live from utilization; balances don't
grow), fake transaction hashes (labelled, no explorer link), one block per transaction.

## Real contracts (chain mode)

Built (2026-10-14): `src/apps/mini/data/chainSource.ts` implements the same `MiniDataSource`
interface on wagmi + viem + MetaMask, and `miniSource` in `source.ts` forwards to the mock or the
chain. Pick it in the wallet menu (**Data: Mock / Chain**) or with `NEXT_PUBLIC_MINI_SOURCE=chain`;
the default stays mock. Details, every ABI assumption, the local test steps and the Base Sepolia
switch: **`docs/MINI_INTEGRATION.md`**.

## Funding a wallet (test funds only, Base Sepolia)

The path you'd follow by hand on a testnet, inside the app: free test ETH for fees → free test
tokens → use the app. Everything happens in the user's own wallet: no server, no keys, no on-ramp,
no real money.

**Where to find it:**
- the "Fund your wallet" button in the top bar (desktop);
- "Fund your wallet" in the wallet menu (all sizes);
- the Dashboard: a button in the not-connected state, and a "New here?" card for a connected wallet that has nothing yet;
- the Faucet page's notice;
- the low-gas banner.

**The modal** (`src/apps/mini/tx/FundModal.tsx`) has three steps. While it's open it re-reads
balances every 10 s, and each step ticks itself off (✅):

| Step | Done when | How it's read |
|---|---|---|
| 1. Get test ETH for fees | Base Sepolia ETH **> 0.0002** (`GAS_MIN_WEI`) | `getBalance` on chain 84532 |
| 2. Get test tokens | USDC **or** WETH > 0 | the tokens' `balanceOf` |
| 3. Start using Mini-Aave | (always available) | Supply opens the Supply modal; or Open Markets |

Step 1 offers two routes:
- **(a) Straight to Base Sepolia:** the Coinbase Developer Platform faucet (needs a free CDP account) and the Alchemy Base Sepolia faucet. Both are external links.
- **(b) From Ethereum Sepolia, through the bridge.** The app reads the wallet's ETH on Ethereum Sepolia (chain 11155111, `https://ethereum-sepolia-rpc.publicnode.com`, or `NEXT_PUBLIC_MINI_RPC_11155111`).
  - **If it's 0:** a link to the Google Cloud Sepolia faucet ("Sign in with a personal Gmail account; work accounts may need real ETH").
  - **If it's above 0:** an amount (default 0.02; Max = balance − 0.002 kept for the fee) and **Move to Base Sepolia**:
    1. switch the wallet to Ethereum Sepolia;
    2. call `depositETH(200000, 0x)` with `value = amount` on Base's official **L1StandardBridge** `0xfd0Bf71F60660E2f608ed56e1659C450eB113120` (source: docs.base.org Base Contracts; `abis/l1StandardBridge.ts`);
    3. wait for the receipt.
  - **Then:** "On its way to Base Sepolia… usually 2–5 minutes", with an Etherscan link and "Switch back to Base Sepolia". The step turns ✅ when the Base Sepolia balance goes up (`bridgeArrived`).
  - **Errors:** a rejection shows "Transaction cancelled."; too little ETH shows "Not enough Sepolia ETH (keep a little for the fee)."; anything else gets a plain message. The raw error goes to the console.

Ethereum Sepolia is in the wagmi config **only** for this bridge step and its balance read. The pool
runs only on 31337 and 84532.

**Mock mode:** the same modal over simulated balances, labelled "Mock data · simulated balances".
"Simulate faucet" buttons and a simulated bridge (about 7 s) replace the real steps. Step 2 uses the
mock pool's real faucet. "reset simulation" starts over.

**Other pieces:**
- **Faucet page (`/mini/faucet`):** like Aave's testnet faucet: each token with your wallet balance, the amount per click and a Faucet button. It's in the sidebar under Demo and in the search.
- **Low-gas banner:** in chain mode on Base Sepolia, when the connected wallet has ≤ 0.0002 ETH, "You need a little test ETH to pay fees" with Fund your wallet / Not now. It checks every 30 s and can be dismissed for the session.

Tests: `src/apps/mini/__tests__/funding.test.ts`. Screenshots of every step: `reference/mini-screens/fund/`
(`node D:/aave-protocol-study/tools/mini-fund-shots.mjs`).

## Checklist (§13)

- BigInt maths everywhere; parse/format with each token's decimals ✅
- approve → wait → simulate → send → wait → refetch ✅ (mocked)
- Max sends maxUint256 for withdraw and repay; Repay Max approves debt + 0.1% ✅
- every write simulated first; §9 messages; "Transaction cancelled." on reject ✅
- wrong network detected, "Switch network" offered ✅ (mock toggle)
- HF ∞ with no debt, coloured by risk ✅
- buttons disabled while pending ✅; refetch after each confirmed tx and every 15 s ✅
- addresses from one config keyed by chain id ✅; no private keys anywhere ✅

## Verify

```
npm run lint            # eslint
npx tsc --noEmit        # types (tsconfig target is ES2020 for BigInt literals)
npx vitest run          # includes src/apps/mini/__tests__/mini.test.ts (§11 acceptance)
node D:/aave-protocol-study/tools/mini-shots.mjs   # screenshots of every screen (1440 + 390)
node D:/aave-protocol-study/tools/mini-flow.mjs    # §11 story through the UI
node D:/aave-protocol-study/tools/mini-flow2.mjs   # non-owner setPrice, reject, supply, repay max
node D:/aave-protocol-study/tools/mini-chain.mjs   # every route in mock AND chain mode, banner / connect-wallet shots
npx vitest run abi-check                           # reconstructed vs real ABIs (skips until abis/real/*.json exist)
```
