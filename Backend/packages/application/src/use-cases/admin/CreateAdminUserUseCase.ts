import { randomUUID } from 'node:crypto';
import { randomBytes } from 'node:crypto';
import { ConflictError } from '@betrix/core';
import { IUserRepository, IAdminActionRepository, AdminAction, User } from '@betrix/domain';
import { AuthService } from '../../services/AuthService.js';
import { CreateAdminUserDTO } from '../../schemas/admin.schema.js';

export class CreateAdminUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly adminActionRepo: IAdminActionRepository,
    private readonly authService: AuthService
  ) {}

  /**
   * Create a user directly from the admin panel. If no password is provided,
   * a random one is generated and returned ONCE — never stored in plaintext.
   */
  public async execute(
    adminId: string,
    dto: CreateAdminUserDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ user: User; generatedPassword: string | null }> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('A user with this email already exists.');
    }

    const generatedPassword = dto.password ? null : randomBytes(12).toString('hex');
    const password = dto.password ?? generatedPassword!;
    const passwordHash = await this.authService.hashPassword(password);

    const user = new User({
      id: randomUUID(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      name: dto.name,
      isAdmin: dto.isAdmin ?? false,
      status: 'active',
      tier: dto.tier ?? 'free',
      emailVerified: true, // created by admin — trusted
      credits: dto.credits ?? 100,
      createdAt: new Date()
    });

    const saved = await this.userRepo.save(user);

    const action = new AdminAction({
      id: randomUUID(),
      adminId,
      action: 'CREATE_USER',
      targetType: 'user',
      targetId: saved.id,
      details: { email: saved.email, isAdmin: saved.isAdmin, credits: saved.credits, passwordGenerated: !dto.password },
      ip: context?.ip,
      userAgent: context?.userAgent,
      createdAt: new Date()
    });
    await this.adminActionRepo.save(action);

    return { user: saved, generatedPassword };
  }
}
