# Reference audit

Phase 1 output. It records what the two reference apps look like and how they behave, and where each fact came from. It is the source of truth for the clone's visuals and copy.

Audit date: 2026-10-13.

## 0. Sources and how they were used

| Source | What it gave us | Trust |
|---|---|---|
| `github.com/aave/interface` (main branch), read through raw.githubusercontent.com. Read-only copies are in `D:\aave-protocol-study\reference-cache\github-interface\raw\` | Standard app: design tokens, theme, layout, copy, flows, maths helpers | **Verified source.** The live app.aave.com serves the same build (see below) |
| `https://app.aave.com` HTML, `_buildManifest.js`, main CSS, `_app` chunk | Confirms the live app is the redesigned "Figma token" build (same hex values `#716ef3`, `#fafafa`, `#f1f1f1`, `Inter Variable`) and the same route list | Verified |
| `https://pro.aave.com` HTML for `/`, `/activity`, `/explore/deposit`, `/explore/borrow`, `/insights`, plus all their CSS and JS chunks (cache: `reference-cache\pro.aave.com\`) | Pro: real DOM skeleton (server-rendered), SCSS-module CSS (tokens, sizes, motion), its full English i18n dictionary (480 strings), route patterns, GraphQL schema names | Verified for structure, copy and tokens. Rendered **data** views are client-only, so their exact layout is partly inferred |
| `https://api.pro.aave.com/graphql` (public, read-only queries) | Real V4 hub, spoke and reserve names and parameter ranges (collateral factor, liquidation bonus and so on), used to make the mock data plausible | Verified data shapes. Values in the clone are rounded and labelled illustrative |
| User screenshots folder `D:\aave-protocol-study\reference\screenshots\{app,pro}` | Nothing yet: the folders exist but were empty at audit time | n/a |

**Licence.** `LICENSE.md` in aave/interface says **"All Rights Reserved © Aave Labs"**. Its `package.json` says `BSD-3-Clause`. We follow the stricter rule:
- No source file, SVG, logo or icon was copied.
- The clone re-implements the appearance in its own code, using measured values such as colours, sizes and copy.
- No Aave logo or ghost mark is used. Token icons come from `cryptocurrency-icons`, which is CC0-1.0. The **AAVE and GHO token icons are deliberately not used**, because they are Aave brand marks; the clone shows letter avatars instead.

## 1. Standard app (app.aave.com)

### 1.1 Stack (verified from package.json)
- Next.js 15.5 (Pages Router), React 18, MUI 5 with Emotion, Zustand 5, TanStack Query 5, visx 2/3, `@number-flow/react` 0.5, Lingui i18n, wagmi/viem/ethers, connectkit.
- Theme: MUI CSS-variables mode. Light and dark schemes come from one token map (`figmaColors.ts`), flattened onto the palette root (`--mui-palette-bg-1`), with a Display-P3 override layer.

### 1.2 Routes (verified from `_buildManifest.js` and `pages/`)
`/` (dashboard if connected, else markets), `/dashboard`, `/markets`, `/reserve-overview?underlyingAsset=…&marketName=…`, `/history`, `/faucet` (testnet only), `/sgho` (Savings), `/staking` (Umbrella), `/safety-module`, `/governance`, `/governance/v3/proposal`, `/bridge`, `/v3-migration`, `/404`.

### 1.2a Markets (verified by Agent 1 in `src/ui-config/marketsConfig.tsx`)
- **Mainnet titles, in listed order:** Core, Prime, Ethereum, Polygon, Avalanche, Base, Arbitrum, …, Linea, Sonic, OP, Aave Horizon, Plasma, Ink, MegaETH, X Layer, Mantle, Gnosis, BNB Chain, Monad, Scroll, ZKsync, Aptos, Celo, Soneium, EtherFi, Metis.
- **"Core"** is `proto_mainnet_v3`, the default Ethereum market.
- **Testnets:**
  - **"Base Sepolia"** (`proto_base_sepolia_v3`, V3, has a Faucet).
  - "Avalanche Fuji" (`proto_fuji`, legacy V2, faucet).
  - **There is no Ethereum Sepolia market** in the current app, even though aave.com/docs still mentions "Sepolia".
- **The switcher** (`MarketSwitcher.tsx`) groups markets into Favourites, Ethereum (with the V4 / Aave Pro links), L1 Networks, L2 Networks and Legacy. It orders them by a fixed title list. It sits at the top of the Dashboard and Markets pages.
- **The clone** mirrors a subset: Core and Prime (Ethereum), Base and Arbitrum (L2), and Base Sepolia (testnet, with faucet). Fuji (V2) is omitted because the clone implements V3 only.

### 1.2b Live screenshot: Markets page in test mode
Source: `reference/screenshots/app/markets-testmode-base-sepolia-desktop.png`, live app.aave.com, desktop, dark theme. This screenshot overrides anything inferred.

**Header, left to right:**
- Wordmark, then a green "Test Mode ⌃⌄" chip.
- Nav: Dashboard · **Markets** (active, purple underline) · Faucet · Savings · More ▾.
- Right side: "V4 ↗" pill (the label collapses in test mode), a refresh-style Swap icon button, a **headset (support) icon button**, the wallet pill (avatar plus `0x44...2c18`), and a settings gear.
- No Bridge GHO button in test mode, and no notify bar.

**Title row:**
- Market icon with a small test-chain badge ("S").
- The title reads **"Base"**: the "Sepolia" word is stripped and shown as the badge instead.
- Purple "V3" chip, then ⌃⌄.
- No description line for this market.

**Stats, right-aligned:**
- "Aave total deposits $32.62B ⓘ" and "Aave total loans $12.75B ⓘ".
- A vertical divider.
- "Total market size $93.45M", "Total available $77.11M", "Total borrows $16.34M".

**Toolbar:**
- Search on the left: "Search asset name, symbol, or address".
- On the right: an "In Wallet" toggle pill and an "All Categories ⌃⌄" select.

**Table:**
- Columns: ASSET ⌃⌄ | TOTAL SUPPLIED ⌃⌄ | SUPPLY APY ⌃⌄ | TOTAL BORROWED ⌃⌄ | BORROW APY, VARIABLE ⓘ ⌃⌄ | Details.
- Amounts show the token amount on top and the muted USD value below.
- A non-borrowable asset shows "—" in both borrow columns (WBTC).
- **The wrapped native reserve is shown as "Ethereum · ETH".**
- Rows: USDC, USDT, WBTC, cbETH, ETH, LINK.
- Footer row inside the card: a "Show assets <$100k supply" switch.

**Rates:** supply APY ≈ borrow APY × utilization × (1 − reserve factor of about 10%) on every row. The clone's maths uses this formula.

**Footer:** Terms · Privacy · Docs · FAQS · Get Support · Manage analytics, with social icons on the right. The clone shows text links and no brand icons.

**Clone changes made from this screenshot:**
- Base Sepolia uses this asset list and similar sizes.
- The title is stripped and the test badge added.
- Short address format `0xde...0001`.
- Support button added; labels collapse in test mode; Bridge hidden on testnet.
- Protocol-wide stats are shown, computed from the demo's own markets and labelled simulated.

### 1.3 Global layout
**Top notify bar.** `TopBarNotify` is a per-chain, dismissible campaign bar:
- bg-1 background with a border-0 bottom border, 14px text.
- Underlined CTA in purple-2 with an ↗ icon.
- Close X on the right.

**Header** (`AppHeader`):
- Height 72px, sticky, bg-3 (bg-1 in dark), inset bottom hairline border-0.
- Hides on scroll on desktop only: a Slide-down that triggers after 80px.
- Contents from left to right:
  - Logo.
  - "Test Mode" pill. It shows only when testnets are enabled: teal text with a chevron, and its menu holds "Disable testnet".
  - Nav: Dashboard, Markets, (Faucet), Savings, More ▾ (Governance, Umbrella, Safety Module).
  - Spacer.
  - Right side: "Aave V4 ↗" (outlined, links to pro.aave.com), "Swap", "Bridge GHO", "Connect Wallet" (outlined), and a settings cog (outlined, square).
- Nav links:
  - fg-3, turning fg-1 on hover or when active. Colour transition 0.25s ease-out.
  - The active link has a 2px purple-1 underline at the bottom of the 72px bar.
  - Padding 2.25rem × 0.8125rem.
- Mobile handover is below `mdlg` (1125px), or below `lg` when the testnet badge shows.
  - A hamburger morphs into an X (three bars, 0.2s).
  - A full-width drawer appears under the header: bg-1, rows 3rem tall in h3, purple-1 bar marking the active item, a "More" accordion, settings rows, and Swap / Bridge buttons pinned at the bottom.

**Settings menu** (cog):
- Rows: Shield toggle, Test Mode switch, Language ›, Theme › (System / Light / Dark submenu with a check), Watch Wallet.

**Footer:**
- Inset top hairline.
- Caption links in fg-3 (hover fg-1): Terms, Privacy, Docs, FAQS, Get Support, Manage analytics. Social icons on the right.

**Container:**
- Gutters: 1rem below 640px, 20px from 640, 48px from 760, 20px from 960 and up.
- Max width 1280 from lg, 1632 (with 96px gutters) from xl, 1440 from xxl.
- Bottom padding 39px.

### 1.4 Design tokens (verified, `src/utils/figmaColors.ts` and `theme.tsx`)

**Light / dark tokens:**

| Group | Light | Dark |
|---|---|---|
| bg-1…6 | #fafafa #fcfcfc #fff #f2f2f2 #f1f1f1 #ebebeb | #100f0f #1a1919 #1f1e1e #2a2828 #393737 #494646 |
| fg-1…5 | #000 #666 #7d7d7d #a8a8a8 #b3b3b3 | #fff #bcbbbb #8f8e8e #636161 (fg-5 #fff) |
| border-0/1/2 | rgba(0,0,0,.06/.08/.10) | rgba(255,255,255,.06/.08/.12) |
| purple-1/2/3 | #716ef3 #9b99ff #e0dfff | #9391f7 #bcbbff #e2e0ff |
| data-green | #00BD68 | #66C399 |
| data-orange | #FF7029 | #E68662 |
| data-red | #FF4760 | #E05269 |
| yellow-1 | #f5a800 | #ffc42c |
| red-1 | #eb4200 | #f24900 |
| table-bg | #fff | #1A1919 |
| surface-elevated | #fff | #1E1E20 |

The full map is reproduced in `src/shared/theme/tokens.ts`.

**Semantic mapping:**
- primary is fg-1, so contained buttons are black in light mode and white in dark.
- success = data-green, warning = yellow-1, error = red-1, info = blue-1.
- background.default = bg-5, paper = surface-elevated, divider = border-0.

**Surface shadow:** `0 2px 4px 0 shadow-low, 0 0 0 1px shadow-stroke-2`. Cards use the shadow-stroke-1 ring.

**Typography** (Inter Variable): display1 32/700, h1 28/700, h2 24/500, h3 18/500, h4 16/600, h5 14/500, subheader1 14/600, subheader2 12/500, description 14/400/143%, caption 12/400, buttonM 14/500, main12 12/600, helperText 10/400. statValue is h2, dropping to h4 below 760px.

**Spacing unit:** 4px.

**Breakpoints:** xs 0, xsm 640, sm 760, md 960, mdlg 1125, lg 1280, xl 1575, xxl 1800.

**Buttons:**

| Size | Height | Padding | Radius |
|---|---|---|---|
| small | 28px | 0 0.62rem | 0.375rem |
| medium | 36px | 0 0.88rem | 0.5rem |
| large | 48px | 0 24px | 0.625rem |

- Variants: contained (fg-1 fill), outlined ("secondary pill": bg-3 with ring), and tertiary (the default pill).
- No ripple. Press scales to 0.99. 100ms transitions. Focus ring is 2px currentColor, offset 3px.

**Motion** (`motion.ts`):
- Overlays and menus use 100ms ScaleFade (opacity 0→1, scale 0.96→1).
- Hover 100ms, hoverSlow 150ms.
- Modal 200ms and mobile slide-up 300ms are **reserved but not used yet**: the reference modals are not animated.
- A global `prefers-reduced-motion` rule collapses durations to 0.01ms.

**Menus:**
- 0.75rem radius, 8px offset.
- Rows are 2rem tall with an inset hover highlight that scales from 0.96 to 1.

**Paper variants:**
- card: 10px radius.
- table: table-bg, 10px radius.
- modal: 0.75rem radius, bg-1 (bg-2 in dark), with a ring plus `0 4px 16px` shadow-medium.

### 1.5 Screens

These were extracted from the source. The detailed specs are condensed below.

#### Dashboard
**Page header band** (bg-3, pt/pb 40 to 48px, hairline at the bottom):
- Market switcher title: 28px market logo, market name at 1.875rem with a shimmer on hover, a "V3" pill (purple 16% tint, #8374FF), and an up-down chevron.
- Description line in fg-3.
- Stats, bottom-aligned on the right:
  - "Net worth".
  - "Net APY" with an ⓘ.
  - "Health factor" plus a tertiary "Risk details" button.
  - "Available rewards" plus "Claim".

**Positions:**
- An h2 "Your Positions" with an outlined "View transactions" button.
- Below lg, a Supply | Borrow segmented control.

**Four list cards** (two columns from lg, each `calc(50% − 1rem)`):
- **"Your supplies"**
  - Top info: Balance, APY, Collateral.
  - Columns: Asset, Balance, APY, Collateral (switch).
  - Buttons: Supply (contained) and Withdraw (tertiary).
- **"Assets to supply"**
  - Columns: Assets, Balance, APY, Can be collateral (✓ or —).
  - Buttons: Supply and "…" (Swap / Details).
  - "Show assets with 0 balance" checkbox.
- **"Your borrows"**
  - Top info: Balance, APY, Borrow power used.
  - "E-Mode" button.
  - Columns: Asset, Debt, APY.
  - Buttons: Borrow (contained) and Repay (tertiary).
- **"Assets to borrow"**
  - Columns: Asset, Available (ⓘ), "APY, variable" (ⓘ).
  - Buttons: Borrow and Details, both tertiary.

**List card details:**
- Table paper.
- Header band with title (16px/500), a tertiary "Hide" / "Show" button (the minus icon morphs into a plus), and a top-info row.
- Sticky column header: 11px/500 uppercase fg-3, with an 8×10 sort chevron.
- Rows are 71px tall. Click a header to cycle sort: descending → ascending → off.

**Mobile:** below 640px, lists become cards.

**Empty and alert copy:**
- "Nothing supplied yet" / "Nothing borrowed yet".
- Not connected: "No Wallet Connected / Connect your wallet to see your supplies, borrowings, and open positions."
- Alerts below lists: liquidation risk at HF ≤ 1.1, E-Mode restriction, no collateral.

**Liquidation risk parameters modal:**
- Two InfoWrapper cards.
- Health factor card: a gradient bar running red to green, a marker, and a liquidation tick at 1.00.
- Current LTV card: fill bar, hatched max-LTV segment, and a liquidation-threshold marker.

#### Markets
- Same page header with the stats "Total market size", "Total available" and "Total borrows". The live app also shows protocol-wide totals.
- Filter bar:
  - Search field, 340px wide: "Search asset name, symbol, or address".
  - "All Categories" multiselect: Stablecoins, ETH Correlated, Principal Tokens.
  - When connected, an "In Wallet" switch.
- Table columns: Asset (name over symbol), Total supplied (with USD under), Supply APY, Total borrowed, "Borrow APY, variable", and a "Details" button.
- Row details: 76px tall, the whole row is clickable, hover uses the button-hover tint.
- Footer switches: "Show frozen/paused assets", "Show assets <$100k supply".
- Empty search: "No search results for '…' / We couldn't find any assets related to your search."
- Below 1125px, rows become mobile cards.

#### Reserve overview
**Header band:**
- Back link, 56px token icon, name and symbol at 1.875rem, icon buttons, and "on {market}".
- Stats: Reserve size, Available liquidity, Utilization rate, Oracle price.

**Layout:**
- From lg: left column `calc(100% − 432px)` and right column 416px.
- Below lg: an "Overview | Your info" segmented control.

**Left card, "Reserve status & configuration":**
- **Supply Info:**
  - Cap ring (80px; green, turning yellow at ≥98% and red at 100%).
  - Total supplied "X of Y".
  - APY plus a Supply APR chart.
  - "Collateral usage: ✓ Can be collateral".
  - Three boxes: Max LTV, Liquidation threshold, Liquidation penalty.
- **Borrow info:**
  - Orange cap ring.
  - "APY, variable" plus a borrow APR chart.
  - Borrow cap.
  - Collector info: Reserve factor and Collector contract.
- **E-Mode info:** one entry per category, with Collateral / Borrowable ticks and the three boxes.
- **Interest rate model:**
  - Utilization rate, plus a tertiary "Interest rate strategy ↗" button.
  - Chart: 155px tall, line #B6509E, dashed #0062D2 markers "Current x%" and "Optimal y%", crosshair, and a tooltip giving the borrow amount needed to reach a given utilization.
  - Legend: "Borrow APR, variable" and "Utilization Rate".
- APY charts offer the ranges 1w / 1m / 6m / 1y (segmented, 24px tall).

**Right card, "Your info":**
- Wallet balance row (wallet icon box).
- "Available to supply" with a Supply button (contained, 96×36).
- "Available to borrow" with a Borrow button.
- Not connected: "Please connect a wallet to view your personal information here."

#### History
- Header: "Transaction history" (h5 fg-3) above the market switcher.
- Toolbar:
  - Search field: "Search assets".
  - Filter menu: "All transactions" plus checkbox types.
  - "Export" menu: Download CSV / Download JSON.
- List grouped by date ("September 18, 2026", 16px/500).
- Rows are 72px: action title (subheader1) over time (caption fg-3), the details ("+ 1.20 ETH" with icon; "Collateralization enabled for X"), and a "View" link.
- Empty: "No transactions yet".

#### Faucet (testnet mode)
- "{Market} Faucet" header with the testnet explainer copy.
- "Test Assets" list: Asset, Wallet balance, and a contained "Faucet" button.

### 1.6 Transaction modals (verified)

**Shell:**
- Centred card, max width 420px (359px below 640), 24px padding, 12px radius.
- Backdrop rgba(0,0,0,.32).
- 30px close X at the top right.
- **Not animated in the reference.** The clone adds a short ScaleFade using the reference's own reserved 200ms token. This is a deliberate enhancement, recorded in §4.

**Title:** "Supply ETH", 16px/500.

**AssetInput:**
- "Amount" label.
- Field box on bg-2 with a ring and 0.5rem radius.
- 21px input with a "0.00" placeholder, then the token icon and symbol.
- USD value on the left.
- "{Wallet balance|Supply balance|Available} X" and a **"Max"** text button.
- Typing more than the maximum snaps to the maximum: there is no "not enough balance" state.

**"Transaction overview" card. Rows per action:**
- Supply: Supply APY, Collateralization (Enabled / Disabled / Unavailable), Health factor.
- Withdraw: Remaining supply, Health factor.
- Borrow: Health factor.
- Repay: Remaining debt, Health factor.
- Health factor shows `before → after` with "Liquidation at <1.0" under it.

**Gas row:** gas-pump icon plus a USD estimate. The clone shows a "simulated" estimate instead.

**Buttons:**
- Large contained, 48px.
- The approval button sits on top: "Approve USDC to continue", then "Approving USDC...", then "Approve Confirmed ✓".
- The main button: "Supply USDC", then "Supplying USDC".
- Other states: "Enter an amount".
- Approve-method toggle: "Approve with Signed message ⚙".

**Result view:**
- Status wash gradient with a 3rem circle icon.
- Titles: "Supplied Successfully", "Withdrawn Successfully", "Borrowed Successfully", "Repaid Successfully", "All done".
- Body: "You supplied 1.00 ETH".
- Buttons: "Review Transaction ↗" (outlined) and "Done" (contained).
- Error: "Transaction Failed", then "We were unable to complete this transaction", with "Copy error text" and "Close".

**Rules (verified):**
- Withdraw max keeps HF ≥ **1.01**.
- Borrow max applies a **0.99** margin.
- The risk checkbox "I acknowledge the risks involved." appears when the HF after the action is below **1.5**, on both Borrow and Withdraw.
- Collateral disable is blocked when the HF after is ≤ 1.
- E-Mode exit is blocked when the HF after is below 1.01.
- Variable rate only; no stable rate anywhere.

## 2. Pro (pro.aave.com), which is the Aave V4 app

### 2.1 What it is (verified)
- The title is "Aave Pro" and the description "The full power of DeFi". The standard app's header button "Aave V4 ↗" links to it.
- It is a **separate codebase**: Next.js App Router with Turbopack, **SCSS modules** (not MUI), Radix dropdowns, Framer-Motion-style transforms, `@number-flow/react` and ConnectKit.
- It is not a reskin. It shares the same Figma colour tokens (`--bg-1`, `--fg-1`, `--purple-1` and so on, with identical hex values) but has its own layout, components and vocabulary.
- **V4 domain** (verified from GraphQL and copy):
  - **Hubs** hold the liquidity. Live hubs are "Core", "Prime", "Plus", "Global Dollar", and "Coinbase Stocks" on Base.
  - **Spokes**, shown in the UI as **"Markets"**, hold user positions. Live examples: "Main", "Bluechip", "Lido", "Etherfi", "Ethena Ecosystem", "Gold".
  - **Reserves** are spoke × hub-asset pairs.
  - Wording: "Deposit", not "Supply". "Collateral Factor", not LTV/LT. "Risk Premium", an extra borrow cost based on collateral risk. "Liquidity Fee" is charged by the hub.
- **Chains:** Ethereum, OP Mainnet, Arc, Base, Avalanche.
- **Tokenised equities** (verified live): hub "Coinbase Stocks" on Base, with AAPLc, AMZNc, GOOGLc, METAc, MSFTc, NVDAc and TSLAc as collateral-only assets (collateral factors 65–79%) and USDC as the borrowable asset.
  - The sidebar promo card reads "Tokenised Stocks · Powered by Base".
  - Agent 1's changelog calls these the "Equities Hub" and "MAG7 Spoke". The clone uses those neutral names.

### 2.2 Routes (verified from HTML and JS)
- `/` Dashboard
- `/activity`
- `/explore/deposit`
- `/explore/borrow`
- `/insights`
- `/explore/hub/{id}`
- `/explore/market/{id}`
- `/explore/reserve/{chain}/{hub}/{spoke}/{asset}`
- `/explore/token/{symbol}`
- `/position/{id}` (`#loans`)
- `/swaps/{orderId}`

### 2.3 Layout (verified from SSR DOM and CSS)
**Sidebar** (`aside`):
- Fixed, bg-1, a 1px border-0 rule on the right.
- Width **16.25rem** (260px) when open and **3.625rem** (58px) when collapsed. A collapse button sits in the header, and the width transition is 0.3s ease-in-out.
- Groups:
  - (no label) Dashboard, Activity.
  - **EXPLORE**: Deposit, Borrow.
  - **PROTOCOL**: Insights, Security ↗, Protocol ↗, Governance ↗, Developer Docs ↗, Access Aave V3 ↗.
  - **SUPPORT**: Contact Support, Help Center ↗.
- Group labels: 11px/600 uppercase fg-4.
- Links: 36px tall, 14px fg-2, 0.5rem radius, 0 0.625rem padding, a fg-3 icon, and a trailing ↗ badge in fg-4 for external links.
- Footer promo card: "Tokenised Stocks / Powered by Base", dismissible.

**Topbar:**
- Fixed, height **4.5rem** desktop and 3.5rem mobile, bg-1, 1px border-1 ring, and a scrim gradient below it.
- Centred search box "Search assets, hubs and markets" with a chain-filter dropdown (4-chain icon grid) and a "/" shortcut hint.
- Right side: account button (a skeleton during SSR).
- Mobile: logo, search icon button, and a hamburger ("Open navigation menu").

**Main:** max width **90rem** plus gutters (2rem desktop, 1rem mobile), padding-top = topbar + 1.25rem, page sections gap 1.75rem.

**Breakpoints in CSS:** 550px (mobile), 860px, 1010px.

### 2.4 Pro tokens and components (verified CSS)
**Tokens:**
- Same bg, fg, border and data tokens as the standard app.
- Extra tokens:
  - `--card-radius: .625rem`.
  - Health ramp `--health-1…7`: #e13b3b, #f27211, #f0c914, #93cc00, #74c428, #3bc94b, #00c55c (light).
  - Motion: `--ease-snappy cubic-bezier(.175,.885,.32,1.1)` at .22s; `--ease-smooth cubic-bezier(.19,1,.22,1)` at .3s.
  - Overlays: `--overlay-backdrop #0006`, `--overlay-shadow 0 0 0 1px shadow-stroke-2, 0 6px 32px shadow-high`, `--overlay-filter blur(10px)`.

**Buttons:**
- **Pill** shape (radius 10rem), height 2.25rem, padding 0 .875rem, 14px/500.
- Variants: primary (fg-1 fill), secondary (bg-3 with ring), tertiary (bg-4), quaternary, text, and square (icon).
- Press scale .99. A spinner state slides the label down 8px and fades it.
- Sizes: sm 1.75rem, lg, xl.

**Tables:**
- Card on elevated-0 with radius .625rem and a ring. Padding 1.25rem (mobile .5rem 1rem).
- Header names 11px/500 uppercase fg-3, turning fg-1 when sorted. A sort icon fades in on hover.
- Rows about 72px tall. Cells 14px with a right-edge fade mask.
- The first column is sticky. Scroll-nav arrow buttons appear when the table overflows.
- Mobile: rows become cards.

**Page heading:** 1.875rem/500 (1.5rem mobile). Subheading 14px fg-3.

**Skeletons:** border-1 fill, pill radius.

### 2.5 Pro screens (copy verified from the i18n dictionary; layout partly inferred)
**Explore Deposit / Borrow:**
- Title, plus a subheading ("Deposit assets to earn yield and enable borrowing from protocol markets").
- Filter row: "All Chains" select, then pills "Hubs", "Markets", "Assets"; search; "Group By: Hub" (Hub / Market / Asset).
- Grouped table cards. Each group header shows a title, a description, and the stats "Assets" and "Total Deposits".
- Deposit columns: Asset, Market, APY, Total Deposits, Capacity Filled, Available Liquidity.
- Borrow columns follow the same pattern with borrow figures.
- Empty: "No Results Found / Try adjusting your search or filters / Clear Filters".

**Insights:**
- "Overview of protocol activity and performance".
- "Protocol Deposits $32.67B" and "Total Protocol Loans $12.76B" (number-flow).
- Chains filter, time window (1 Day / 1 Week / 1 Month / 6 Months / 1 Year / All Time), asset filter, "Group By: Asset".
- Table: Asset, Total Deposits, Deposit APY, Total Borrowed, Borrow APY.

**Activity:** title "Activity". Copy: "No Activity / You haven't made any transactions", plus Filter (All / Deposit / Borrow) and "Download CSV".

**Dashboard** (client-rendered, so inferred from copy):
- Greeting "Good morning / afternoon / evening".
- Summary: Balance, Deposited, Borrowed, Net APY, Lowest Health Factor.
- Sections: Positions, Deposits, Borrows, Your Balance (wallet), Rewards.
- Empty states: "No Positions / Deposit an asset from your wallet to open a position", and so on.
- Not connected: "Get Started".

**Reserve page:**
- Interest rates (APY with "Incl. x Est. Underlying Yield").
- Aside "Your Positions" with "Your Deposits" and "Your Loans".
- "Available to Deposit" (the lower of wallet balance and capacity) and "Available to Borrow".
- Borrowing-power breakdown.
- Not connected: "Connect wallet to view your position."

**Modals:**
- Width 432.
- Multi-step progress: "Awaiting approval in your wallet…", "Approval pending…", "Awaiting wallet confirmation…", "Transaction processing…", then "Confirmed".
- Preview warnings:
  - "This withdrawal would trigger liquidation"
  - "This borrow puts your position at risk"
  - "Health Factor will drop to {x} after this transaction. You are at risk of liquidation."
- Rate breakdown: "Your APY", "Base APY", "Risk Premium Impact".
- Collateral: "Enable as Collateral" / "Disable as Collateral" / "Collateral cannot be disabled".

### 2.5a Live screenshot: Pro Deposit page (desktop, dark, not connected)
Source: `reference/screenshots/pro/deposit-page-desktop.png`. This is the source of truth for Pro and it confirms the SSR-derived structure above.

**Sidebar:**
- Wordmark with an outlined purple **"PRO"** pill, and a collapse icon on the right.
- Groups: Dashboard, Activity · **EXPLORE** Deposit (active), Borrow · **PROTOCOL** Insights, Security ↗, Protocol ↗, Governance ↗, Developer Docs ↗, Access Aave V3 ↗ · **SUPPORT** Contact Support, Help Center ↗.
- Group labels are small, muted and uppercase.

**Top bar:**
- A wide search box "Search assets, hubs and markets" with a "/" hint. No chain filter is visible at rest.
- Not connected, the far right shows a **white "Get Started" pill**.

**Header:**
- "Deposit" plus subtitle.
- On the right: "Protocol Deposits ⓘ $32.68B" | divider | "Total Protocol Loans ⓘ $12.77B".

**Filter row:**
- "All Chains ⌃⌄" with a chain-icon cluster.
- "Hubs", "Markets", "Assets" pills, each with a filter-lines icon.
- On the right: "Filter Assets" search, "Group By: Hub ⌃⌄", and a sliders icon button.

**Hub group header:**
- Chain icon plus **"Core"**. The title is just the hub name, with no "Hub" suffix.
- Description "Deposit the widest range of assets into Aave's deepest, general-purpose liquidity pool."
- On the right: "Assets" with overlapping token icons and "+8", then "Total Deposits $423.60m".

**Table:**
- Columns: ASSET | MARKET | APY ⌃⌄ | TOTAL DEPOSITS | CAPACITY FILLED | AVAILABLE LIQUIDITY.
- **No action buttons in rows.**
- Default sort is APY descending.
- Asset cell: about 44px icon, name, and the symbol muted below.
- MARKET is the spoke name. The same asset appears once per spoke, for example USDC under "Forex" and under "Main".
- Some APYs have a small circular rewards badge.
- Amounts show token amount over muted USD, with **lowercase compact suffixes** ("680.56k GHO", "$423.60m"), compacted from 1,000.
- CAPACITY FILLED shows a small ring plus an integer % ("<0.01%" for dust).

**Other:**
- Floating circular "?" help button, bottom-right.
- Cookie banner, which the clone does not need.

**Clone changes made from this screenshot:**
- The Core hub gains a **Forex** market (USDC, USDT, EURC) and the stablecoins USDG and frxUSD (with rewards badge) and RLUSD on Main.
- Explore was rewritten to this exact layout.
- Rows have no actions (a click opens the reserve page).
- "Get Started", the PRO pill, the help button and lowercase table amounts are all in place.
- The chain filter inside the top search now appears only while the search is open.

**Still inferred:** the Pro Dashboard, Reserve, Hub, Market, Position, Activity and Insights pages, and the Pro modals. They use the verified copy deck, CSS and design language, but their exact layout has not been seen in a screenshot.

### 2.6 Standard vs Pro: key differences

| | Standard | Pro |
|---|---|---|
| Navigation | Horizontal top nav, 72px header | Collapsible left sidebar plus a 72px topbar with central search |
| Buttons | Rounded-rectangle (0.5rem), contained/outlined/tertiary | Pill (10rem radius) |
| Vocabulary | Supply, LTV, Liquidation threshold, E-Mode, Market = deployment | Deposit, Collateral Factor, Risk Premium, Hub, Market = Spoke |
| Positions | One position per market | One position per spoke ("Positions"), each with its own HF; the dashboard shows "Lowest Health Factor" |
| Market data | Single market table | Grouped tables by Hub / Market / Asset, multi-chain filter |
| Assets | Crypto | Crypto plus tokenised stocks (MAG7 on Base) |
| Implementation | MUI | SCSS modules |

## 3. What could not be verified

- **No browser and no screenshots.** Pixel layout of client-rendered views was not observed: the Pro dashboard, the Pro reserve, hub, market and position pages, and the Pro modals. Their structure is **inferred** from copy keys, CSS class names and SSR skeletons. Each such screen is marked "inferred" in PROGRESS.md.
- **Exact animations** in Pro beyond the CSS (Framer Motion timings live in JS) are approximated with the CSS tokens (`--ease-snappy`, `--ease-smooth`).
- **Market-level numbers** are not used. All figures are illustrative mock data.
- **Standard reference components missing from the read set:** IncentivesCard, IsolatedBadge, FunSupplyButton (live label assumed "Supply"), getEmodeMessage, GasTooltip. These were rebuilt from their call sites.
- **Pro `/swaps`, rewards claiming and leverage flows** are out of scope.

## 4. Deliberate deviations (safety and scope)

- A **"Demo · simulated data · not affiliated with Aave"** indicator is always visible in both apps (header chip and notify bar).
- The brand is shown as a neutral placeholder mark with the word "Aave Clone".
- The wallet is a mock modal that sets a demo address. No wallet libraries, no signing, no RPC.
- Fake transaction hashes are prefixed `0xdemo…` and labelled "simulated". They never link to a block explorer.
- Informational links (Terms, Docs, Governance, Security) open the **official** aave.com pages in a new tab. That points users to the real product rather than imitating it.
- Brand and social icons (X, Discord and so on) are not reproduced.
- Modals get a 200ms ScaleFade, using the reference's own reserved `motion.modal` token. The reference does not animate them yet.
