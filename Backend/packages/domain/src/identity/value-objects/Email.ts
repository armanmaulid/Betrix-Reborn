import { ValidationError, normalizeEmail } from '@betrix/core';

export class Email {
  private readonly _value: string;

  constructor(rawEmail: string) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new ValidationError('Email address is required');
    }

    const normalized = normalizeEmail(rawEmail);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new ValidationError(`Invalid email format: ${rawEmail}`);
    }

    this._value = normalized;
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: Email): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
