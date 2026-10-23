import { createTheme, type CSSObject, type ThemeOptions } from '@mui/material/styles';
import { motion, transition } from './motion';
import { ScaleFade } from './ScaleFade';
import { DARK, darkTokens, lightTokens, surfaceShadow, tv, type TokenName } from './tokens';

/**
 * One MUI theme for both clones. It runs in CSS-variables mode with two colour schemes, so
 * switching light/dark only flips a `data-mui-color-scheme` attribute on <html> and nothing
 * re-renders. The recipes (button pills, inset menu highlight, surface shadow) re-implement what
 * the reference measures, as documented in docs/REFERENCE_AUDIT.md §1.4.
 */
export const FONT = "var(--font-inter), 'Inter Variable', Inter, Arial, sans-serif";

const rem = (px: number) => `${px / 16}rem`;

const palette = (mode: 'light' | 'dark') => {
  const t: Record<TokenName, string> = mode === 'light' ? lightTokens : darkTokens;
  return {
    mode,
    ...t,
    primary: { main: t['fg-1'], light: t['fg-2'], dark: t['fg-max'], contrastText: t['bg-1'] },
    secondary: { main: t['purple-1'], light: t['purple-2'], dark: t['purple-1'], contrastText: '#ffffff' },
    error: { main: t['red-1'], light: t['red-2'], dark: t['red-1'], contrastText: '#ffffff' },
    warning: { main: t['yellow-1'], light: t['yellow-2'], dark: t['yellow-1'], contrastText: '#000000' },
    info: { main: t['blue-1'], light: t['blue-2'], dark: t['blue-1'], contrastText: '#ffffff' },
    success: { main: t['data-green'], light: t['data-green'], dark: t['data-green'], contrastText: '#ffffff' },
    text: { primary: t['fg-1'], secondary: t['fg-2'], disabled: t['fg-4'], muted: t['fg-3'] },
    background: { default: t['bg-5'], paper: t['surface-elevated'], surface: t['bg-2'] },
    divider: t['border-0'],
    action: {
      active: t['fg-3'],
      hover: t['button-hover'],
      selected: t.selected,
      disabled: t['fg-4'],
      disabledBackground: t['bg-6'],
      focus: mode === 'light' ? 'rgba(26, 136, 248, 0.2)' : 'rgba(85, 167, 251, 0.3)',
    },
  };
};

const typography = {
  fontFamily: FONT,
  display1: { fontFamily: FONT, fontWeight: 700, letterSpacing: rem(0.25), lineHeight: '123.5%', fontSize: rem(32) },
  h1: { fontFamily: FONT, fontWeight: 700, letterSpacing: rem(0.25), lineHeight: '123.5%', fontSize: rem(28) },
  h2: { fontFamily: FONT, fontWeight: 500, lineHeight: '120%', fontSize: rem(24) },
  h3: { fontFamily: FONT, fontWeight: 500, lineHeight: '120%', fontSize: rem(18) },
  h4: { fontFamily: FONT, fontWeight: 600, letterSpacing: rem(0.15), lineHeight: rem(24), fontSize: rem(16) },
  h5: { fontFamily: FONT, fontWeight: 500, lineHeight: rem(18), fontSize: rem(14) },
  h6: { fontFamily: FONT, fontWeight: 500, lineHeight: rem(18), fontSize: rem(14) },
  subheader1: { fontFamily: FONT, fontWeight: 600, letterSpacing: rem(0.15), lineHeight: rem(20), fontSize: rem(14) },
  subheader2: { fontFamily: FONT, fontWeight: 500, letterSpacing: rem(0.1), lineHeight: rem(16), fontSize: rem(12) },
  base: { fontFamily: FONT, fontWeight: 400, lineHeight: rem(18), fontSize: rem(14) },
  description: { fontFamily: FONT, fontWeight: 400, letterSpacing: rem(0.15), lineHeight: '143%', fontSize: rem(14) },
  caption: { fontFamily: FONT, fontWeight: 400, letterSpacing: rem(0.15), lineHeight: rem(16), fontSize: rem(12) },
  buttonL: { fontFamily: FONT, fontWeight: 500, letterSpacing: '-0.00563rem', lineHeight: 'normal', fontSize: '0.9375rem' },
  buttonM: { fontFamily: FONT, fontWeight: 500, letterSpacing: '-0.00563rem', lineHeight: '1.25rem', fontSize: rem(14) },
  helperText: { fontFamily: FONT, fontWeight: 400, letterSpacing: rem(0.4), lineHeight: rem(12), fontSize: rem(10) },
  main12: { fontFamily: FONT, fontWeight: 600, letterSpacing: rem(0.1), lineHeight: rem(16), fontSize: rem(12) },
  secondary16: { fontFamily: FONT, fontWeight: 500, letterSpacing: rem(0.15), lineHeight: rem(24), fontSize: rem(16) },
  secondary21: { fontFamily: FONT, fontWeight: 500, lineHeight: '133.4%', fontSize: rem(21) },
  body1: { fontFamily: FONT, fontSize: rem(14), lineHeight: '143%' },
  body2: { fontFamily: FONT, fontSize: rem(14), lineHeight: '143%' },
  button: { fontFamily: FONT, textTransform: 'none' as const },
} satisfies ThemeOptions['typography'];

