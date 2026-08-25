import { eq } from 'drizzle-orm';
import { IDeviceRepository, Device, Nullable } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { devices } from '../drizzle/schema.js';

export class DrizzleDeviceRepository implements IDeviceRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof devices.$inferSelect): Device {
    return new Device({
      id: row.id,
      userId: row.userId,
      fingerprint: row.fingerprint,
      lastSeenAt: row.lastSeenAt,
      createdAt: row.createdAt
    });
  }

  async findByFingerprint(fingerprint: string): Promise<Nullable<Device>> {
    const result = await this.db
      .select()
      .from(devices)
      .where(eq(devices.fingerprint, fingerprint))
      .limit(1);
    return result[0] ? this.mapToDomain(result[0]) : null;
  }

  async findByUserId(userId: string): Promise<Device[]> {
    const rows = await this.db.select().from(devices).where(eq(devices.userId, userId));
    return rows.map((r) => this.mapToDomain(r));
  }

  async save(device: Device): Promise<Device> {
    const inserted = await this.db
      .insert(devices)
      .values({
        id: device.id || undefined,
        userId: device.userId,
        fingerprint: device.fingerprint,
        lastSeenAt: device.lastSeenAt,
        createdAt: device.createdAt
      })
      .onConflictDoUpdate({
        target: devices.fingerprint,
        // Deliberately do NOT set userId here. On a genuine fingerprint
        // collision this row already belongs to whichever account
        // registered it first; this upsert only refreshes lastSeenAt so
        // repeat logins from the true owner keep the row current. The
        // caller (DeviceDomainService.registerDevice) is responsible for
        // comparing the returned row's userId against the userId it
        // intended to register and treating a mismatch as a conflict.
        set: {
          lastSeenAt: new Date()
        }
      })
      .returning();

    return this.mapToDomain(inserted[0]!);
  }

  async updateLastSeen(fingerprint: string): Promise<boolean> {
    const updated = await this.db
      .update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.fingerprint, fingerprint))
      .returning();
    return updated.length > 0;
  }

  async deleteByFingerprint(fingerprint: string): Promise<boolean> {
    const deleted = await this.db
      .delete(devices)
      .where(eq(devices.fingerprint, fingerprint))
      .returning();
    return deleted.length > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const deleted = await this.db.delete(devices).where(eq(devices.userId, userId)).returning();
    return deleted.length;
  }
}
