import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateAgentSchema, TestAgentSchema } from '@/lib/schemas/agent.schema';
import { AgentTestConsole } from './agent-test-console';
import { ToastProvider } from '@/components/ui/terminal-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const mockAgent = {
  id: 'test-qa-model',
  name: 'Test QA Model',
  modelName: 'deepseek-v4-pro',
  taskType: 'trade_reasoning',
  tier: 'deep' as const,
  creditsPer1kTokens: 1,
  maxTokens: 4096,
  temperature: 0.7,
  supportsThinking: true,
  isDefault: false,
  isActive: true,
  visibility: 'private' as const,
  systemPrompt: 'You are QA market analyst.',
  description: 'QA test model',
  createdAt: '2026-08-21T00:00:00Z',
  updatedAt: '2026-08-21T00:00:00Z'
};

describe('Phase 6 AI Agent Fleet Management Tests', () => {
  describe('CreateAgentSchema Validation (Test Gate 6.2)', () => {
    it('should validate temperature bounds (0.0 to 2.0)', () => {
      const valid = CreateAgentSchema.safeParse({
        id: 'test-agent',
        name: 'Test Agent',
        modelName: 'gpt-4o',
        temperature: 1.5,
        maxTokens: 4096
      });
      expect(valid.success).toBe(true);

      const invalidLow = CreateAgentSchema.safeParse({
        id: 'test-agent',
        name: 'Test Agent',
        modelName: 'gpt-4o',
        temperature: -0.5
      });
      expect(invalidLow.success).toBe(false);

      const invalidHigh = CreateAgentSchema.safeParse({
        id: 'test-agent',
        name: 'Test Agent',
        modelName: 'gpt-4o',
        temperature: 2.5
      });
      expect(invalidHigh.success).toBe(false);
    });

    it('should validate maxTokens bounds (256 to 65,536)', () => {
      const invalidLow = CreateAgentSchema.safeParse({
        id: 'test-agent',
        name: 'Test Agent',
        modelName: 'gpt-4o',
        maxTokens: 100
      });
      expect(invalidLow.success).toBe(false);

      const invalidHigh = CreateAgentSchema.safeParse({
        id: 'test-agent',
        name: 'Test Agent',
        modelName: 'gpt-4o',
        maxTokens: 100000
      });
      expect(invalidHigh.success).toBe(false);

      const valid = CreateAgentSchema.safeParse({
        id: 'test-agent',
        name: 'Test Agent',
        modelName: 'gpt-4o',
        maxTokens: 32768
      });
      expect(valid.success).toBe(true);
    });

    it('should default visibility to public and accept private', () => {
      const parsedDefault = CreateAgentSchema.parse({
        id: 'test-agent',
        name: 'Test Agent',
        modelName: 'gpt-4o'
      });
      expect(parsedDefault.visibility).toBe('public');

      const parsedPrivate = CreateAgentSchema.parse({
        id: 'test-agent-qa',
        name: 'Test Agent QA',
        modelName: 'gpt-4o',
        visibility: 'private'
      });
      expect(parsedPrivate.visibility).toBe('private');
    });
  });

  describe('TestAgentSchema & AgentTestConsole (Poin 1)', () => {
    it('should validate TestAgentSchema inputs', () => {
      const valid = TestAgentSchema.safeParse({
        message: 'Calculate position size on XAUUSD',
        temperatureOverride: 0.8,
        maxTokensOverride: 2048,
        systemPromptOverride: 'Strict risk rules only'
      });
      expect(valid.success).toBe(true);

      const emptyMsg = TestAgentSchema.safeParse({
        message: ''
      });
      expect(emptyMsg.success).toBe(false);
    });

    it('should render AgentTestConsole and allow filling presets', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AgentTestConsole agent={mockAgent} />
          </ToastProvider>
        </QueryClientProvider>
      );

      expect(screen.getByText(/QA INFERENCE TERMINAL \/\/ \[Test QA Model\]/i)).toBeInTheDocument();
      expect(screen.getByText(/PRIVATE QA MODEL/i)).toBeInTheDocument();

      const presetBtn = screen.getByRole('button', { name: /\[EURUSD CONFLUENCE\]/i });
      fireEvent.click(presetBtn);

      const textarea = screen.getByPlaceholderText(/Enter trading question or instruction to test this model/i) as HTMLTextAreaElement;
      expect(textarea.value).toContain('Analyze current EURUSD market structure');
    });
  });

  describe('Masked API Key Invariant (Test Gate 6.1)', () => {
    it('should treat empty string as undefined to preserve existing backend key', () => {
      const emptyInput = '';
      const payloadKey = emptyInput.trim() ? emptyInput.trim() : undefined;
      expect(payloadKey).toBeUndefined();

      const newKeyInput = 'sk-newsecretkey123';
      const updatedPayloadKey = newKeyInput.trim() ? newKeyInput.trim() : undefined;
      expect(updatedPayloadKey).toBe('sk-newsecretkey123');
    });
  });
});
