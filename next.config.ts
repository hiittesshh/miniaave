import type { NextConfig } from "next";

// MINI_ONLY=1 (set only on the public deployment): every page outside /mini redirects to /mini, so
// the pro.aave.com / app.aave.com look-alikes are never served publicly (phishing scanners can't
// tell a demo from a fake). Local dev leaves it unset and keeps every page.
const MINI_ONLY = process.env.MINI_ONLY === "1";
const STANDARD_PAGES = "bridge|dashboard|faucet|governance|history|markets|reserve-overview|safety-module|sgho|staking|v3-migration";

const nextConfig: NextConfig = {
  async redirects() {
    if (!MINI_ONLY) return [];
    return [
      { source: "/", destination: "/mini", permanent: false },
      { source: "/pro", destination: "/mini", permanent: false },
      { source: "/pro/:path*", destination: "/mini", permanent: false },
      { source: `/:page(${STANDARD_PAGES})/:path*`, destination: "/mini", permanent: false },
    ];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Let other devices on the LAN (e.g. the user's Mac at this PC's IP) load dev
  // scripts; Next 16 blocks cross-origin dev resources by default.
  allowedDevOrigins: ["192.168.1.6"],
  // The floating "N" dev badge is not part of the reference UI.
  devIndicators: false,
};

export default nextConfig;
