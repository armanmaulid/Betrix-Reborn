'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Brain,
  Zap,
  RotateCcw,
  Copy,
  Check,
  Clock,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useTestAgentMutation } from '@/modules/intelligence/application/queries/use-agents';
import { TestAgentSchema } from '@/modules/intelligence/application/schemas/agent.schema';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { formatFinancialNumber } from '@/shared/utils';
import { useCopyFeedback } from '@/shared/presentation/hooks/use-copy-feedback';
import type { AiAgent, AgentDetail } from '@intelligence/domain/entities/AiAgent';
import type { AgentTestResult } from '@intelligence/domain/repositories/IAgentRepository';

interface AgentTestConsoleProps {
  agent: AiAgent | AgentDetail;
}

const PRESET_PROMPTS = [
  {
    label: 'EURUSD CONFLUENCE',
    prompt: 'Analyze current EURUSD market structure on H1 timeframe. Identify key liquidity levels, trend alignment, and high-probability trade zones.'
  },
  {
    label: 'RISK MANAGEMENT',
    prompt: 'Calculate 1% risk position size for a $50,000 institutional account trading XAUUSD (Gold) with an entry at 2650.00 and stop loss at 2642.50.'
  },
  {
    label: 'LATENCY & HEALTH PING',
    prompt: 'Confirm model connectivity, inference latency, and persona directives in one crisp sentence.'
  }
];

