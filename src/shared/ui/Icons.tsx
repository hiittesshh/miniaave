'use client';

import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import * as React from 'react';

/**
 * A small hand-drawn stroke icon set (24×24, 1.5px strokes). Written for this clone. No icon
 * files from the reference apps are used.
 */
const stroke = (node: React.ReactNode, name: string, width = 1.5) => {
  const Icon = (props: SvgIconProps) => (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <g fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
        {node}
      </g>
    </SvgIcon>
  );
  Icon.displayName = name;
  return Icon;
};

export const ChevronDownIcon = stroke(<path d="M6 9.5l6 6 6-6" />, 'ChevronDown');
export const ChevronUpIcon = stroke(<path d="M6 14.5l6-6 6 6" />, 'ChevronUp');
export const ChevronRightIcon = stroke(<path d="M9.5 6l6 6-6 6" />, 'ChevronRight');
export const ChevronLeftIcon = stroke(<path d="M14.5 6l-6 6 6 6" />, 'ChevronLeft');
export const ChevronUpDownIcon = stroke(<path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4" />, 'ChevronUpDown');
export const ArrowUpRightIcon = stroke(<path d="M7.5 16.5l9-9M9 7.5h7.5V15" />, 'ArrowUpRight');
export const ArrowRightIcon = stroke(<path d="M4.5 12h15m-5.5-5.5L19.5 12 14 17.5" />, 'ArrowRight');
export const ArrowLeftIcon = stroke(<path d="M19.5 12h-15m5.5-5.5L4.5 12l5.5 5.5" />, 'ArrowLeft');
export const ArrowDownIcon = stroke(<path d="M12 4.5v15m-5.5-5.5L12 19.5l5.5-5.5" />, 'ArrowDown');
export const CloseIcon = stroke(<path d="M6.5 6.5l11 11m0-11l-11 11" />, 'Close', 1.8);
export const CheckIcon = stroke(<path d="M5 12.5l4.5 4.5L19 7.5" />, 'Check', 1.8);
export const InfoIcon = stroke(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
  </>,
  'Info'
);
export const SearchIcon = stroke(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l3.5 3.5" />
  </>,
  'Search'
);
export const SettingsIcon = stroke(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6" />
  </>,
  'Settings'
);
export const WalletIcon = stroke(
  <>
    <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
    <path d="M3.5 9.5h17M15.5 14h1.5" />
    <path d="M6 6l9-2.5a1.5 1.5 0 0 1 1.9 1.4V6" />
  </>,
  'Wallet'
);
export const BoltIcon = (props: SvgIconProps) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <path d="M13 2.5L5 13.5h6l-1 8 8-11h-6l1-8z" fill="currentColor" />
  </SvgIcon>
);
export const MinusIcon = stroke(<path d="M6 12h12" />, 'Minus');
export const PlusIcon = stroke(<path d="M12 6v12M6 12h12" />, 'Plus');
export const DotsIcon = (props: SvgIconProps) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <circle cx="6" cy="12" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="18" cy="12" r="1.6" fill="currentColor" />
  </SvgIcon>
);
export const SwapIcon = stroke(<path d="M7 7.5h11l-3-3M17 16.5H6l3 3" />, 'Swap');
export const BridgeIcon = stroke(<path d="M3.5 16.5h17M5.5 16.5V12a6.5 6.5 0 0 1 13 0v4.5M9.5 16.5v-4M14.5 16.5v-4" />, 'Bridge');
export const SunIcon = stroke(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1" />
  </>,
  'Sun'
);
export const MoonIcon = stroke(<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />, 'Moon');
export const MonitorIcon = stroke(
  <>
    <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
    <path d="M9 20h6M12 16.5V20" />
  </>,
  'Monitor'
);
export const GasIcon = stroke(
  <>
    <path d="M5 20V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14M4 20h11M5 10h9" />
    <path d="M14 8.5h1.5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 0 3 0V8l-2.5-2.5" />
  </>,
  'Gas'
);
export const ClockIcon = stroke(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
  'Clock'
);
export const CopyIcon = stroke(
  <>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </>,
  'Copy'
);
export const StarIcon = (props: SvgIconProps) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor" />
  </SvgIcon>
);
export const WarningIcon = stroke(
  <>
    <path d="M12 4l9 15.5H3z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="16.8" r="0.6" fill="currentColor" stroke="none" />
  </>,
  'Warning'
);
export const CheckCircleIcon = stroke(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 12.3l2.4 2.4 4.6-5" />
  </>,
  'CheckCircle'
);
export const XCircleIcon = (props: SvgIconProps) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="9" fill="currentColor" />
    <path d="M9 9l6 6m0-6l-6 6" stroke="var(--mui-palette-bg-1, #fff)" strokeWidth={1.8} strokeLinecap="round" />
  </SvgIcon>
);
export const DownloadIcon = stroke(<path d="M12 4.5v11m-4.5-4.5L12 15.5l4.5-4.5M5 19.5h14" />, 'Download');
export const FilterIcon = stroke(<path d="M4.5 6.5h15M7.5 12h9M10.5 17.5h3" />, 'Filter');
export const DashboardIcon = stroke(
  <>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </>,
  'Dashboard'
);
export const ActivityIcon = stroke(<path d="M3.5 12h4l2.5-6 4 12 2.5-6h4" />, 'Activity');
export const DepositIcon = stroke(<path d="M12 3.5v10m-4-4l4 4 4-4M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />, 'Deposit');
export const BorrowIcon = stroke(<path d="M12 13.5v-10m-4 4l4-4 4 4M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />, 'Borrow');
export const InsightsIcon = stroke(<path d="M5 19.5V13M10 19.5V5M15 19.5v-9M20 19.5V9M3.5 19.5h17" />, 'Insights');
export const ShieldIcon = stroke(<path d="M12 3.5l7 3v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9v-5z" />, 'Shield');
export const CodeIcon = stroke(<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14" />, 'Code');
export const GovernanceIcon = stroke(<path d="M3.5 9.5L12 4.5l8.5 5M5.5 9.5v8M9.5 9.5v8M14.5 9.5v8M18.5 9.5v8M3.5 19.5h17" />, 'Governance');
export const BookIcon = stroke(<path d="M5 5.5A2 2 0 0 1 7 3.5h12v15H7a2 2 0 0 0-2 2zM5 20.5V5.5M9 7.5h6" />, 'Book');
export const ChatIcon = stroke(<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 16V7A1.5 1.5 0 0 1 5 5.5z" />, 'Chat');
export const HelpIcon = stroke(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4" />
    <circle cx="12" cy="16.8" r="0.6" fill="currentColor" stroke="none" />
  </>,
  'Help'
);
export const LayersIcon = stroke(<path d="M12 4l8.5 4.5L12 13 3.5 8.5zM3.5 12.5L12 17l8.5-4.5M3.5 16L12 20.5l8.5-4.5" />, 'Layers');
export const SidebarIcon = stroke(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M9.5 4.5v15" />
  </>,
  'Sidebar'
);
export const LinkOutIcon = ArrowUpRightIcon;
export const TrendUpIcon = stroke(<path d="M4 16.5l5-5 3.5 3.5L20 7.5M14.5 7.5H20V13" />, 'TrendUp');
export const QrIcon = stroke(
  <>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2" />
  </>,
  'Qr'
);
export const LogoutIcon = stroke(<path d="M14.5 4.5h-8a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8M10 12h10m-3.5-3.5L20 12l-3.5 3.5" />, 'Logout');
export const PieIcon = stroke(<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z M15 3.9a8.5 8.5 0 0 1 5.1 5.1H15z" />, 'Pie');
export const HeadsetIcon = stroke(<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2M4.5 14a1.5 1.5 0 0 1 1.5-1.5h1v6H6A1.5 1.5 0 0 1 4.5 17zM19.5 14a1.5 1.5 0 0 0-1.5-1.5h-1v6h1a1.5 1.5 0 0 0 1.5-1.5zM17 18.5c0 1.1-1.5 2-3.5 2H12" />, 'Headset');
export const RefreshIcon = stroke(<path d="M19.5 12a7.5 7.5 0 0 1-13.1 5M4.5 12a7.5 7.5 0 0 1 13.1-5M17.6 3.5V7h-3.5M6.4 20.5V17h3.5" />, 'Refresh');
