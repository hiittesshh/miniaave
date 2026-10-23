/* eslint-disable @typescript-eslint/no-empty-object-type -- MUI module augmentation extends interfaces by declaration merging. */
import type {} from '@mui/material/themeCssVarsAugmentation';
import type { CSSProperties } from 'react';
import type { TokenName } from './tokens';

interface CustomTypography {
  display1: CSSProperties;
  subheader1: CSSProperties;
  subheader2: CSSProperties;
  description: CSSProperties;
  base: CSSProperties;
  buttonL: CSSProperties;
  buttonM: CSSProperties;
  helperText: CSSProperties;
  main12: CSSProperties;
  secondary16: CSSProperties;
  secondary21: CSSProperties;
  statValue: CSSProperties;
  statValueNoData: CSSProperties;
}

declare module '@mui/material/styles' {
  // Tokens live at the palette root so `sx={{ color: 'fg-3' }}` resolves to a CSS variable.
  interface Palette extends Record<TokenName, string> {}
  interface PaletteOptions extends Partial<Record<TokenName, string>> {}
  interface TypeText {
    muted: string;
  }
  interface TypeBackground {
    surface: string;
  }
  interface TypographyVariants extends CustomTypography {}
  interface TypographyVariantsOptions extends Partial<CustomTypography> {}
  interface BreakpointOverrides {
    xsm: true;
    mdlg: true;
    xxl: true;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    display1: true;
    subheader1: true;
    subheader2: true;
    description: true;
    base: true;
    buttonL: true;
    buttonM: true;
    helperText: true;
    main12: true;
    secondary16: true;
    secondary21: true;
    statValue: true;
    statValueNoData: true;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    tertiary: true;
  }
}

declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    modal: true;
    card: true;
    table: true;
  }
}