export function AgentTestConsole({ agent }: AgentTestConsoleProps) {
  const { success, error } = useToast();
  const { isCopied, copy } = useCopyFeedback();
  const testMutation = useTestAgentMutation();

  const [message, setMessage] = useState('');
  const [systemPromptOverride, setSystemPromptOverride] = useState(agent.systemPrompt || '');
  const [temperatureOverride, setTemperatureOverride] = useState<number>(agent.temperature);
  const [maxTokensOverride, setMaxTokensOverride] = useState<number>(agent.maxTokens);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showThinking, setShowThinking] = useState(true);

  const [testResult, setTestResult] = useState<AgentTestResult | null>(null);

  const handleRunTest = async () => {
    if (!message.trim()) {
      error('PROMPT REQUIRED', 'Please enter a test prompt message before running inference.');
      return;
    }

    try {
      const validatedPayload = TestAgentSchema.parse({
        message: message.trim(),
        systemPromptOverride: systemPromptOverride.trim() || undefined,
        temperatureOverride,
        maxTokensOverride
      });

      const result = await testMutation.mutateAsync({
        id: agent.id,
        payload: validatedPayload
      });
      setTestResult(result);
      success('INFERENCE COMPLETE', `Model responded in ${result.usage.latencyMs}ms (${result.usage.totalTokens} tokens).`);
    } catch (err: any) {
      error('TEST INFERENCE FAILED', err.message || 'Unable to complete test inference.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunTest();
    }
  };

  const handleCopyReply = () => {
    if (!testResult?.reply) return;
    copy(testResult.reply, 'reply', {
      toastTitle: 'COPIED',
      toastMessage: 'Agent response copied to clipboard.'
    });
  };

  const handleResetDefaults = () => {
    setSystemPromptOverride(agent.systemPrompt || '');
    setTemperatureOverride(agent.temperature);
    setMaxTokensOverride(agent.maxTokens);
    setMessage('');
    setTestResult(null);
  };

  return (
    <div className="space-y-5 font-mono">
      {/* Console Header Banner */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-accent" />
            <h2 className="text-xs font-bold text-accent tracking-wider uppercase">
              QA INFERENCE TERMINAL // [{agent.name}]
            </h2>
            <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${
              agent.visibility === 'private'
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-info/40 bg-info/10 text-info'
            }`}>
              {agent.visibility === 'private' ? 'PRIVATE QA MODEL' : 'PUBLIC FLEET MODEL'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Execute 1-shot completions directly against <span className="text-foreground font-bold">{agent.modelName}</span>. Zero credit cost, ephemeral testing.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground text-xs transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET PROMPT</span>
        </button>
      </div>

      {/* Advanced Hyperparameters & Directives Toggle */}
      <div className="border border-border bg-surface/60">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-3 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground font-bold uppercase transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-info" />
            <span>TEST PARAMETER OVERRIDES & DIRECTIVES</span>
          </div>
          {showAdvanced ? (
            <ChevronDown className="w-3.5 h-3.5 text-accent" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-4 border-t border-border space-y-4 bg-black/40 text-xs">
            {/* System Prompt Override */}
            <div className="space-y-1">
              <label htmlFor="override-prompt" className="text-[10px] uppercase text-muted-foreground tracking-wider block font-bold">
                SYSTEM PROMPT INSTRUCTION OVERRIDE
              </label>
              <textarea
                id="override-prompt"
                rows={3}
                value={systemPromptOverride}
                onChange={(e) => setSystemPromptOverride(e.target.value)}
                placeholder="Custom instruction override..."
                className="w-full bg-black border border-border p-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-accent leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Temperature Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="override-temp" className="text-[10px] uppercase text-muted-foreground tracking-wider block font-bold">
                    TEMPERATURE ({temperatureOverride.toFixed(2)})
                  </label>
                </div>
                <input
                  id="override-temp"
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={temperatureOverride}
                  onChange={(e) => setTemperatureOverride(parseFloat(e.target.value))}
                  className="w-full accent-accent bg-border h-1.5 cursor-pointer"
                />
              </div>

              {/* Max Tokens */}
              <div className="space-y-1.5">
                <label htmlFor="override-tokens" className="text-[10px] uppercase text-muted-foreground tracking-wider block font-bold">
                  MAX OUTPUT TOKENS
                </label>
                <input
                  id="override-tokens"
                  type="number"
                  min={64}
                  max={65536}
                  value={maxTokensOverride}
                  onChange={(e) => setMaxTokensOverride(parseInt(e.target.value, 10) || 4096)}
                  className="w-full bg-black border border-border px-3 py-1.5 text-foreground focus:outline-none focus:border-accent text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Quick Fill Buttons */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
          FAST TEST PRESETS:
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROMPTS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setMessage(preset.prompt)}
              className="px-2.5 py-1 text-[10px] border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground uppercase transition-colors"
            >
              [{preset.label}]
            </button>
          ))}
        </div>
      </div>

      {/* Input Prompt Box */}
      <div className="border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="test-prompt-input" className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold block">
            TEST USER PROMPT *
          </label>
          <span className="text-[10px] text-muted-foreground">
            Press <kbd className="bg-black border border-border px-1 py-0.5 text-foreground">Ctrl+Enter</kbd> to run
          </span>
        </div>

        <textarea
          id="test-prompt-input"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter trading question or instruction to test this model..."
          className="w-full bg-black border border-border p-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent leading-relaxed resize-y"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="text-[10px] text-muted-foreground">
            CHARACTER COUNT: <span className="text-foreground font-bold">{message.length}</span>
          </div>

          <button
            type="button"
            onClick={handleRunTest}
            disabled={testMutation.isPending || !message.trim()}
            className="flex items-center gap-2 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testMutation.isPending ? (
              <>
                <Zap className="w-3.5 h-3.5 animate-bounce" />
                <span>INFERENCING...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RUN INFERENCE TEST</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Console Results */}
      {testMutation.isPending && (
        <div className="border border-border bg-black p-8 text-center space-y-2 animate-pulse">
          <div className="text-accent text-xs font-bold tracking-widest uppercase">
            COMMUNICATING WITH UPSTREAM AI GATEWAY...
          </div>
          <div className="text-[10px] text-muted-foreground">
            Model: {agent.modelName} // Awaiting completion tokens
          </div>
        </div>
      )}

      {testResult && (
        <div className="border border-accent/60 bg-surface p-5 space-y-4 shadow-[0_0_15px_rgba(255,128,0,0.1)]">
          {/* Telemetry Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80 text-[10px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 font-bold border uppercase border-positive/40 bg-positive/10 text-positive">
                200 OK // INFERENCE SUCCESS
              </span>
              <span className="px-2 py-0.5 font-bold border uppercase border-info/40 bg-info/10 text-info flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {testResult.usage.latencyMs} MS
              </span>
              <span className="px-2 py-0.5 font-bold border uppercase border-accent/40 bg-accent/10 text-accent">
                TOTAL: {formatFinancialNumber(testResult.usage.totalTokens)} TOKENS
              </span>
              <span className="text-muted-foreground">
                (IN: {testResult.usage.inputTokens} | OUT: {testResult.usage.outputTokens})
              </span>
            </div>

            <button
              onClick={handleCopyReply}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors"
            >
              {isCopied('reply') ? (
                <>
                  <Check className="w-3 h-3 text-positive" />
                  <span className="text-positive">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>COPY OUTPUT</span>
                </>
              )}
            </button>
          </div>

          {/* Thinking Accordion (if present) */}
          {testResult.thinking && (
            <div className="border border-border/60 bg-black/60">
              <button
                type="button"
                onClick={() => setShowThinking(!showThinking)}
                className="w-full p-2.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground"
              >
                <div className="flex items-center gap-1.5 text-accent">
                  <Brain className="w-3.5 h-3.5" />
                  <span>CHAIN-OF-THOUGHT REASONING TRACE</span>
                </div>
                {showThinking ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>

              {showThinking && (
                <div className="p-3 border-t border-border/40 text-[11px] text-muted-foreground/90 font-mono whitespace-pre-wrap leading-relaxed bg-black/40">
                  {testResult.thinking}
                </div>
              )}
            </div>
          )}

          {/* Model Final Reply */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">
              AGENT RESPONSE OUTPUT
            </div>
            <div className="border border-border bg-black p-4 text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed select-text">
              {testResult.reply}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
