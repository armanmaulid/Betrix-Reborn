'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Edit2, Trash2, CheckCircle2, XCircle, Brain } from 'lucide-react';
import { formatFinancialNumber } from '@/shared/utils';
import type { AiAgent } from '@intelligence/domain/entities/AiAgent';

export interface AgentCardProps {
  agent: AiAgent;
  onSetDefault: (agent: AiAgent) => void;
  onDelete: (agent: AiAgent) => void;
}

export function AgentCard({ agent, onSetDefault, onDelete }: AgentCardProps) {
  const tierBadgeVariant = agent.getTierBadgeVariant();
  const tierBadgeClass =
    tierBadgeVariant === 'positive'
      ? 'border-positive/40 bg-positive/10 text-positive'
      : tierBadgeVariant === 'info'
        ? 'border-info/40 bg-info/10 text-info'
        : 'border-accent/40 bg-accent/10 text-accent font-bold';

  return (
    <div
      className={`border bg-surface p-5 flex flex-col justify-between transition-all ${
        agent.isDefault
          ? 'border-accent shadow-[0_0_15px_rgba(255,128,0,0.15)] bg-surface'
          : 'border-border hover:border-accent/50'
      }`}
    >
      <div>
        {/* Top Flags */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {agent.isDefault && (
              <span className="px-2 py-0.5 text-[9px] font-bold border border-accent bg-accent text-black uppercase tracking-wider flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-black" />
                SYSTEM DEFAULT
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${tierBadgeClass}`}
            >
              {agent.tier.toUpperCase()} TIER
            </span>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold border uppercase ${
                agent.visibility === 'private'
                  ? 'border-accent-dim/40 bg-accent-dim/10 text-accent'
                  : 'border-info/40 bg-info/10 text-info'
              }`}
            >
              {agent.visibility}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {agent.isActive ? (
              <span className="flex items-center gap-1 text-[10px] text-positive font-bold">
                <CheckCircle2 className="w-3 h-3" /> ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <XCircle className="w-3 h-3" /> INACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Agent Name & ID */}
        <div className="mb-2">
          <h2 className="text-sm font-bold text-foreground tracking-wide flex items-center justify-between">
            <span>{agent.name}</span>
            <span className="text-[10px] text-muted-foreground font-normal">{agent.taskType}</span>
          </h2>
          <div className="text-[10px] text-muted-foreground/60 select-all font-mono">
            {agent.id}
          </div>
        </div>

        {/* Model Engine */}
        <div className="bg-black/60 border border-border/80 p-2.5 mb-4 text-xs">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            MODEL ENGINE:
          </div>
          <div className="text-accent font-bold select-all truncate">{agent.modelName}</div>
          {agent.baseUrl && (
            <div className="text-[10px] text-muted-foreground/80 select-all truncate mt-0.5">
              URL: {agent.baseUrl}
            </div>
          )}
        </div>

        {/* Description / System Prompt Excerpt */}
        <p className="text-xs text-muted-foreground/90 line-clamp-2 mb-4">
          {agent.description ||
            agent.systemPrompt ||
            'No prompt or description configured for this agent.'}
        </p>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-border/60 pt-3 mb-4">
          <div>
            <span className="text-muted-foreground text-[10px] uppercase">TOKEN RATE:</span>
            <div className="font-bold text-foreground tabular-nums">
              {formatFinancialNumber(agent.creditsPer1kTokens)} CR / 1K
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px] uppercase">MAX TOKENS:</span>
            <div className="font-bold text-foreground tabular-nums">
              {formatFinancialNumber(agent.maxTokens)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px] uppercase">TEMPERATURE:</span>
            <div className="font-bold text-foreground tabular-nums">
              {agent.temperature.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px] uppercase">THINKING:</span>
            <div className="font-bold text-foreground">
              {agent.supportsThinking ? (
                <span className="text-positive flex items-center gap-1">
                  <Brain className="w-3 h-3" /> ENABLED
                </span>
              ) : (
                <span className="text-muted-foreground">DISABLED</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
        <div>
          {!agent.isDefault ? (
            <button
              onClick={() => onSetDefault(agent)}
              className="flex items-center gap-1 border border-border bg-black hover:border-accent hover:text-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Star className="w-3 h-3" />
              <span>SET AS DEFAULT</span>
            </button>
          ) : (
            <span className="text-[10px] text-accent font-bold tracking-wider">
              ★ PRIMARY AGENT
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Link href={`/agents/${agent.id}`}>
            <button
              title="Edit Model Parameters & Test Sandbox"
              className="flex items-center gap-1 border border-border bg-black hover:border-accent hover:text-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>CONFIGURE</span>
            </button>
          </Link>

          <button
            onClick={() => onDelete(agent)}
            disabled={agent.isDefault}
            title={
              agent.isDefault ? 'Cannot delete the system default agent' : 'Delete Agent from Fleet'
            }
            className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
