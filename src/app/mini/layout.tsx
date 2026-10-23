import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MiniProviders } from '@/apps/mini/layout/MiniProviders';
import { MiniShell } from '@/apps/mini/layout/MiniShell';
import { BRAND } from '@/apps/mini/brand';

export const metadata: Metadata = {
  title: { default: BRAND, template: `%s · ${BRAND}` },
  description: `${BRAND}: a demo lending app on the Base Sepolia testnet. Mock data by default, or the real test contracts through MetaMask. Test tokens only.`,
};

// Same font setup as the Pro app (Inter with the optical-size axis, normal letter spacing), so the
// Mini-Aave mode looks like Pro. #pro-root also opts into Pro's root-level CSS rules.
const interPro = Inter({ subsets: ['latin'], axes: ['opsz'], display: 'swap' });

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="pro-root" className={interPro.className}>
      <style>{`body:has(#pro-root){--font-inter:${interPro.style.fontFamily};}body:has(#pro-root) .MuiTypography-root{letter-spacing:normal;}`}</style>
      <MiniProviders>
        <MiniShell>{children}</MiniShell>
      </MiniProviders>
    </div>
  );
}
