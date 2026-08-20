import { generateDeviceFingerprint, ValidationError } from '@betrix/core';

export class DeviceFingerprint {
  private readonly _value: string;

  constructor(rawOrGenerated: string) {
    if (!rawOrGenerated || typeof rawOrGenerated !== 'string') {
      throw new ValidationError('Device fingerprint is required');
    }
    this._value = rawOrGenerated.trim();
  }

  public static fromRequest(ip: string, userAgent: string): DeviceFingerprint {
    const hash = generateDeviceFingerprint(ip, userAgent);
    return new DeviceFingerprint(hash);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: DeviceFingerprint): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
