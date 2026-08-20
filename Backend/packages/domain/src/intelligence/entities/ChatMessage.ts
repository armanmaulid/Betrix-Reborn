export interface ChatMessageProps {
  id: string;
  userId: string;
  sessionId: string;
  taskType: string;
  modelUsed: string;
  message: string;
  reply: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  createdAt: Date;
}

export class ChatMessage {
  public readonly id: string;
  public readonly userId: string;
  public readonly sessionId: string;
  public readonly taskType: string;
  public readonly modelUsed: string;
  public readonly message: string;
  public readonly reply: string;
  public readonly latencyMs: number;
  public readonly inputTokens: number;
  public readonly outputTokens: number;
  public readonly createdAt: Date;

  constructor(props: ChatMessageProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.sessionId = props.sessionId;
    this.taskType = props.taskType;
    this.modelUsed = props.modelUsed;
    this.message = props.message;
    this.reply = props.reply;
    this.latencyMs = props.latencyMs;
    this.inputTokens = props.inputTokens;
    this.outputTokens = props.outputTokens;
    this.createdAt = props.createdAt;
  }

  public get totalTokens(): number {
    return this.inputTokens + this.outputTokens;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      taskType: this.taskType,
      modelUsed: this.modelUsed,
      message: this.message,
      reply: this.reply,
      latencyMs: this.latencyMs,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.totalTokens,
      createdAt: this.createdAt.toISOString()
    };
  }
}
