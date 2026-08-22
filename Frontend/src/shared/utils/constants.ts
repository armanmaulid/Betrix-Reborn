/**
 * Application Constants for Betrix Admin Terminal
 */

export const AUDIT_ACTIONS = [
  { label: 'ALL ACTIONS', value: '' },
  { label: 'CREATE_USER', value: 'CREATE_USER' },
  { label: 'UPDATE_USER', value: 'UPDATE_USER' },
  { label: 'DELETE_USER', value: 'DELETE_USER' },
  { label: 'RESET_USER_PASSWORD', value: 'RESET_USER_PASSWORD' },
  { label: 'VIEW_USER_CHAT', value: 'VIEW_USER_CHAT' },
  { label: 'CREATE_VOUCHER', value: 'CREATE_VOUCHER' },
  { label: 'REVOKE_VOUCHER', value: 'REVOKE_VOUCHER' },
  { label: 'BATCH_REVOKE_VOUCHERS', value: 'BATCH_REVOKE_VOUCHERS' },
  { label: 'CREATE_AGENT', value: 'CREATE_AGENT' },
  { label: 'UPDATE_AGENT', value: 'UPDATE_AGENT' },
  { label: 'DELETE_AGENT', value: 'DELETE_AGENT' },
  { label: 'SET_DEFAULT_AGENT', value: 'SET_DEFAULT_AGENT' },
  { label: 'BROADCAST_MESSAGE', value: 'BROADCAST_MESSAGE' },
  { label: 'SYSTEM_CLEANUP', value: 'SYSTEM_CLEANUP' }
] as const;

export const USER_TIERS = ['free', 'starter', 'pro', 'premium', 'vip'] as const;

export const USER_STATUSES = ['active', 'suspended', 'banned'] as const;
