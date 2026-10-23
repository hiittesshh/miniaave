import Link from 'next/link';

const box: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '2rem 1rem',
  background: 'var(--mui-palette-bg-1)',
  color: 'var(--mui-palette-fg-1)',
  fontFamily: 'var(--font-inter), Inter, Arial, sans-serif',
};
const button: React.CSSProperties = { height: 36, padding: '0 0.88rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 500, background: 'var(--mui-palette-bg-3)', boxShadow: '0 2px 4px var(--mui-palette-shadow-low), 0 0 0 1px var(--mui-palette-shadow-stroke-2)' };

/**
 * Global 404, modelled on the reference: mark, short rule, "Page not found", back button.
 * Next serialises this into every page's payload, so the public /mini-only build (MINI_ONLY=1)
 * renders a brand-neutral version that links back to /mini (no other protocol's name in the page).
 */
export default function NotFound() {
  if (process.env.MINI_ONLY === '1') {
    return (
      <main style={box}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 500, margin: 0 }}>Page not found</h1>
        <p style={{ color: 'var(--mui-palette-fg-2)', marginTop: '1rem', fontSize: '0.875rem' }}>We could not find the page you were looking for.</p>
        <Link href="/mini" style={{ ...button, marginTop: '2.5rem' }}>
          ‹ Back to the app
        </Link>
        <p style={{ color: 'var(--mui-palette-fg-4)', marginTop: '2rem', fontSize: 12 }}>Demo · testnet · test tokens only</p>
      </main>
    );
  }
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem 1rem',
        background: 'var(--mui-palette-bg-1)',
        color: 'var(--mui-palette-fg-1)',
        fontFamily: 'var(--font-inter), Inter, Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mui-palette-purple-1)', fontWeight: 600 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <rect x="1" y="1" width="22" height="22" rx="6.5" fill="currentColor" />
          <rect x="6.5" y="7" width="3.2" height="10" rx="1.6" fill="#fff" />
          <rect x="14.3" y="7" width="3.2" height="10" rx="1.6" fill="#fff" opacity="0.55" />
        </svg>
        Aave Clone
      </div>
      <div style={{ width: '1.5rem', height: '1px', background: 'var(--mui-palette-border-0)', marginTop: '2rem' }} />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 500, margin: '2rem 0 0' }}>Page not found</h1>
      <p style={{ color: 'var(--mui-palette-fg-2)', marginTop: '1rem', fontSize: '0.875rem' }}>We could not find the page you were looking for.</p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2.5rem' }}>
        <Link
          href="/"
          style={{ height: 36, padding: '0 0.88rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 500, background: 'var(--mui-palette-bg-3)', boxShadow: '0 2px 4px var(--mui-palette-shadow-low), 0 0 0 1px var(--mui-palette-shadow-stroke-2)' }}
        >
          ‹ Back to App
        </Link>
        <Link
          href="/pro"
          style={{ height: 36, padding: '0 0.88rem', borderRadius: '10rem', display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 500, background: 'var(--mui-palette-bg-3)', boxShadow: '0 2px 4px var(--mui-palette-shadow-low), 0 0 0 1px var(--mui-palette-shadow-stroke-2)' }}
        >
          Pro clone
        </Link>
      </div>
      <p style={{ color: 'var(--mui-palette-fg-4)', marginTop: '2rem', fontSize: 12 }}>Demo · simulated data · not affiliated with Aave</p>
    </main>
  );
}
