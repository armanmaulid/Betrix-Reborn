import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FLEET MAINTENANCE'
};

export default function MaintenanceSegmentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
