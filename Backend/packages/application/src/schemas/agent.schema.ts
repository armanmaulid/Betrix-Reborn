import { Type, Static } from '@sinclair/typebox';

export const CreateAgentSchema = Type.Object({
  id: Type.String({ minLength: 2, maxLength: 100 }),
  name: Type.String({ minLength: 2, maxLength: 255 }),
  modelName: Type.String({ minLength: 2, maxLength: 255 }),
  baseUrl: Type.Optional(Type.String({ maxLength: 500 })),
  apiKey: Type.Optional(Type.String()),
  taskType: Type.Optional(Type.String({ default: 'trade_reasoning' })),
  systemPrompt: Type.Optional(Type.String()),
  tier: Type.Optional(
    Type.Union([Type.Literal('cheap'), Type.Literal('balanced'), Type.Literal('deep')], {
      default: 'deep'
    })
  ),
  creditsPer1kTokens: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  maxTokens: Type.Optional(Type.Integer({ minimum: 256, maximum: 65536, default: 8192 })),
  temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2, default: 0.7 })),
  supportsThinking: Type.Optional(Type.Boolean({ default: true })),
  isDefault: Type.Optional(Type.Boolean({ default: false })),
  isActive: Type.Optional(Type.Boolean({ default: true })),
  visibility: Type.Optional(
    Type.Union([Type.Literal('public'), Type.Literal('private')], { default: 'public' })
  ),
  description: Type.Optional(Type.String())
});

export const UpdateAgentSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 2, maxLength: 255 })),
  modelName: Type.Optional(Type.String({ minLength: 2, maxLength: 255 })),
  baseUrl: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  apiKey: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  taskType: Type.Optional(Type.String()),
  systemPrompt: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  tier: Type.Optional(
    Type.Union([Type.Literal('cheap'), Type.Literal('balanced'), Type.Literal('deep')])
  ),
  creditsPer1kTokens: Type.Optional(Type.Integer({ minimum: 1 })),
  maxTokens: Type.Optional(Type.Integer({ minimum: 256, maximum: 65536 })),
  temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
  supportsThinking: Type.Optional(Type.Boolean()),
  isDefault: Type.Optional(Type.Boolean()),
  isActive: Type.Optional(Type.Boolean()),
  visibility: Type.Optional(Type.Union([Type.Literal('public'), Type.Literal('private')])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});

export const AgentIdParamSchema = Type.Object({
  id: Type.String({ minLength: 1 })
});

export const TestAgentSchema = Type.Object({
  message: Type.String({ minLength: 1, maxLength: 4000 }),
  systemPromptOverride: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  temperatureOverride: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
  maxTokensOverride: Type.Optional(Type.Integer({ minimum: 64, maximum: 65536 }))
});

export type CreateAgentDto = Static<typeof CreateAgentSchema>;
export type UpdateAgentDto = Static<typeof UpdateAgentSchema>;
export type TestAgentDto = Static<typeof TestAgentSchema>;
