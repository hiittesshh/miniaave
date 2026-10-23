# Progress log (Agent 2, the builder)

This file is the checkpoint Agent 1 reads. It is updated at the end of every phase.

## Phase 1: Reference audit (DONE)
- [x] aave/interface source read (cached read-only). The live app.aave.com runs the same build.
- [x] Pro audited from SSR HTML, CSS, JS, its 480-string i18n dictionary and the public V4 GraphQL API. Pro is a separate V4 app.
- [x] `docs/REFERENCE_AUDIT.md`.
- [x] Agent 1's corrections applied:
  - Base Sepolia is the testnet market (no Ethereum Sepolia), and markets are grouped Ethereum / L2 / Testnets.
  - Two live screenshots (Markets and the empty Dashboard in test mode) were read and mirrored. See audit §1.2a and §1.2b.

## Phase 2: Architecture and design system (DONE)
- [x] Next.js 16.4 + React 19.3 + MUI 9.5 (CSS-variables theme, both schemes) + Zustand + TanStack Query + visx + NumberFlow + Vitest.
- [x] `docs/ARCHITECTURE.md`: two isolated apps in one project, a swappable `LendingDataSource`, and atomic commits.
- [x] `lib/aave-math` with tests: rates, APR→APY, HF, borrowing power, max withdraw (HF floor 1.01), max borrow (0.99 margin), liquidation price, close factor, V4 risk premium.
- [x] Mock chain: seed data (5 Standard markets, 4 Pro hubs, 6 Pro markets including MAG7 tokenised stocks), a pure validated engine, a persisted store, and a mock source with phases, latency and failure injection.
- [x] Tests: 61 passing (maths, engine consistency and failure-changes-nothing, formatting).

## Phase 3: Core implementation (IN PROGRESS)

### Standard (done, visually checked with headless-Chrome screenshots of my own build)
- [x] Layout:
  - header with nav, More menu, Test Mode chip, V4 link, Swap, Bridge, support, wallet and settings;
  - settings menu: Test Mode, Theme submenu, Language, plus demo controls (Simulate failures, Reset demo data);
  - mobile drawer, notify bar (demo disclaimer), footer.
- [x] Dashboard:
  - top panel: Net worth, Net APY, HF with Risk details, Rewards;
  - Your Positions, mobile Supply/Borrow toggle, four lists (sort, hide/show, category filter, 0-balance toggle, cap hint, isolated badge);
  - E-Mode button menu, not-connected state, empty states, alerts.
- [x] Markets: protocol and market stats, search, In Wallet, categories, sortable table, frozen section, <$100k toggle, mobile cards, loaders.
- [x] Reserve overview:
  - header stats;
  - Supply / Borrow / E-Mode / Interest rate model sections with cap rings, the IRM chart (hover tooltip) and simulated APR history charts (1w/1m/6m/1y);
  - Your info panel;
  - mobile tabs.
- [x] Transaction modals:
  - Supply (approve → supply, permit or transaction), Withdraw (unwrap), Borrow (risk checkbox), Repay (wallet / native / aToken), Collateral, E-Mode, Faucet, plus the liquidation-risk modal;
  - result views for success and failure.
- [x] History (date-grouped, filters, search, CSV/JSON export of simulated log), Faucet (test mode), and "Not included" pages for Savings, Governance, Umbrella, Safety Module, Bridge and Migrate.
- [x] An end-to-end approve → supply flow was driven in headless Chrome. Every number updated consistently and there were no console errors.

### Pro, first build (2026-10-13; layouts mostly inferred)
Built before any live capture existed:
- layout (sidebar, topbar, search)
- pages: Dashboard, Explore Deposit/Borrow, Reserve, Hub, Market, Position, Activity, Insights
- the deposit/withdraw/borrow/repay/collateral modals

Validation at that point:
- lint clean; `tsc` clean; 62 tests; `next build` passes
- every route returns 200 on dev and on `next start`
- mobile at 390px has no horizontal overflow
- automated accessibility pass: no unnamed controls, labelled switches, keyboard activation, an h1 on every page

### Standard app: frozen on 2026-10-13 per the coordinator
Left as is: no fidelity pass, nothing reverted.

