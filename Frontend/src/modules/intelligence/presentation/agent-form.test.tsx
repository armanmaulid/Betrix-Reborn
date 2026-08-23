import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AgentForm } from './agent-form';
import type { AgentDetail } from '@/modules/intelligence/domain/entities/AiAgent';

describe('AgentForm Component', () => {
  const mockAgent: AgentDetail = {
    id: 'gpt-4o-market-reasoner',
    name: 'GPT-4o Market Intelligence',
    modelName: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    taskType: 'trade_reasoning',
    tier: 'deep',
    creditsPer1kTokens: 2,
    maxTokens: 8192,
    temperature: 0.7,
    supportsThinking: true,
    isDefault: true,
    isActive: true,
    visibility: 'public',
    systemPrompt: 'You are a market expert.',
    description: 'Advanced market intelligence agent',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  it('should render create form with empty default values and editable ID slug', () => {
    render(<AgentForm onSubmit={vi.fn()} />);

    expect(screen.queryByText('NEW MODEL CONFIGURATION')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/UNIQUE IDENTIFIER SLUG \(IMMUTABLE\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DEPLOY MODEL TO FLEET/i })).toBeInTheDocument();
  });

  it('should render edit form with prefilled values and locked ID slug', () => {
    render(<AgentForm initialData={mockAgent} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/UNIQUE IDENTIFIER SLUG \(LOCKED\)/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('gpt-4o-market-reasoner')).toBeDisabled();
    expect(screen.getByDisplayValue('GPT-4o Market Intelligence')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SAVE CHANGES/i })).toBeInTheDocument();
  });

  it('should trigger onSubmit with valid form data in edit mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AgentForm initialData={mockAgent} onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /SAVE CHANGES/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'GPT-4o Market Intelligence',
          modelName: 'gpt-4o',
          tier: 'deep'
        })
      );
    });
  });
});
