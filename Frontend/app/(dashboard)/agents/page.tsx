'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  PlusCircle,
  Star,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Brain,
  Zap,
  Sliders,
  AlertCircle
} from 'lucide-react';
import {
  useAgentsQuery,
  useSetDefaultAgentMutation,
  useDeleteAgentMutation
} from '@/lib/queries/use-agents';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { useToast } from '@/components/ui/terminal-toast';
import { formatFinancialNumber } from '@/lib/utils';
import type { AiAgent } from '@/lib/types';

export default function AgentsPage() {
  const { success, error } = useToast();
  const { data: agents = [], isLoading, isError, refetch } = useAgentsQuery();

  const setDefaultMutation = useSetDefaultAgentMutation();
  const deleteMutation = useDeleteAgentMutation();

  const [selectedAgentForDelete, setSelectedAgentForDelete] = useState<AiAgent | null>(null);

  const handleSetDefault = async (agent: AiAgent) => {
    if (agent.isDefault) return;
    try {
      await setDefaultMutation.mutateAsync(agent.id);
      success('DEFAULT MODEL UPDATED', `${agent.name} is now the system-wide default intelligence agent.`);
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Unable to update default agent.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAgentForDelete) return;
    if (selectedAgentForDelete.isDefault) {
      error('ACTION BLOCKED', 'Cannot delete the system default agent. Set another agent as default first.');
      setSelectedAgentForDelete(null);
      return;
    }

    try {
      await deleteMutation.mutateAsync(selectedAgentForDelete.id);
      success('AGENT PURGED', `AI Model ${selectedAgentForDelete.name} was successfully removed from the fleet.`);
      setSelectedAgentForDelete(null);
    } catch (err: any) {
      error('PURGE FAILED', err.message || 'Unable to delete AI agent.');
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              AI AGENT FLEET & MODEL GOVERNANCE
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure inference parameters, system prompts, token pricing tiers, and system default models
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/agents/new"
            className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>DEPLOY NEW MODEL</span>
          </Link>
        </div>
      </div>

      {/* Agents Card Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground animate-pulse border border-border bg-surface">
          RETRIEVING AI AGENT FLEET TELEMETRY...
        </div>
      ) : isError ? (
        <div className="p-8 text-center text-xs text-negative border border-negative bg-surface">
          FAILED TO LOAD AI AGENT MODELS. CHECK API CONNECTION.
        </div>
      ) : agents.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-border/80">
          NO AI AGENTS CONFIGURED IN FLEET. CLICK "DEPLOY NEW MODEL" TO INITIALIZE AN AGENT.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent: AiAgent) => {
            const tierBadge =
              agent.tier === 'cheap'
                ? 'border-positive/40 bg-positive/10 text-positive'
                : agent.tier === 'balanced'
                ? 'border-info/40 bg-info/10 text-info'
                : 'border-accent/40 bg-accent/10 text-accent';

            return (
              <div
                key={agent.id}
                className={`border bg-surface p-5 flex flex-col justify-between transition-colors ${
                  agent.isDefault
                    ? 'border-accent shadow-[0_0_15px_rgba(255,128,0,0.15)]'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${tierBadge}`}>
                        {agent.tier} TIER
                      </span>
                      {agent.visibility === 'private' ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider border-accent/40 bg-accent/10 text-accent">
                          PRIVATE (INTERNAL)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider border-info/40 bg-info/10 text-info">
                          PUBLIC
                        </span>
                      )}
                    </div>

                    {agent.isDefault ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/20 border border-accent/60 px-2 py-0.5">
                        <Star className="w-3 h-3 fill-accent text-accent" />
                        <span>SYSTEM DEFAULT</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(agent)}
                        disabled={setDefaultMutation.isPending}
                        className="text-[10px] text-muted-foreground hover:text-accent transition-colors flex items-center gap-1 border border-border px-1.5 py-0.5 bg-black"
                      >
                        <Star className="w-2.5 h-2.5" />
                        <span>SET DEFAULT</span>
                      </button>
                    )}
                  </div>

                  {/* Agent Identity */}
                  <div className="mt-3 space-y-1">
                    <h2 className="text-sm font-bold text-foreground truncate" title={agent.name}>
                      {agent.name}
                    </h2>
                    <div className="text-[11px] text-accent font-mono select-all">
                      model: {agent.modelName}
                    </div>
                    <div className="text-[10px] text-muted-foreground select-all">
                      id: {agent.id}
                    </div>
                    {agent.description && (
                      <p className="text-[11px] text-muted-foreground/80 mt-2 line-clamp-2 leading-relaxed">
                        {agent.description}
                      </p>
                    )}
                  </div>

                  {/* Technical Parameters */}
                  <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">TOKEN RATE:</span>
                      <div className="font-bold text-foreground tabular-nums">
                        {formatFinancialNumber(agent.creditsPer1kTokens)} CR / 1K
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground">MAX TOKENS:</span>
                      <div className="font-bold text-foreground tabular-nums">
                        {formatFinancialNumber(agent.maxTokens)}
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground">TEMPERATURE:</span>
                      <div className="font-bold text-foreground tabular-nums">
                        {agent.temperature}
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground">THINKING:</span>
                      <div className="font-bold">
                        {agent.supportsThinking ? (
                          <span className="text-positive flex items-center gap-1">
                            <Brain className="w-2.5 h-2.5" /> ENABLED
                          </span>
                        ) : (
                          <span className="text-muted-foreground">DISABLED</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {agent.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-positive font-bold">
                        <CheckCircle2 className="w-3 h-3" /> ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                        <XCircle className="w-3 h-3" /> INACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/agents/${agent.id}`}
                      className="p-1 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors"
                      title="Edit Agent Parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setSelectedAgentForDelete(agent)}
                      disabled={agent.isDefault}
                      title={agent.isDefault ? 'Cannot delete the system default agent' : 'Purge AI Agent'}
                      className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Agent Modal */}
      <DestructiveConfirmDialog
        isOpen={Boolean(selectedAgentForDelete)}
        onClose={() => setSelectedAgentForDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="PURGE AI AGENT MODEL"
        description={`Are you sure you want to permanently delete the AI model "${selectedAgentForDelete?.name}" (${selectedAgentForDelete?.modelName})?`}
        targetIdentifier={selectedAgentForDelete?.id}
        confirmButtonText="PURGE AGENT NOW"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
