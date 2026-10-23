# Mini-Aave: real-contract integration (wagmi + viem + MetaMask)

> **Update 2026-10-14 16:50: the real contracts arrived.** They're at `D:\aave-protocol-study\contracts`.
> - **ABI check against the real `handoff/abis`:** MockERC20 matched with no changes. Three fixes were needed:
>   - `getReserveData`'s output is named `v` (cosmetic);
>   - `getPrice`'s output is named `price` (cosmetic);
>   - the oracle error `PriceNotSet` takes `(address asset)` (a real selector change).
>
>   The real files are now in `src/apps/mini/abis/real/`, so the check runs on every test run. 110 of 110 pass.
> - **Base Sepolia is filled in:** `CONTRACTS[84532]` (pool `0xB9b2…a107`, oracle `0x73BD…C099`, USDC `0xcbd9…A2a3`, WETH `0x18Ce…6B20`) and `DEPLOY_BLOCK[84532] = 48102059n`.
> - **A live read against Base Sepolia with viem worked:** reserves [USDC, WETH]; the oracle owner is `0x9978…98B0`; USDC is $1 with 100,000 supplied; WETH is $2,000 with 10 supplied; LTV is 80%.
> - The backend team confirmed every other assumption in §2.
> - **Not yet tested:** writes (supply/borrow/…) through MetaMask. Those need a wallet with Base Sepolia ETH.

Originally built from `docs/FRONTEND-GUIDE.md` only (16:02). The mock stays the default; switch to
Chain in the wallet menu.

## 1. What's wired

