export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name?: string | null;
  createdAt: Date;
}

export interface SessionCreatedEvent {
  sessionId: string;
  userId: string;
  deviceFingerprint: string;
  createdAt: Date;
}
