'use client';

import React from 'react';
import { Crown, Sparkles, Zap, Shield, Star } from 'lucide-react';
import type { UserTier } from '@/lib/types';

interface UserTierBadgeProps {
  tier?: UserTier | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const TIER_CONFIG: Record<
  string,
  {
    label: string;
    classes: string;
    icon: React.ElementType;
  }
> = {
  free: {
    label: 'FREE',
    classes: 'border-muted-foreground/30 bg-surface/60 text-muted-foreground',
    icon: Shield
  },
  starter: {
    label: 'STARTER',
    classes: 'border-info/40 bg-info/10 text-info',
    icon: Zap
  },
  pro: {
    label: 'PRO',
    classes: 'border-accent/40 bg-accent/10 text-accent font-bold',
    icon: Star
  },
  premium: {
    label: 'PREMIUM',
    classes: 'border-purple-500/40 bg-purple-500/10 text-purple-400 font-bold',
    icon: Sparkles
  },
  vip: {
    label: 'VIP',
    classes: 'border-positive/40 bg-positive/10 text-positive font-bold shadow-[0_0_8px_rgba(0,255,102,0.15)]',
    icon: Crown
  }
};

export function UserTierBadge({
  tier = 'free',
  size = 'sm',
  showIcon = true
}: UserTierBadgeProps) {
  const normalizedTier = (tier || 'free').toLowerCase();
  const config = TIER_CONFIG[normalizedTier] || TIER_CONFIG.free;
  const Icon = config.icon;

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
      className={`inline-flex items-center border font-mono uppercase select-none transition-colors ${config.classes} ${sizeClasses}`}
      title={`Tier: ${config.label}`}
    >
      {showIcon && <Icon className={`${iconSizes} shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
}
