'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bot } from 'lucide-react';
import { type CreateAgentInput } from '@/modules/intelligence/application/schemas/agent.schema';
import { useCreateAgentMutation } from '@/modules/intelligence/application/queries/use-agents';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { AgentForm } from './agent-form';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';

export function NewAgentContainer() {
  usePageTitle('DEPLOY NEW AGENT');
  const router = useRouter();
  const { success, error } = useToast();
  const createMutation = useCreateAgentMutation();

  const handleSubmit = async (data: any) => {
    const createData = data as CreateAgentInput;
    try {
      const payload: CreateAgentInput = {
        ...createData,
        id: createData.id?.trim().toLowerCase(),
        baseUrl: createData.baseUrl?.trim() || undefined,
        apiKey: createData.apiKey?.trim() || undefined,
        systemPrompt: createData.systemPrompt?.trim() || undefined,
        description: createData.description?.trim() || undefined
      };

      await createMutation.mutateAsync(payload);
      success('AI AGENT DEPLOYED', `Model ${createData.name} initialized into the active fleet.`);
      router.push('/agents');
    } catch (err: any) {
      error('DEPLOYMENT FAILED', err.message || 'Unable to deploy AI agent.');
    }
  };

  return (
    <div className="space-y-3 font-mono">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO FLEET CATALOG</span>
        </Link>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
            NEW MODEL CONFIGURATION
          </h1>
        </div>
      </div>

      {/* Deployment Form */}
      <AgentForm onSubmit={handleSubmit} isPending={createMutation.isPending} />
    </div>
  );
}
