import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MARKET CATALOG'
};

export default function MarketDataSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
