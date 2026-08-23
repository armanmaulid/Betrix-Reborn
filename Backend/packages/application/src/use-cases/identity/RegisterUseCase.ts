import { randomUUID } from 'node:crypto';
import { ConflictError, generateSecureToken } from '@betrix/core';
import {
  IUserRepository,
  IDeviceRepository,
  IVerificationRepository,
  IActivityLogRepository,
  DeviceDomainService,
  User,
  Session
} from '@betrix/domain';
import { AuthService } from '../../services/AuthService.js';
import { RegisterDTO } from '../../schemas/auth.schema.js';

export interface IEmailDispatcher {
  sendVerificationEmail(to: string, link: string, name?: string): Promise<boolean>;
}

export interface RegisterResult {
  user: User;
  session: Session;
  token: string;
  verificationToken?: string;
}

export class RegisterUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly deviceRepo: IDeviceRepository,
    private readonly verificationRepo: IVerificationRepository,
    private readonly authService: AuthService,
    private readonly emailService?: IEmailDispatcher,
    private readonly defaultCredits: number = 100,
    private readonly isDevMode: boolean = false,
    private readonly enforceDeviceBinding: boolean = true,
    private readonly activityLogRepo?: IActivityLogRepository
  ) {}

  public async execute(
    dto: RegisterDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<RegisterResult> {
    const email = dto.email.toLowerCase().trim();
    const fingerprint = dto.deviceFingerprint;

    // 1. Check Device Uniqueness (ADR-05)
    if (this.enforceDeviceBinding) {
      const existingDevice = await this.deviceRepo.findByFingerprint(fingerprint);
      if (existingDevice) {
        throw new ConflictError('This physical device is already bound to an existing account.');
      }
    }

    // 2. Check Email Uniqueness
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists.');
    }

    // 3. Hash Password
    const passwordHash = await this.authService.hashPassword(dto.password);

    // 4. Create User Entity
    const userId = randomUUID();
    const newUser = new User({
      id: userId,
      email,
      passwordHash,
      name: dto.name || email.split('@')[0]!,
      isAdmin: false,
      status: 'active',
      emailVerified: false,
      credits: this.defaultCredits,
      phone: dto.phone,
      address: dto.address,
      birthdate: dto.birthdate,
      gender: dto.gender,
      bio: dto.bio,
      createdAt: new Date()
    });

    const savedUser = await this.userRepo.save(newUser);

    // 5. Register Device (1:1 Binding)
    if (this.enforceDeviceBinding) {
      await DeviceDomainService.registerDevice(this.deviceRepo, userId, fingerprint);
    }

    // 6. Generate Verification Token
    const vToken = generateSecureToken(32);
    await this.verificationRepo.create(userId, vToken, 'email_verification', 60 * 24); // 24 hours

    // 7. Send Verification Email
    if (this.emailService) {
      const verificationLink = `https://betrix.io/verify-email?token=${vToken}`;
      await this.emailService.sendVerificationEmail(email, verificationLink, savedUser.name || undefined).catch((err) => {
        console.warn(`[RegisterUseCase] Failed to send verification email to ${email}:`, err.message);
      });
    }

    // 8. Create Active Session
    const { session, token } = await this.authService.createSession(
      userId,
      fingerprint,
      context?.ip,
      context?.userAgent
    );

    await this.activityLogRepo?.log(userId, 'REGISTER', { email }, context?.ip, context?.userAgent);

    return {
      user: savedUser,
      session,
      token,
      verificationToken: this.isDevMode ? vToken : undefined
    };
  }
}
