// B-3: unmatched /pro/* URLs (e.g. /pro/explore, a 404 on the live site) must render the Pro
// not-found page (src/app/pro/not-found.tsx, Builder B) instead of falling through to the root one.
import { notFound } from 'next/navigation';

export default function ProCatchAll() {
  notFound();
}
