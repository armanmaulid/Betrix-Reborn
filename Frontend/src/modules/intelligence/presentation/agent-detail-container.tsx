'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Terminal, Bot } from 'lucide-react';
import { type UpdateAgentInput } from '@/modules/intelligence/application/schemas/agent.schema';
import {
  useAgentDetailQuery,
  useUpdateAgentMutation,
  useSetDefaultAgentMutation
} from '@/modules/intelligence/application/queries/use-agents';
import { AgentTestConsole } from './agent-test-console';
import { AgentForm } from './agent-form';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';

export interface AgentDetailContainerProps {
  agentId: string;
}

export function AgentDetailContainer({ agentId }: AgentDetailContainerProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'config' | 'test'>('config');

  const { data: agent, isLoading, isError, error: agentError } = useAgentDetailQuery(agentId);
  usePageTitle(agent?.name ? `AGENT // ${agent.name}` : `AGENT // ${agentId}`);
  const updateMutation = useUpdateAgentMutation();
  const setDefaultMutation = useSetDefaultAgentMutation();

  if (isLoading) {
    return (
      <div className="space-y-3 font-mono animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO FLEET CATALOG</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 bg-surface border border-border w-32"></div>
            <div className="h-4 bg-surface border border-border w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !agent) {
    return (
      <div className="space-y-3 font-mono">
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO FLEET CATALOG</span>
        </Link>
        <div className="border border-negative bg-surface p-8 text-center space-y-3">
          <div className="text-sm font-bold text-negative uppercase">AI AGENT NOT DISCOVERED</div>
          <p className="text-xs text-muted-foreground">
            {agentError instanceof Error
              ? agentError.message
              : `No model identified by slug "${agentId}".`}
          </p>
        </div>
      </div>
    );
  }

  const handleSetDefault = async () => {
    if (agent.isDefault) return;
    try {
      await setDefaultMutation.mutateAsync(agent.id);
      success('DEFAULT MODEL UPDATED', `${agent.name} is now the system default AI agent.`);
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Unable to update default agent.');
    }
  };

  const onSubmit = async (data: any) => {
    const updateData = data as UpdateAgentInput;
    try {
      const payload: UpdateAgentInput = {
        name: updateData.name,
        modelName: updateData.modelName,
        baseUrl: updateData.baseUrl?.trim() || null,
        apiKey: updateData.apiKey ? updateData.apiKey.trim() : undefined,
        taskType: updateData.taskType,
        systemPrompt: updateData.systemPrompt?.trim() || null,
        tier: updateData.tier,
        creditsPer1kTokens: updateData.creditsPer1kTokens,
        maxTokens: updateData.maxTokens,
        temperature: updateData.temperature,
        supportsThinking: updateData.supportsThinking,
        isActive: updateData.isActive,
        visibility: updateData.visibility,
        description: updateData.description?.trim() || null
      };

      await updateMutation.mutateAsync({ id: agent.id, data: payload });
      success('AGENT UPDATED', `Model parameters for ${agent.name} saved successfully.`);
      router.push('/agents');
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Unable to update agent.');
    }
  };

  return (
    <div className="space-y-3 font-mono">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO FLEET CATALOG</span>
        </Link>

        <div className="flex items-center gap-3">
          {!agent.isDefault ? (
            <button
              onClick={handleSetDefault}
              disabled={setDefaultMutation.isPending}
              className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Star className="w-3.5 h-3.5" />
              <span>SET AS SYSTEM DEFAULT</span>
            </button>
          ) : (
            <span className="px-2.5 py-1 text-xs font-bold border border-accent bg-accent text-black uppercase flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-black" />
              SYSTEM DEFAULT MODEL
            </span>
          )}

          <div className="text-[10px] text-muted-foreground font-mono select-all">
            SLUG: <strong className="text-accent">{agent.id}</strong>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-border text-xs">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold tracking-wider uppercase transition-colors cursor-pointer ${
            activeTab === 'config'
              ? 'border-b-2 border-accent text-accent bg-accent/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>[1] MODEL CONFIGURATION</span>
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold tracking-wider uppercase transition-colors cursor-pointer ${
            activeTab === 'test'
              ? 'border-b-2 border-accent text-accent bg-accent/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>[2] QA TEST CONSOLE</span>
        </button>
      </div>

      {/* Tab 2: Interactive QA Test Console */}
      {activeTab === 'test' ? (
        <AgentTestConsole agent={agent} />
      ) : (
        /* Tab 1: Edit Form */
        <AgentForm initialData={agent} onSubmit={onSubmit} isPending={updateMutation.isPending} />
      )}
    </div>
  );
}
