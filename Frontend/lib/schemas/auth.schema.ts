import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  deviceFingerprint: z.string().min(10, 'Device fingerprint required'),
  captchaId: z.string().optional(),
  captchaAnswer: z.string().optional()
});
export type LoginInput = z.infer<typeof LoginSchema>;
