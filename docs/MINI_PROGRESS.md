# Mini-Aave mode: progress

Built inside the Pro app at `/mini`, from `docs/FRONTEND-GUIDE.md`, with mock data only (no RPC,
no wallet libraries, no new dependencies). Screenshots: `D:\aave-protocol-study\reference\mini-screens\`
(`<screen>-desktop.png` 1440 wide, `<screen>-mobile.png` 390 wide, `flow-*.png` modal states).

| Guide section | Route / component | Status |
|---|---|---|
| §2 contract config keyed by chain id | `src/apps/mini/data/config.ts` (`CONTRACTS[31337]`) | ✅ |
| §3 test accounts (addresses only, never keys) | mock wallet in `data/wallet.ts`, picker in `layout/MiniShell.tsx` | ✅ Owner / Borrower / Liquidator, not-connected state, wrong-network toggle |
| §4 units + helpers (formatUnits, parseUnits, MAX_UINT256, fmtToken, fmtUsd, fmtHealth, aprToApyPercent) | `src/apps/mini/lib/units.ts`, `lib/format.ts` | ✅ tested (all §4 examples) |
| §5 actions + rules (approve first, maxUint256 = all, 50% liquidation cap, +5% bonus) | `src/apps/mini/data/engine.ts` | ✅ tested |
| §6 read functions, exact return shapes | `engine.ts` reads, served by `data/source.ts` | ✅ tested |
| §6 two-slope rates, RF 10%, LTV 80%, LT 85% | `engine.borrowRateFor`, `RESERVE_CONFIG` | ✅ §12 rates reproduced exactly |
| §7 Markets (9 columns) | `/mini/markets` → `apps/mini/pages/Markets.tsx` (Pro ScrollTable) | ✅ 1440 + 390 |
| §7 Dashboard header (Collateral, Debt, Net worth, Available, Borrow power used, HF coloured, "Can be liquidated") | `/mini` → `pages/Dashboard.tsx` | ✅ 1440 + 390 |
| §7 Dashboard rows (Your supplies/Withdraw, Your borrows/Repay, Assets to supply/Supply·Faucet, Assets to borrow/max-borrow formula) | `pages/Dashboard.tsx` + `ui/MiniTable.tsx` | ✅ max borrow = 99 USDC (1% margin) |
| §7 HF preview in modals (warn < 1.1, block withdraw/borrow < 1) | `lib/preview.ts` → `tx/MiniTxModal.tsx` | ✅ tested + UI-checked (0.5 WETH withdraw blocked at 0.57) |
| §8 steps (allowance → approve → wait → simulate → send → wait → success / error; buttons disabled while pending; refetch) | `tx/runTx.ts` + Pro `StepsList`/`ResultView` | ✅ UI-checked |
| §8 Max: Withdraw/Repay send maxUint256; Repay approves debt + 0.1% | `tx/MiniTxModal.tsx` | ✅ UI-checked (1,501.5 USDC approval, 1,500 repaid, HF ∞) |
| §8 wrong network → "Switch network" | `ui/parts.tsx` `ActionGate`, modal `ActionButton`, topbar | ✅ UI-checked |
| §5 Faucet (10,000 USDC / 5 WETH) | Dashboard "Assets to supply" → faucet modal | ✅ UI-checked |
| §9 error names → messages, "Transaction cancelled." on reject | `lib/errors.ts` (engine throws the names) | ✅ tested + UI-checked |
| §10 History (Supply/Withdraw/Borrow/Repay/Liquidation) | `/mini/history` → `pages/History.tsx` (My activity / Everyone) | ✅ 1440 + 390 |
| §11 Liquidations (Borrow events → account data → HF < 1; modal with token choice, 50% cap, +5% preview) | `/mini/liquidations` → `pages/Liquidations.tsx` | ✅ UI-checked (0.4632 WETH · $787.50) |
| §11 Admin box (owner only; others get OwnableUnauthorizedAccount) | `/mini/admin` → `pages/Admin.tsx`; nav item only for the owner | ✅ UI-checked both cases |
| §11 demo replay (acceptance) | `src/apps/mini/__tests__/mini.test.ts` | ✅ passes |
| §12 mock data shapes as the starting state + Reset demo | `engine.demoState()`, wallet menu "Reset demo data" | ✅ tested (exact §12 values) |
| §13 checklist | see MINI_README "Checklist" | ✅ except real-chain items (no chain) |
| Data source (one swappable module) | `src/apps/mini/data/source.ts` | ✅ |
| Shell variant | ProShell `variant` prop (`src/apps/pro/layout/ProShell.tsx`) | ✅ /pro unchanged |

## Real-contract integration (2026-10-14 16:02, see MINI_INTEGRATION.md)

| Guide section | Route / component | Status |
|---|---|---|
| §2 ABIs as `as const` | `src/apps/mini/abis/{pool,erc20,oracle}.ts` | ⚠ reconstructed from the guide; ABI check ready, skips until the real JSON is in `abis/real/` |
| §2 CONTRACTS by chain, anvil + baseSepolia, RPCs, DEPLOY_BLOCK | `data/config.ts`, `data/wagmi.ts` | ✅ 31337 filled · ⚠ 84532 empty until the testnet deploy |
| §6 reads (batched) | `data/chainSource.ts` | ✅ unit-tested shapes · ⚠ not run on a chain (no anvil here) |
| §8 approve → wait → simulate → send → wait → status; Max; disable while pending | `tx/runTx.ts`, `tx/build.ts`, `chainSource.ts` | ✅ unit-tested · ⚠ not run on a chain |
| §9 errors decoded by name (pool + token + oracle), "Transaction cancelled." | `data/chainErrors.ts` | ✅ tested with fabricated viem errors (all 16 names) |
| §10 events, chunked from DEPLOY_BLOCK | `chainSource.getEvents`, `data/logs.ts` | ✅ chunking tested · ⚠ not run on a chain |
| §7 refresh (blocks, 15 s, after receipts, account / network change) | `data/hooks.ts` | ✅ |
| §8 wrong network → Switch network; real hash + Basescan link | `data/useWallet.ts`, `ui/parts.tsx` | ✅ UI-checked (headless, no MetaMask) |
| Source switch mock / chain + "not reachable" banner | `data/settings.ts`, `source.ts`, `ChainBanner` | ✅ every /mini route 200 in both modes, no errors |

Not done / out of scope (mock only): time-based interest accrual (rates are live, balances don't
grow), real tx hashes and explorer links (fake hashes are labelled), real wallet connection.

## v2: the full Pro experience (started 2026-10-19 15:14)

Updated after each step so a stop never loses status. ⏳ = not started yet.

| Step | Where | Status |
|---|---|---|
| Chart data layer: event replay, rate curve, mock noise, sampling, Top Addresses; `getReserveHistory` / `getPriceHistory` / `getUserHistory` on both sources | `lib/history.ts`, `data/historyReads.ts`, `source.ts`, `chainSource.ts`, `hooks.ts` | ✅ 13 new tests (123 total) · 15:21 |
| Mock timeline: demo setup spread from 24 to 10 days ago, deploy PriceSet events, new writes stamped with the wall clock (state key v2) | `data/source.ts` `timedDemoState` | ✅ tested · 15:48 |
| Chain read network picker (Anvil / Base Sepolia) in the wallet menu, for browsing without a wallet | `settings.ts`, `useWallet.ts` `useReadChainId`, `MiniShell.tsx` | ✅ tested · 16:00 |
| Event scan at the public RPC's real limits (200 blocks, 25 req/s): one query for pool + oracle, paced waves, retry on rate limit, shared in-flight scan, localStorage cache, progress notice | `logs.ts` `scanLogs`, `chainSource.ts`, `scanProgress.ts`, `ScanNotice` | ✅ tested · live: 67 s first scan, 4.6 s reload · 16:12 |
| Hydration: Mini stores load after the first render (no server/client mismatch) | `MiniProviders.tsx` | ✅ 0 errors, both modes · 16:05 |
| Pro parts made reusable (ChartCard real data + draw-in, Reserve page rings / params / IRM curve, Explore header bits, shell search / promo / help) | `src/apps/pro/**` | ✅ backward-compatible · 16:15 |
| Shell: search + "/" shortcut, promo card, HelpFab, toasts | `layout/MiniShell.tsx` | ✅ · 16:15 |
| Markets (Pro explore) | `/mini/markets` | ✅ 1440 + 390 · mock + Base Sepolia · 16:15 |
| Reserve page (new) | `/mini/reserve/[symbol]` | ✅ 1440 + 390 · mock + live Base Sepolia events · 16:15 |
| Dashboard (stats, HF gauge, charts) | `/mini` | ✅ 1440 + 390 · 16:15 |
| Liquidations | `/mini/liquidations` | ✅ 1440 + 390 · 16:15 |
| History | `/mini/history` | ✅ 1440 + 390 · 16:15 |
| Admin (price chart) | `/mini/admin` | ✅ 1440 + 390 · 16:15 |
| Modals + toasts | `tx/MiniTxModal.tsx` | ✅ step rows animate in, toasts · flows pass · 16:15 |
| Verify + screenshots (reference/mini-screens/v2/) | — | ✅ lint 0 · tsc 0 · 126/126 tests · 12 routes 200 · 66 shots (mock + Base Sepolia, 1440 + 390), 0 page errors · 16:24 |

## Funding a wallet (2026-10-19)

Test funds only, Base Sepolia only, everything in the user's wallet (no server, no keys). Details: MINI_README "Funding a wallet".

| Piece | Route / component | How completion is detected | Status |
|---|---|---|---|
| Fund your wallet modal, step 1: test ETH for fees (faucet links, or bridge from Ethereum Sepolia via L1StandardBridge.depositETH) | `tx/FundModal.tsx`, `data/funding.ts`, `lib/funding.ts`, `abis/l1StandardBridge.ts` | Base Sepolia ETH > 0.0002 (polled every 10 s); bridge: Base balance above the one at sending | ✅ mock, every state, 1440 + 390 · real bridge ⚠ not tested (needs a wallet with Sepolia ETH) · 17:13 |
| Step 2: test tokens (inline faucet) | `FundModal.tsx` | USDC or WETH balance > 0 | ✅ mock · 17:13 |
| Step 3: start (Supply / Markets) | `FundModal.tsx` | n/a (hands over to the Supply modal) | ✅ · 17:13 |
| Entry points: top bar (desktop), wallet menu, dashboard CTAs, Faucet page notice, low-gas banner | `MiniShell.tsx`, `Dashboard.tsx`, `Faucet.tsx`, `ui/parts.tsx` | — | ✅ · banner needs chain mode + a wallet (not screenshotted) · 17:13 |
| Faucet page | `/mini/faucet` → `pages/Faucet.tsx`; sidebar Demo + search | wallet balance per token | ✅ 1440 + 390 · 17:13 |
| Tests | `__tests__/funding.test.ts` | thresholds, routes, bridge encoding (selector 0xb1a1a882), error mapping | ✅ 12 tests (138 total) · 17:13 |
