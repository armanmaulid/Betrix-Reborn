import { Nullable } from '@betrix/core';

export interface SessionProps {
  id: string;
  userId: string;
  token: string;
  deviceFingerprint: string;
  ip?: Nullable<string>;
  userAgent?: Nullable<string>;
  expiresAt: Date;
  createdAt: Date;
}

export class Session {
  public readonly id: string;
  public readonly userId: string;
  public readonly token: string;
  public readonly deviceFingerprint: string;
  public readonly ip: Nullable<string>;
  public readonly userAgent: Nullable<string>;
  public readonly expiresAt: Date;
  public readonly createdAt: Date;

  constructor(props: SessionProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.token = props.token;
    this.deviceFingerprint = props.deviceFingerprint;
    this.ip = props.ip ?? null;
    this.userAgent = props.userAgent ?? null;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
  }

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      deviceFingerprint: this.deviceFingerprint,
      ip: this.ip,
      userAgent: this.userAgent,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt
    };
  }
}
