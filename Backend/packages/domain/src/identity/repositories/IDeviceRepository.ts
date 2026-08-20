import { Nullable } from '@betrix/core';
import { Device } from '../entities/Device.js';

export interface IDeviceRepository {
  findByFingerprint(fingerprint: string): Promise<Nullable<Device>>;
  findByUserId(userId: string): Promise<Device[]>;
  save(device: Device): Promise<Device>;
  updateLastSeen(fingerprint: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
}
