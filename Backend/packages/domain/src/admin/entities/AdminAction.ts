import { Nullable } from '@betrix/core';

export interface AdminActionProps {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: unknown;
  ip?: Nullable<string>;
  userAgent?: Nullable<string>;
  createdAt: Date;
}

export class AdminAction {
  public readonly id: string;
  public readonly adminId: string;
  public readonly action: string;
  public readonly targetType: string;
  public readonly targetId: string;
  public readonly details: unknown;
  public readonly ip: Nullable<string>;
  public readonly userAgent: Nullable<string>;
  public readonly createdAt: Date;

  constructor(props: AdminActionProps) {
    this.id = props.id;
    this.adminId = props.adminId;
    this.action = props.action;
    this.targetType = props.targetType;
    this.targetId = props.targetId;
    this.details = props.details ?? null;
    this.ip = props.ip ?? null;
    this.userAgent = props.userAgent ?? null;
    this.createdAt = props.createdAt;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      adminId: this.adminId,
      action: this.action,
      targetType: this.targetType,
      targetId: this.targetId,
      details: this.details,
      ip: this.ip,
      userAgent: this.userAgent,
      createdAt: this.createdAt.toISOString()
    };
  }
}
