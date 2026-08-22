import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FINANCIAL NEWS'
};

export default function NewsSegmentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
