'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, PlusCircle, RefreshCw } from 'lucide-react';
import { AgentCard } from './agent-card';
import type { AiAgent } from '@intelligence/domain/entities/AiAgent';

export interface AgentsFleetGridProps {
  agents: AiAgent[];
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onSetDefault: (agent: AiAgent) => void;
  onDeleteRequest: (agent: AiAgent) => void;
}

export function AgentsFleetGrid({
  agents,
  isLoading,
  isError,
  isRefetching,
  onRefresh,
  onSetDefault,
  onDeleteRequest
}: AgentsFleetGridProps) {
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
            Configure inference parameters, system prompts, token pricing tiers, and system default
            models
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh AI Models List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <Link href="/agents/new">
            <button className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>DEPLOY NEW MODEL</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Grid Content */}
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
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSetDefault={onSetDefault}
              onDelete={onDeleteRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}
