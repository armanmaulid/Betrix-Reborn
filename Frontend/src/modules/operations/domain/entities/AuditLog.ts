export interface AuditLogProps {
  id: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string | Date;
}

export class AuditLog {
  public readonly id: string;
  public readonly userId: string | null;
  public readonly action: string;
  public readonly resource: string;
  public readonly resourceId: string | null;
  public readonly details: Record<string, unknown> | null;
  public readonly ipAddress: string | null;
  public readonly userAgent: string | null;
  public readonly createdAt: Date;

  constructor(props: AuditLogProps) {
    this.id = props.id;
    this.userId = props.userId ?? null;
    this.action = props.action.toUpperCase();
    this.resource = props.resource;
    this.resourceId = props.resourceId ?? null;
    this.details = props.details ?? null;
    this.ipAddress = props.ipAddress ?? null;
    this.userAgent = props.userAgent ?? null;
    this.createdAt = typeof props.createdAt === 'string' ? new Date(props.createdAt) : props.createdAt;
  }
}
