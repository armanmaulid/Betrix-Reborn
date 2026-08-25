import { use } from 'react';
import { UserDetailContainer } from '@/modules/identity/presentation/user-detail-container';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <UserDetailContainer userId={id} />;
}
