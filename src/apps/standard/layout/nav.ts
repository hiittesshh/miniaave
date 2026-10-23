export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  markets: '/markets',
  reserve: (symbol: string, marketId: string) => `/reserve-overview?underlyingAsset=${encodeURIComponent(symbol)}&marketName=${encodeURIComponent(marketId)}`,
  history: '/history',
  faucet: '/faucet',
  savings: '/sgho',
  governance: '/governance',
  staking: '/staking',
  safetyModule: '/safety-module',
  bridge: '/bridge',
  pro: '/pro',
} as const;

/** Header breakpoint handover (reference: below mdlg the nav moves into the drawer). */
export const HEADER_MOBILE_BELOW = 'mdlg' as const;
export const HEADER_HEIGHT = 72;

export const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: 'Dashboard' },
  { href: ROUTES.markets, label: 'Markets' },
  { href: ROUTES.faucet, label: 'Faucet', testnetOnly: true },
  { href: ROUTES.savings, label: 'Savings' },
] as const;

export const MORE_ITEMS = [
  { href: ROUTES.governance, label: 'Governance' },
  { href: ROUTES.staking, label: 'Umbrella' },
  { href: ROUTES.safetyModule, label: 'Safety Module' },
] as const;
