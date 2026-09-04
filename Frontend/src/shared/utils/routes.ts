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
  MessageSquare,
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
    shortcutKey: 'a',
    description: 'Main Operations Dashboard'
  },
  {
    num: '02',
    name: 'USER MANAGEMENT',
    href: '/users',
    icon: Users,
    shortcutKey: 'b',
    description: 'User Accounts Management'
  },
  {
    num: '03',
    name: 'CREDIT VOUCHERS',
    href: '/vouchers',
    icon: Ticket,
    shortcutKey: 'c',
    description: 'Credit Voucher Inventory'
  },
  {
    num: '04',
    name: 'AI AGENTS',
    href: '/agents',
    icon: Bot,
    shortcutKey: 'd',
    description: 'AI Agent Fleet & Models'
  },
  {
    num: '05',
    name: 'REAL TEST CHAT',
    href: '/chat-test',
    icon: MessageSquare,
    shortcutKey: 'e',
    description: 'Live AI Chat — credit billing & context injection verification'
  },
  {
    num: '06',
    name: 'FINNHUB NEWS',
    href: '/news',
    icon: Newspaper,
    shortcutKey: 'f',
    description: 'Finnhub Market News Stream'
  },
  {
    num: '07',
    name: 'MARKET CATALOG',
    href: '/market-data',
    icon: Layers,
    shortcutKey: 'g',
    description: 'Market Instruments Catalog (symbols)'
  },
  {
    num: '08',
    name: 'STREAM SYMBOLS',
    href: '/stream-symbols',
    icon: Activity,
    shortcutKey: 'h',
    description: 'Finnhub Real-Time Stream Terminal (stream_symbols)'
  },
  {
    num: '09',
    name: 'OHLC SYMBOLS',
    href: '/ohlc-symbols',
    icon: BarChart3,
    shortcutKey: 'i',
    description: 'Dukascopy Historical OHLC Data Symbols'
  },
  {
    num: '10',
    name: 'ECONOMIC CALENDAR',
    href: '/calendar',
    icon: CalendarDays,
    shortcutKey: 'j',
    description: 'FXMacroData Before/Forecast/Actual Releases'
  },
  {
    num: '11',
    name: 'BROADCAST MSG',
    href: '/broadcast',
    icon: Radio,
    shortcutKey: 'k',
    description: 'Global Message Broadcast'
  },
  {
    num: '12',
    name: 'AUDIT LOGS',
    href: '/audit-logs',
    icon: ShieldAlert,
    shortcutKey: 'l',
    description: 'Security & Activity Audit Logs'
  },
  {
    num: '13',
    name: 'MAINTENANCE',
    href: '/maintenance',
    icon: Wrench,
    shortcutKey: 'm',
    description: 'System Maintenance & Workers'
  }
];

export const ROUTE_SHORTCUT_MAP: Record<string, string> = Object.fromEntries(
  ADMIN_ROUTES.filter((r): r is typeof r & { shortcutKey: string } => Boolean(r.shortcutKey)).map(
    (r) => [r.shortcutKey, r.href]
  )
);
