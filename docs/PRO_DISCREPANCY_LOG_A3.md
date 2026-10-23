# Aave Pro: Builder B (A3) discrepancy log (real vs clone)

Evidence: real `reference/pro-capture/real-a3/` (2026-10-14), clone `reference/pro-capture/clone-a3/`.
Status: OPEN (not fixed), FIXED (fixed and verified in a screenshot), INTENTIONAL (kept on purpose),
BLOCKED (not observable), INFERRED (built without a live observation; documented, not guessed silently).

| # | Page / area | Real | Clone | Status |
|---|---|---|---|---|
| T1 | Token: chart component | Live token chart: one series per market (≤15), 7 shown by default, scrolling legend with chain logos, optional "Base APY" title, x labels only while hovering, loading wave replacing the card body | Page-specific `pages/token/MultiLineChart.tsx` (visx, same library as live; A's shared ChartCard does not support these). Same tokens, motion measured frame by frame (tools/a3-motion2.mjs) | INTENTIONAL (fork, reason logged) |
| T2 | Token: default legend selection | Two loads showed different 7-series selections (first 7 in legend order; another time the middle 7) | First 7 in legend order | INFERRED |
| T3 | Token: markets table | Two sticky columns (Chain + Market, 191px), content-sized columns, 72px rows, hover plate, hover "⋯" menu | Page-specific `pages/token/MarketsTable.tsx` reusing A's ScrollTable mechanics (spacer + sticky layer + masked middle); A's table has one sticky column, 73px rows and no row menu | INTENTIONAL (fork, reason logged) |
| T4 | Token: chart history | Real API history | Deterministic simulated series (seed/proB_history.ts) ending at today's seed APY; markets on one hub asset share one curve, as live | INTENTIONAL (dummy data) |
| T5 | Token: rewards hover card | "Your APY / Base APY / 1 Available Reward (token, end date) / Merkl and Aave DAO disclaimers / Show details" | Same frame and rows; reward shown as "Incentives" with the seed's illustrative rate and a demo disclaimer (no real program or token named) | INTENTIONAL |
| T6 | Token: Hub Assets "CF" toggle | Only the "Assets" state was observed | CF state lists collateral factors in that market (labelled illustrative) | INFERRED |
| T7 | Token: loading wave artwork | Their own SVG wave | Our own curve with the same stroke (fg-1 6%, 1px, non-scaling) | INTENTIONAL (no copied SVG) |
| T8 | Token: WETH notice copy | "…within Aave Pro…" | "…within this demo, as in Aave Pro…" | INTENTIONAL |
| T9 | Token: borrow-side reward badges | Some borrow rows show a reward badge | Seed has no borrow incentives, so none show | OPEN (seed lacks data; not invented) |
| N1 | 404 glyph | Aave logomark (arc with blinking eyes) inside the window tile | Neutral dotted search ring, same tile | INTENTIONAL (guardrail: no Aave logo) |
| S1 | Settings sidebar "Account" link | Live /account renders an empty page | Links to /pro/account, which is outside B's scope and renders the clone 404 | OPEN (not B's route) |
| T10 | Token: text widths | Live InterVariable with optical sizing ("USD Coin" 28px = 123px) | Was 129px; A2 added the opsz axis (B-4, 13:54) | FIXED by A2 (re-verify) |
| I1 | Insights: asset list | 38 rows (incl. rsETH, PT USDG, PT USDe, PT sUSDe) | 35 rows: the shared seed has no rsETH or Pendle PT reserves. USDt and USDT are merged into one row, as live | OPEN (seed scope, A2's seed) |
| I2 | Insights: chart levels | Total deposits $1.42B, Active loans $457.61M (live V4 totals) | Seed V4 totals ($1.10B / $418M): the same figures the clone's hubs add up to. History is a simulated launch-era ramp (+50-60% over a month, like live) | INTENTIONAL (dummy data, consistent across the app) |
| I3 | Insights: chain filter | Ethereum, Arc, Base, Avalanche and "EtherFi ⓘ" | The seed's four chains; EtherFi has no data in the seed | OPEN (not invented) |
| I4 | Insights: title block | Totals header block ends 4px higher | A2's shared PageTitle + ProtocolTotalsHeader is 4px taller; compensated locally (-4px on the Protocol section) | FIXED (local) |
| I5 | Insights: ETH borrow APY | 1.71% - 2.16% (EtherFi borrow carries rewards) | 2.16%: the seed has no borrow incentives (see T9) | OPEN (seed) |
| C1 | Changelog: body copy | Aave's own prose | Our own wording (not copied); each block's length tuned with tools/a3-fit.mjs so it wraps to the live line count at 341px (list, mobile), 358px (detail, mobile) and 610px (desktop). The list and all 8 detail pages have the live block and page heights | INTENTIONAL (no copied text) |
| C2 | Changelog: illustrations | Aave artwork images (610×343) | Own compositions in the same frame (pages/changelog/art.tsx) from open logos; MSFTc/AMZNc show brand-colour circles (no open logo, ICONS.md). Fixed the stocks centre disc (a gradient was passed to bgcolor and did not render) | INTENTIONAL |
| C3 | Changelog: image load fade | The image fades/settles in over 0.6s once loaded | The art is drawn, not loaded, so there is nothing to fade in | INTENTIONAL (n/a) |
| C4 | Changelog: sign-off clock | 14px clock glyph on the rail whose hands turn every 6s and 36s | Own CSS glyph, same size, position and periods | INTENTIONAL (own drawing) |
| C5 | Changelog: list structure | Every entry ends with a 1px border-0 rule; the last entry has 112px bottom padding and no rule; the sign-off row sits after the rail box (x −6.4px); mobile uses the same 72px gaps with a 16px rail inset | Was: no rules, 40px mobile gaps with top rules, sign-off as a list item. Rebuilt to the live structure; list and sign-off exact at both widths | FIXED |
| C6 | Changelog: hovers | Title: no change; image: inset ring 6%→8%; detail back link: colour only; Copy Link: no hover, "Copied" for ~2s | Was: title underline, 12% ring, arrow nudge, Copy Link colour hover, 1.6s. Matched to live (tools/a3-hover.mjs) | FIXED |
| C7 | Changelog detail layout | Same entry layout as the list: back link in the date column (sticky), date + Copy Link row, 28/500 title (24 on mobile), no page h1 | Was a centred 610px column with its own spacing; rebuilt. All 8 detail pages match live heights at both widths | FIXED |
| C8 | Changelog detail route (dev) | n/a | Next 16 Cache Components logged "encountered URL data during prerendering" on /changelog/{slug}; the params are now read inside a Suspense boundary (same pattern as the token/hub routes) | FIXED |
| C9 | Live capture artefact | Settings/changelog full-page captures showed the content at x 418/468 instead of 545 | Not a layout difference: the full-page screenshot resizes the viewport and live replays its 0.3s padding-left transition. a3-capture now waits 900ms before the fold shot and style dump; the steady state was verified with tools/a3-settle.mjs (x 545 from 0.7s on) | FIXED (tooling) |
| P1 | Preferences: value morph | The menu value morphs letter by letter: old letters fade (linear) and scale to .8 over ~190ms; the new value fades in over 200ms from ~100ms and scales .95→1 over 400ms; the width eases | MorphText with the same timings per word; width eases 200ms (frame-sampled on live and clone) | INTENTIONAL (word-level, timings matched) |
| P2 | Preferences: Analytics switch | Live: cookie/tracking consent | The clone has no analytics or cookies; the switch only stores the choice | INTENTIONAL |
| P3 | Preferences: Approvals | Permit / Transaction changes how approvals are signed | Stored only; simulated transactions have no approval step | INTENTIONAL (simulation) |
| P4 | Pro popover menus dim the page | Live menus never dim the page | The shared theme gives every MUI Backdrop a 32% fill, which also overrides the invisible backdrop that Popovers use. The settings menus set a transparent backdrop locally; theme.ts is left alone (shared with the frozen Standard app and /mini). A-side menus: PRO_DISCREPANCY_LOG #44 | FIXED (settings) |
| W1 | Watch Address: submit when not connected | The dialog closes and nothing is stored (verified twice: aave-watch-wallets-v1 stays {}) | Same | MATCHES |
| W2 | Watch Address: populated list | Wallet-gated, not observable | Not built (no invented layout) | BLOCKED (not observable) |
| W3 | Watch Address: dialog tile glyph | Own animated binoculars artwork | Lucide Binoculars (ISC) in the same 64px bg-4 tile | INTENTIONAL (open icon set) |
| W4 | Watch Address: ENS names | "Resolves to 0x…" over the network, then submit enables | No network in the demo: a helper line says ENS cannot be resolved here and submit stays disabled | INTENTIONAL (no network) |
| W5 | Watch Address: empty-state outline | Dotted outline drawn with a CSS mask | Own SVG mask (3px stroke on the edge, 4px dashes), same look | INTENTIONAL (own drawing) |
| S2 | Settings sidebar hover | 6% white plate, label fg-1/500, icon fg-1 | Was a 2.5% plate and no weight change; matched | FIXED |
| S3 | Settings mobile top bar | /preferences: round "Go back" button in place of the mark; /watch-address: the mark | Same (ProShell MobileHomeOrBack also matches /pro/preferences; /mini paths unaffected) | FIXED |
