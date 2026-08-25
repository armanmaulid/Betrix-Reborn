'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, Sparkles, Sliders, Key } from 'lucide-react';
import {
  CreateAgentSchema,
  UpdateAgentSchema,
  type CreateAgentInput,
  type UpdateAgentInput
} from '@/modules/intelligence/application/schemas/agent.schema';
import type { AgentDetail, AiAgent } from '@intelligence/domain/entities/AiAgent';

export interface AgentFormProps {
  initialData?: AgentDetail | AiAgent | null;
  onSubmit: (data: CreateAgentInput | UpdateAgentInput) => Promise<void>;
  isPending?: boolean;
}

export function AgentForm({ initialData, onSubmit, isPending = false }: AgentFormProps) {
  const isEdit = Boolean(initialData);

  // Key by isEdit+initialData.id to force a full remount when switching between
  // create/edit modes.  This avoids stale defaultValues + resolver mismatches
  // that react-hook-form v8 cannot fully reset at runtime.
  const formKey = `${isEdit ? 'edit' : 'create'}-${initialData?.id ?? 'new'}`;

  const defaultValues =
    isEdit && initialData
      ? {
          name: initialData.name,
          modelName: initialData.modelName,
          baseUrl: initialData.baseUrl || '',
          apiKey: '',
          taskType: initialData.taskType,
          tier: initialData.tier,
          creditsPer1kTokens: initialData.creditsPer1kTokens,
          maxTokens: initialData.maxTokens,
          temperature: initialData.temperature,
          supportsThinking: initialData.supportsThinking,
          isDefault: initialData.isDefault,
          isActive: initialData.isActive,
          visibility: initialData.visibility || 'public',
          systemPrompt: initialData.systemPrompt || '',
          description: initialData.description || ''
        }
      : {
          id: '',
          name: '',
          modelName: '',
          baseUrl: '',
          apiKey: '',
          taskType: 'trade_reasoning',
          tier: 'deep' as const,
          creditsPer1kTokens: 1,
          maxTokens: 8192,
          temperature: 0.7,
          supportsThinking: true,
          isDefault: false,
          isActive: true,
          visibility: 'public' as const,
          systemPrompt: '',
          description: ''
        };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const form = useForm<any>({
    resolver: zodResolver(isEdit ? UpdateAgentSchema : CreateAgentSchema),
    defaultValues
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = form;

  const temperatureValue = watch('temperature', initialData?.temperature ?? 0.7);

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
  };

  return (
    <form key={formKey} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 font-mono">
      {/* Panel 1: Primary Identity & Model Spec */}
      <div className="border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-border/60 pb-3">
          <Bot className="w-4 h-4 text-accent" />
          <h2 className="text-xs font-bold text-foreground tracking-wider uppercase">
            MODEL IDENTIFICATION & INFERENCE ENDPOINT
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Slug Identifier */}
          <div className="space-y-1">
            <label
              htmlFor={isEdit ? 'agent-edit-id' : 'agent-id'}
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              {isEdit ? 'UNIQUE IDENTIFIER SLUG (LOCKED)' : 'UNIQUE IDENTIFIER SLUG (IMMUTABLE) *'}
            </label>
            {isEdit ? (
              <input
                id="agent-edit-id"
                type="text"
                value={initialData?.id || ''}
                disabled
                className="w-full bg-black/60 border border-border/50 px-3 py-2 text-muted-foreground cursor-not-allowed select-all font-bold"
              />
            ) : (
              <input
                id="agent-id"
                type="text"
                {...register('id')}
                placeholder="e.g. gpt-4o-market-reasoner"
                className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent font-bold"
              />
            )}
            {errors.id && (
              <p className="text-[10px] text-negative">{errors.id.message as string}</p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-1">
            <label
              htmlFor={isEdit ? 'agent-edit-name' : 'agent-name'}
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              AGENT DISPLAY NAME *
            </label>
            <input
              id={isEdit ? 'agent-edit-name' : 'agent-name'}
              type="text"
              {...register('name')}
              placeholder="e.g. GPT-4o Market Intelligence"
              className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
            />
            {errors.name && (
              <p className="text-[10px] text-negative">{errors.name.message as string}</p>
            )}
          </div>

          {/* LLM Model Name */}
          <div className="space-y-1">
            <label
              htmlFor={isEdit ? 'agent-edit-model' : 'agent-model'}
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              UPSTREAM LLM MODEL IDENTIFIER *
            </label>
            <input
              id={isEdit ? 'agent-edit-model' : 'agent-model'}
              type="text"
              {...register('modelName')}
              placeholder="e.g. gpt-4o, claude-3-7-sonnet-20250219"
              className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
            />
            {errors.modelName && (
              <p className="text-[10px] text-negative">{errors.modelName.message as string}</p>
            )}
          </div>

          {/* Task Type */}
          <div className="space-y-1">
            <label
              htmlFor={isEdit ? 'agent-edit-task' : 'agent-task'}
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              TASK CLASSIFICATION
            </label>
            <input
              id={isEdit ? 'agent-edit-task' : 'agent-task'}
              type="text"
              {...register('taskType')}
              placeholder="trade_reasoning"
              className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {/* Base URL */}
          <div className="space-y-1">
            <label
              htmlFor={isEdit ? 'agent-edit-url' : 'agent-url'}
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              CUSTOM BASE URL (OPTIONAL)
            </label>
            <input
              id={isEdit ? 'agent-edit-url' : 'agent-url'}
              type="text"
              {...register('baseUrl')}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor={isEdit ? 'agent-edit-key' : 'agent-key'}
                className="text-[10px] uppercase text-muted-foreground tracking-wider block"
              >
                {isEdit ? 'API SECRET KEY' : 'API SECRET KEY (OPTIONAL)'}
              </label>
              {isEdit && (
                <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <Key className="w-2.5 h-2.5" /> Leave empty to keep existing key
                </span>
              )}
            </div>
            <input
              id={isEdit ? 'agent-edit-key' : 'agent-key'}
              type="password"
              {...register('apiKey')}
              placeholder={isEdit ? '••••••••••••••••' : 'sk-...'}
              className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>

      {/* Panel 2: Inference Hyperparameters & Billing Tiers */}
      <div className="border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-border/60 pb-3">
          <Sliders className="w-4 h-4 text-info" />
          <h2 className="text-xs font-bold text-foreground tracking-wider uppercase">
            INFERENCE HYPERPARAMETERS & TOKEN BILLING
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Billing Tier */}
          <div className="space-y-1">
            <label
              htmlFor={isEdit ? 'agent-edit-tier' : 'agent-tier'}
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              PRICING TIER
            </label>
            <select
              id={isEdit ? 'agent-edit-tier' : 'agent-tier'}
              {...register('tier')}
              className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
            >
              <option value="cheap">CHEAP (Low-cost / Fast)</option>
              <option value="balanced">BALANCED (Standard Performance)</option>
              <option value="deep">DEEP (Advanced Reasoning / SOTA)</option>
            </select>
          </div>

          {/* Credits Per 1k Tokens */}
          <div className="space-y-1">
            <label
              htmlFor={isEdit ? 'agent-edit-rate' : 'agent-rate'}
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              CREDITS PER 1K TOKENS (≥ 1) *
            </label>
            <input
              id={isEdit ? 'agent-edit-rate' : 'agent-rate'}
              type="number"
              min="1"
              step="1"
              {...register('creditsPer1kTokens', { valueAsNumber: true })}
              className="w-full bg-black border border-border px-3 py-2 text-foreground tabular-nums focus:outline-none focus:border-accent"
            />
            {errors.creditsPer1kTokens && (
              <p className="text-[10px] text-negative">
                {errors.creditsPer1kTokens.message as string}
              </p>
            )}
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-1">
            <label
              htmlFor={isEdit ? 'agent-edit-max-tokens' : 'agent-max-tokens'}
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              MAX TOKENS (256 - 65,536) *
            </label>
            <input
              id={isEdit ? 'agent-edit-max-tokens' : 'agent-max-tokens'}
              type="number"
              min="256"
              max="65536"
              step="256"
              {...register('maxTokens', { valueAsNumber: true })}
              className="w-full bg-black border border-border px-3 py-2 text-foreground tabular-nums focus:outline-none focus:border-accent"
            />
            {errors.maxTokens && (
              <p className="text-[10px] text-negative">{errors.maxTokens.message as string}</p>
            )}
          </div>
        </div>

        {/* Temperature Slider */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <label
              htmlFor={isEdit ? 'agent-edit-temp' : 'agent-temp'}
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              TEMPERATURE SLIDER (0.0 - 2.0)
            </label>
            <span className="text-xs font-bold text-accent tabular-nums bg-accent/10 border border-accent/30 px-2 py-0.5">
              {Number(temperatureValue ?? 0.7).toFixed(2)}
            </span>
          </div>
          <input
            id={isEdit ? 'agent-edit-temp' : 'agent-temp'}
            type="range"
            min="0"
            max="2"
            step="0.05"
            {...register('temperature', { valueAsNumber: true })}
            className="w-full accent-accent bg-border h-1.5 cursor-pointer"
          />
          {errors.temperature && (
            <p className="text-[10px] text-negative">{errors.temperature.message as string}</p>
          )}
        </div>

        {/* Visibility Scope */}
        <div className="space-y-1 pt-3 border-t border-border/60 text-xs">
          <label
            htmlFor={isEdit ? 'agent-edit-visibility' : 'agent-visibility'}
            className="text-[10px] uppercase text-muted-foreground tracking-wider block font-bold"
          >
            CATALOG VISIBILITY SCOPE
          </label>
          <select
            id={isEdit ? 'agent-edit-visibility' : 'agent-visibility'}
            {...register('visibility')}
            className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
          >
            <option value="public">PUBLIC (VISIBLE TO ALL TRADERS IN CHAT CATALOG)</option>
            <option value="private">PRIVATE (INTERNAL QA / ADMIN TESTING ONLY)</option>
          </select>
          <p className="text-[10px] text-muted-foreground">
            Private models remain available to administrators for testing & QA, but are hidden from
            the public chat interface.
          </p>
        </div>

        {/* Feature Switches */}
        <div
          className={`grid grid-cols-1 ${isEdit ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3 pt-3 border-t border-border/60 text-xs`}
        >
          <label className="border border-border bg-black p-3 flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-bold text-foreground">THINKING MODE</div>
              <div className="text-[10px] text-muted-foreground">Chain-of-thought support</div>
            </div>
            <input
              type="checkbox"
              {...register('supportsThinking')}
              className="accent-accent w-4 h-4"
            />
          </label>

          <label className="border border-border bg-black p-3 flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-bold text-foreground">ACTIVE STATUS</div>
              <div className="text-[10px] text-muted-foreground">Available for routing</div>
            </div>
            <input type="checkbox" {...register('isActive')} className="accent-accent w-4 h-4" />
          </label>

          {!isEdit && (
            <label className="border border-border bg-black p-3 flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-bold text-foreground">SET AS DEFAULT</div>
                <div className="text-[10px] text-muted-foreground">Primary fleet model</div>
              </div>
              <input type="checkbox" {...register('isDefault')} className="accent-accent w-4 h-4" />
            </label>
          )}
        </div>
      </div>

      {/* Panel 3: System Prompt & Description */}
      <div className="border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-border/60 pb-3">
          <Sparkles className="w-4 h-4 text-positive" />
          <h2 className="text-xs font-bold text-foreground tracking-wider uppercase">
            SYSTEM PROMPT & DIRECTIVES
          </h2>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={isEdit ? 'agent-edit-prompt' : 'agent-prompt'}
            className="text-[10px] uppercase text-muted-foreground tracking-wider block"
          >
            SYSTEM PROMPT (MONOSPACE INSTRUCTION SET)
          </label>
          <textarea
            id={isEdit ? 'agent-edit-prompt' : 'agent-prompt'}
            rows={6}
            {...register('systemPrompt')}
            placeholder="You are an institutional financial AI specialized in risk management..."
            className="w-full bg-black border border-border p-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent leading-relaxed"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={isEdit ? 'agent-edit-desc' : 'agent-desc'}
            className="text-[10px] uppercase text-muted-foreground tracking-wider block"
          >
            PUBLIC DESCRIPTION
          </label>
          <input
            id={isEdit ? 'agent-edit-desc' : 'agent-desc'}
            type="text"
            {...register('description')}
            placeholder="Short description of this model's capabilities"
            className="w-full bg-black border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-end space-x-4">
        <Link
          href="/agents"
          className="px-5 py-2 text-xs text-muted-foreground hover:text-foreground border border-border bg-black"
        >
          CANCEL
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-accent text-black hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {isPending
            ? isEdit
              ? 'SAVING PARAMETERS...'
              : 'DEPLOYING AGENT...'
            : isEdit
              ? 'SAVE CHANGES'
              : 'DEPLOY MODEL TO FLEET'}
        </button>
      </div>
    </form>
  );
}
