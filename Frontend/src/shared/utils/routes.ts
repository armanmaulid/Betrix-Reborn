import {
  LayoutDashboard,
  Users,
  Ticket,
  Bot,
  Newspaper,
  Layers,
  Activity,
  BarChart3,
  Radio,
  ShieldAlert,
  Wrench,
  CalendarDays,
  type LucideIcon
} from 'lucide-react';

export interface RouteDefinition {
  num: string;
  name: string;
  href: string;
  icon: LucideIcon;
  shortcutKey?: string;
  description: string;
  badge?: string;
}

export const ADMIN_ROUTES: RouteDefinition[] = [
  {
    num: '01',
    name: 'DASHBOARD',
    href: '/dashboard',
    icon: LayoutDashboard,
    shortcutKey: '1',
    description: 'Main Operations Dashboard'
  },
  {
    num: '02',
    name: 'USER MANAGEMENT',
    href: '/users',
    icon: Users,
    shortcutKey: '2',
    description: 'User Accounts Management'
  },
  {
    num: '03',
    name: 'CREDIT VOUCHERS',
    href: '/vouchers',
    icon: Ticket,
    shortcutKey: '3',
    description: 'Credit Voucher Inventory'
  },
  {
    num: '04',
    name: 'AI AGENTS',
    href: '/agents',
    icon: Bot,
    shortcutKey: '4',
    description: 'AI Agent Fleet & Models'
  },
  {
    num: '05',
    name: 'FINNHUB NEWS',
    href: '/news',
    icon: Newspaper,
    shortcutKey: '5',
    description: 'Finnhub Market News Stream'
  },
  {
    num: '06',
    name: 'MARKET CATALOG',
    href: '/market-data',
    icon: Layers,
    shortcutKey: '6',
    description: 'Market Instruments Catalog (symbols)'
  },
  {
    num: '07',
    name: 'STREAM SYMBOLS',
    href: '/stream-symbols',
    icon: Activity,
    shortcutKey: '7',
    description: 'Finnhub Real-Time Stream Terminal (stream_symbols)'
  },
  {
    num: '08',
    name: 'OHLC SYMBOLS',
    href: '/ohlc-symbols',
    icon: BarChart3,
    shortcutKey: 'o',
    description: 'Dukascopy Historical OHLC Data Symbols'
  },
  {
    num: '09',
    name: 'ECONOMIC CALENDAR',
    href: '/calendar',
    icon: CalendarDays,
    shortcutKey: 'c',
    description: 'FXMacroData Before/Forecast/Actual Releases'
  },
  {
    num: '10',
    name: 'BROADCAST MSG',
    href: '/broadcast',
    icon: Radio,
    shortcutKey: '8',
    description: 'Global Message Broadcast'
  },
  {
    num: '11',
    name: 'AUDIT LOGS',
    href: '/audit-logs',
    icon: ShieldAlert,
    shortcutKey: '9',
    description: 'Security & Activity Audit Logs'
  },
  {
    num: '12',
    name: 'MAINTENANCE',
    href: '/maintenance',
    icon: Wrench,
    shortcutKey: '0',
    description: 'System Maintenance & Workers'
  }
];

export const ROUTE_SHORTCUT_MAP: Record<string, string> = Object.fromEntries(
  ADMIN_ROUTES.filter((r): r is typeof r & { shortcutKey: string } => Boolean(r.shortcutKey)).map(
    (r) => [r.shortcutKey, r.href]
  )
);
