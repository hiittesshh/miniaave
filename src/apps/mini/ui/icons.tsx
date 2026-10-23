/** Mini-only icons, made exactly like Pro's (lucide, 18px, 1.25 absolute stroke): see apps/pro/icons.tsx. */
import type { LucideIcon, LucideProps } from 'lucide-react';
import { Droplet, Wallet } from 'lucide-react';

const make = (Icon: LucideIcon, name: string) => {
  const C = ({ size = 18, strokeWidth = 1.25, ...rest }: LucideProps) => <Icon size={size} strokeWidth={strokeWidth} absoluteStrokeWidth aria-hidden focusable={false} {...rest} />;
  C.displayName = `MiniIcon(${name})`;
  return C;
};

export const MIFaucet = make(Droplet, 'Faucet');
export const MIWallet = make(Wallet, 'Wallet');
