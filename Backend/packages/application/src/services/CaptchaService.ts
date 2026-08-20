import { randomUUID } from 'node:crypto';
import { ICaptchaStore } from '@betrix/domain';

export interface CaptchaChallenge {
  id: string;
  question: string;
  expiresInSeconds: number;
}

export class CaptchaService {
  constructor(private readonly captchaStore: ICaptchaStore) {}

  public async generateChallenge(ttlSeconds: number = 300): Promise<CaptchaChallenge> {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const operator = Math.random() > 0.5 ? '+' : '-';

    const num1 = Math.max(a, b);
    const num2 = Math.min(a, b);
    const answer = operator === '+' ? num1 + num2 : num1 - num2;

    const id = randomUUID();
    const question = `What is ${num1} ${operator} ${num2}?`;

    await this.captchaStore.save(id, String(answer), ttlSeconds);

    return {
      id,
      question,
      expiresInSeconds: ttlSeconds
    };
  }

  public async verify(challengeId: string, answer: string): Promise<boolean> {
    const stored = await this.captchaStore.getAndDelete(challengeId);
    if (!stored) return false;
    return stored.trim() === answer.trim();
  }
}