const breakpoints = {
  keys: ['xs', 'xsm', 'sm', 'md', 'mdlg', 'lg', 'xl', 'xxl'],
  values: { xs: 0, xsm: 640, sm: 760, md: 960, mdlg: 1125, lg: 1280, xl: 1575, xxl: 1800 },
} as unknown as ThemeOptions['breakpoints'];

/** Composites a translucent hover token over a button's own fill via a ::before layer. */
const hoverOverlay = (fill: string): CSSObject => ({
  position: 'relative',
  isolation: 'isolate',
  '&::before': {
    content: "''",
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    zIndex: -1,
    transition: transition(['background-color'], motion.duration.hover),
  },
  '&:hover::before, &.Mui-focusVisible::before, &[aria-expanded="true"]::before': { backgroundColor: fill },
});

const pill = (hover: TokenName, darkFill: string): CSSObject => ({
  backgroundColor: tv('bg-3'),
  boxShadow: surfaceShadow(),
  color: tv('fg-1'),
  border: 'none',
  ...hoverOverlay(tv(hover)),
  '& .MuiButton-startIcon': { color: tv('fg-3') },
  '&:hover, &.Mui-focusVisible, &[aria-expanded="true"]': { backgroundColor: tv('bg-3'), boxShadow: surfaceShadow(), border: 'none' },
  '&.Mui-disabled': { color: tv('fg-3'), boxShadow: surfaceShadow(), border: 'none' },
  [DARK]: {
    backgroundColor: darkFill,
    boxShadow: 'none',
    '&:hover, &.Mui-focusVisible, &[aria-expanded="true"], &.Mui-disabled': { backgroundColor: darkFill, boxShadow: 'none' },
  },
});

const pressScale: CSSObject = { '&:active:not(.Mui-disabled)': { transform: 'scale(0.99)' } };
const focusRing = { outline: '2px solid currentColor', outlineOffset: '3px' } as const;

const base = createTheme({
  cssVariables: { colorSchemeSelector: 'data-mui-color-scheme' },
  colorSchemes: { light: { palette: palette('light') }, dark: { palette: palette('dark') } },
  breakpoints,
  spacing: 4,
  typography,
  shape: { borderRadius: 8 },
});

