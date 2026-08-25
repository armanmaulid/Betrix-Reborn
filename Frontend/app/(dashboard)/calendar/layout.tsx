import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ECONOMIC CALENDAR'
};

export default function CalendarSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
