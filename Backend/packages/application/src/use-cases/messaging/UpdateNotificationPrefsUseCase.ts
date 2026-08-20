import { IMessageRepository, NotificationPreference } from '@betrix/domain';
import { UpdateNotificationPrefsDTO } from '../../schemas/messaging.schema.js';

export class UpdateNotificationPrefsUseCase {
  constructor(private readonly messageRepo: IMessageRepository) {}

  public async execute(
    userId: string,
    dto: UpdateNotificationPrefsDTO
  ): Promise<NotificationPreference> {
    const pref = new NotificationPreference({
      userId,
      emailNotifications: dto.emailNotifications,
      pushNotifications: dto.pushNotifications,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return this.messageRepo.saveNotificationPreference(pref);
  }
}
