'use client';

/**
 * Pro changelog (/changelog and /changelog/{slug}), measured on the live site (2026-10-14):
 * List (desktop): h1 28/500; 24px below, a timeline column whose 1px bg-4 rail sits at the content's
 * left edge with 252px of padding for the dates. Each entry: a sticky date (top 128px, lifted 10px,
 * 14px inset, 14/17 fg-1) with a 5px dot on the rail (fg-3 with a 5px bg-1 ring; the newest is
 * purple-1 with an 11px halo pulsing every 2s), then the body pulled up 26px: tag (14/17 fg-3),
 * 24px, title link (30/500/34), 32px, a 610×343 image card (12px radius), 24px, then prose:
 * paragraphs 14/19 fg-2 (8px apart, 20px before a heading or at the end), headings 14/500,
 * bullet lists (16px indent, 4px gaps, 4px fg-4 dots). Entries are 72px + 32px apart. The list ends
 * with a sign-off row after the rail: a 14px clock glyph on the rail and "You’ve reached the end, which
 * is also the beginning." (12px fg-4). The last entry has 112px bottom padding and no rule.
 * Every entry ends with a 1px border-0 rule. Mobile: the rail sits at the left edge (16px inset), the date
 * sits inline above each entry (lifted 8px), the body follows 16px below it; same 72px gaps.
 * Detail: the list's entry layout without the rail: "← Changelog" in the date column (sticky), then
 * the date + "Copy Link" row, the 28/500 title (24px on mobile), image and prose in the 610px column.
 */
import Box from '@mui/material/Box';
import Link from 'next/link';
import * as React from 'react';
import { CHANGELOG, type ChangelogBlock, type ChangelogEntry } from '@/data/mock/seed/proB_changelog';
import { tv } from '@/shared/theme/tokens';
import { PIBack } from '../../icons';
import { formatPrefDate, usePrefs } from '../preferences/prefs';
import { ChangelogArt } from './art';

const dateOf = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12);

function EntryDate({ iso }: { iso: string }) {
  // Live renders "September 25, 2026"; the Date Format preference applies here too.
  const prefs = usePrefs();
  return <time dateTime={iso}>{formatPrefDate(dateOf(iso), prefs.hydrated ? prefs.dateFormat : 'mdy')}</time>;
}

function Paragraph({ b }: { b: Extract<ChangelogBlock, { type: 'p' }> }) {
  let content: React.ReactNode = b.text;
  if (b.link) {
    const i = b.text.indexOf(b.link.label);
    if (i >= 0)
      content = (
        <>
          {b.text.slice(0, i)}
          <Box component="a" href={b.link.href} target="_blank" rel="noopener noreferrer" sx={{ color: 'fg-1', textDecoration: 'none', fontWeight: 500, '&:hover': { textDecoration: 'underline', textUnderlineOffset: 3 } }}>
            {b.link.label}
          </Box>
          {b.text.slice(i + b.link.label.length)}
        </>
      );
  } else if (b.code) {
    const i = b.text.indexOf(b.code);
    if (i >= 0)
      content = (
        <>
          {b.text.slice(0, i)}
          <Box component="code" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12.25px', lineHeight: '12.25px', color: 'fg-1', bgcolor: 'bg-2', borderRadius: '4px', p: '4px 6px', boxShadow: `inset 0 0 0 1px ${tv('border-0')}` }}>
            {b.code}
          </Box>
          {b.text.slice(i + b.code.length)}
        </>
      );
  }
  return content;
}

export function Prose({ blocks }: { blocks: ChangelogBlock[] }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {blocks.map((b, i) => {
        const next = blocks[i + 1];
        const pb = !next || next.type === 'h' ? '20px' : '8px';
        if (b.type === 'h')
          return (
            <Box key={i} component="h5" sx={{ m: 0, fontSize: 14, fontWeight: 500, lineHeight: '16.8px', color: 'fg-1' }}>
              {b.text}
            </Box>
          );
        if (b.type === 'ul')
          return (
            <Box key={i} component="ul" sx={{ m: 0, p: '0 0 20px 16px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {b.items.map((it) => (
                <Box key={it} component="li" sx={{ position: 'relative', fontSize: 14, lineHeight: '19px', color: 'fg-2', '&::before': { content: '""', position: 'absolute', left: -16, top: 7.5, width: 4, height: 4, borderRadius: '50%', bgcolor: 'fg-4' } }}>
                  {it}
                </Box>
              ))}
            </Box>
          );
        return (
          <Box key={i} component="p" sx={{ m: 0, pb, fontSize: 14, lineHeight: '19px', color: 'fg-2' }}>
            <Paragraph b={b} />
          </Box>
        );
      })}
    </Box>
  );
}

const href = (e: ChangelogEntry) => `/pro/changelog/${e.slug}`;

function Dot({ latest }: { latest: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: -3,
        top: 8,
        width: 5,
        height: 5,
        borderRadius: '50%',
        bgcolor: latest ? 'purple-1' : 'fg-3',
        boxShadow: `0 0 0 5px ${tv('bg-1')}`,
        '&::after': latest
          ? { content: '""', position: 'absolute', left: -3, top: -3, width: 11, height: 11, borderRadius: '50%', bgcolor: 'purple-1', animation: 'a3-pip 2s linear infinite', '@keyframes a3-pip': { '0%': { opacity: 0.2, transform: 'scale(0)' }, '40%': { opacity: 0.4, transform: 'scale(1)' }, '80%, 100%': { opacity: 0, transform: 'scale(2)' } } }
          : undefined,
      }}
    />
  );
}

