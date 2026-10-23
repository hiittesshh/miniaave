# Aave Pro: inventory of pages, components and states

Source: live captures of https://pro.aave.com taken on 2026-10-13 with `D:\aave-protocol-study\tools\` (puppeteer-core driving the installed Chrome). The captures were not connected to a wallet, and the cookie banner was dismissed with "Deny All".

Capture files live in `D:\aave-protocol-study\reference\pro-capture\real\`:
- Full-page shots: `<page>-<desktop|mobile>.png`
- First screen only: `-fold.png`
- Scroll segments: `seg/<page>-desktop-sN.png`
- Computed styles: `styles/*.json`
- Rendered DOM: `dom/*.html`
- CSS variables, `@font-face` rules, keyframes and transitions: `cssom/*.json`
- Route discovery: `routes.json` and `probe.json`

## 1. Routes

The route list comes from three sources: the bundle's `ROUTES` map, its route manifest (regex entries), and link crawling.

| Route | Not-connected behaviour | Captured | Clone status |
|---|---|---|---|
| `/` (Dashboard) | Renders the **Deposit explore page** at `/`; the URL does not change | yes | clone shows its own dashboard or "Get Started" (differs) |
| `/activity` | **Redirects to `/explore/deposit`** | yes | clone shows its own page (differs) |
| `/explore/deposit` | Accessible | yes, 8 scroll segments | built (see discrepancy log) |
| `/explore/borrow` | Accessible | yes, 8 segments | built |
| `/explore/hub/{base64 id}` | Accessible. Ids are base64 of `chainId::hubAddress` | 3 hubs | built (older inferred layout) |
| `/explore/market/{base64 id}` | Accessible | 3 markets | built (inferred layout) |
| `/explore/reserve/{chain}/{hub}/{spoke}/{asset}` | Accessible | ETH, weETH, USDG | built (inferred layout) |
| `/explore/token/{symbol}` | Accessible, but not linked from the explore tables | USDC, ETH | built (inferred layout) |
| `/insights` | Accessible | yes | built (inferred layout) |
| `/changelog` and `/changelog/{slug}` | Accessible | list + all 8 entries | built (2026-10-14) |
| `/preferences` | Accessible (Appearance: Time Format, Date Format; Transactions: Approvals; Security: Analytics) | yes, incl. menus and mobile sheets | built (2026-10-14) |
| `/watch-address` | Accessible ("Add Address" dialog, empty state; saving needs a wallet) | yes | built (2026-10-14) |
| `/stake`, `/invest` | Accessible, but only a "TODO" placeholder on the live site | yes | not built (placeholder only) |
| `/tools/faucet` | Accessible, title "Faucet" only | yes | not built |
| `/account` | Renders empty | yes | not built |
| unknown, e.g. `/explore` | "Page not Found / We could not find the page you were looking for. / Back" | yes | clone has its own 404 (differs) |
| `/position/{id}` | Invalid ids redirect to `/explore/deposit`. A real id needs the `UserPositions` GraphQL query (api.pro.aave.com) with an owner address | **not observable yet** | built (inferred) |
| `/swaps/{id}`, `/transactions/{a}/{b}` | Need a wallet or order id | not observable | out of scope |
| `/send`, `/deposit`, `/borrow`, `/withdraw`, `/repay`, `/swap`, `/leverage`, ... | Transaction routes. Without a wallet they redirect to `/explore/deposit` | redirect only | clone uses modals (behaviour differs) |
| `/dev/components` | Internal dev route | not captured | out of scope |

## 2. Shared shell (every page)

- **Sidebar**
  - 260px wide, bg-1, with a 1px right rule.
  - Header: wordmark plus an outlined purple "PRO" pill. In the real app the logo box is about 107×16 at (20,28). A collapse toggle icon sits at x=231.
  - Nav groups:
    - (no label): Dashboard, Activity
    - EXPLORE: Deposit, Borrow
    - PROTOCOL: Insights, Security ↗, Protocol ↗, Governance ↗, Developer Docs ↗, Access Aave V3 ↗
    - SUPPORT: Contact Support, Help Center ↗
  - Rows are 37px apart. The active row has a bg-3 fill and 8px radius, and its label turns fg-1 and bold.
  - Promo card at the bottom: "Tokenised Stocks / Powered by Base", with a dark circular graphic and a "–" collapse control.
  - Collapsed state: 58px wide, icons only.
- **Topbar**
  - Search field "Search assets, hubs and markets" with a "/" key hint, about 503×36 at x=291.
  - Not connected: a white **Get Started** pill on the right.
  - Mobile: wordmark and PRO pill, Get Started, a search icon button and a hamburger.
- **Floating "?" help button** at the bottom right.
- **Cookie banner.** It is real but not reproduced, as an intentional difference.

## 3. Pages and their sections

### Explore Deposit and Borrow (`/explore/deposit`, `/explore/borrow`; also `/` when not connected)
1. Title, subtitle, and on the right "Protocol Deposits ⓘ" and "Total Protocol Loans ⓘ" (live values $32.55B and $12.72B).
2. **Sticky filter row**:
   - All Chains (chain-icon cluster, up/down chevron)
   - Hubs, Markets and Assets pills (filter-lines icon)
   - "Filter Assets" search
   - "Group By: Hub" (Hub / Market / Asset)
   - a sliders icon button
3. **Hub group** sections. The live site has many groups, top to bottom:
   - Core (Ethereum)
   - Prime
   - Coinbase Stocks (Base)
   - Core (Avalanche)
   - Arc
   - and others
   Each group has a chain icon, the hub name, a description, "Assets" with overlapping token icons and "+N", and "Total Deposits".
4. **Group table**
   - Columns: ASSET (sticky, with a vertical divider) | MARKET | APY | TOTAL DEPOSITS ⇅ (the default sort, descending) | CAPACITY FILLED | AVAILABLE LIQUIDITY.
   - ‹ › scroll-arrow buttons in the header row.
   - Rows are about 73px tall and the asset icon is 44px.
   - The APY may carry a "*" (underlying yield) or a purple check-circle (rewards).
   - Amounts are formatted "43.59K ETH" over "$108.96M", with **uppercase** suffixes.
   - Rows have no action buttons; clicking a row opens the reserve page.
5. Borrow is the same, with borrow columns.

### Hub (`/explore/hub/{id}`)
- Back link.
- Header: a 56px hub icon tile (three dots), the name (30px/500) and "Hub on ⟠ Ethereum". On the right: Deposit and Borrow pill buttons with icons.
- Left stat column:
  - Total deposits and Total borrows, as large values with dividers
  - Market size, Available liquidity and Utilization rate, as rows
- Right chart card:
  - 1D/1W/1M/6M/1Y/All tabs, with 1W the default
  - four lines: Total deposits (green), Total borrowed (orange), Available liquidity (purple), Utilization rate (pink)
  - a clickable legend
- **Deposit Opportunities** table: ASSET | APY ⇅ | TOTAL DEPOSITS | LIQUIDITY.
- **Borrow Opportunities** table: ASSET | APY ⇅ | TOTAL BORROWS | AVAIL BORROWS.
- **Hub Activity** list: date | action, asset, hub and chain | amount. A "See more" footer with a + sign.

### Market (`/explore/market/{id}`)
- Header: a diamond tile and "Market on ⟠ Ethereum", with Deposit and Borrow buttons.
- Stats: Total Deposits, Total Borrows, Assets (14), Connected Hubs (1).
- Chart: Total Deposits and Total Borrows.
- **Deposit Markets** ("Assets available to deposit in this market"):
  - Columns: ASSET | HUB (a button) | APY | TOTAL DEPOSITS | AVAILABLE LIQUIDITY | USE AS COLLATERAL ("Not eligible" or a value).
- **Borrow Markets**.
- **Connected Hubs**: Hub | Deposits | Borrows | Credit Line | Credit Used | Assets.
- **Risk Parameters**.
- **Supported Assets**: Asset | Hub | Deposit ...

### Reserve (`/explore/reserve/...`)
- Header: icon, "Ether ETH", "Main on Core ⟠ Ethereum" (linked). On the right: Deposit, Borrow and a "⋯" menu.
- **The header becomes sticky and compact on scroll.**
- Stats row: Total Deposits, Total Borrows, Available Liquidity, Utilisation (ring), Liquidity Fee, each with ⓘ and a token amount underneath.
- **Interest Rates**: Deposit APY and Borrow APY on the left; a chart with 1D…All tabs on the right (Deposit green, Borrow orange).
- **Protocol Parameters**:
  - "Market parameters come from two protocol layers: the hub and the market."
  - Two ring stats: "$112.03M of $150.35M" and "44.71K of 60.00K ETH".
  - A 3×3 parameter card: Hub, Market, Deposit capacity, Borrow capacity, Liquidation penalty, Use as collateral, Collateral factor, Collateral risk, Target health factor.
- **Interest Rate Model**: Utilisation Rate (ring), Optimal utilisation, Base borrow rate, …; a curve chart with Optimal and Current markers.
- **Available Liquidity**: value, 7D and 1M liquidity flow; a chart.
- **Supported Collateral**: ASSET | COLLATERAL FACTOR, compact 48px rows.
- **Assets You Can Borrow**: Asset | Base APY …
- **Top Addresses**: Holder | Share of Deposits | Deposited | Latest Activity.

### Token (`/explore/token/{symbol}`)
- Header "USD Coin USDC / Asset on All Chains ⌄", with Deposit and Borrow buttons.
- Stats: Total Deposits, Total Borrows, Price, …
- **Deposit**: an APY range ("0.45% – 8.14%"), a chart, and market filter chips (Bluechip, Coinbase Stocks, …).
  - **Deposit Markets** table: Chain | Market | APY | Total Deposits | Capacity Filled | Remaining Capacity | Available Liquidity | Use as Collateral | Hub Assets | Borrowable Assets.
- **Borrow**: the same pattern; **Borrow Markets** table: Chain | Market | APY | Total Borrowed | Capacity Filled | Available Liquidity | Supp. Collateral.

### Insights (`/insights`)
- Title "Insights" with the Protocol Deposits and Total Protocol Loans header.
- **Protocol** section:
  - "All Chains" and "1 Month" selectors
  - Two charts: Total deposits and Active loans (y-axis "$1B…", x-axis "13 Sep … Now")
- **All Assets** table:
  - "All Assets" and "Group By: Asset" controls
  - Columns: Asset | Total Deposits | Deposit APY (as ranges, e.g. "0.43% – 8.07%") | Total Borrowed | Borrow APY
  - "Includes estimated underlying" note

### Other pages
- **Changelog** list: date, "New Feature" tag, title, body.
- **Preferences**: Appearance; Time Format (12h/24h); Date Format.
- **Watch Address**: "Track wallets…", "Add Address", and an empty state.
- **404**.

## 4. Shared components (used on more than one page)

- Sidebar nav row
- Section heading: h2 24px/500 with a 14px fg-3 description
- Pill button (Deposit or Borrow, with an icon)
- Filter pill or select
- Time-range tabs (12px)
- Chart card with legend
- Stat block: label with ⓘ, a 24–28px value, a sub-amount
- Ring gauge (capacity or utilisation)
- Table card:
  - 11px/500 uppercase header in fg-3
  - sticky first column
  - ‹ › scroll arrows
  - sortable ⇅ headers
- Asset cell: icon, name, symbol
- APY with a rewards badge
- Hub and Market icon tiles
- Info tooltip ⓘ
- Back link
- Help FAB

## 5. Wallet-gated or not observable (do not invent)

The following can't be seen without a connected wallet:
- the connected Dashboard (positions, deposits, borrows, balance, rewards)
- connected Activity
- `/position/{id}` (no public id found yet)
- transaction flows (`/deposit`, `/borrow`, `/withdraw`, `/repay`, swap and leverage)
- the "Get Started" connect UI, which is ConnectKit and not yet captured
- `/swaps/{id}`
- `/transactions/{…}`

Screenshots supplied by the user will appear in `reference/screenshots/pro/`. At this capture only `deposit-page-desktop.png` existed.

## 6. Tokens observed (computed styles)

- **Font:** `Inter, "Inter Fallback"` (open, the same as the clone's next/font Inter).
- **Colours:** computed in `display-p3`, with the same token names as the shared Figma set.
- **Headings:**
  - h1 28–30px/500
  - section h2 24px/500, line-height 28.8px
  - h3 18px/500
- **Table header:** 11px/500, uppercase.
- **Time tabs:** 12px/400; the active tab is fg-1 and bold.
- **Body:** 14px.

Full per-element values are in `styles/*.json`, and the CSS variables are in `cssom/*.json`.
