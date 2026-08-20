import { ConflictError, Nullable } from '@betrix/core';
import { Device } from '../entities/Device.js';
import { DeviceFingerprint } from '../value-objects/DeviceFingerprint.js';

export interface IDeviceBindingCheck {
  canBind: boolean;
  existingUserId?: Nullable<string>;
}

export class DeviceDomainService {
  /**
   * Validates if a device fingerprint is available to be bound to a given user.
   * Strict Rule: A device fingerprint cannot belong to more than one unique account.
   */
  public static validateBinding(
    targetUserId: string,
    existingDevice: Nullable<Device>,
    fingerprint: DeviceFingerprint
  ): IDeviceBindingCheck {
    if (!existingDevice) {
      return { canBind: true };
    }

    if (existingDevice.userId === targetUserId) {
      return { canBind: true, existingUserId: targetUserId };
    }

    throw new ConflictError('This device is already bound to another registered account.');
  }

  public static async registerDevice(
    deviceRepo: { findByFingerprint(fp: string): Promise<Nullable<Device>>; save(d: Device): Promise<Device> },
    userId: string,
    fingerprintStr: string
  ): Promise<Device> {
    const existing = await deviceRepo.findByFingerprint(fingerprintStr);
    const fp = new DeviceFingerprint(fingerprintStr);
    DeviceDomainService.validateBinding(userId, existing, fp);

    const newDevice = new Device({
      id: crypto.randomUUID(),
      userId,
      fingerprint: fingerprintStr,
      lastSeenAt: new Date(),
      createdAt: new Date()
    });
    return deviceRepo.save(newDevice);
  }
}
