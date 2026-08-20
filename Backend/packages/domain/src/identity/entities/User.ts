import { Nullable, Optional } from '@betrix/core';

export interface UserProps {
  id: string;
  email: string;
  passwordHash?: Nullable<string>;
  name?: Nullable<string>;
  isAdmin: boolean;
  status: 'active' | 'suspended' | 'banned';
  emailVerified: boolean;
  credits: number;
  googleId?: Nullable<string>;
  phone?: Nullable<string>;
  address?: Nullable<string>;
  birthdate?: Nullable<string>;
  gender?: Nullable<string>;
  bio?: Nullable<string>;
  verifiedAt?: Nullable<Date>;
  lastActive?: Nullable<Date>;
  createdAt: Date;
}

export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly passwordHash: Nullable<string>;
  public readonly name: Nullable<string>;
  public readonly isAdmin: boolean;
  public readonly status: 'active' | 'suspended' | 'banned';
  public readonly emailVerified: boolean;
  public readonly credits: number;
  public readonly googleId: Nullable<string>;
  public readonly phone: Nullable<string>;
  public readonly address: Nullable<string>;
  public readonly birthdate: Nullable<string>;
  public readonly gender: Nullable<string>;
  public readonly bio: Nullable<string>;
  public readonly verifiedAt: Nullable<Date>;
  public readonly lastActive: Nullable<Date>;
  public readonly createdAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash ?? null;
    this.name = props.name ?? null;
    this.isAdmin = props.isAdmin;
    this.status = props.status;
    this.emailVerified = props.emailVerified;
    this.credits = props.credits;
    this.googleId = props.googleId ?? null;
    this.phone = props.phone ?? null;
    this.address = props.address ?? null;
    this.birthdate = props.birthdate ?? null;
    this.gender = props.gender ?? null;
    this.bio = props.bio ?? null;
    this.verifiedAt = props.verifiedAt ?? null;
    this.lastActive = props.lastActive ?? null;
    this.createdAt = props.createdAt;
  }

  public isActive(): boolean {
    return this.status === 'active';
  }

  public hasSufficientCredits(amount: number): boolean {
    return this.credits >= amount;
  }

  public withDeductedCredits(amount: number): User {
    return new User({
      ...this,
      credits: Math.max(0, this.credits - amount)
    });
  }

  public withAddedCredits(amount: number): User {
    return new User({
      ...this,
      credits: this.credits + amount
    });
  }

  public withEmailVerified(): User {
    return new User({
      ...this,
      emailVerified: true,
      verifiedAt: new Date()
    });
  }

  public withUpdatedProfile(props: Partial<Pick<UserProps, 'name' | 'phone' | 'address' | 'birthdate' | 'gender' | 'bio'>>): User {
    return new User({
      ...this,
      ...props
    });
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      isAdmin: this.isAdmin,
      status: this.status,
      emailVerified: this.emailVerified,
      credits: this.credits,
      googleId: this.googleId,
      phone: this.phone,
      address: this.address,
      birthdate: this.birthdate,
      gender: this.gender,
      bio: this.bio,
      verifiedAt: this.verifiedAt?.toISOString() || null,
      lastActive: this.lastActive?.toISOString() || null,
      createdAt: this.createdAt.toISOString()
    };
  }
}
