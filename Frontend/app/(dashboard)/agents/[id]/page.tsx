import { use } from 'react';
import { AgentDetailContainer } from '@/modules/intelligence/presentation/agent-detail-container';

export default function EditAgentPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AgentDetailContainer agentId={id} />;
}
