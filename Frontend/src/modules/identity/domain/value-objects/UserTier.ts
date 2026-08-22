export type UserTierLevel = 'free' | 'starter' | 'pro' | 'premium' | 'vip';

export class UserTier {
  public static readonly CONFIG: Record<
    UserTierLevel,
    { label: string; maxDailyChats: number; badgeClass: string }
  > = {
    free: {
      label: 'FREE',
      maxDailyChats: 50,
      badgeClass: 'border-muted-foreground/30 bg-surface/60 text-muted-foreground'
    },
    starter: {
      label: 'STARTER',
      maxDailyChats: 200,
      badgeClass: 'border-info/40 bg-info/10 text-info'
    },
    pro: {
      label: 'PRO',
      maxDailyChats: 1000,
      badgeClass: 'border-accent/40 bg-accent/10 text-accent font-bold'
    },
    premium: {
      label: 'PREMIUM',
      maxDailyChats: 5000,
      badgeClass: 'border-accent-dim/50 bg-accent-dim/10 text-accent font-bold'
    },
    vip: {
      label: 'VIP',
      maxDailyChats: 20000,
      badgeClass: 'border-positive/40 bg-positive/10 text-positive font-bold'
    }
  };

  public static normalize(raw?: string | null): UserTierLevel {
    const key = (raw || 'free').toLowerCase() as UserTierLevel;
    return UserTier.CONFIG[key] ? key : 'free';
  }

  public static getBadgeClass(tier: UserTierLevel): string {
    return UserTier.CONFIG[tier]?.badgeClass ?? UserTier.CONFIG.free.badgeClass;
  }

  public static getLabel(tier: UserTierLevel): string {
    return UserTier.CONFIG[tier]?.label ?? 'FREE';
  }
}
