'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Shield, Edit2, KeyRound, Trash2, ExternalLink } from 'lucide-react';
import { UserTierBadge } from './user-tier-badge';
import { formatFinancialNumber } from '@/shared/utils';
import { formatDate, getUserStatusBadgeClass } from '@/shared/utils/formatters';
import { useSession } from '@/shared/presentation/hooks/use-session';
import type { User } from '@identity/domain/entities/User';

export interface UserTableProps {
  users: User[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UserTable({
  users,
  isLoading,
  isError,
  onEdit,
  onResetPassword,
  onDelete
}: UserTableProps) {
  const { currentUser } = useSession();

  return (
    <div className="border border-border bg-surface overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-black/80 text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="p-3">TRADER / EMAIL</th>
            <th className="p-3">ROLE</th>
            <th className="p-3">ACCOUNT STATUS</th>
            <th className="p-3">TIER</th>
            <th className="p-3 text-right">CREDITS</th>
            <th className="p-3">VERIFIED</th>
            <th className="p-3">CREATED</th>
            <th className="p-3 text-right">OPERATIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-muted-foreground animate-pulse">
                RETRIEVING TRADER ACCOUNTS...
              </td>
            </tr>
          ) : isError ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-negative">
                ERROR LOADING USERS. PLEASE CHECK API CONNECTION.
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-muted-foreground">
                NO TRADERS FOUND MATCHING CRITERIA.
              </td>
            </tr>
          ) : (
            users.map((user: User) => {
              const isSelf = Boolean(
                currentUser && (currentUser.id === user.id || currentUser.email === user.email)
              );
              const cannotDelete = user.isAdmin || isSelf;

              return (
              <tr key={user.id} className="hover:bg-surface-hover/80 transition-colors font-mono">
                {/* Email / ID */}
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <div>
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <Link href={`/users/${user.id}`} className="hover:text-accent flex items-center gap-1">
                          <span>{user.email}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-accent inline" />
                        </Link>
                        {isSelf && (
                          <span className="px-1.5 py-0.2 text-[9px] border border-accent bg-accent text-black font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        {user.name && <span>{user.name}</span>}
                        <span className="text-muted-foreground/60 select-all">UUID: {user.id}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="p-3">
                  {user.isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold border border-accent bg-accent/10 text-accent uppercase tracking-wider">
                      <Shield className="w-2.5 h-2.5" />
                      ADMIN
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] border border-border bg-black text-muted-foreground uppercase">
                      USER
                    </span>
                  )}
                </td>

                {/* Account Status */}
                <td className="p-3">
                  <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${getUserStatusBadgeClass(user.status)}`}>
                    {user.status}
                  </span>
                </td>

                {/* Subscription Tier */}
                <td className="p-3">
                  <UserTierBadge tier={user.tier} />
                </td>

                {/* Credit Balance */}
                <td className="p-3 text-right font-bold text-foreground tabular-nums">
                  {formatFinancialNumber(user.credits)}
                </td>

                {/* Email Verified */}
                <td className="p-3">
                  {user.emailVerified ? (
                    <span className="text-positive flex items-center gap-1 text-[10px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> YES
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                      <XCircle className="w-3.5 h-3.5 text-negative/60" /> NO
                    </span>
                  )}
                </td>

                {/* Created Date */}
                <td className="p-3 text-[11px] text-muted-foreground tabular-nums">
                  {formatDate(user.createdAt)}
                </td>

                {/* Operations */}
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(user)}
                      title={isSelf ? 'Edit Your Account Parameters' : 'Edit User Profile & Tier'}
                      className="p-1 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onResetPassword(user)}
                      title="Reset User Password"
                      className="p-1 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(user)}
                      disabled={cannotDelete}
                      title={
                        isSelf
                          ? 'Cannot delete your own active account'
                          : user.isAdmin
                          ? 'Cannot delete admin user'
                          : 'Purge Trader Account'
                      }
                      className="p-1 border border-border bg-black hover:border-negative hover:text-negative text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
