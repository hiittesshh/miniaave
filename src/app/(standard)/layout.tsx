import { StandardShell } from '@/apps/standard/layout/StandardShell';

export default function StandardLayout({ children }: { children: React.ReactNode }) {
  return <StandardShell>{children}</StandardShell>;
}
