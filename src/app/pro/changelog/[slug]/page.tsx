import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CHANGELOG } from '@/data/mock/seed/proB_changelog';
import { ChangelogDetail } from '@/apps/pro/pages/changelog/ChangelogPage';

/** Static: every changelog entry is known at build time. */
export function generateStaticParams() {
  return CHANGELOG.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: CHANGELOG.find((e) => e.slug === slug)?.title ?? 'Changelog' };
}

async function Entry({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!CHANGELOG.some((e) => e.slug === slug)) notFound();
  return <ChangelogDetail slug={slug} />;
}

// Same pattern as the other dynamic Pro routes (token, hub): the params are read inside a Suspense
// boundary, which Cache Components requires (it logged "encountered URL data during prerendering").
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={null}>
      <Entry params={params} />
    </Suspense>
  );
}
