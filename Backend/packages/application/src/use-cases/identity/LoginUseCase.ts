import {
  AuthenticationError,
  ForbiddenError,
  PreconditionRequiredError,
  ConflictError
} from '@betrix/core';
import {
  IUserRepository,
  IDeviceRepository,
  ILoginAttemptRepository,
  IActivityLogRepository,
  LoginPolicy,
  DeviceDomainService,
  User,
  Session
} from '@betrix/domain';
import { AuthService } from '../../services/AuthService.js';
import { CaptchaService } from '../../services/CaptchaService.js';
import { LoginDTO } from '../../schemas/auth.schema.js';
import { resolveServerFingerprint } from './resolveDeviceFingerprint.js';

export interface LoginResult {
  user: User;
  session: Session;
  token: string;
}

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly deviceRepo: IDeviceRepository,
    private readonly loginAttemptRepo: ILoginAttemptRepository,
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
    private readonly enforceDeviceBinding: boolean = true,
    private readonly activityLogRepo?: IActivityLogRepository
  ) {}

  public async execute(
    dto: LoginDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<LoginResult> {
    const email = dto.email.toLowerCase().trim();
    // ADR-05: the binding key is derived SERVER-SIDE from request context —
    // never trust the client-supplied string (see resolveServerFingerprint).
    const fingerprint = resolveServerFingerprint(dto.deviceFingerprint, context);

    // 1. Check Anti-Bruteforce Policy & CAPTCHA requirement
    const recentFailures = await this.loginAttemptRepo.countRecentFailures(email, 15);
    const requiresCaptcha = LoginPolicy.requiresCaptcha(recentFailures);

    if (requiresCaptcha) {
      if (!dto.captchaId || !dto.captchaAnswer) {
        const challenge = await this.captchaService.generateChallenge();
        throw new PreconditionRequiredError(
          'CAPTCHA verification required due to recent failed login attempts.',
          {
            captcha: challenge
          }
        );
      }

      const isValidCaptcha = await this.captchaService.verify(dto.captchaId, dto.captchaAnswer);
      if (!isValidCaptcha) {
        await this.loginAttemptRepo.recordFailedLogin(email, context?.ip);
        const newChallenge = await this.captchaService.generateChallenge();
        throw new PreconditionRequiredError('Invalid CAPTCHA answer. Please try again.', {
          captcha: newChallenge
        });
      }
    }

    // 2. Progressive delay if applicable
    const delayMs = LoginPolicy.calculateDelayMs(recentFailures);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // 3. Find User
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      await this.loginAttemptRepo.recordFailedLogin(email, context?.ip);
      throw new AuthenticationError('Invalid email or password.');
    }

    if (user.status !== 'active') {
      throw new ForbiddenError(`Your account is ${user.status}. Please contact support.`);
    }

    // 4. Verify Password
    if (!user.passwordHash) {
      throw new AuthenticationError(
        'This account was created via Google OAuth. Please login with Google.'
      );
    }

    const isMatch = await this.authService.verifyPassword(dto.password, user.passwordHash);
    if (!isMatch) {
      await this.loginAttemptRepo.recordFailedLogin(email, context?.ip);
      const newFailureCount = recentFailures + 1;
      if (LoginPolicy.requiresCaptcha(newFailureCount)) {
        const challenge = await this.captchaService.generateChallenge();
        throw new PreconditionRequiredError(
          'Invalid email or password. CAPTCHA verification now required.',
          {
            captcha: challenge
          }
        );
      }
      throw new AuthenticationError('Invalid email or password.');
    }

    // 5. Enforce 1:1 Device Binding (ADR-05) - Bypassed for Admin or when DEVICE_ENFORCEMENT=false
    if (this.enforceDeviceBinding && !user.isAdmin) {
      const existingDevice = await this.deviceRepo.findByFingerprint(fingerprint);
      if (existingDevice && existingDevice.userId !== user.id) {
        throw new ConflictError('This physical device is already associated with another account.');
      }

      if (!existingDevice) {
        await DeviceDomainService.registerDevice(this.deviceRepo, user.id, fingerprint);
      }
    }

    // 6. Clear failed attempts & create session
    await this.loginAttemptRepo.clearFailedLogins(email);
    const { session, token } = await this.authService.createSession(
      user.id,
      fingerprint,
      context?.ip,
      context?.userAgent
    );

    await this.activityLogRepo?.log(
      user.id,
      'LOGIN',
      { method: 'password' },
      context?.ip,
      context?.userAgent
    );

    return {
      user,
      session,
      token
    };
  }
}
