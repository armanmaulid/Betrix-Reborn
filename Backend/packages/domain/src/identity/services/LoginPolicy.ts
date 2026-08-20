export interface LoginDelayDecision {
  delaySeconds: number;
  isCaptchaRequired: boolean;
}

export class LoginPolicy {
  public static readonly CAPTCHA_THRESHOLD = 5;
  public static readonly PROGRESSIVE_DELAY_START = 6;
  public static readonly MAX_DELAY_SECONDS = 30;

  /**
   * Computes required delay and CAPTCHA necessity based on failed attempts in the last 15 mins.
   */
  public static evaluate(recentFailureCount: number): LoginDelayDecision {
    const isCaptchaRequired = recentFailureCount >= LoginPolicy.CAPTCHA_THRESHOLD;

    let delaySeconds = 0;
    if (recentFailureCount >= LoginPolicy.PROGRESSIVE_DELAY_START) {
      // 1s, 2s, 4s, 8s... capped at 30s
      const power = recentFailureCount - LoginPolicy.PROGRESSIVE_DELAY_START;
      delaySeconds = Math.min(Math.pow(2, power), LoginPolicy.MAX_DELAY_SECONDS);
    }

    return {
      delaySeconds,
      isCaptchaRequired
    };
  }

  public static requiresCaptcha(recentFailureCount: number): boolean {
    return recentFailureCount >= LoginPolicy.CAPTCHA_THRESHOLD;
  }

  public static calculateDelayMs(recentFailureCount: number): number {
    const decision = LoginPolicy.evaluate(recentFailureCount);
    return decision.delaySeconds * 1000;
  }
}
