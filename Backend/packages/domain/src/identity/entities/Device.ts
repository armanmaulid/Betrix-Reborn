export interface DeviceProps {
  id: string;
  userId: string;
  fingerprint: string;
  lastSeenAt: Date;
  createdAt: Date;
}

export class Device {
  public readonly id: string;
  public readonly userId: string;
  public readonly fingerprint: string;
  public readonly lastSeenAt: Date;
  public readonly createdAt: Date;

  constructor(props: DeviceProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.fingerprint = props.fingerprint;
    this.lastSeenAt = props.lastSeenAt;
    this.createdAt = props.createdAt;
  }

  public withUpdatedLastSeen(): Device {
    return new Device({
      ...this,
      lastSeenAt: new Date()
    });
  }

  public toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      fingerprint: this.fingerprint,
      lastSeenAt: this.lastSeenAt,
      createdAt: this.createdAt
    };
  }
}
