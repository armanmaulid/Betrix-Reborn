/**
 * Application Configuration Interface
 *
 * This interface defines the configuration values that the application layer
 * needs. Use cases receive this via constructor injection — they NEVER import
 * from @betrix/config directly. The composition root (container.plugin.ts)
 * is the only place that reads env.* and constructs this object.
 */
export interface AppConfig {
  /** Default AI model identifier for fallback when no agent is specified */
  defaultModel: string;

  /** Default credits assigned to newly registered users */
  defaultUserCredits: number;

  /** Whether email verification is required for new registrations */
  requireEmailVerification: boolean;

  /** Node environment (development, test, production) */
  nodeEnv: string;

  /** Session TTL in days */
  sessionTtlDays: number;
}

/**
 * Creates an AppConfig from environment values.
 * Called only once in the composition root (container.plugin.ts).
 */
export function createAppConfig(env: {
  DEFAULT_MODEL?: string;
  DEFAULT_USER_CREDITS?: number;
  REQUIRE_EMAIL_VERIFICATION?: string;
  NODE_ENV?: string;
  SESSION_TTL_DAYS?: number;
}): AppConfig {
  return {
    defaultModel: env.DEFAULT_MODEL || 'dahono/deepseek-v4-pro-0813',
    defaultUserCredits: env.DEFAULT_USER_CREDITS ?? 100,
    requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION === 'true',
    nodeEnv: env.NODE_ENV || 'development',
    sessionTtlDays: env.SESSION_TTL_DAYS ?? 7
  };
}
