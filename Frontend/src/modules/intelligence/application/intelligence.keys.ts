export const intelligenceKeys = {
  all: ['intelligence'] as const,
  agents: () => ['intelligence', 'agents'] as const,
  agentDetail: (agentId: string) => ['intelligence', 'agents', agentId] as const,
  models: () => ['intelligence', 'models'] as const
};
