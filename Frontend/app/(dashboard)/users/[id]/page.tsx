import { use } from 'react';
import type { Metadata } from 'next';
import { UserDetailContainer } from '@/modules/identity/presentation/user-detail-container';

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `USER // ${id}` };
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <UserDetailContainer userId={id} />;
}
