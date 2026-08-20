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

    // Authoritative check: deviceRepo.save() below performs an atomic
    // upsert at the database level (see DrizzleDeviceRepository.save) and
    // is the sole source of truth for who actually owns this fingerprint
    // after a concurrent race. It returns the row as it exists in the
    // database post-write, which reflects the actual winner even if this
    // call was not the winner.
    const saved = await deviceRepo.save(newDevice);

    // If another concurrent request won the race, the row returned by
    // the atomic upsert belongs to a different user than the one this
    // call is registering. Surface that as the same ConflictError the
    // pre-check would have thrown had it seen the winner first, instead
    // of silently returning a Device that misrepresents its owner.
    if (saved.userId !== userId) {
      throw new ConflictError('This device is already bound to another registered account.');
    }

    return saved;
  }
}
