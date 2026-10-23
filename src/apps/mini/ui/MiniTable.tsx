'use client';

/**
 * Compact table in Pro's table style (bg-2 card, 10px radius, shadow + ring, 11/500 uppercase
 * headers in fg-3, 1px border-0 row rules, 14px cells) for the Mini-Aave lists, with an unmasked
 * actions cell on the right. Below 860px each row becomes a Pro-style card (header + fields +
 * full-width actions), like the Pro explore tables on mobile.
 */
import Box from '@mui/material/Box';
import * as React from 'react';
import { tv } from '@/shared/theme/tokens';

export interface MiniColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  /** CSS grid track, default minmax(0, 1fr) */
  width?: string;
  align?: 'left' | 'right';
  hideOnMobile?: boolean;
}

const BP = 860;
const card = { borderRadius: '10px', bgcolor: 'bg-2', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.15), 0 0 0 1px ${tv('border-1')}` } as const;

export function MiniTable<T>({
  rows,
  rowKey,
  first,
  columns,
  actions,
  actionsWidth = '200px',
  mobileAside,
  empty,
  loading,
  ariaLabel,
}: {
  rows: T[];
  rowKey: (r: T) => string;
  first: MiniColumn<T>;
  columns: MiniColumn<T>[];
  actions?: (r: T) => React.ReactNode;
  actionsWidth?: string;
  mobileAside?: (r: T) => React.ReactNode;
  empty?: React.ReactNode;
  loading?: boolean;
  ariaLabel?: string;
}) {
  const template = [first.width ?? 'minmax(0, 1.4fr)', ...columns.map((c) => c.width ?? 'minmax(0, 1fr)'), ...(actions ? [actionsWidth] : [])].join(' ');
  if (!loading && rows.length === 0 && empty) return <Box sx={{ ...card, p: '20px', color: 'fg-3', fontSize: 14 }}>{empty}</Box>;
  return (
    <>
      <Box role="table" aria-label={ariaLabel} sx={{ ...card, p: '20px', pb: '12px', display: 'none', [`@media (min-width:${BP}px)`]: { display: 'block' } }}>
        <Box role="row" sx={{ display: 'grid', gridTemplateColumns: template, columnGap: '16px', pb: '16px', fontSize: 11, fontWeight: 500, lineHeight: '11px', textTransform: 'uppercase', color: 'fg-3' }}>
          <Box role="columnheader">{first.label}</Box>
          {columns.map((c) => (
            <Box key={c.key} role="columnheader" sx={{ textAlign: c.align ?? 'left' }}>
              {c.label}
            </Box>
          ))}
          {actions && <Box role="columnheader" aria-label="Actions" />}
        </Box>
        {loading
          ? [0, 1].map((i) => <Box key={i} sx={{ height: 64, borderTop: `1px solid ${tv('border-0')}` }} />)
          : rows.map((r) => (
              <Box key={rowKey(r)} role="row" sx={{ display: 'grid', gridTemplateColumns: template, columnGap: '16px', alignItems: 'center', minHeight: 64, py: '12px', borderTop: `1px solid ${tv('border-0')}`, fontSize: 14, lineHeight: '17px' }}>
                <Box role="cell" sx={{ minWidth: 0 }}>{first.render(r)}</Box>
                {columns.map((c) => (
                  <Box key={c.key} role="cell" sx={{ minWidth: 0, textAlign: c.align ?? 'left' }}>
                    {c.render(r)}
                  </Box>
                ))}
                {actions && (
                  <Box role="cell" sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {actions(r)}
                  </Box>
                )}
              </Box>
            ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', [`@media (min-width:${BP}px)`]: { display: 'none' } }}>
        {rows.map((r) => (
          <Box key={rowKey(r)} sx={{ ...card, p: '16px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box sx={{ minWidth: 0 }}>{first.render(r)}</Box>
              {mobileAside && <Box sx={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>{mobileAside(r)}</Box>}
            </Box>
            <Box sx={{ height: '1px', bgcolor: 'border-1', my: '16px' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((c) => (
                  <Box key={c.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', fontSize: 14, lineHeight: '17px' }}>
                    <Box component="span" sx={{ color: 'fg-3', flexShrink: 0 }}>{c.label}</Box>
                    <Box component="span" sx={{ textAlign: 'right', minWidth: 0 }}>{c.render(r)}</Box>
                  </Box>
                ))}
            </Box>
            {actions && <Box sx={{ mt: '16px', display: 'flex', gap: '8px', '& > *': { flex: 1 } }}>{actions(r)}</Box>}
          </Box>
        ))}
      </Box>
    </>
  );
}
