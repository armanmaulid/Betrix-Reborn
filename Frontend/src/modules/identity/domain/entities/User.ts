import { UserTier, type UserTierLevel } from '../value-objects/UserTier';

export type UserStatus = 'active' | 'suspended' | 'banned';

export interface UserProps {
  id: string;
  email: string;
  name?: string | null;
  status: UserStatus;
  tier?: string | null;
  isAdmin: boolean;
  credits: number;
  emailVerified: boolean;
  phone?: string | null;
  address?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  bio?: string | null;
  lastActive?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

/** Flat admin user interface for presentation layer */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'suspended' | 'banned';
  tier?: import('../value-objects/UserTier').UserTierLevel;
  isAdmin: boolean;
  credits: number;
  emailVerified: boolean;
  phone?: string | null;
  address?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  bio?: string | null;
  lastActive?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface UserDevice {
  id: string;
  userId: string;
  fingerprint: string;
  trusted: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceFingerprint: string;
  ip: string;
  userAgent: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserUsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCreditsSpent: number;
}

export interface AdminUserDetail {
  user: AdminUser;
  devices: UserDevice[];
  sessions: UserSession[];
  recentActivity?: unknown[];
  usageSummary?: UserUsageSummary;
}

export interface AdminChatMessage {
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
  totalTokens?: number;
  createdAt: string;
}

export interface AdminChatHistoryQuery {
  page?: number;
  limit?: number;
  sessionId?: string;
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'suspended' | 'banned';
  tier?: import('../value-objects/UserTier').UserTierLevel;
  isAdmin?: boolean;
}

export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly name: string | null;
  public readonly status: UserStatus;
  public readonly tier: UserTierLevel;
  public readonly isAdmin: boolean;
  public readonly credits: number;
  public readonly emailVerified: boolean;
  public readonly phone: string | null;
  public readonly address: string | null;
  public readonly birthdate: string | null;
  public readonly gender: string | null;
  public readonly bio: string | null;
  public readonly lastActive: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date | null;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name ?? null;
    this.status = props.status;
    this.tier = UserTier.normalize(props.tier);
    this.isAdmin = props.isAdmin;
    this.credits = Math.max(0, props.credits || 0);
    this.emailVerified = props.emailVerified;
    this.phone = props.phone ?? null;
    this.address = props.address ?? null;
    this.birthdate = props.birthdate ?? null;
    this.gender = props.gender ?? null;
    this.bio = props.bio ?? null;
    this.lastActive = props.lastActive ?? null;
    this.createdAt =
      typeof props.createdAt === 'string' ? new Date(props.createdAt) : props.createdAt;
    this.updatedAt = props.updatedAt
      ? typeof props.updatedAt === 'string'
        ? new Date(props.updatedAt)
        : props.updatedAt
      : null;
  }

  public isActive(): boolean {
    return this.status === 'active';
  }

  public isSuspended(): boolean {
    return this.status === 'suspended';
  }

  public isBanned(): boolean {
    return this.status === 'banned';
  }

  public hasSufficientCredits(required: number): boolean {
    return this.credits >= required;
  }

  public getDisplayName(): string {
    return this.name?.trim() || this.email.split('@')[0] || 'User';
  }
}
