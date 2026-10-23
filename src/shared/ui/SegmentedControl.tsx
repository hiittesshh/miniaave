'use client';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import * as React from 'react';
import { DARK, tv } from '@/shared/theme/tokens';
import { motion } from '@/shared/theme/motion';

/**
 * Segmented toggle (reference: Supply | Borrow, Overview | Your info, 1w/1m/6m/1y). A sliding
 * pill animates under the active option instead of jumping, which makes tab changes feel smooth.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  height = 36,
  fullWidth = false,
  ariaLabel,
  size = 'medium',
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  height?: number;
  fullWidth?: boolean;
  ariaLabel: string;
  size?: 'small' | 'medium';
}) {
  const index = Math.max(options.findIndex((o) => o.value === value), 0);
  return (
    <Box
      role="tablist"
      aria-label={ariaLabel}
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        width: fullWidth ? '100%' : 'auto',
        height,
        p: '0.06rem',
        borderRadius: size === 'small' ? '0.4rem' : '0.5625rem',
        bgcolor: 'bg-5',
        [DARK]: { bgcolor: 'bg-2', p: '0.13rem', boxShadow: `0 0 0 1px ${tv('border-1')}` },
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
          onChange(options[next].value);
        }
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '0.06rem',
          bottom: '0.06rem',
          left: '0.06rem',
          width: `calc((100% - 0.12rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
          transition: `transform ${motion.duration.smooth}ms ${motion.easing.smooth}`,
          borderRadius: size === 'small' ? '0.34rem' : '0.5025rem',
          bgcolor: 'bg-3',
          boxShadow: `inset 0 0 0 1px ${tv('border-1')}, 0 1px 2px ${tv('shadow-low')}`,
          [DARK]: { bgcolor: 'bg-5', boxShadow: 'none', top: '0.13rem', bottom: '0.13rem', left: '0.13rem', width: `calc((100% - 0.26rem) / ${options.length})` },
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <ButtonBase
            key={o.value}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            sx={{
              position: 'relative',
              zIndex: 1,
              px: size === 'small' ? '0.6rem' : '1rem',
              borderRadius: '0.5rem',
              fontFamily: 'inherit',
              fontWeight: size === 'small' ? 500 : 600,
              fontSize: size === 'small' ? '0.75rem' : '0.875rem',
              color: 'fg-max',
              opacity: active ? 1 : 0.4,
              transition: `opacity ${motion.duration.hover}ms ease`,
              '&:hover': { opacity: active ? 1 : 0.65 },
              '&.Mui-focusVisible': { outline: `2px solid ${tv('fg-1')}`, outlineOffset: '1px' },
              [DARK]: { opacity: active ? 1 : 0.55 },
            }}
          >
            {o.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
