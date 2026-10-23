import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ProShell } from '@/apps/pro/layout/ProShell';

export const metadata: Metadata = {
  title: { default: 'Aave Clone Pro (demo)', template: '%s · Aave Clone Pro (demo)' },
  description: 'A simulated, unaffiliated study clone of the Aave Pro (V4) interface.',
};

// B-4: live Pro serves Inter 4 (variable) with the optical-size axis, which tightens large text
// (~5% narrower at 28px). Pro-only, so the Standard app keeps its font untouched. The variable is
// redefined on <body> (via :has) so portalled menus and dialogs pick it up too. Live text also uses
// normal letter spacing (MUI Typography adds 0.15px by default).
const interPro = Inter({ subsets: ['latin'], axes: ['opsz'], display: 'swap' });

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="pro-root" className={interPro.className}>
      <style>{`body:has(#pro-root){--font-inter:${interPro.style.fontFamily};}body:has(#pro-root) .MuiTypography-root{letter-spacing:normal;}`}</style>
      <ProShell>{children}</ProShell>
    </div>
  );
}
