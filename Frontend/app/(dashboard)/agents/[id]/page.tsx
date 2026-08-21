'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Bot, Sparkles, Sliders, Star, Key, Terminal } from 'lucide-react';
import { UpdateAgentSchema, type UpdateAgentInput } from '@/lib/schemas/agent.schema';
import {
  useAgentDetailQuery,
  useUpdateAgentMutation,
  useSetDefaultAgentMutation
} from '@/lib/queries/use-agents';
import { AgentTestConsole } from '@/components/agents/agent-test-console';
import { useToast } from '@/components/ui/terminal-toast';

export default function EditAgentPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'config' | 'test'>('config');

  const { agent, isLoading, isError } = useAgentDetailQuery(id);
  const updateMutation = useUpdateAgentMutation();
  const setDefaultMutation = useSetDefaultAgentMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<UpdateAgentInput>({
    resolver: zodResolver(UpdateAgentSchema)
  });

  const temperatureValue = watch('temperature', agent?.temperature ?? 0.7);

  useEffect(() => {
    if (agent) {
      reset({
        name: agent.name,
        modelName: agent.modelName,
        baseUrl: agent.baseUrl || '',
        apiKey: '', // Left empty by default to preserve masked key
        taskType: agent.taskType,
        tier: agent.tier,
        creditsPer1kTokens: agent.creditsPer1kTokens,
        maxTokens: agent.maxTokens,
        temperature: agent.temperature,
        supportsThinking: agent.supportsThinking,
        isDefault: agent.isDefault,
        isActive: agent.isActive,
        visibility: agent.visibility || 'public',
        systemPrompt: agent.systemPrompt || '',
        description: agent.description || ''
      });
    }
  }, [agent, reset]);

  if (isLoading) {
    return (
      <div className="p-12 text-center font-mono text-xs text-muted-foreground animate-pulse">
        LOADING AI AGENT SPECIFICATION...
      </div>
    );
  }

  if (isError || !agent) {
    return (
      <div className="space-y-4 font-mono">
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO FLEET CATALOG</span>
        </Link>
        <div className="border border-negative bg-surface p-8 text-center text-negative text-xs">
          AI AGENT MODEL NOT FOUND: {id}
        </div>
      </div>
    );
  }

  const onSubmit = async (data: UpdateAgentInput) => {
    try {
      const payload: UpdateAgentInput = {
        name: data.name,
        modelName: data.modelName,
        baseUrl: data.baseUrl?.trim() || undefined,
        // Masked key invariant: if empty string, don't overwrite
        apiKey: data.apiKey?.trim() ? data.apiKey.trim() : undefined,
        taskType: data.taskType,
        tier: data.tier,
        creditsPer1kTokens: data.creditsPer1kTokens,
        maxTokens: data.maxTokens,
        temperature: data.temperature,
        supportsThinking: data.supportsThinking,
        isDefault: data.isDefault,
        isActive: data.isActive,
        systemPrompt: data.systemPrompt?.trim() || undefined,
        description: data.description?.trim() || undefined
      };

      await updateMutation.mutateAsync({ id: agent.id, data: payload });
      success('PARAMETERS UPDATED', `AI Model ${agent.name} updated successfully.`);
      router.push('/agents');
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Unable to update agent parameters.');
    }
  };

  const handleSetDefault = async () => {
    try {
      await setDefaultMutation.mutateAsync(agent.id);
      success('DEFAULT MODEL UPDATED', `${agent.name} is now the primary fleet model.`);
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Unable to set default.');
    }
  };

  return (
    <div className="space-y-6 font-mono max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO FLEET CATALOG</span>
        </Link>

        <div className="flex items-center gap-3">
          {!agent.isDefault && (
            <button
              type="button"
              onClick={handleSetDefault}
              disabled={setDefaultMutation.isPending}
              className="flex items-center gap-1.5 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-1 text-xs font-bold transition-colors"
            >
              <Star className="w-3.5 h-3.5" />
              <span>MAKE SYSTEM DEFAULT</span>
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            ID: <strong className="text-foreground select-all">{agent.id}</strong>
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-border text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 font-bold tracking-wider uppercase border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-accent text-accent bg-surface/80'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          [1] SPECIFICATION & HYPERPARAMETERS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('test')}
          className={`px-4 py-2 font-bold tracking-wider uppercase border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'test'
              ? 'border-accent text-accent bg-surface/80'
              : 'border-transparent text-muted-foreground hover:text-foreground'
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Panel 1: Primary Identity & Model Spec */}
        <div className="border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-border/60 pb-3">
            <Bot className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-bold text-foreground tracking-wider uppercase">
              MODEL IDENTIFICATION & INFERENCE ENDPOINT
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Read-only Identifier */}
            <div className="space-y-1">
              <label htmlFor="agent-edit-id" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                UNIQUE IDENTIFIER SLUG (LOCKED)
              </label>
              <input
                id="agent-edit-id"
                type="text"
                value={agent.id}
                disabled
                className="w-full bg-black/60 border border-border/50 px-3 py-2 text-muted-foreground cursor-not-allowed select-all"
              />
            </div>

            {/* Display Name */}
            <div className="space-y-1">
              <label htmlFor="agent-edit-name" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                AGENT DISPLAY NAME *
              </label>
              <input
                id="agent-edit-name"
                type="text"
                {...register('name')}
                className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
              />
              {errors.name && <p className="text-[10px] text-negative">{errors.name.message}</p>}
            </div>

            {/* LLM Model Name */}
            <div className="space-y-1">
              <label htmlFor="agent-edit-model" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                UPSTREAM LLM MODEL IDENTIFIER *
              </label>
              <input
                id="agent-edit-model"
                type="text"
                {...register('modelName')}
                className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
              />
              {errors.modelName && <p className="text-[10px] text-negative">{errors.modelName.message}</p>}
            </div>

            {/* Task Type */}
            <div className="space-y-1">
              <label htmlFor="agent-edit-task" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                TASK CLASSIFICATION
              </label>
              <input
                id="agent-edit-task"
                type="text"
                {...register('taskType')}
                className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            {/* Base URL */}
            <div className="space-y-1">
              <label htmlFor="agent-edit-url" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                CUSTOM BASE URL (OPTIONAL)
              </label>
              <input
                id="agent-edit-url"
                type="text"
                {...register('baseUrl')}
                className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            {/* API Key with Masked Key Invariant */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="agent-edit-key" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                  API SECRET KEY
                </label>
                <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <Key className="w-2.5 h-2.5" /> Leave empty to keep existing key
                </span>
              </div>
              <input
                id="agent-edit-key"
                type="password"
                {...register('apiKey')}
                placeholder="••••••••••••••••"
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
              <label htmlFor="agent-edit-tier" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                PRICING TIER
              </label>
              <select
                id="agent-edit-tier"
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
              <label htmlFor="agent-edit-rate" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                CREDITS PER 1K TOKENS (≥ 1) *
              </label>
              <input
                id="agent-edit-rate"
                type="number"
                min="1"
                step="1"
                {...register('creditsPer1kTokens', { valueAsNumber: true })}
                className="w-full bg-black border border-border px-3 py-2 text-foreground tabular-nums focus:outline-none focus:border-accent"
              />
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-1">
              <label htmlFor="agent-edit-max-tokens" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                MAX TOKENS (256 - 65,536) *
              </label>
              <input
                id="agent-edit-max-tokens"
                type="number"
                min="256"
                max="65536"
                step="256"
                {...register('maxTokens', { valueAsNumber: true })}
                className="w-full bg-black border border-border px-3 py-2 text-foreground tabular-nums focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <label htmlFor="agent-edit-temp" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                TEMPERATURE SLIDER (0.0 - 2.0)
              </label>
              <span className="text-xs font-bold text-accent tabular-nums bg-accent/10 border border-accent/30 px-2 py-0.5">
                {Number(temperatureValue ?? 0.7).toFixed(2)}
              </span>
            </div>
            <input
              id="agent-edit-temp"
              type="range"
              min="0"
              max="2"
              step="0.05"
              {...register('temperature', { valueAsNumber: true })}
              className="w-full accent-accent bg-border h-1.5 cursor-pointer"
            />
          </div>

          {/* Visibility Scope */}
          <div className="space-y-1 pt-3 border-t border-border/60 text-xs">
            <label htmlFor="agent-edit-visibility" className="text-[10px] uppercase text-muted-foreground tracking-wider block font-bold">
              CATALOG VISIBILITY SCOPE
            </label>
            <select
              id="agent-edit-visibility"
              {...register('visibility')}
              className="w-full bg-black border border-border px-3 py-2 text-foreground focus:outline-none focus:border-accent"
            >
              <option value="public">PUBLIC (VISIBLE TO ALL TRADERS IN CHAT CATALOG)</option>
              <option value="private">PRIVATE (INTERNAL QA / ADMIN TESTING ONLY)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">
              Private models remain available to administrators for testing & QA, but are hidden from the public chat interface.
            </p>
          </div>

          {/* Feature Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60 text-xs">
            <label className="border border-border bg-black p-3 flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-bold text-foreground">THINKING MODE</div>
                <div className="text-[10px] text-muted-foreground">Chain-of-thought support</div>
              </div>
              <input type="checkbox" {...register('supportsThinking')} className="accent-accent w-4 h-4" />
            </label>

            <label className="border border-border bg-black p-3 flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-bold text-foreground">ACTIVE STATUS</div>
                <div className="text-[10px] text-muted-foreground">Available for routing</div>
              </div>
              <input type="checkbox" {...register('isActive')} className="accent-accent w-4 h-4" />
            </label>
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
            <label htmlFor="agent-edit-prompt" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              SYSTEM PROMPT (MONOSPACE INSTRUCTION SET)
            </label>
            <textarea
              id="agent-edit-prompt"
              rows={6}
              {...register('systemPrompt')}
              className="w-full bg-black border border-border p-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="agent-edit-desc" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              PUBLIC DESCRIPTION
            </label>
            <input
              id="agent-edit-desc"
              type="text"
              {...register('description')}
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
            disabled={updateMutation.isPending}
            className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-accent text-black hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {updateMutation.isPending ? 'SAVING PARAMETERS...' : 'SAVE CHANGES'}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
