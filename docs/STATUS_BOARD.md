# Status board: Aave Pro clone

Rewritten by **Agent 4 (Logger)** on every pass. **Last pass: 2026-10-14 13:31 (pass 5, audit of Market + Hub).**

- **Stages:** not started → building → structure ✅ → fine-detail → DONE (or BLOCKED).
- **9 checks** = Structure, Layout, Styling, Typography, Icons, Interactions, Animation,
  Responsive, Quality. Builder A's rows come from `PRO_CHECKLIST.md` and Builder B's from
  `PRO_CHECKLIST_A3.md` (⚠ = known gaps, ? = not compared yet).
- **"Last verified by Logger"**: **AUDIT PASS / AUDIT ISSUES** = a full independent check of a DONE
  claim. Otherwise it's an HTTP status check only. One short-lived 500 is expected while the watchdog
  is running.

| Page | Owner | Stage | 9-check summary | Last verified by Logger | Link |
|---|---|---|---|---|---|
| Shell (sidebar, top bar, mobile menu) | A | fine-detail (SHELL READY; settings and bare frames added) | 6/9 ✅; ⚠ Icons (Lucide, intentional), ⚠ Interactions (search dropdown #13b); ? Animation (hover states) | 13:30 HTTP 200 (via any page) | http://192.168.1.6:3100/pro/explore/deposit |
| Explore Deposit | A | fine-detail | 6/9 ✅; ⚠ Responsive (mobile filter row #21), ⚠ Quality (mobile); ? Animation | 13:16 HTTP 200 | http://192.168.1.6:3100/pro/explore/deposit |
| Explore Borrow | A | fine-detail | 7/9 ✅; ? Animation, ? Responsive (mobile not compared) | 13:02 HTTP 200 | http://192.168.1.6:3100/pro/explore/borrow |
| **Hub** | A | **DONE claimed 13:21, AUDIT ISSUES** | A claims 9/9 ✅. Logger: **Responsive ❌** (no sticky compact header at 390px, L-1), **Quality ⚠** (borrow rewards badge/APY, L-2); everything else checked passes | **13:31 AUDIT ISSUES** (L-1, L-2) | http://192.168.1.6:3100/pro/explore/hub/ethereum-core |
| **Market** | A | **DONE claimed 13:21, AUDIT ISSUES** | A claims 9/9 ✅. Logger: **Responsive ❌** (no sticky compact header at 390px, L-1), **Quality ⚠** (borrow rewards badge/APY, L-2; asset icon order, L-3) | **13:31 AUDIT ISSUES** (L-1, L-2, L-3) | http://192.168.1.6:3100/pro/explore/market/ethereum-main |
| Reserve | A | fine-detail (sticky header shared via EntityHeader) | 6/9 ✅; ? Animation, ? Responsive, ⚠ Quality (simulated flows, labelled). L-1 will affect it too | 13:16 HTTP 200 | http://192.168.1.6:3100/pro/explore/reserve/ethereum/core/main/ETH |
| `/` not connected (shows Deposit) | A | structure ✅ | Structure ✅, Layout ✅; rest follows Deposit | 13:02 HTTP 200 | http://192.168.1.6:3100/pro |
| `/activity` not connected (redirect) | A | structure ✅ | Structure ✅, Interactions ✅, Quality ✅; others n/a (redirect only) | 13:02 HTTP 200 | http://192.168.1.6:3100/pro/activity |
| Token | B | building (built and wired 13:18; compare pending) | 0/9 compared (all ?); 2 forks logged (T1 chart, T3 table) | 13:30 HTTP 200 (B's page now) | http://192.168.1.6:3100/pro/explore/token/USDC |
| Insights | B | not started | 0/9 (A's old guessed layout still served) | 13:16 HTTP 200 | http://192.168.1.6:3100/pro/insights |
| Changelog | B | not started | 0/9 (not built) | 13:16 HTTP 404 (expected) | http://192.168.1.6:3100/pro/changelog |
| Preferences | B | building (prefs store + settings nav; page not started) | 0/9 | 13:16 HTTP 404 (expected) | http://192.168.1.6:3100/pro/preferences |
| Watch address | B | not started (frame ready via B-1) | 0/9 | 13:16 HTTP 404 (expected) | http://192.168.1.6:3100/pro/watch-address |
| 404 page | B | building (built 13:18 with the bare frame; compare pending; B-3 open) | 0/9 compared | 13:30 HTTP 404 | http://192.168.1.6:3100/pro/nonexistent-xyz |
| Position | A | BLOCKED | can't be observed without a wallet (no public id) | not rechecked | http://192.168.1.6:3100/pro/position/test |
| Connect prompt (Get Started) | A | BLOCKED | live ConnectKit modal not captured | n/a | n/a |

**Audit evidence:** `D:\aave-protocol-study\reference\audit\` holds full-page, viewport and scrolled
clone shots and side-by-side crops (`cmp-*.png`), plus `market-audit-log.txt` and `hub-audit-log.txt`.
Full-page shots miss lazily loaded icons and chart labels, so the viewport shots are the reference.

**Dev server:** healthy. Both audited URLs returned 200 on the LAN address at 13:30 with desktop and
phone user agents. The watchdog (`tools/ops-restart-dev.ps1`) is running.

**Reference captures:** use `real-a3/` for Builder B's pages and the 12:40–12:45 files in `real/` for
Builder A's. The broken "no internet" mobile files are still in `real/`, so don't use them.

## Open requests between builders

| ID | From → To | What | Status |
|---|---|---|---|
| **L-1** | Logger → A | Hub and Market at 390px: the header must stay pinned and compact on scroll (live h1 stays at y=80, scale 0.7642; clone scrolls away) | **OPEN** |
| **L-2** | Logger → A | Hub and Market: Core USDC borrow is 5.24% with a rewards badge on live, 5.37% with none in the clone (your #32). Fix it or score it ⚠ | **OPEN** |
| **L-3** | Logger → A | Market: Connected Hubs "Assets" icon order (live AAVE, LINK, cbBTC, EURC; clone ETH, USDG, wstETH, WBTC) | **OPEN** |
| B-3 | B → A | Catch-all `src/app/pro/[...notFound]/page.tsx` so unmatched `/pro/*` URLs show the Pro 404 | **OPEN** |
| B-1, B-2, A-1 | | Settings frame, bare 404 frame, dev-server restart | DONE |

## Top 5 remaining differences

From `PRO_DISCREPANCY_LOG.md` (13:21), `PRO_DISCREPANCY_LOG_A3.md` (13:18) and this audit. Biggest first:

1. **Builder B's pages:** Token and the 404 are built but not compared yet. Insights, Changelog,
   Preferences and Watch address haven't been started, and Insights still serves A's guessed layout.
2. **Mobile sticky compact header (L-1)** is missing on Hub and Market, and on Reserve through the shared
   header. It's the main reason the two DONE claims don't pass.
3. **#13b search dropdown content:** live has tabs (All / Assets / Hubs / Markets) and sections with "See
   all"; the clone groups content as Assets / Hubs / Markets with no tabs.
4. **#21 Explore at 390px:** the clone shows protocol totals, wraps its filter chips onto two rows (live:
   one sideways-scrolling row), and puts the APY in a row instead of the card header.
5. **Borrow-side rewards (#32 / T9 / L-2):** borrow APYs carry no rewards badge, and the APY differs from
   live (USDC 5.37% against 5.24%). This shows on Hub, Market, Borrow and Token.
