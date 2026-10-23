# Architecture

## One project, two isolated apps

```
src/
  app/                       Next.js App Router (routes only, thin files)
    layout.tsx               <html>, font, colour-scheme script, MUI cache, Providers
    providers.tsx            Theme, TanStack Query, DataSourceProvider (the only "mock" wiring)
    (standard)/...           Standard app routes: /, /dashboard, /markets, /reserve-overview, /history, /faucet, out-of-scope pages
    pro/...                  Pro app routes: /pro, /pro/explore/*, /pro/position/*, /pro/activity, /pro/insights
  apps/
    standard/                Standard UI (layout, dashboard, markets, reserve, history, faucet, transactions)
    pro/                     Pro UI (sidebar + topbar layout, explore, reserve, hub, market, position, modals)
  shared/
    theme/                   tokens (light/dark), MUI theme, motion tokens, ScaleFade transition
    ui/                      primitives used by both apps (TokenIcon, FormattedNumber, InfoTooltip, BasicModal…)
    charts/                  visx charts (interest-rate model, simulated rate history)
    state/                   UI-only stores: demo wallet, settings, notice dialog
    format.ts                number/date formatting (reference FormattedNumber rules)
  lib/aave-math/             pure maths + unit tests (rates, HF, limits, V4 risk premium)
  data/
    types.ts                 domain types (what the UI needs)
    source.ts                LendingDataSource interface (the swap point)
    derive.ts                raw state → displayed figures (shared by any source)
    hooks.ts                 TanStack Query hooks (the only way UI reads/writes data)
    DataSourceProvider.tsx   React context holding the active source
    mock/                    the simulated chain: seed data, engine, persisted store, MockLendingDataSource
```

**Why one project:** both apps share the token set, maths, data layer and primitives. Each app keeps its own layout and components where the reference differs (Pro is a different product), so nothing visual leaks between them.

## Data flow

```
component ─► hook (src/data/hooks.ts) ─► LendingDataSource ─► MockLendingDataSource
                                                                 ├─ engine.applyAction (pure, validated)
                                                                 └─ chainStore (Zustand, persisted)
```

- **Components never import mock data.** They call hooks. The hooks call whichever `LendingDataSource` `<DataSourceProvider>` holds.
- **Reads** (`getMarket`, `getUserMarketState`, `getProProtocol`, …) return *derived* objects. The functions in `derive.ts` compute utilization, rates, APYs, health factor, risk premium and so on from raw state, using `lib/aave-math`.
- **Writes** go through `submitAction(action, { onPhase })`:
  1. The action is validated first, like a gas estimate. Invalid input throws `SimulatedTxError('validation')` and the UI shows it inline.
  2. Phase `awaiting-signature` (about 0.9s, simulated wallet).
  3. Phase `pending` (about 1.5s). A permit approval skips this step.
  4. If "Simulate failures" is on, the call throws `SimulatedTxError('simulated-failure')` and **nothing is committed**.
  5. Otherwise `applyAction(state, action)` returns a brand-new state, which is committed in **one** `set()`. That single commit covers the wallet balance, the position, reserve totals (and so utilization and rates), the history record and the allowance.
  6. The mutation's `onSuccess` invalidates every query. Every figure on screen is then re-read from the same committed state, so nothing can disagree.
- **Tests** (`src/data/mock/__tests__/engine.test.ts`) check that a success changes all related values together and that every kind of failure leaves the state deep-equal to before.

## Swapping in a real chain later

1. Implement `LendingDataSource` as, for example, `ChainDataSource`:
   - reads from contracts or Aave's GraphQL API, mapped into `ReserveConfig` / `ReserveState` and passed through `derive.ts`;
   - `submitAction` builds a transaction with viem/wagmi, calls `onPhase('awaiting-signature')` before the wallet prompt and `onPhase('pending')` after broadcast, and resolves on the receipt.
2. Replace the wallet store (`shared/state/wallet.ts`) with a wagmi-backed hook that exposes the same `account`.
3. Change one line in `src/app/providers.tsx`.
4. Remove the demo-only bits: `resetSimulation`, the "Simulate failures" toggle, the demo URL parameters and the disclaimers. Keep the disclaimers if it stays a demo.

## Theme and design system

- `shared/theme/tokens.ts` holds the reference's light and dark colour tokens (`bg-1…6`, `fg-1…5`, `border-0…2`, `purple-1`, `data-*`, Pro's `health-1…7`).
- `theme.ts` is one MUI theme in **CSS-variables mode** with two colour schemes. Tokens are flattened onto the palette root, so `sx={{ bgcolor: 'bg-3' }}` and `tv('bg-3')` both resolve to `var(--mui-palette-bg-3)`. Theme switching flips a `data-mui-color-scheme` attribute and nothing re-renders.
- It carries the reference recipes: pill buttons with surface shadow, contained = fg-1, 100ms transitions, press scale 0.99, no ripple, the inset menu-row highlight, `card` / `table` / `modal` Paper variants, the custom breakpoints (xsm 640, mdlg 1125, xxl 1800) and the typography scale (`description`, `subheader1`, `statValue`, …).
- **Motion** (`motion.ts`): overlay 100ms, hover 100ms, modal 200ms, Pro snappy 220ms and smooth 300ms. `ScaleFade` is the shared overlay transition.
- `CssBaseline` neutralises all animation under `prefers-reduced-motion`, and chart draw-ins are disabled there too.
- **Pro** uses the same theme and tokens but its own components: pill buttons, sidebar, tables. Pro's real implementation uses SCSS modules; we reproduce its look with MUI `sx`.

## State that is UI-only

- `shared/state/wallet.ts` is the mock wallet. "Connect" picks one of two fake demo addresses, persisted per browser.
- `shared/state/settings.ts` holds: theme-independent preferences, Test Mode, current market, Simulate failures, banner dismissals, and Pro sidebar open/closed.
- `apps/standard/state.ts` tracks which transaction modal is open and provides the `useStdContext()` convenience hook.
- `apps/pro/state.ts` is the Pro equivalent.

Persisted stores load after the first paint (`skipHydration`), so server and client HTML match.
