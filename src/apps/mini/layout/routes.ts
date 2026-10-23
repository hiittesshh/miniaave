/** Mini-Aave routes, in their own module so modals and pages can link without importing the shell. */
export const miniRoutes = {
  dashboard: '/mini',
  markets: '/mini/markets',
  faucet: '/mini/faucet',
  liquidations: '/mini/liquidations',
  history: '/mini/history',
  admin: '/mini/admin',
  reserve: (symbol: string) => `/mini/reserve/${encodeURIComponent(symbol)}`,
};
