import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI FLEET'
};

export default function AgentsSegmentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
