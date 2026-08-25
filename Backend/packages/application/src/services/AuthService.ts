import { randomUUID } from 'node:crypto';
import { Nullable, hashPassword, verifyPassword, generateSecureToken } from '@betrix/core';
import {
  ISessionRepository,
  IDeviceRepository,
  IUserRepository,
  Session,
  User
} from '@betrix/domain';

export interface CreateSessionResult {
  session: Session;
  token: string;
}

export class AuthService {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly deviceRepo: IDeviceRepository,
    private readonly userRepo: IUserRepository,
    private readonly sessionTtlDays: number = 7
  ) {}

  public async hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return verifyPassword(password, hash);
  }

  public async createSession(
    userId: string,
    deviceFingerprint: string,
    ip?: string,
    userAgent?: string
  ): Promise<CreateSessionResult> {
    const token = generateSecureToken(48);
    const expiresAt = new Date(Date.now() + this.sessionTtlDays * 24 * 60 * 60 * 1000);

    const session = new Session({
      id: randomUUID(),
      userId,
      token,
      deviceFingerprint,
      ip,
      userAgent,
      expiresAt,
      createdAt: new Date()
    });

    await this.sessionRepo.save(session);
    await this.deviceRepo.updateLastSeen(deviceFingerprint);

    return {
      session,
      token
    };
  }

  public async validateSession(token: string): Promise<Nullable<{ user: User; session: Session }>> {
    const session = await this.sessionRepo.findByToken(token);
    if (!session || session.isExpired()) {
      return null;
    }

    const user = await this.userRepo.findById(session.userId);
    if (!user || user.status !== 'active') {
      return null;
    }

    return { user, session };
  }

  public async revokeSession(token: string): Promise<boolean> {
    return this.sessionRepo.delete(token);
  }

  public async revokeAllUserSessions(userId: string): Promise<number> {
    return this.sessionRepo.deleteByUserId(userId);
  }

  /**
   * Sign a JWT token with the given payload.
   * The signing function is provided by the composition root (Fastify JWT plugin).
   * This centralizes JWT payload construction — no duplication across auth routes.
   */
  public signJwt(
    user: { id: string; email: string; isAdmin: boolean },
    session: { token: string },
    signFn: (payload: any) => string
  ): string {
    return signFn({
      userId: user.id,
      sessionId: session.token,
      email: user.email,
      isAdmin: user.isAdmin
    });
  }
}
