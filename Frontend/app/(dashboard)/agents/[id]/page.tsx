import { use } from 'react';
import type { Metadata } from 'next';
import { AgentDetailContainer } from '@/modules/intelligence/presentation/agent-detail-container';

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `AGENT // ${id}` };
}

export default function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AgentDetailContainer agentId={id} />;
}
