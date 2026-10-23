'use client';

/**
 * Pro icon set.
 *
 * The live Pro app uses a custom 18×18 icon set (1.25px round strokes, Figma-exported paths) that
 * is not an open library. Per the fidelity brief we use the closest open-licensed set instead:
 * Lucide (ISC), rendered at the same 18px size with an absolute 1.25px stroke so the line weight
 * matches. Each mapping is logged in docs/PRO_DISCREPANCY_LOG.md as a known, intentional difference.
 */
import type { LucideIcon, LucideProps } from 'lucide-react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChartColumnBig,
  ChevronsUpDown,
  CircleArrowDown,
  CircleArrowUp,
  Clock,
  Ellipsis,
  FileText,
  Globe,
  Info,
  Landmark,
  LayoutGrid,
  LifeBuoy,
  ListFilter,
  Mail,
  Minus,
  PanelLeft,
  PanelTop,
  RefreshCw,
  Search,
  Settings2,
  Shield,
} from 'lucide-react';
import * as React from 'react';

const make = (Icon: LucideIcon, name: string) => {
  const C = ({ size = 18, strokeWidth = 1.25, ...rest }: LucideProps) => (
    <Icon size={size} strokeWidth={strokeWidth} absoluteStrokeWidth aria-hidden focusable={false} {...rest} />
  );
  C.displayName = `ProIcon(${name})`;
  return C;
};

export const PIDashboard = make(LayoutGrid, 'Dashboard');
export const PIActivity = make(Clock, 'Activity');
export const PIDeposit = make(CircleArrowDown, 'Deposit');
export const PIBorrow = make(CircleArrowUp, 'Borrow');
export const PIInsights = make(ChartColumnBig, 'Insights');
export const PISecurity = make(Shield, 'Security');
export const PIProtocol = make(Globe, 'Protocol');
export const PIGovernance = make(Landmark, 'Governance');
export const PIDocs = make(FileText, 'Docs');
export const PIAccessV3 = make(PanelTop, 'AccessV3');
export const PISupport = make(Mail, 'Support');
export const PIHelp = make(LifeBuoy, 'Help');
export const PIExternal = make(ArrowUpRight, 'External');
export const PICollapse = make(PanelLeft, 'Collapse');
export const PISearch = make(Search, 'Search');
export const PIFilter = make(ListFilter, 'Filter');
export const PIUpDown = make(ChevronsUpDown, 'UpDown');
export const PISliders = make(Settings2, 'Sliders');
export const PIBack = make(ArrowLeft, 'Back');
export const PIInfo = make(Info, 'Info');
export const PIMore = make(Ellipsis, 'More');
export const PIMinus = make(Minus, 'Minus');
export const PISwap = make(RefreshCw, 'Swap');