| Guide | What | Where |
|---|---|---|
| §2 | `CONTRACTS` keyed by chain id (31337 filled, 84532 empty); chains `anvil` and `baseSepolia` from `viem/chains`; RPCs `http://127.0.0.1:8545` / `https://sepolia.base.org`; `DEPLOY_BLOCK`; Basescan links | `src/apps/mini/data/config.ts` |
| §2 | ABIs as `as const` TypeScript, **reconstructed from the guide** | `src/apps/mini/abis/{pool,erc20,oracle}.ts` |
| — | wagmi config: injected connector (MetaMask) only, one HTTP transport per chain, multicall batching | `src/apps/mini/data/wagmi.ts` |
| — | `WagmiProvider` around the **/mini routes only** (inside the app's existing QueryClient) | `src/apps/mini/layout/MiniProviders.tsx`, `src/app/mini/layout.tsx` |
| §6–§10 | `chainSource`: the same `MiniDataSource` interface as the mock | `src/apps/mini/data/chainSource.ts` |
| §6 | reads: getReserveList, getReserveData, getUserReserveData, getUserAccountData, getReserveConfig, balanceOf, allowance, symbol/name/decimals, oracle.owner(). Reads fired together are merged: Multicall3 where the chain has it (Base Sepolia), JSON-RPC batching otherwise (anvil has no Multicall3) | `chainSource.ts`, `wagmi.ts` |
| §8 | allowance → approve → **wait for receipt** → simulateContract → writeContract → waitForTransactionReceipt → status check; the step list shows each one | `src/apps/mini/tx/runTx.ts` (unchanged order) + `chainSource.ts` |
| §8 | Max: withdraw/repay send `maxUint256`; Repay Max approves debt + 0.1% (+1); liquidate approves `debtToCover` | `src/apps/mini/tx/build.ts` |
| §9 | `ContractFunctionRevertedError.data.errorName` → the mock's `MiniContractError(name)`; `UserRejectedRequestError` / code 4001 → "Transaction cancelled."; unknown revert → "Transaction failed."; anything else → the generic message. Pool calls decode with pool + token + oracle errors | `src/apps/mini/data/chainErrors.ts`, `src/apps/mini/abis/index.ts` |
| §10 | events via `getContractEvents` from `DEPLOY_BLOCK`, in block chunks (span halves on a range error), cached per chain; only new blocks are fetched on refresh; a reset chain (anvil restarted) is detected by block hash | `chainSource.getEvents`, `src/apps/mini/data/logs.ts` |
| §7 | refresh: `watchBlockNumber` (at most every 5 s), every 15 s, after each confirmed receipt, and on account / network change (query keys hold source + chain + account) | `src/apps/mini/data/hooks.ts` |
| §8 | real tx hash after success; "View on Basescan" on 84532, none locally | `TxHashNote` in `src/apps/mini/ui/parts.tsx` |
| §8 | wallet: `useConnection` (wagmi 3's name for `useAccount`), `useConnect(injected)`, `useDisconnect`, `useSwitchChain`; "Switch network" when the wallet's chain has no entry in `CONTRACTS`; the Admin box when the account equals `oracle.owner()` | `src/apps/mini/data/useWallet.ts` |
| — | **source switch**: `NEXT_PUBLIC_MINI_SOURCE=mock\|chain` (default `mock`) + "Data: Mock / Chain" in the wallet menu (saved per browser; the toggle wins over the env) | `src/apps/mini/data/settings.ts`, `source.ts` (`miniSource` forwards to the active source) |
| — | chain mode can't reach the RPC, has no addresses, or finds no contract code → banner "Contracts not reachable on this network" + "Use mock data instead"; no crash, data queries wait | `ChainBanner` in `ui/parts.tsx`, `useSourceStatus` in `hooks.ts` |
| — | the chip next to "Mini-Aave": "Mock data" in mock mode, the network name in chain mode | `MiniWordmark` in `ui/parts.tsx` |

**Mock mode is unchanged**: same test-account picker, wrong-network toggle, Reset demo, "Reject in
wallet (mock)" button and §11 acceptance test. Screens, modals and hooks call `miniSource` exactly
as before.

### Environment values (all optional)

| Variable | Default | Use |
|---|---|---|
| `NEXT_PUBLIC_MINI_SOURCE` | `mock` | `chain` makes chain mode the default (the wallet-menu toggle still wins) |
| `NEXT_PUBLIC_MINI_CHAIN_ID` | `31337` | the chain to read before a wallet connects, and to offer in "Switch network" |
| `NEXT_PUBLIC_MINI_RPC_31337` | `http://127.0.0.1:8545` | anvil on another machine (see Known limitations) |
| `NEXT_PUBLIC_MINI_RPC_84532` | `https://sepolia.base.org` | another Base Sepolia RPC |
| `NEXT_PUBLIC_MINI_DEPLOY_BLOCK_84532` | none | first block for event queries on Base Sepolia |

`NEXT_PUBLIC_*` values are baked in when Next compiles, so changing them needs a dev-server restart.
Everything in them is public (it ships to the browser): never put a secret RPC key there (§13).

## 2. ABI assumptions (every guess)

The guide gives names, fields and meanings but not the Solidity declarations. Each guess below is
checked automatically by the ABI check once the real files arrive (section 3).

**What can break and how badly.** The **selector** (name + argument types) must be exact, or a call
won't reach the function, a revert won't decode by name and an event won't be found.
**Struct field order** must be exact, or values land in the wrong fields. The **integer width** of
small fields (uint8 vs uint16 vs uint256) does *not* matter for decoding (every field is one 32-byte
word), and `normalizeReserveView` / `normalizeReserveConfig` accept number or bigint anyway.

### LendingPool (`abis/pool.ts`)
1. Function names and argument order exactly as the §5 table: `supply(address asset, uint256 amount)`, `withdraw(…)`, `borrow(…)`, `repay(…)`, `liquidate(address collateralAsset, address debtAsset, address user, uint256 debtToCover)`.
2. `supply` and `borrow` return nothing ("Returns: nothing"); `withdraw` and `repay` return one unnamed `uint256`; `liquidate` returns `(uint256 debtCovered, uint256 collateralSeized)`.
3. All write functions are `nonpayable`; all §6 reads are `view`.
4. `getReserveData(address)` returns **one struct** (`ReserveView`; "object" in §6), fields in the §6 table order: `asset address, decimals uint8, price uint256, totalSupplied uint256, totalBorrowed uint256, availableLiquidity uint256, utilization uint256, supplyRate uint256, borrowRate uint256, ltv uint16, liquidationThreshold uint16, liquidationBonus uint16`.
   - Widths: §12 writes `decimals` and the BPS fields as plain JSON numbers, so they are small integers (viem returns `number` up to 48 bits). I picked `uint8` for decimals and `uint16` for BPS.
5. `getUserAccountData(address)` returns one struct of six `uint256` in the §6 order: `totalCollateralUsd, totalDebtUsd, borrowLimitUsd, availableBorrowsUsd, liquidationLimitUsd, healthFactor`.
6. `getReserveConfig(address)` returns one struct in the §6 order: `ltv, liquidationThreshold, liquidationBonus, reserveFactor` as `uint16`, then `baseRate, slope1, slope2, optimalUtilization` as `uint256`.
7. `getUserReserveData(address asset, address user)` returns **two plain outputs** named `supplied` and `borrowed` (§6: "a function with several plain outputs comes back as an array"), not a struct.
8. `getReserveList()` returns `address[]`; `oracle()` returns `address`.
9. Events, field order as in the §10 table, indexed as bolded there: `Supply/Withdraw/Borrow/Repay(address indexed asset, address indexed user, uint256 amount)`, `Liquidation(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtCovered, uint256 collateralSeized, address liquidator)`.
10. The admin events `ReserveListed`, `ReserveConfigured` and `OracleUpdated` and the admin functions behind them are **left out**: the guide gives no fields, and the app doesn't use them.
11. The nine pool errors (`ZeroAmount`, `AssetNotListed`, `InsufficientBalance`, `InsufficientLiquidity`, `BorrowLimitExceeded`, `HealthFactorTooLow`, `PositionHealthy`, `NoDebt`, `NoCollateral`) take **no arguments**. If the real ones carry arguments (e.g. `AssetNotListed(address)`), their selectors differ: they would show "Transaction failed." instead of the specific message until fixed.
12. OpenZeppelin **v5** is assumed (the §9 names are v5 names): `OwnableUnauthorizedAccount(address account)`, `OwnableInvalidOwner(address owner)`, `SafeERC20FailedOperation(address token)`, `ReentrancyGuardReentrantCall()`. The pool's own `owner()` isn't included (not used).

### MockERC20 (`abis/erc20.ts`)
13. Standard OZ ERC-20: `name`, `symbol`, `decimals (uint8)`, `totalSupply`, `balanceOf(address account)`, `allowance(address owner, address spender)`, `approve / transfer` returning `bool`, `transferFrom`, the `Transfer` / `Approval` events.
14. `faucet()` takes no arguments and returns nothing; it mints 10,000 USDC / 5 WETH per call (§5). The app's success message uses those amounts.
15. `mint(address to, uint256 amount)`: argument names and order are a guess. The app doesn't call it.
16. OZ v5 `IERC20Errors` with their exact signatures: `ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)`, `ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)`, plus `ERC20InvalidSender / Receiver / Approver / Spender(address)`.

### MockOracle (`abis/oracle.ts`)
17. `getPrice(address asset) view returns (uint256)`, `setPrice(address asset, uint256 price)`, `owner() view returns (address)`.
18. `PriceSet(address indexed asset, uint256 price)`: the guide writes `PriceSet(asset, price)` without bolding, so **`asset` being indexed is a guess**. If it's wrong, History won't show price changes; nothing else depends on it.
19. `ZeroPrice()` and `PriceNotSet()` take no arguments (guess); `OwnableUnauthorizedAccount(address)` / `OwnableInvalidOwner(address)` as in OZ v5.

### Not ABI, but assumed
20. Token display labels for History, Liquidations and the modals come from `TOKENS` (USDC 6 / WETH 18 per §2) for every chain in `CONTRACTS`. Markets and the Dashboard read `decimals` from the chain (`ReserveView.decimals`, `token.decimals()`), as §4 asks.
21. Health factor `maxUint256` with no debt, exactly as §6 says.

## 3. Testing locally once the `aave` folder arrives

Do this **on the PC that runs the dev server** (see Known limitations for the Mac).

1. **Check the ABIs first (no chain needed).** Copy `aave/handoff/abis/LendingPool.json`,
   `MockERC20.json` and `MockOracle.json` into `clone/src/apps/mini/abis/real/`, or point at the folder:
   `MINI_REAL_ABI_DIR=../aave/handoff/abis npx vitest run abi-check`. Otherwise run `npx vitest run abi-check`.
   - It passes, or it lists every difference: the signature and selector here versus the real one, return names and types, indexed fields, and missing items. Items only the real ABI has are printed as notes.
   - Fix by pasting the real JSON into the `.ts` files (`export const poolAbi = [ …real JSON… ] as const;`) and deleting the "RECONSTRUCTED" header. Run the whole suite again (`npx vitest run`).
2. Install Foundry (Git Bash on Windows): `curl -L https://foundry.paradigm.xyz | bash`, then `foundryup`.
3. Terminal 1: `anvil` (leave it running).
4. Terminal 2, in the `aave` folder: the deploy command from guide §3 step 4. The addresses come out exactly as `CONTRACTS[31337]`.
5. MetaMask:
   - Add the network: name Anvil, RPC `http://127.0.0.1:8545`, chain id `31337`, symbol ETH.
   - Import the Owner, Borrower and Liquidator test accounts **into MetaMask**, using the keys in guide §3. The app never sees them.
6. Open http://localhost:3100/mini. Wallet menu → **Data → Chain** → **Connect MetaMask**. The chip should read ANVIL and the banner should not appear. If it says "Contracts not reachable", anvil isn't running or the deploy didn't happen.
7. Play §11:
   - **Borrower:** Faucet WETH → Supply 1 WETH → Borrow 1,500 USDC (HF 1.13).
   - **Owner:** Admin (now in the sidebar) → Set WETH price 1700.
   - **Liquidator:** Faucet USDC → Liquidations → Liquidate → Max → Approve & Liquidate. Expect about 0.4632 WETH ($787.50).
   - **Borrower:** about 0.5368 WETH left, 750 USDC debt, HF about 1.03.

   Switch accounts in MetaMask, and the screens follow.
8. Also try the edge cases:
   - Reject in MetaMask → "Transaction cancelled."
   - Withdraw that would drop HF below 1 → button disabled.
   - Repay Max → approves debt + 0.1%, debt goes to 0.
   - Owner functions from another account → "Only the admin can do this."
   - MetaMask on another network → "Switch network".
9. After restarting anvil: deploy again, and in MetaMask use Settings → Advanced → Clear activity tab data for each account (§3 "nonce" error). The app notices the reset chain by itself.

To make chain mode the default: `NEXT_PUBLIC_MINI_SOURCE=chain` in `clone/.env.local`, then restart the dev server.

## 4. Switching to Base Sepolia

1. Fill `CONTRACTS[84532]` in `src/apps/mini/data/config.ts` from `aave/deployments/84532.json` (pool, oracle, usdc, weth).
2. Set the deploy block:
   - Either `DEPLOY_BLOCK[84532]` in the same file, or `NEXT_PUBLIC_MINI_DEPLOY_BLOCK_84532`.
   - The value is the block of the pool's deploy transaction on Basescan.
   - Without it, events are read only from the last 50,000 blocks, and a console warning says so.
3. `NEXT_PUBLIC_MINI_CHAIN_ID=84532` in `.env.local`, then restart the dev server.
4. In MetaMask, pick Base Sepolia. If it isn't added, "Switch network" asks MetaMask to add it. You need test ETH from a Base Sepolia faucet for gas.
5. Run `npx vitest run`. The config test that expects `84532` to be empty will fail on purpose; update it to the new addresses.

Transaction results now link to `https://sepolia.basescan.org/tx/<hash>`.

### Reading Base Sepolia without a wallet (added 2026-10-19)

Wallet menu → **Data: Chain** → **Network: Base Sepolia**. The choice is saved per browser. A
connected wallet on a supported chain still decides; picking a network then asks MetaMask to switch.
This is how a browser with no anvil (for example the Mac) can show the live testnet.

**Event log on the public RPC.** Measured on 2026-10-19, `https://sepolia.base.org` allows:
- `eth_getLogs` over **at most 200 blocks** per query;
- **25 requests per second** (more returns "request limit reached" or HTTP 429).

So the first read of the whole history (about 217,000 blocks since `DEPLOY_BLOCK`) takes about a
minute. How the app handles it:
- one query per 200-block window covers both the pool and the oracle;
- windows go out in waves of 20 a second, sent as one JSON-RPC batch;
- a rate-limited wave waits and retries;
- every hook shares the one scan;
- a "Reading the pool's history… n%" notice shows progress;
- the result is cached in localStorage and saved every ~10 waves, so a reload resumes, and later
  visits read only the new blocks (measured: 67 s first scan, 4.6 s reload).

A private RPC (`NEXT_PUBLIC_MINI_RPC_84532`) with larger limits can raise `LOG_CHUNK_BLOCKS` /
`LOG_SCAN` in `config.ts`. Such keys are public in the browser, so use a domain-restricted one.

## 5. Known limitations

- **Writes never run against a chain.**
  - **Reads:** live Base Sepolia reads and the full event log are verified, in headless Chrome without a wallet.
  - **Writes:** signing a transaction needs MetaMask, so supply, borrow and the rest are checked only against fabricated viem errors and encoded calls, plus the mock.
  - **Foundry / anvil:** not installed on this PC.
- **The Mac and `127.0.0.1`.** A browser on the Mac that opens `http://192.168.1.6:3100/mini` still sends RPC calls to `127.0.0.1:8545`, which is the **Mac's** own localhost, not the PC running anvil. MetaMask on the Mac does the same. Either:
  - test in a browser on the PC that runs anvil (simplest), or
  - start anvil with `anvil --host 0.0.0.0`, allow TCP port 8545 in the Windows firewall, then:
    - set `NEXT_PUBLIC_MINI_RPC_31337=http://192.168.1.6:8545` and restart the dev server;
    - use the same RPC URL in the Mac's MetaMask "Anvil" network.

  Anvil's accounts are public test keys, so only do this on a trusted home network.
- **MetaMask only.** No WalletConnect means phones can only connect from the MetaMask app's built-in browser.
- **Anvil has no Multicall3**, so local reads go out as one JSON-RPC batch of separate calls (still one request). Base Sepolia uses Multicall3.
- **The mode is chosen per browser.** The server always renders the env default (the HTML says "Mock data"), and the browser applies the saved toggle as the page loads; no hydration errors are logged. `curl` therefore only ever sees the env-default render; chain mode is verified in a browser.
- **Balances grow on a real chain** (interest per second), and the screens refresh every 15 s. The mock has no time-based interest.
- **Mined reverts aren't named.** A transaction that passes simulation but reverts when mined (the state changed in between) shows "Transaction failed." without a name.
- **Event history is cached in memory per tab** and rebuilt from `DEPLOY_BLOCK` on reload. That's fine locally; on Base Sepolia the first load scans from the deploy block in chunks.
- **Static token labels.** Display labels in History, Liquidations and the modals use `TOKENS`, not on-chain `symbol()`; see assumption 20.

## 6. Tests

- `src/apps/mini/__tests__/abi-check.test.ts`:
  - compares against the real ABIs when present, and otherwise skips with a note;
  - always self-tests the comparator: it catches a changed field type, an error that gained an argument, a missing function and a changed indexed field, and it checks known selectors.
- `src/apps/mini/__tests__/chain.test.ts`:
  - **§9 decoding** from fabricated viem errors: every §9 name, token errors inside pool calls, the non-owner setPrice, nested user rejection, the bare 4001 code, unknown selectors, RPC failure.
  - **Max and approve amounts.**
  - **Encoded calls** checked against the ABI.
  - **Config lookups, source selection and the `miniSource` switch.**
  - **Chunked log queries.**
  - **Shape normalisers, event mapping, receipt → liquidation result.**
- `src/apps/mini/__tests__/mini.test.ts`: the §11 acceptance test on the mock engine (unchanged).
- `D:/aave-protocol-study/tools/mini-chain.mjs`:
  - every /mini route in both modes in headless Chrome;
  - screenshots of chain mode with the RPC down (banner) and with the RPC answering (connect-wallet state, stubbed inside that script only);
  - the wallet menu, and the "no browser wallet" message.
