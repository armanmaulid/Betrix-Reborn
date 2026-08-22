import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TERMINAL AUTH'
};

export default function LoginSegmentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
