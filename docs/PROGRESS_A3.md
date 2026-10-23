# Progress log (Agent 3, Builder B)

Scope: Token, Insights, Changelog, Preferences, Watch address, 404 (see docs/AGENTS.md).
Checklist: `docs/PRO_CHECKLIST_A3.md`. Differences: `docs/PRO_DISCREPANCY_LOG_A3.md`.

## Reference captures (2026-10-14)
- The Logger found that many mobile captures in `reference/pro-capture/real/` were Chrome
  "no internet" pages or skeletons. **B does not use those.** All of B's pages were recaptured
  with `tools/a3-capture.mjs`, which waits for page-specific text (e.g. "Deposit Markets",
  "All Assets", "Time Format") and refuses to save error pages.
- Output: `reference/pro-capture/real-a3/` (full page, fold, `seg/` scroll segments, `styles/`,
  `dom/`) at 1440×900 and 390×844, for token-usdc, token-eth (plus the "WETH Is Displayed as ETH"
  modal shot), insights, changelog, preferences, watch-address, not-found.
- Known capture artefact: the desktop full-page PNG of the token page leaves the Borrow Markets
  table blank (lazy rendering during full-page capture). The scroll segments show it correctly.

## Tools written (all `tools/a3-*.mjs`, dev-only)
- `a3-capture.mjs`: content-gated captures of B's pages (real or clone) → `<target>-a3/`.
- `a3-tree.mjs`: compact element tree with rects and key computed styles under a class fragment.
- `a3-scrollprobe.mjs`: computed transform/padding/pseudo-elements at several scroll offsets.
- `a3-chart.mjs`: chart internals (paths, masks, gradients, gridlines, labels, legend, tooltip).
- `a3-legend.mjs`: legend button states, and toggling one.

## Dev server
- 2026-10-14 12:50: token/insights routes 200 after Agent 1's restart.
- 13:05: Agent 1 added a watchdog; transient 500s are server restarts, not B's code. History generation is memoised at module level (seed/proB_history.ts).

## Timeline (real clock)
- 12:44 recaptured real pages (a3-capture.mjs).
- 12:50-13:05 Token page inspection: header compaction (linear over 72px of scroll), chart spec (palette, mask, ticks, tooltip, legend, loading wave, settle fades), table spec, popovers, WETH notice, chain picker (?chain=<id>).
- 12:58 filed REQUESTS B-1 (settings sidebar frame) and B-2 (bare 404); A2 marked both DONE.
- 13:18 Token page + 404 built and wired (src/app/pro/explore/token/[symbol]/page.tsx now renders B's TokenRoute; src/app/pro/not-found.tsx). Lint and tsc clean on B's files.

- 13:20-13:39 Token compare/fix loop: stats/summary/table heights, header pb bug (responsive p override), compact header logo width, scrim layering, mobile spacing + borrow-card blank row; filed B-3 (catch-all 404 route) and B-4 (Inter opsz).
- Watchdog is off (Agent 1): if routes 500 for >3 min, file OPEN … to A1 | dev server.
- 13:40-13:55 Insights built and compared (desktop + mobile), live motion recorded (first-load wave only; window change = instant line swap + gridline cross-fade); shared Plot generalised (geometry, tick exit fades).
- 13:54 A2 closed B-3 (catch-all → B's 404) and B-4 (Inter opsz): token title width now 123px = live.
- 13:55-14:01 re-verification after A2's font change; desktop token offset fix (-10px); card shadows/white ink moved to shared tokens (shadow-low, onAccent); filed B-5 (table-item-hover-2 token) and B-6 (dev-only notice on the catch-all route).
- 14:01 DONE logged: Token, Insights, 404.

## Pages
| Page | Status |
|---|---|
| Token | DONE 14:01 (desktop ≤1px, mobile ≤5px, motion/tooltip/menus verified against live) |
| Insights | DONE 14:01 (desktop ≤2px, mobile ≤2px, motion verified against live) |
| Changelog | DONE 2026-10-14 (list + 8 detail pages exact at 1440 and 390) |
| Preferences | DONE 2026-10-14 (exact at both widths; menus, sheets, motion sampled) |
| Watch address | DONE 2026-10-14 (page and dialog exact at both widths) |
| 404 | DONE 14:01 |

## Resumed 2026-10-14 afternoon (after the Mini-Aave pause; one builder covering A and B)
- Changelog: entry rules, 72px gaps, sign-off row with clock, detail page rebuilt to the list's entry layout, copy lengths fitted per width (a3-fit.mjs), hovers matched, detail-route Cache Components error fixed.
- Preferences: built (SettingsLayout, controls: SegmentedToggle, SelectMenu with mobile sheet, Switch, MorphText).
- Watch Address: built (page, DialogFrame, dialog; submit closes and stores nothing, as live when not connected).
- Reserve (A's page): sticky header geometry, mobile rebuild, IRM chart, Top Addresses, Reward Campaigns.
- Shell/Deposit/Borrow hovers, help button, Deposit mobile filters + Display Preferences sheet.
- New tools: a3-settle, a3-els, a3-hover, a3-watch, a3-prefstates, a3-prose, a3-fit, a3-chgdetail, a3-entityhdr, a3-scrollshot2, a3-textmap, a3-dpsheet, a3-dumpfn.js.