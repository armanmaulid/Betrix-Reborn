import { randomUUID } from 'node:crypto';
import { IDeviceRepository, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class RemoveUserDeviceUseCase {
  constructor(
    private readonly deviceRepo: IDeviceRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    targetUserId: string,
    deviceId: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean }> {
    const devices = await this.deviceRepo.findByUserId(targetUserId);
    const device = devices.find((d) => d.id === deviceId);

    if (!device) {
      throw new Error('Device not found for this user.');
    }

    // Delete by fingerprint since that's the unique constraint
    await this.deviceRepo.deleteByFingerprint(device.fingerprint);

    if (this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: randomUUID(),
          adminId,
          action: 'REMOVE_USER_DEVICE',
          targetType: 'user',
          targetId: targetUserId,
          details: {
            deviceId,
            fingerprint: device.fingerprint,
            lastSeenAt: device.lastSeenAt
          },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return { success: true };
  }
}
