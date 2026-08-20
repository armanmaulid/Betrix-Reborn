import { generateRandomToken, ValidationError } from '@betrix/core';

export class SessionToken {
  private readonly _value: string;

  constructor(token?: string) {
    if (token) {
      if (typeof token !== 'string' || token.trim().length === 0) {
        throw new ValidationError('Invalid session token');
      }
      this._value = token.trim();
    } else {
      this._value = generateRandomToken(32);
    }
  }

  public get value(): string {
    return this._value;
  }

  public toString(): string {
    return this._value;
  }
}