const components: ThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        fontFamily: FONT,
        fontSize: rem(14),
        minWidth: 360,
        backgroundColor: tv('bg-1'),
        color: tv('fg-1'),
      },
      '*::selection': { background: tv('purple-1'), color: '#fff' },
      '@media (prefers-reduced-motion: reduce)': {
        '*, *::before, *::after': {
          animationDuration: '0.01ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.01ms !important',
          scrollBehavior: 'auto !important',
        },
      },
    },
  },
  MuiButtonBase: { defaultProps: { disableRipple: true } },
  MuiTypography: {
    defaultProps: {
      variant: 'description',
      variantMapping: {
        display1: 'h1',
        h1: 'h1',
        h2: 'h2',
        h3: 'h3',
        h4: 'h4',
        h5: 'p',
        subheader1: 'p',
        subheader2: 'p',
        caption: 'p',
        base: 'p',
        description: 'p',
        buttonL: 'span',
        buttonM: 'span',
        main12: 'p',
        secondary16: 'p',
        secondary21: 'p',
        statValue: 'p',
        statValueNoData: 'p',
        helperText: 'span',
      },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        minWidth: 'unset',
        whiteSpace: 'nowrap',
        textTransform: 'none',
        transition: transition(['background-color', 'box-shadow', 'border-color', 'color', 'transform']),
        ...pressScale,
        '&.Mui-focusVisible': focusRing,
      },
      sizeLarge: { ...typography.buttonL, height: 48, padding: '0 24px', borderRadius: '0.625rem' },
      sizeMedium: { ...typography.buttonM, height: 36, padding: '0 0.88rem', borderRadius: '0.5rem' },
      sizeSmall: { ...typography.buttonM, height: 28, padding: '0 0.62rem', borderRadius: '0.375rem' },
    },
    variants: [
      {
        props: { variant: 'contained', color: 'primary' },
        style: {
          backgroundColor: tv('fg-1'),
          color: tv('bg-1'),
          boxShadow: surfaceShadow('fg-1'),
          ...hoverOverlay(tv('button-hover-primary')),
          '&:hover': { backgroundColor: tv('fg-1'), boxShadow: surfaceShadow('fg-1') },
          '&.Mui-focusVisible': { outlineColor: tv('fg-1') },
          '&.Mui-disabled': {
            color: tv('bg-1'),
            backgroundColor: 'transparent',
            boxShadow: 'none',
            '&::before': { backgroundColor: tv('fg-1'), opacity: 0.5 },
          },
        },
      },
      { props: { variant: 'outlined', color: 'primary' }, style: pill('button-hover-secondary', tv('bg-4-hover')) },
      { props: { variant: 'tertiary', color: 'primary' }, style: pill('button-hover-tertiary', tv('bg-4')) },
      {
        props: { variant: 'text' },
        style: { color: tv('fg-1'), '&:hover': { backgroundColor: tv('button-hover') } },
      },
    ],
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        transition: transition(['background-color', 'color', 'transform']),
        ...pressScale,
        '&[aria-expanded="true"]': { backgroundColor: tv('button-hover') },
        '&.Mui-focusVisible': focusRing,
      },
    },
  },
  MuiMenu: {
    defaultProps: {
      slots: { transition: ScaleFade as never },
      transitionDuration: motion.duration.overlay,
    },
    styleOverrides: {
      paper: {
        '&&': {
          marginTop: 8,
          minWidth: 220,
          borderRadius: '0.75rem',
          border: 'none',
          boxShadow: surfaceShadow(),
          backgroundColor: tv('surface-elevated'),
        },
        '*:where([data-mui-color-scheme="dark"]) &&': { backgroundColor: tv('bg-2') },
        '.MuiList-root': { padding: '0.38rem' },
      },
    },
  },
  MuiPopover: {
    defaultProps: { slots: { transition: ScaleFade as never }, transitionDuration: motion.duration.overlay },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        minHeight: '2rem',
        padding: '0.31rem 0.38rem',
        fontSize: rem(14),
        position: 'relative',
        isolation: 'isolate',
        '@media (min-width: 0px)': { minHeight: '2rem' },
        // Inset highlight that grows from 0.96 → 1 (keeps a gap between adjacent rows).
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '1px 0',
          zIndex: -1,
          borderRadius: 'calc(0.75rem - 0.38rem)',
          transform: 'scale(0.96)',
          transition: transition(['transform', 'background-color']),
        },
        '&:hover::before, &.Mui-focusVisible::before, &.Mui-selected::before': {
          backgroundColor: tv('button-hover'),
          transform: 'scale(1)',
        },
        '&:hover, &.Mui-focusVisible, &.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': {
          backgroundColor: 'transparent',
        },
        '&:hover::before': { backgroundColor: tv('selected') },
        '& > svg': { color: tv('fg-3') },
      },
    },
  },
  MuiListItemText: {
    styleOverrides: {
      root: { margin: 0 },
      primary: { fontSize: rem(14), fontWeight: 400, lineHeight: rem(18) },
    },
  },
  MuiListItemIcon: { styleOverrides: { root: { color: tv('fg-2'), minWidth: 'unset !important', marginRight: 12 } } },
  MuiDivider: { styleOverrides: { root: { borderColor: tv('border-0') } } },
  MuiPaper: {
    styleOverrides: { root: { borderRadius: 8, backgroundImage: 'none' } },
    variants: [
      {
        props: { variant: 'outlined' },
        style: { border: 'none', boxShadow: surfaceShadow(), background: tv('surface-elevated'), [DARK]: { background: tv('bg-2') } },
      },
      {
        props: { variant: 'modal' },
        style: {
          borderRadius: '0.75rem',
          isolation: 'isolate',
          backgroundColor: tv('bg-1'),
          boxShadow: `0 0 0 1px ${tv('border-1')}, 0 4px 16px 0 ${tv('shadow-medium')}`,
          [DARK]: { backgroundColor: tv('bg-2') },
        },
      },
      {
        props: { variant: 'card' },
        style: {
          backgroundColor: tv('surface-elevated'),
          borderRadius: 10,
          boxShadow: surfaceShadow('shadow-stroke-1'),
          [DARK]: { backgroundColor: tv('bg-2') },
        },
      },
      {
        props: { variant: 'table' },
        style: { backgroundColor: tv('table-bg'), borderRadius: 10, boxShadow: surfaceShadow('shadow-stroke-1') },
      },
    ],
  },
  MuiContainer: {
    styleOverrides: {
      root: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        paddingBottom: 39,
        paddingLeft: '1rem',
        paddingRight: '1rem',
        [base.breakpoints.up('xsm')]: { paddingLeft: 20, paddingRight: 20 },
        [base.breakpoints.up('sm')]: { paddingLeft: 48, paddingRight: 48 },
        [base.breakpoints.up('md')]: { paddingLeft: 20, paddingRight: 20 },
        [base.breakpoints.up('lg')]: { paddingLeft: 20, paddingRight: 20, maxWidth: 1280 },
        [base.breakpoints.up('xl')]: { paddingLeft: 96, paddingRight: 96, maxWidth: 1632 },
        [base.breakpoints.up('xxl')]: { paddingLeft: 0, paddingRight: 0, maxWidth: 1440 },
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: {
        width: '1.75rem',
        height: '1.125rem',
        padding: 0,
        flexShrink: 0,
        borderRadius: 9,
        overflow: 'visible',
        '&:has(.Mui-focusVisible)': { outline: '2px solid currentColor', outlineOffset: '3px' },
      },
      switchBase: {
        padding: 0,
        margin: 2,
        transitionDuration: '150ms',
        '&.Mui-checked': {
          transform: 'translateX(10px)',
          color: '#fff',
          '& + .MuiSwitch-track': { backgroundColor: tv('purple-1'), opacity: 1 },
        },
        '&.Mui-disabled': { opacity: 0.7 },
        '&:hover': { backgroundColor: 'transparent' },
      },
      thumb: { color: '#fff', width: 14, height: 14, boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.12)' },
      track: { opacity: 1, backgroundColor: tv('bg-6'), borderRadius: 9, transition: transition(['background-color'], 150) },
    },
  },
  MuiFormControlLabel: { styleOverrides: { root: { '&:has(.MuiSwitch-root)': { marginLeft: 0, gap: '0.5rem' } } } },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        padding: 6,
        color: tv('fg-4'),
        '&.Mui-checked': { color: tv('purple-1') },
        '&:hover': { backgroundColor: 'transparent' },
      },
    },
  },
  MuiTooltip: {
    defaultProps: { arrow: false, enterDelay: 80, slots: { transition: ScaleFade as never } },
    styleOverrides: {
      tooltip: {
        fontFamily: FONT,
        fontSize: rem(12),
        lineHeight: rem(16),
        color: tv('fg-1'),
        backgroundColor: tv('surface-elevated'),
        boxShadow: `0 1px 12px ${tv('shadow-medium')}, inset 0 0 0 1px ${tv('border-0')}`,
        borderRadius: '0.5rem',
        padding: '8px 12px',
        maxWidth: 280,
        [DARK]: { backgroundColor: tv('bg-3') },
      },
    },
  },
  MuiSkeleton: {
    defaultProps: { animation: 'wave' },
    styleOverrides: {
      root: { transform: 'unset', backgroundColor: tv('border-1') },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '0.375rem',
        boxShadow: surfaceShadow(),
        color: tv('fg-max'),
        fontFamily: FONT,
        fontSize: rem(14),
        lineHeight: rem(19),
        '.MuiAlert-icon': { margin: 0, padding: 0, opacity: 1, alignSelf: 'flex-start', marginTop: 1 },
        '.MuiAlert-message': { padding: 0, alignSelf: 'center' },
        '.MuiAlertTitle-root': { margin: 0, marginBottom: 2, fontWeight: 500, fontSize: rem(14), lineHeight: rem(19) },
        a: { color: 'inherit', textDecoration: 'underline' },
        '&[data-size="small"]': { padding: '0.625rem 0.75rem', fontSize: rem(12), lineHeight: '1.0125rem' },
      },
    },
    variants: (['error', 'info', 'success', 'warning'] as const).map((severity) => {
      const color = { error: tv('danger'), info: tv('purple-1'), success: tv('data-green'), warning: tv('favourite-star') }[severity];
      return {
        props: { severity },
        style: {
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 4%, transparent) 0%, ${tv('bg-2')} 100%), ${tv('bg-2')}`,
          '.MuiAlert-icon': { color },
        },
      };
    }),
  },
  MuiToggleButton: {
    styleOverrides: { root: { transition: transition(['background-color', 'color', 'transform', 'opacity']), ...pressScale } },
  },
  MuiLinearProgress: { styleOverrides: { root: { backgroundColor: tv('bg-6') } } },
  MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(0, 0, 0, 0.32)' } } },
  MuiLink: { defaultProps: { underline: 'none' }, styleOverrides: { root: { color: 'inherit' } } },
};

export const appTheme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-mui-color-scheme' },
  colorSchemes: { light: { palette: palette('light') }, dark: { palette: palette('dark') } },
  breakpoints,
  spacing: 4,
  typography: {
    ...typography,
    statValue: { ...typography.h2, [base.breakpoints.down('sm')]: typography.h4 },
    statValueNoData: { ...typography.secondary21, [base.breakpoints.down('sm')]: typography.secondary16 },
  },
  shape: { borderRadius: 8 },
  components,
});
