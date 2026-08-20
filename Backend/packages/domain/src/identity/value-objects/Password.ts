import { ValidationError } from '@betrix/core';

export class Password {
  private readonly _plaintext: string;

  constructor(plaintext: string) {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new ValidationError('Password is required');
    }

    if (plaintext.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    this._plaintext = plaintext;
  }

  public get plaintext(): string {
    return this._plaintext;
  }
}
