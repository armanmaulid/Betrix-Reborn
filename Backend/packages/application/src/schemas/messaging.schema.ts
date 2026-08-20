import { Type, Static } from '@sinclair/typebox';

// Send In-App Message DTO
export const SendUserMessageSchema = Type.Object({
  toUserId: Type.String({ minLength: 1 }),
  subject: Type.String({ minLength: 1, maxLength: 255 }),
  body: Type.String({ minLength: 1, maxLength: 5000 }),
  replyToMessageId: Type.Optional(Type.String())
});
export type SendUserMessageDTO = Static<typeof SendUserMessageSchema>;

// Thread ID Route Parameter
export const ThreadIdParamSchema = Type.Object({
  threadId: Type.String({ minLength: 1 })
});
export type ThreadIdParamDTO = Static<typeof ThreadIdParamSchema>;

// Update Notification Preferences DTO
export const UpdateNotificationPrefsSchema = Type.Object({
  emailNotifications: Type.Boolean(),
  pushNotifications: Type.Boolean()
});
export type UpdateNotificationPrefsDTO = Static<typeof UpdateNotificationPrefsSchema>;
