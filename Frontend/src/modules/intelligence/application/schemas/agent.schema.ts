import { z } from 'zod';

export const CreateAgentSchema = z.object({
  id: z
    .string()
    .min(2, 'ID must be at least 2 characters')
    .max(100, 'ID cannot exceed 100 characters'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name cannot exceed 255 characters'),
  modelName: z
    .string()
    .min(2, 'Model name must be at least 2 characters')
    .max(255, 'Model name cannot exceed 255 characters'),
  baseUrl: z
    .string()
    .max(500, 'Base URL cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  apiKey: z.string().optional().or(z.literal('')),
  taskType: z.string().default('trade_reasoning'),
  systemPrompt: z.string().optional().or(z.literal('')),
  tier: z.enum(['cheap', 'balanced', 'deep']).default('deep'),
  creditsPer1kTokens: z.coerce.number().int().min(1, 'Must be at least 1 credit').default(1),
  maxTokens: z.coerce
    .number()
    .int()
    .min(256, 'Minimum 256 tokens')
    .max(65536, 'Maximum 65536 tokens')
    .default(8192),
  temperature: z.coerce
    .number()
    .min(0, 'Min temperature is 0')
    .max(2, 'Max temperature is 2')
    .default(0.7),
  supportsThinking: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  visibility: z.enum(['public', 'private']).default('public'),
  description: z.string().optional().or(z.literal(''))
});
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;

export const UpdateAgentSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  modelName: z.string().min(2).max(255).optional(),
  baseUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  apiKey: z.string().optional().nullable().or(z.literal('')),
  taskType: z.string().optional(),
  systemPrompt: z.string().optional().nullable().or(z.literal('')),
  tier: z.enum(['cheap', 'balanced', 'deep']).optional(),
  creditsPer1kTokens: z.coerce.number().int().min(1).optional(),
  maxTokens: z.coerce.number().int().min(256).max(65536).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  supportsThinking: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  description: z.string().optional().nullable().or(z.literal(''))
});
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;

export const TestAgentSchema = z.object({
  message: z.string().min(1, 'Test message is required').max(4000, 'Max 4000 characters'),
  systemPromptOverride: z.string().optional().nullable().or(z.literal('')),
  temperatureOverride: z.coerce.number().min(0).max(2).optional(),
  maxTokensOverride: z.coerce.number().int().min(64).max(65536).optional()
});
export type TestAgentInput = z.infer<typeof TestAgentSchema>;
