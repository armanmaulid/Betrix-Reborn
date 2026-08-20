import { Nullable } from '@betrix/core';

export interface MessageProps {
  id: string;
  fromUserId: string;
  toUserId: string;
  subject: string;
  body: string;
  threadId: string;
  replyToMessageId?: Nullable<string>;
  readAt?: Nullable<Date>;
  deletedAt?: Nullable<Date>;
  createdAt: Date;
}

export class Message {
  public readonly id: string;
  public readonly fromUserId: string;
  public readonly toUserId: string;
  public readonly subject: string;
  public readonly body: string;
  public readonly threadId: string;
  public readonly replyToMessageId: Nullable<string>;
  public readonly readAt: Nullable<Date>;
  public readonly deletedAt: Nullable<Date>;
  public readonly createdAt: Date;

  constructor(props: MessageProps) {
    this.id = props.id;
    this.fromUserId = props.fromUserId;
    this.toUserId = props.toUserId;
    this.subject = props.subject;
    this.body = props.body;
    this.threadId = props.threadId;
    this.replyToMessageId = props.replyToMessageId ?? null;
    this.readAt = props.readAt ?? null;
    this.deletedAt = props.deletedAt ?? null;
    this.createdAt = props.createdAt;
  }

  public isRead(): boolean {
    return this.readAt !== null;
  }

  public withMarkedAsRead(): Message {
    return new Message({
      ...this,
      readAt: new Date()
    });
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      fromUserId: this.fromUserId,
      toUserId: this.toUserId,
      subject: this.subject,
      body: this.body,
      threadId: this.threadId,
      replyToMessageId: this.replyToMessageId,
      readAt: this.readAt?.toISOString() || null,
      deletedAt: this.deletedAt?.toISOString() || null,
      createdAt: this.createdAt.toISOString()
    };
  }
}

export interface NotificationPreferenceProps {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationPreference {
  public readonly userId: string;
  public readonly emailNotifications: boolean;
  public readonly pushNotifications: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: NotificationPreferenceProps) {
    this.userId = props.userId;
    this.emailNotifications = props.emailNotifications;
    this.pushNotifications = props.pushNotifications;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
