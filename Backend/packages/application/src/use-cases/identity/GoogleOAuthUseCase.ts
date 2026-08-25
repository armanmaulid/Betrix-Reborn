import { randomUUID } from 'node:crypto';
import { ConflictError, ForbiddenError, ValidationError } from '@betrix/core';
import {
  IUserRepository,
  IDeviceRepository,
  DeviceDomainService,
  User,
  Session
} from '@betrix/domain';
import { AuthService } from '../../services/AuthService.js';
import { GoogleOAuthDTO } from '../../schemas/auth.schema.js';
import { resolveServerFingerprint } from './resolveDeviceFingerprint.js';

export interface GooglePayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
}

export interface IGoogleTokenVerifier {
  verifyIdToken(token: string): Promise<GooglePayload>;
}

/**
 * Thrown when no real Google token verifier is wired in the composition root
 * (no GOOGLE_CLIENT_ID/SECRET). Routes map this to 501 Not Implemented — a
 * plain Error would surface as a misleading 500 INTERNAL_SERVER_ERROR.
 */
export class GoogleVerifierNotConfiguredError extends Error {
  constructor() {
    super('Google OAuth is not configured on this deployment.');
    this.name = 'GoogleVerifierNotConfiguredError';
  }
}

export interface GoogleOAuthResult {
  user: User;
  session: Session;
  token: string;
  isNewUser: boolean;
}

export class GoogleOAuthUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly deviceRepo: IDeviceRepository,
    private readonly authService: AuthService,
    private readonly googleVerifier: IGoogleTokenVerifier,
    private readonly defaultCredits: number = 100,
    private readonly enforceDeviceBinding: boolean = true
  ) {}

  public async execute(
    dto: GoogleOAuthDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<GoogleOAuthResult> {
    const payload = await this.googleVerifier.verifyIdToken(dto.idToken);
    if (!payload || !payload.email) {
      throw new ValidationError('Invalid Google OAuth token.');
    }

    if (!payload.email_verified) {
      throw new ForbiddenError(
        "This Google account's email is not verified. Please verify your email with Google and try again."
      );
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    // ADR-05: server-derived binding key (see resolveServerFingerprint).
    const fingerprint = resolveServerFingerprint(dto.deviceFingerprint, context);

    let user = await this.userRepo.findByGoogleId(googleId);
    let isNewUser = false;

    if (!user) {
      // Check if user exists with the same email (ADR-33: Auto-Link)
      user = await this.userRepo.findByEmail(email);

      if (user) {
        if (!user.emailVerified) {
          throw new ConflictError(
            "An unverified account already exists with this email. " +
            "Please verify the existing account or contact support before using Google Sign-In."
          );
        }
        // Auto-link Google ID and mark email verified
        const updatedUser = new User({
          ...user,
          googleId,
          emailVerified: true,
          verifiedAt: user.verifiedAt || new Date()
        });
        user = await this.userRepo.update(updatedUser);
      } else {
        // Register new user via Google
        isNewUser = true;

        // Check device uniqueness
        if (this.enforceDeviceBinding) {
          const existingDevice = await this.deviceRepo.findByFingerprint(fingerprint);
          if (existingDevice) {
            throw new ConflictError('This physical device is already bound to another account.');
          }
        }

        const newId = randomUUID();
        const createdUser = new User({
          id: newId,
          email,
          name: payload.name || email.split('@')[0]!,
          isAdmin: false,
          status: 'active',
          emailVerified: true,
          credits: this.defaultCredits,
          googleId,
          verifiedAt: new Date(),
          createdAt: new Date()
        });

        user = await this.userRepo.save(createdUser);
      }
    }

    if (user.status !== 'active') {
      throw new ForbiddenError(`Your account is ${user.status}. Please contact support.`);
    }

    // Device binding check - Bypassed for Admin or when DEVICE_ENFORCEMENT=false
    if (this.enforceDeviceBinding && !user.isAdmin) {
      const existingDevice = await this.deviceRepo.findByFingerprint(fingerprint);
      if (existingDevice && existingDevice.userId !== user.id) {
        throw new ConflictError('This physical device is already associated with another account.');
      }

      if (!existingDevice) {
        await DeviceDomainService.registerDevice(this.deviceRepo, user.id, fingerprint);
      }
    }

    const { session, token } = await this.authService.createSession(
      user.id,
      fingerprint,
      context?.ip,
      context?.userAgent
    );

    return {
      user,
      session,
      token,
      isNewUser
    };
  }
}
