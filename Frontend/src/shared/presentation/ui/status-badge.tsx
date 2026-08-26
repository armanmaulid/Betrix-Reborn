import React from 'react';
import { Badge, type BadgeTone } from './badge';

/**
 * UI-layer home for status→colour semantics (style-audit decision D3):
 * domain entities expose plain status strings; presentation decides colour.
 * Replaces the former entity/formatters getStatusBadgeClass() class-string
 * builders. Unknown statuses degrade gracefully to the neutral tone.
 */
const STATUS_TONES: Record<string, BadgeTone> = {
  // Healthy / operational
  available: 'positive',
  active: 'positive',
  running: 'positive',
  verified: 'positive',
  // Transitional / attention
  suspended: 'accent-soft',
  paused: 'accent-soft',
  pending: 'warning',
  // Terminal states
  expired: 'negative',
  revoked: 'negative',
  stopped: 'negative',
  error: 'negative',
  // Consumed
  redeemed: 'neutral'
};

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge tone={STATUS_TONES[status.toLowerCase()] ?? 'neutral'} className={className}>
      {status}
    </Badge>
  );
}
