export interface ChatMessageStreamedEvent {
  userId: string;
  sessionId: string;
  taskType: string;
  model: string;
  userMessage: string;
  aiReply: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  creditsSpent: number;
  createdAt: Date;
}
