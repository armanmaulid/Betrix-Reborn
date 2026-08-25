import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'USER DIRECTORY'
};

export default function UsersSegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
