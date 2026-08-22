/**
 * Core Domain & Infrastructure Error Hierarchy
 */
export class FrontendDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'DOMAIN_ERROR',
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
    public readonly correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends FrontendDomainError {
  constructor(message: string, details?: unknown, correlationId?: string) {
    super(message, 'VALIDATION_ERROR', 400, details, correlationId);
  }
}

export class AuthenticationError extends FrontendDomainError {
  constructor(message: string = 'Authentication required', correlationId?: string) {
    super(message, 'AUTHENTICATION_REQUIRED', 401, undefined, correlationId);
  }
}

export class ForbiddenError extends FrontendDomainError {
  constructor(message: string = 'Access denied', correlationId?: string) {
    super(message, 'FORBIDDEN', 403, undefined, correlationId);
  }
}

export class NotFoundError extends FrontendDomainError {
  constructor(message: string = 'Resource not found', correlationId?: string) {
    super(message, 'NOT_FOUND', 404, undefined, correlationId);
  }
}

export class ConflictError extends FrontendDomainError {
  constructor(message: string, correlationId?: string) {
    super(message, 'CONFLICT', 409, undefined, correlationId);
  }
}

export class CaptchaRequiredError extends FrontendDomainError {
  constructor(
    message: string = 'CAPTCHA challenge required',
    public readonly captchaId?: string,
    public readonly captchaSvg?: string,
    correlationId?: string
  ) {
    super(message, 'CAPTCHA_REQUIRED', 428, { captchaId, captchaSvg }, correlationId);
  }
}

export class RateLimitExceededError extends FrontendDomainError {
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly delayMs?: number,
    correlationId?: string
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { delayMs }, correlationId);
  }
}

export class NetworkError extends FrontendDomainError {
  constructor(message: string = 'Network communication failure', correlationId?: string) {
    super(message, 'NETWORK_ERROR', 0, undefined, correlationId);
  }
}

export class TimeoutError extends FrontendDomainError {
  constructor(message: string = 'Request timed out', correlationId?: string) {
    super(message, 'TIMEOUT_ERROR', 408, undefined, correlationId);
  }
}

export class InternalServerError extends FrontendDomainError {
  constructor(message: string = 'Internal server error', statusCode: number = 500, correlationId?: string) {
    super(message, 'INTERNAL_SERVER_ERROR', statusCode, undefined, correlationId);
  }
}
