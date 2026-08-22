import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DEPLOY NEW AGENT'
};

export default function NewAgentSegmentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
