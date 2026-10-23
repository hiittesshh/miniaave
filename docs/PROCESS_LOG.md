# Process log: Aave Pro clone build

Written by **Agent 4 (Logger/Auditor)**. This is an append-only journal: the newest entry is
at the **bottom**, and old entries are never rewritten.

How to read it:
- Each entry is `### HH:MM, title`, followed by a few bullets on who did what, which page,
  and how it was checked.
- "Builder A" = Agent 2, "Builder B" = Agent 3, "Agent 1" = the coordinator in the main chat.
- I only write down what the files show. When a time comes from a file's "last modified"
  stamp, it says when the file was **last saved**, not when the work started.
- Small glossary:
  - **clone** = our copy of the site; **live** or **real** = the actual pro.aave.com.
  - **capture** = an automatic screenshot taken by a script (puppeteer drives a hidden Chrome).
  - **computed style** = the final CSS values the browser actually uses (sizes, colours,
    positions). Comparing them gives exact pixel numbers instead of guessing by eye.
  - **1440×900 / 390×844** = the desktop and phone screen sizes we compare at.
  - **mock / dummy data** = made-up numbers stored in the app; nothing talks to a blockchain.

---

## Backfill: 2026-10-13 (reconstructed from docs and file timestamps)

### 15:54, Foundations: maths, fake chain, design system
- Builder A (then the only builder) set up the project: Next.js 16.4, React 19.3, MUI 9.5,
  Zustand (app state), TanStack Query (data loading), visx (charts), Vitest (tests).
  Source: `docs/PROGRESS.md` Phase 2; oldest files in `src/lib` are from 15:54.
- `lib/aave-math` holds the lending maths (interest rates, APR→APY, health factor, max
  borrow/withdraw) with tests.
- A **mock chain** (a fake blockchain kept in memory) was added: seed data, a validated
  engine and a store, so the UI can show "transactions" without a real wallet.
- 61 tests passed at this stage. The plan is written up in `docs/ARCHITECTURE.md` (saved 16:44).

### 16:12, Standard app (app.aave.com) built first
- Files in `src/apps/standard/` date from 16:12 to 17:23.
- Built: header and menus, Dashboard, Markets, Reserve overview with charts, the transaction
  modals (Supply, Withdraw, Borrow, Repay, Collateral, E-Mode, Faucet), and History.
- Checked by driving one full approve → supply flow in headless Chrome: all numbers updated
  together and the console showed no errors (`docs/PROGRESS.md`).

### 16:45, Pro app first build (layouts guessed)
- Builder A built a first Pro version (sidebar, top bar, search, Dashboard, Deposit, Borrow,
  Reserve, Hub, Market, Position, Activity, Insights) **before** any screenshot of the live
  site existed, so most layouts were inferred. Oldest Pro file: 16:45.
- Checks at the time: lint and TypeScript clean, 62 tests, `next build` passed, every route
  answered HTTP 200, no sideways scrolling at 390px, a basic accessibility pass.

### 17:06, Reference audit written
- `docs/REFERENCE_AUDIT.md` (saved 17:06) records what was learned by reading public
  material: Pro is a separate **Aave V4** app (V4 = the newer design with "hubs" and
  "spokes"; a spoke is shown in the UI as a "market").
- No code, SVG or icon was copied from Aave's own repo or bundles, because their licence is
  "All Rights Reserved" (`docs/PROGRESS.md`, assumption 2).

### 17:23, Standard app frozen; Pro becomes the only priority
- The coordinator froze the Standard app "as is" on 2026-10-13: no more fidelity work, nothing
  reverted (`docs/PROGRESS.md`, "Standard app: frozen"). The last Standard file was saved at
  17:23; the exact time of the decision is not recorded.
- From here on the goal is an **exact, page-by-page copy of pro.aave.com** with dummy data.

