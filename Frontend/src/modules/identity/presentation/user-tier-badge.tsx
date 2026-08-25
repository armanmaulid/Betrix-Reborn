'use client';

import React from 'react';
import { Crown, Sparkles, Zap, Shield, Star } from 'lucide-react';
import { UserTier, type UserTierLevel } from '@/modules/identity/domain/value-objects/UserTier';

interface UserTierBadgeProps {
  tier?: UserTierLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const TIER_ICONS: Record<string, React.ElementType> = {
  free: Shield,
  starter: Zap,
  pro: Star,
  premium: Sparkles,
  vip: Crown
};

export function UserTierBadge({ tier = 'free', size = 'sm', showIcon = true }: UserTierBadgeProps) {
  const normalizedTier = (tier || 'free').toLowerCase() as UserTierLevel;
  const config = UserTier.CONFIG[normalizedTier] || UserTier.CONFIG.free;
  const Icon = TIER_ICONS[normalizedTier] || Shield;

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 tracking-wider gap-1',
    md: 'text-[10px] px-2 py-0.5 tracking-wider gap-1.5',
    lg: 'text-xs px-2.5 py-1 tracking-widest gap-1.5'
  }[size];

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5'
  }[size];

  return (
    <span
      className={`inline-flex items-center border font-mono uppercase select-none transition-colors ${config.badgeClass} ${sizeClasses}`}
      title={`Tier: ${config.label}`}
    >
      {showIcon && <Icon className={`${iconSizes} shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
}
