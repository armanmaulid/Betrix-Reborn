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

export interface GooglePayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
}

export interface IGoogleTokenVerifier {
  verifyIdToken(token: string): Promise<GooglePayload>;
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
    private readonly defaultCredits: number = 100
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
        'This Google account\'s email is not verified. Please verify your email with Google and try again.'
      );
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const fingerprint = dto.deviceFingerprint;

    let user = await this.userRepo.findByGoogleId(googleId);
    let isNewUser = false;

    if (!user) {
      // Check if user exists with the same email (ADR-33: Auto-Link)
      user = await this.userRepo.findByEmail(email);

      if (user) {
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
        const existingDevice = await this.deviceRepo.findByFingerprint(fingerprint);
        if (existingDevice) {
          throw new ConflictError('This physical device is already bound to another account.');
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

    // Device binding check
    const existingDevice = await this.deviceRepo.findByFingerprint(fingerprint);
    if (existingDevice && existingDevice.userId !== user.id) {
      throw new ConflictError('This physical device is already associated with another account.');
    }

    if (!existingDevice) {
      await DeviceDomainService.registerDevice(this.deviceRepo, user.id, fingerprint);
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