### 17:40, Live Pro site captured
- Scripts in `D:\aave-protocol-study\tools\` (`crawl-real.mjs`, `capture.mjs`, `segments.mjs`)
  found the routes (`real/routes.json` 17:40) and took full-page screenshots plus computed-style
  and DOM dumps of 23 live pages at desktop and mobile.
- Desktop shots 17:54–17:59, mobile shots 18:00–18:04, all in
  `reference/pro-capture/real/`. Seven pages also got scroll "segments" (screen-by-screen shots).
- The captures were taken with no wallet connected and the cookie banner dismissed.

---

## 2026-10-14

### 10:38, Inventory of the live site
- `docs/PRO_INVENTORY.md` (saved 10:38) lists every live route, what it shows when no wallet
  is connected, and the sections on each page.
- Facts found that changed earlier guesses: with no wallet, `/` shows the Deposit page and
  `/activity` redirects to Deposit; the default sort is Total Deposits; number suffixes are
  uppercase ("43.59K"); the font is Inter.
- Builder A created `docs/PRO_DISCREPANCY_LOG.md` (a numbered real-vs-clone difference list) and
  `docs/PRO_CHECKLIST.md` (one row per page, 9 check categories).

### 10:57, SHELL READY (sidebar and top bar)
- Builder A captured live shell states at 10:54–10:57 (`real/states/search-open.png`,
  `mobile-nav-open.png`, `sidebar-collapsed.png`) and the clone's at 11:00 (`clone/states/`).
- Sidebar (open and collapsed), promo card, top bar, search field, mobile top bar and mobile
  menu match the live computed styles **within 1px** (discrepancy log #11–#14, all FIXED).
- Icons: live uses a custom icon set; the clone uses Lucide (an open-licence set) at 18px
  with a 1.25px stroke, the closest match. Logged as INTENTIONAL (#12).
- Still open: the search dropdown's contents (#13b).

### 11:05, Deposit page rebuilt
- First clone Deposit shots are from 11:05 (mobile); the desktop comparison shots are from 11:36.
- New `components/ScrollTable.tsx` copies the live table: sticky first column, sideways
  scroll with ‹ › arrows, the same fade at the edges, 73px rows (#8 FIXED).
- Default sort changed to Total Deposits and suffixes to uppercase (#6, #7 FIXED).
- Verified by comparing `real/seg/deposit-desktop-s0.png` with `clone/seg/deposit-desktop-s0.png`
  (clone shots saved 11:36): header, filters, group heading and table within 1px.
- Still open: mobile filter chips wrap onto two rows and the totals show on mobile (#21).

### 11:29, Icons work (user priority)
- One shared `TokenIcon` component (`src/shared/ui/TokenIcon.tsx`) now shows real token logos
  from open-licence sets: web3icons (MIT), Trust Wallet assets (MIT), simple-icons (CC0).
  Full list in `docs/ICONS.md` (saved 11:29).
- 9 tokens with no open logo (cbBTC, LBTC, RLUSD, frxUSD, syrupUSDC, syrupUSDG, cirBTC, MSFTc,
  AMZNc) show a plain circle in the brand colour (#5).
- Chain logos (Ethereum, Base, Avalanche, Arc, Optimism) come from web3icons (#9 FIXED).

### 11:34, Live-shaped dummy data
- Builder A extracted the live explore tables (`real/data/explore.json`, 11:22–11:32) and generated
  `src/data/mock/seed/proLive.ts`: 4 chains, 7 hubs, 19 markets, 95 reserves (#4 FIXED).
- Interest rates were "back-solved" (worked backwards) so the clone's V4 maths produces the
  same APYs as live, e.g. Core ETH 1.64% / 2.16%.
- Engine, types and tests were updated at 11:34–11:35. Collateral factors and risks are
  illustrative, not real.

### 11:42, Borrow page
- Built to match live: search on its own row, a Collateral filter, Group By Market, columns
  ASSET / HUB / BASE APY / TOTAL BORROWS / LIQUIDITY (#22 FIXED).
- Column positions identical to live; headings within 1–4px. Clone shots `clone/seg/borrow-*`
  saved 11:42. Mobile not compared yet.

### 11:53, Hub page rebuilt
- `pages/Hub.tsx` (11:47) plus shared `components/Entity.tsx` rebuilt from the live layout:
  header, stats, 4-line chart, Deposit and Borrow Opportunities tables, Hub Activity.
- Compared at 11:52–11:53 (`clone/seg/hub-core-desktop-s*.png`): within 0–3px.
- Still open (#24 PARTIAL): the header does not yet shrink and stick on scroll; per-market APY
  ranges show as one value; chart history and activity are simulated and labelled so.

### 12:02, Market page rebuilt
- `pages/Market.tsx` (12:02): header, stats, 2-line chart, Deposit and Borrow Markets,
  Connected Hubs, Risk Parameters, Supported Assets. Column positions identical to live (#25 FIXED).
- Known dev-server quirk (#26, DEV-ONLY): the exact URL `/pro/explore/market/ethereum-main` was
  served from a stale cached render; it was not restarted, per the coordinator.

### 12:09, Reserve page rebuilt; docs updated
- `pages/ReservePage.tsx` (12:08) rebuilt with all live sections (stats, Interest Rates,
  Protocol Parameters, Interest Rate Model, Available Liquidity, Supported Collateral, Assets
  You Can Borrow, Top Addresses). Within 3–8px (#27 PARTIAL: sticky header not done).
- Builder A updated `PROGRESS.md`, `PRO_CHECKLIST.md` and `PRO_DISCREPANCY_LOG.md` at 12:09 and
  created an empty `docs/PAGES_DONE.log`. No page has been declared DONE yet.

### 12:28, Market and filter detail work (after the 12:09 docs update)
- Agent 1's brief mentions a Market discrepancy list. The only written Market items are #25
  (FIXED) and #26 (DEV-ONLY); I found no separate list file.
- File evidence of what Builder A has worked on since 12:09 (not yet described in its docs):
  - source edits: `ScrollTable.tsx` 12:12, `PillMenu.tsx` 12:15, `Explore.tsx` 12:16,
    `shared/theme/ScaleFade.tsx` 12:20, `Entity.tsx` 12:35;
  - live captures of Deposit filter states (`real/states/dep-*.png`, 12:12–12:26) and the
    Market chart close-up (`real/states/market-chart2x.png`, 12:28);
  - clone Market recaptured at 12:26; live chart animation frames in `real/burst/` (12:30–12:32).
- What these edits change is not described yet; I'll log it when `PROGRESS.md` or the
  discrepancy log is updated.

### 12:31, Team change: four agents
- `docs/AGENTS.md` (12:31) sets up the team. Agent 1 coordinates and is the only one who talks
  to the user.
- Builder A keeps the shared parts and Deposit/Borrow/Hub/Market/Reserve. Builder B takes Token,
  Insights, Changelog, Preferences, Watch address and 404. The Logger (me) keeps this log and
  the status board and re-checks DONE claims.
- Each builder may only edit the files it owns. To ask for a change in someone else's file,
  it appends a line to `docs/REQUESTS.md` (a shared to-do list between agents).
- A page counts as DONE only when all 9 checklist categories pass at 1440×900 and 390×844.

### 12:36, Logger first pass
- Created `docs/PROCESS_LOG.md` (this file), `docs/STATUS_BOARD.md` and `docs/.logger_state.json`.
- `PAGES_DONE.log` is empty, so there was nothing to audit. `REQUESTS.md` and Builder B's
  docs (`PROGRESS_A3.md`, `PRO_CHECKLIST_A3.md`, `PRO_DISCREPANCY_LOG_A3.md`) don't exist yet.
- HTTP check at 12:33 (curl = a command-line page fetch): `/pro`, Deposit, Borrow, Insights,
  Activity, Hub, Market, Reserve answered 200; `/pro/changelog`, `/preferences`,
  `/watch-address` answered 404 (not built yet, as expected).

### 12:36, Dev server failing on all detail pages (reported to Agent 1)
- From about 12:34, every **dynamic** route (a URL with a variable part, like a hub id) returns
  HTTP 500: Hub, Market, Reserve, Token and Position. Re-checked at 12:34, 12:35 and 12:37
  with the same result.
- Error text in the page: "Jest worker encountered 2 child process exceptions, exceeding retry
  limit". That means a helper process inside the running `next dev` server crashed, not a
  bug in one page's code: no source file changed in the 5 minutes before it started.
- Fixed routes (Deposit, Borrow, Insights, Activity, `/pro`) still answer 200.
- I did not restart anything (only Agent 1 manages the server).

### 12:36, Most real mobile captures for Builder B's pages are not usable
- 20 files in `reference/pro-capture/real/` are byte-for-byte the same Chrome
  "ERR_INTERNET_DISCONNECTED" error page, not the live site. Checked by md5 hash and by viewing
  `insights-mobile.png`.
- Affected (mobile full and fold): insights, token-eth, changelog, preferences, watch-address,
  not-found, stake, invest, faucet, account.
- `token-usdc-mobile.png` shows only grey loading placeholders.
- So Token, Insights, Changelog, Preferences, Watch address and 404 have **no valid 390×844
  reference** yet. They need a fresh mobile capture before their Responsive check can pass.

### 12:38, Builder A archives old live captures and starts a fresh recapture
- At 12:38 Builder A moved the 2026-10-13 live captures of its pages into
  `reference/pro-capture/real/archive-2026-10-13/` (46 entries), so the old shots are kept
  rather than overwritten.
- From 12:40 to 12:45 it recaptured Deposit, Borrow, 3 hubs, 3 markets and 3 reserves at desktop,
  and the same pages (except the reserves, so far) at mobile. Run list:
  `real/data/recapture-log.txt`. The new mobile shots are real pages again (sizes 37–1,110 KB).
- It re-extracted the explore tables at 12:40 (`real/data/extract-log.txt`): Deposit 7 groups /
  68 rows, Borrow 19 groups / 70 rows, 0 empty, the same counts as the seed.
- Still the old 18:02 files: `reserve-*-mobile.png`. They were valid pages, so this is not a problem.

### 12:42, Builder A code edits (not yet described in its docs)
- New shared component `src/apps/pro/components/Apy.tsx` (12:42). Its header comment says it draws
  the live APY markers: a "*" when the figure includes estimated underlying yield, and a small purple
  check ring when it includes rewards. Explore, Market and Hub tables share it.
- Also edited 12:41–12:44: `Entity.tsx`, `Market.tsx`, `Explore.tsx`, `PillMenu.tsx`, the engine
  and both Pro seeds (`pro.ts`, `proLive.ts`).
- The clone Market page was recaptured at 12:45 (`clone/market-main-{desktop,mobile}.png`).
- `PROGRESS.md`, `PRO_CHECKLIST.md` and `PRO_DISCREPANCY_LOG.md` are unchanged since 12:09, so I can't
  yet say which discrepancy rows these edits close.

### 12:44, Builder B starts: recaptures its references, begins Token
- Builder B created `docs/PROGRESS_A3.md` (12:44). It says B won't use the broken mobile captures.
  It recaptured all its pages with a new script, `tools/a3-capture.mjs`, which waits for text that
  only the real page has (e.g. "All Assets", "Time Format") and refuses to save error pages.
- Output: `reference/pro-capture/real-a3/` (12:40–12:43), covering token-usdc, token-eth (plus the
  "WETH Is Displayed as ETH" modal), insights, changelog, preferences, watch-address and not-found at
  1440×900 and 390×844, with scroll segments, styles and DOM.
- Logger spot check: `real-a3/insights-mobile-fold.png` and `real-a3/not-found-mobile.png` show the
  real pages, not error screens. Mobile files are no longer identical: the one repeated hash is
  `watch-address-mobile` and its fold, which are the same size (26,108 bytes), as expected for a
  short page.
- Known artefact B logged: the full-page desktop Token shot leaves the Borrow Markets table blank
  (the page draws it lazily); the scroll segments show it correctly.
- Other B tools: `a3-tree.mjs`, `a3-scrollprobe.mjs`, `a3-chart.mjs`, `a3-legend.mjs`. Chart hover
  states were captured as `real/states/a3-token-{dep,bor}-chart-hover.png` (12:38–12:39). Token is
  "in progress: inspection done, building". No B source files exist yet (`pages/token/`, `proB_*`).

### 12:45, Dev server restarted by Agent 1; 500s fixed
- Agent 1 restarted the dev server at 12:45 after the 500 finding (Agent 1's message).
- Logger re-check at 12:45: Deposit, Hub, Market, Reserve, Token (ETH) and Insights all answer 200.
  `/pro/changelog` answers 404, as expected because it isn't built yet.
- Agent 1 told both builders to recapture the broken "no internet" mobile captures and to check
  every capture before using it. B's `real-a3/` set covers its pages. The broken files in `real/`
  (insights, token, changelog, preferences, watch-address, not-found, stake, invest, faucet, account)
  are still there from 18:03–18:04, so anyone reading `real/` directly must use `real-a3/` instead.

### 12:46, Logger pass 2
- No new lines in `PAGES_DONE.log`, so nothing to audit. `REQUESTS.md` still doesn't exist.
  B's checklist and discrepancy log haven't been created yet.
- STATUS_BOARD rewritten: the server notes are resolved, Token moved to "building", and the mobile
  reference note now points to `real-a3/`.

### 12:58, Builder A: Market, Hub and mobile-menu detail work (docs still at 12:09)
- Source edits 12:46–13:02: `ProShell.tsx` (12:48), `ProTxModal.tsx` (12:47), a new
  `components/ReserveActions.tsx` (12:53), `Apy.tsx`, `ScrollTable.tsx`, `Entity.tsx`, `Explore.tsx`,
  `Hub.tsx`, `Market.tsx`, `ReservePage.tsx`, plus the engine, types, `derive.ts` and `proLive.ts`.
- Comparison captures: live and clone mobile-menu shots (`real/states/mm-mobile-*.png` 12:52, the
  clone's at 12:54), live and clone Market desktop "Deposit" state (`mm-desk-dep.png`, 12:58), clone
  Market recaptured at 12:58, and clone Hub at desktop and mobile at 13:01–13:02.
- The first clone **Hub mobile** capture (`clone/hub-core-mobile.png`, 13:02) suggests the Hub
  Responsive check has started.
- `PROGRESS.md`, `PRO_CHECKLIST.md` and `PRO_DISCREPANCY_LOG.md` are **still unchanged since 12:09**
  (about 55 minutes of edits not written up), so the checklist scores on the board may be out of date.

### 13:00, Builder B: Token motion study, history seed, settings nav
- New tools (12:45–12:59): `a3-pop.mjs`, `a3-motion.mjs`, `a3-motion2.mjs`, `a3-montage.mjs`,
  `a3-loadstate.mjs`, `a3-snap.mjs`, `a3-tip.mjs`, `a3-ranges.mjs`. They captured live Token states
  (`real-a3/states/tok-*.png`: chain picker, row hover, row menu, APY range, info tip and others) and
  chart animation frames (`real-a3/burst/tok-1m*/`, 36 frames).
- New seed `src/data/mock/seed/proB_history.ts` (13:00): **simulated** chart history for Token and
  Insights. Each series is generated the same way every time (deterministic) and **ends at today's
  value from the shared seed**, so the last chart point always matches the tables. Point spacing copies
  live (e.g. 1W = 84 points, one every 2 hours), measured with `a3-ranges.mjs`.
- First page code (13:02): `pages/token/icons.tsx` and `pages/preferences/SettingsNav.tsx`.

### 13:02, First requests between builders (B-1, B-2)
- `docs/REQUESTS.md` created by Builder B at 13:02 with two OPEN requests to Builder A. Both concern
  `ProShell.tsx`, the page frame that A owns:
  - **B-1:** on `/preferences` and `/watch-address`, live swaps the sidebar's logo row for "← Back to
    App", shows a different nav list (Preferences / Account / Watch Address, then RESOURCES), and has
    **no desktop top bar**. B built the parts in `pages/preferences/SettingsNav.tsx` (the file exists
    as of 13:02). A only needs to switch to them when `isSettingsPath(pathname)` is true.
  - **B-2:** the live 404 has **no sidebar and no top bar** at any width. B asks for a CSS-only
    rule: hide them when the page contains a `data-pro-bare` marker. Logger note: B's
    `src/app/pro/not-found.tsx`, which would render that marker, **does not exist yet** (checked 13:03).
- Evidence cited: `real-a3/preferences-desktop-fold.png`, `watch-address-desktop-fold.png`,
  `not-found-{desktop,mobile}-fold.png`.

### 13:03, Logger pass 3
- `PAGES_DONE.log` is still empty, so there was nothing to audit. B's checklist and discrepancy log
  haven't been created yet.
- HTTP check at 13:02: `/pro`, Deposit, Borrow, Hub, Market, Reserve, Token (USDC), Insights and
  Activity all answer 200.

### 13:00, Dev server crashed again; Agent 1 adds a watchdog
- At about 13:00 the dev server crashed again with the same "Jest worker" HTTP 500s on dynamic routes
  (Agent 1's message). Builder A logged it at the same time as discrepancy #36 and request A-1.
- Agent 1 restarted it as a **detached** process, meaning it runs on its own and no longer depends on
  the terminal that started it. Agent 1 also added a **watchdog**: `tools/ops-restart-dev.ps1`
  (saved 13:10), run from Agent 1's monitor, checks the Market route every 60s and restarts the server
  after 2 failures in a row.
- The script stops whatever is listening on port 3100, removes `.next/dev/lock`, and starts
  `npm run dev -- --port 3100` hidden, logging to `.next/devserver.{out,err}.log`. (I only read it.)
- Builders were told not to debug short-lived 500s. Builder A agrees in #36b: "Not a code fault",
  and `npx next build` passes for every route (A is the only agent allowed to run builds).
- Logger rule from now on: one 500 is expected; I report only a 500 that lasts more than 3 minutes.

### 13:05, Builder A closes B-1 and B-2 (settings and 404 frames)
- `ProShell.tsx` edited at 13:05. In `REQUESTS.md`, A marked **B-1 DONE**: on settings pages the
  sidebar shows B's `SettingsSidebarHeader` and `SettingsNavList`, and from 900px up the desktop
  top bar is hidden and the sidebar is pinned at 260px.
- **B-2 DONE:** a pure-CSS `:has([data-pro-bare])` rule hides the sidebar and top bar, so there's no
  flash during server rendering, and the "?" button stays visible.
- A verified both by injecting the marker elements by hand, since B's routes don't exist yet. The full
  check waits for B's `/preferences`, `/watch-address` and `not-found.tsx`. Those still answer 404 or
  are missing as of 13:16.

### 13:09, Builder A docs updated: Market and Hub detail, chart, liquidity model
- `PROGRESS.md`, `PRO_CHECKLIST.md` and `PRO_DISCREPANCY_LOG.md` were updated at 13:09 and 13:13.
  This writes up the work I had logged earlier from file times only.
- **#28 Shared chart (FIXED, timing ⚠):** `Entity.tsx` ChartCard rebuilt to behave like the live
  chart, in plain SVG with no new dependency. It reproduces all six captured live axes. The 0.4s
  morph speed is an estimate because live timing couldn't be measured.
- **#29 Market (FIXED):** all 10 items on the coordinator's Market list are done. Desktop is within
  0–4px and mobile within 0–5px of live, down to the bottom of the page. The seed was regenerated from
  fresh live data: totals $410.34M / $94.75M against live $410.35M / $94.75M.
- **#30–#34:** a per-market "available liquidity" model (`drawCap`; the engine refuses borrows above
  it), a new rewards badge glyph (`Apy.tsx`), the frxUSD logo left as a circle for licence reasons,
  and the Hub chart card height. #32, the borrow-side rewards badge, is still OPEN.
- **#35b Hub mobile (FIXED):** opportunity cards, a single Deposit/Borrow button, and 2 cards then
  "Show N more". Mobile within 0–7px. The clone Hub mobile shots were recaptured at 13:12.
  **#37 (INTENTIONAL):** the live Hub chart overflows at 390px, and the clone keeps the card inside
  the screen.

### 13:13, Note on Builder A's times (data quality)
- Several times in A's docs are **later than the moment the file was saved**: "13:20" (#36 and
  PROGRESS P5, saved 13:09), "13:25" (`next build`), "13:40" (#35b) and "13:42" (A-1 DONE, saved 13:13).
  They can't be real clock times.
- This log uses file timestamps instead. A's times look about 10–30 minutes ahead and shouldn't be
  used to order events.

### 13:14, Builder B: Token page code under way
- New files in `src/apps/pro/pages/token/`: `model.ts`, `MultiLineChart.tsx` (13:07),
  `popovers.tsx` (13:08), `MarketsTable.tsx` (13:10), `TokenPage.tsx` (13:14), `WethNotice.tsx`
  (13:15, the "WETH Is Displayed as ETH" notice seen live), plus `pages/preferences/prefs.ts`
  (13:07). `proB_history.ts` was updated at 13:12.
- The route `src/app/pro/explore/token/[symbol]/page.tsx` hasn't been repointed to B's page yet, so
  `/pro/explore/token/USDC` still serves A's old guessed layout. `PROGRESS_A3.md` is unchanged since
  12:44, and B has no checklist or discrepancy log yet.

### 13:16, Logger pass 4
- Route checks at 13:13, 13:14, 13:15 and 13:16: Deposit, Market, Hub, Reserve, Token and Insights
  all answered 200 every time, with no 500s. `/preferences`, `/watch-address`, `/changelog` and the
  test 404 answered 404, as expected because B hasn't built them yet.
- `PAGES_DONE.log` is still empty, so there was nothing to audit. All requests are now closed: B-1,
  B-2 and A-1 are DONE.

### 13:18, Builder B: first checklist and discrepancy log; Token page and 404 built and wired
- B created `docs/PRO_CHECKLIST_A3.md` (13:18) and `docs/PRO_DISCREPANCY_LOG_A3.md` (13:18). Every
  column is still "?" because B hasn't compared anything yet.
- `PROGRESS_A3.md` (13:18): the Token page and the 404 are built and wired. The token route now shows
  B's `TokenRoute`, and `src/app/pro/not-found.tsx` exists. Lint and tsc are clean on B's files.
- B's log says it **forked** (made its own copy of) two shared components: a page-specific
  `MultiLineChart.tsx` (T1), because A's ChartCard can't show up to 15 series with a scrolling legend,
  and `MarketsTable.tsx` (T3), because live has two sticky columns and a row menu. Both reasons are
  logged, as `AGENTS.md` rule 2 requires.
- Other B rows: T9, borrow-side reward badges missing (OPEN, the same data gap as A's #32), N1, the 404
  glyph is neutral rather than the Aave logo (INTENTIONAL guardrail), and S1, the "Account" link leads to
  the clone 404 (OPEN).
- **New request B-3 (B → A, OPEN):** unmatched `/pro/*` URLs such as `/pro/explore` fall through to the
  root `src/app/not-found.tsx` instead of B's Pro 404. B asks A to add a catch-all
  `src/app/pro/[...notFound]/page.tsx` that calls `notFound()`. At 13:30, `/pro/explore` and
  `/pro/nonexistent-xyz` answer 404.

### 13:21, Builder A declares Market and Hub DONE
- `PAGES_DONE.log` got its first two lines (13:21): **DONE | Market** and **DONE | Hub**, each with a
  list of things to test. A's checklist marks both 9/9 ✅. The new #15b says the sticky compact header is
  FIXED ("h1/sub within 1px of live at scroll 60/200/600"), and #28b says chart animation is FIXED
  (legend toggle on a 300ms curve).
- A also corrected its times in `REQUESTS.md` ("NOTE | A-1": real times were about 12:58 and 13:12, and
  its clock now comes from `date`), which resolves my 13:13 data-quality note.

### 13:31, AUDIT ISSUES: Market
- Method: my own puppeteer script, which reuses `tools/lib.mjs` read-only, run against the clone at
  1440×900 and 390×844 with full-page, viewport and scrolled screenshots. Output is in
  `reference/audit/market-*.png` and `market-audit-log.txt`. I compared these with the fresh live captures
  `real/market-main-*.png` (12:42–12:44, real pages, not error screens) and `real/states/mkt-scroll200.png`.
  I also read the live page's header position at 390px on scroll, which is navigation and reading only.
- **Passed:** HTTP 200 at desktop and mobile; no sideways overflow (scrollWidth = width at both sizes); no
  console errors; the desktop first screen matches live closely (`market-desktop-fold.png`); the desktop
  sticky header matches live (sticky top 80px, title scale 0.7642 at scroll 200); the chart tooltip shows
  on hover; hiding "Total Borrows" re-fits the axis from $100M–$400M to $410M–$420M; the 1M tab works;
  at 390px "Show 12 more" expands the list (page height 3842 → 7555px) and a card's Deposit button opens
  the demo "Choose Wallet" prompt.
- **Issue L-1 (390px):** live keeps a compact header pinned under the mobile top bar (h1 stays at y=80,
  scaled 0.7642). The clone's header scrolls off the screen. A's DONE test "scroll down (header compacts
  and sticks)" passes on desktop only.
- **Issue L-2:** the live Core USDC borrow APY is 5.24% with a rewards badge; the clone shows 5.37% with
  no badge. A's own #32 is still OPEN.
- **Issue L-3 (minor):** the Connected Hubs "Assets" icons are in a different order (live AAVE, LINK,
  cbBTC, EURC; clone ETH, USDG, wstETH, WBTC).
- Not counted as issues: the full-page screenshots showed missing icons and chart labels, but viewport
  shots of the same sections show them correctly. Images load lazily (only when scrolled near), so
  full-page captures miss them. The live full-page capture has the same problem.

### 13:31, AUDIT ISSUES: Hub
- Same method; output in `reference/audit/hub-*.png` and `hub-audit-log.txt`. Compared with
  `real/hub-core-*.png` (12:41–12:44).
- **Passed:** HTTP 200 at both sizes; no overflow; no console errors; the desktop first screen matches
  live (side by side in `cmp-hub-desktop-fold.png`); the desktop sticky header compacts the same way as on
  Market; the tooltip shows all 4 series; the 1W→1M switch works; "Utilization rate" toggles off; sorting
  Deposit Opportunities by APY flips between descending (6.26%, 6.18%, …) and ascending (0.00%, …); at
  390px "Show 14 more" expands (3107 → 6259px) and Hub Activity "See more" loads more rows (+620px). All
  activity icons load in the viewport (`hub-mobile-activity-view.png`).
- **Issue L-1 (390px):** the same missing sticky compact header as on Market. Live Hub at 390px keeps the
  h1 at y=80 scaled 0.7642; the clone's scrolls away (`cmp-mobile-scroll200-clone-vs-live.png`).
- **Issue L-2:** USDC borrow shows 5.37% with no badge; live shows 5.24% with a badge
  (Borrow Opportunities, card 2).
- Minor, not filed: at 1W the desktop chart's top y-axis label is $500M in the clone and $600M on live,
  because the simulated history has a lower peak (#28 says the history is simulated).
- **Requests opened:** L-1, L-2 and L-3, from Logger to A2, appended to `docs/REQUESTS.md`.
