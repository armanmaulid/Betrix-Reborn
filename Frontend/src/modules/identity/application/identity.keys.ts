export const identityKeys = {
  all: ['identity'] as const,
  users: (params?: Record<string, unknown>) => ['identity', 'users', params ?? {}] as const,
  userDetail: (userId: string) => ['identity', 'users', userId] as const,
  userSessions: (userId: string) => ['identity', 'users', userId, 'sessions'] as const,
  userChatHistory: (userId: string, params?: Record<string, unknown>) =>
    ['identity', 'users', userId, 'chat-history', params ?? {}] as const,
  currentCredits: () => ['identity', 'current-credits'] as const
};