/** Live sign-off glyph: a 14px clock (1.25px ring) whose hands turn every 6s and 36s. Our own CSS. */
function Clock() {
  const hand = (len: number, dur: number, from: number) => (
    <Box component="span" aria-hidden sx={{ position: 'absolute', inset: 0, animation: `a3-clock ${dur}s linear ${-(from / 360) * dur}s infinite`, '@keyframes a3-clock': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } }, '&::after': { content: '""', position: 'absolute', left: 6.375, bottom: 7, width: 1.25, height: len, borderRadius: '1.25px', bgcolor: 'currentColor' } }} />
  );
  return (
    <Box aria-hidden sx={{ position: 'relative', width: 14, height: 14, flexShrink: 0, borderRadius: '50%', boxShadow: 'inset 0 0 0 1.25px currentColor', '@media (prefers-reduced-motion: reduce)': { '& span': { animation: 'none' } } }}>
      {hand(4, 6, 200)}
      {hand(3, 36, 120)}
    </Box>
  );
}

export function ChangelogList() {
  return (
    <>
      <Box component="h1" sx={{ m: 0, fontSize: { xs: 24, md: 28 }, fontWeight: 500, lineHeight: { xs: '28.8px', md: '33.6px' }, color: 'fg-1' }}>
        Changelog
      </Box>
      <Box sx={{ pt: '24px' }}>
        <Box sx={{ maxWidth: 863, pl: { xs: '16px', md: '252px' }, borderLeft: `1px solid ${tv('bg-4')}` }}>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '72px' }}>
            {CHANGELOG.map((e, i) => (
              <Box
                key={e.slug}
                component="li"
                sx={{ position: 'relative', pb: '32px', borderBottom: `1px solid ${tv('border-0')}`, '&:last-of-type': { pb: '112px', borderBottom: 'none' } }}
              >
                <Box sx={{ position: { xs: 'relative', md: 'sticky' }, top: { md: 128 }, zIndex: 1, height: 20, ml: { xs: '-16px', md: '-252px' }, width: { md: 252 }, transform: { xs: 'translateY(-8px)', md: 'translateY(-10px)' } }}>
                  <Box sx={{ position: 'relative', pl: { xs: '16px', md: '14px' } }}>
                    <Dot latest={i === 0} />
                    <Box sx={{ fontSize: 14, lineHeight: '17px', color: 'fg-1', pt: '2px' }}>
                      <EntryDate iso={e.date} />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', mt: { xs: '16px', md: '-26px' } }}>
                  <Box component="header" sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <Box component="span" sx={{ fontSize: 14, lineHeight: '17px', color: 'fg-3' }}>{e.tag}</Box>
                    <Box component={Link} href={href(e)} sx={{ color: 'fg-1', textDecoration: 'none' }}>
                      <Box component="h2" sx={{ m: 0, fontSize: 30, fontWeight: 500, lineHeight: '34px' }}>{e.title}</Box>
                    </Box>
                  </Box>
                  {e.art && (
                    <Box component={Link} href={href(e)} aria-label={e.title} sx={{ display: 'block', my: '8px', borderRadius: '12px', '&:hover > div::before': { boxShadow: `inset 0 0 0 1px ${tv('border-1')}` } }}>
                      <ChangelogArt art={e.art} />
                    </Box>
                  )}
                  <Prose blocks={e.blocks} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ position: 'relative', left: '-6.4px', display: 'flex', alignItems: 'center', gap: '8px', color: 'fg-4' }}>
          <Clock />
          <Box component="p" sx={{ m: 0, fontSize: 12, lineHeight: '13.6px' }}>You’ve reached the end, which is also the beginning.</Box>
        </Box>
      </Box>
    </>
  );
}

export function ChangelogDetail({ slug }: { slug: string }) {
  const e = CHANGELOG.find((x) => x.slug === slug);
  const [copied, setCopied] = React.useState(false);
  if (!e) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // live: ~2s
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <Box sx={{ pt: '24px' }}>
      <Box sx={{ maxWidth: 863, pl: { xs: 0, md: '253px' } }}>
        <Box sx={{ position: { xs: 'relative', md: 'sticky' }, top: { md: 128 }, zIndex: 1, height: 16, ml: { xs: '-16px', md: '-253px' }, width: { md: 253 }, transform: { xs: 'translateY(-8px)', md: 'translateY(-10px)' } }}>
          <Box sx={{ pl: { xs: '16px', md: 0 } }}>
            <Box
              component={Link}
              href="/pro/changelog"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'fg-3', fontSize: 14, lineHeight: '14px', textDecoration: 'none', transition: 'color 100ms', '&:hover': { color: 'fg-1' } }}
            >
              <PIBack size={16} />
              Changelog
            </Box>
          </Box>
        </Box>
        <Box component="article" sx={{ display: 'flex', flexDirection: 'column', gap: '24px', mt: { xs: 0, md: '-26px' }, pt: { xs: '16px', md: 0 } }}>
          <Box component="header" sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', fontSize: 14, lineHeight: '17px', color: 'fg-3' }}>
              <EntryDate iso={e.date} />
              <Box component="button" type="button" onClick={copy} sx={{ p: 0, border: 0, background: 'none', fontFamily: 'inherit', fontSize: 14, lineHeight: '14px', color: 'inherit', cursor: 'pointer' }}>
                {copied ? 'Copied' : 'Copy Link'}
              </Box>
            </Box>
            <Box component="h1" sx={{ m: 0, fontSize: { xs: 24, md: 28 }, fontWeight: 500, lineHeight: { xs: '28.8px', md: '33.6px' }, color: 'fg-1' }}>
              {e.title}
            </Box>
          </Box>
          {e.art && (
            <Box sx={{ my: '8px' }}>
              <ChangelogArt art={e.art} />
            </Box>
          )}
          <Prose blocks={e.blocks} />
        </Box>
      </Box>
    </Box>
  );
}