## Pro fidelity pass (started 2026-10-14; priority from the user)
Tooling lives in `D:\aave-protocol-study\tools\` (its own package.json; puppeteer-core 24.43.1, Apache-2.0, uses the installed Chrome; not a clone dependency). The scripts:
- `crawl-real.mjs`: route discovery
- `probe-real.mjs`: bundle routes
- `capture.mjs`: full-page shots plus computed-style, DOM and CSSOM dumps at 1440×900 and 390×844
- `segments.mjs`: scroll segments
- `outline.mjs`

Outputs go to `D:\aave-protocol-study\reference\pro-capture\{real,clone}\`.

| Phase | Status |
|---|---|
| P1: audit of the live Pro site and the clone | DONE. 23 real pages captured at desktop and mobile, plus 7 pages in scroll segments. Route map comes from the bundle's ROUTES and route manifest plus a link crawl |
| P2: inventory | DONE: `docs/PRO_INVENTORY.md` |
| Discrepancy log / checklist | Created: `docs/PRO_DISCREPANCY_LOG.md`, `docs/PRO_CHECKLIST.md` (updated after every page) |
| P3: tokens and shared shell | **SHELL READY** (2026-10-14). The sidebar (open and collapsed), promo card, top bar, search field, mobile top bar and mobile menu are matched to computed-style measurements of the live site (within 1px), then verified by screenshot. Icons are Lucide (ISC) at 18px with a 1.25px stroke, because live uses a custom set (logged). Open: search dropdown content (#13b) and hover-state capture (P5) |
| P4: pages | In progress (2026-10-14). **Deposit:** header, filters, group heading and table are within 1px of live (computed-style comparison); new ScrollTable has the live scroll and fade mechanics; mobile cards are done. **Icons (user priority):** one shared TokenIcon with real logos from web3icons (MIT), Trust Wallet (MIT) and simple-icons (CC0). 9 tokens with no open logo use brand-colour circles. Chain logos come from web3icons. See docs/ICONS.md. **Earlier:** not-connected `/` and `/activity` match live; DEMO pill beside PRO. **Live seed:** done (4 chains, 7 hubs, 19 markets, 95 reserves, APYs reproduced). **Borrow:** done (desktop). **Hub:** done (pages/Hub.tsx, shared Entity components). **Market:** done (pages/Market.tsx). **Reserve:** done (pages/ReservePage.tsx). **Next:** Token, Insights, then the search dropdown, the extra pages, mobile, charts and motion | **13:21: Market and Hub DONE** (desktop + 390px, below the fold, interactions and animations sampled per frame; see PAGES_DONE.log).
| P5: interactions and animation | In progress (2026-10-14 13:17). Shared ChartCard rebuilt to the live visx chart (axis algorithm, mask, hover tooltip, legend states, morph). PillMenu rebuilt to live dropdown metrics; ScaleFade now forwards onEntering so MUI popovers position (dropdowns were invisible before). Market page fixed per coordinator list (all 10) and re-verified desktop + 390px; Hub aside/chart re-verified desktop 0–1px. Live data re-captured 12:41 and seed regenerated (per-market liquidity model). B-1/B-2 done (ProShell settings/bare layouts). Dev-server 500s were infra (#36b); `npx next build` passes (~13:00). Hub mobile done (#35b). |
| P6: final comparison | not started |

Verified facts that changed earlier assumptions:
- With no wallet, `/` renders the Deposit page and `/activity` redirects to Deposit.
- The explore default sort is **Total Deposits** descending.
- Compact suffixes are **uppercase**.
- The font is **Inter** (an open font, already used).
- `/explore/token/{symbol}`, `/changelog`, `/preferences` and `/watch-address` are accessible without a wallet.

Not observable without a wallet (not invented):
- the connected dashboard
- `/position/{id}`
- transaction flows
- the ConnectKit "Get Started" UI

See PRO_INVENTORY §5.

## Assumptions / questions for Agent 1
1. **Pro = Aave V4 app** (verified). The equities hub and market are named "Equities" / "MAG7" (neutral); tickers keep the `c` suffix and prices are illustrative.
2. **Licence:** I followed the stricter "All Rights Reserved" reading. No code, SVG or icon was copied.
3. **AAVE / GHO / cbBTC / cbETH icons** are brand marks, so they show letter avatars. Other icons come from `cryptocurrency-icons` (CC0).
4. **Modals get a 200ms scale-fade** using the reference's reserved `motion.modal` token. The reference doesn't animate modals yet.
5. **Live-only details I matched from your screenshots and not the repo:** left-aligned dashboard columns, the support (headset) button, title-cased list titles, and the "Sepolia" → badge title stripping.
6. **"Aave total deposits / loans"** in the Markets header is computed from the demo's own V3 and V4 markets and labelled as such in its tooltip.
7. **Demo URL parameters** (handy for walkthroughs): `?demoAccount=demo|fresh|none`, `?testMode=1|0`, `?colorScheme=light|dark|system`.


## Dev-server worker crashes: what in the code could contribute (A2, 13:10)
- Nothing heavy runs at module scope in the dynamic route pages: they are thin `<Suspense>` wrappers; the seeds are static arrays (95 reserves) and the snapshot is derived on the client.
- No infinite render loops seen: every page renders with zero console errors in the capture scripts (states.mjs now prints console errors for clone runs).
- MaxListenersExceededWarning: nothing in app code uses streams or listeners. The crashes line up with bursts of parallel puppeteer captures (each opens fresh dynamic-route renders), which matches Agent 1's load observation.
