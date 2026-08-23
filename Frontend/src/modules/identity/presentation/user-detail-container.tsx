'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User as UserIcon,
  Shield,
  Smartphone,
  Key,
  Zap,
  CheckCircle2,
  XCircle,
  Edit2,
  KeyRound,
  Trash2,
  Calendar,
  Globe,
  HardDrive,
  MessageSquare
} from 'lucide-react';
import { useUserDetailQuery, useDeleteUserMutation, useRevokeSessionMutation, useRevokeAllSessionsMutation, useRemoveDeviceMutation } from '@/modules/identity/application/queries/use-users';
import { UpdateUserDialog } from './update-user-dialog';
import { ResetPasswordDialog } from './reset-password-dialog';
import { UserChatHistory } from './user-chat-history';
import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { UserTierBadge } from './user-tier-badge';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { formatFinancialNumber } from '@/shared/utils';
import { formatDateTime, getUserStatusBadgeClass } from '@/shared/utils/formatters';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';

export interface UserDetailContainerProps {
  userId: string;
}

export function UserDetailContainer({ userId }: UserDetailContainerProps) {
  const router = useRouter();
  const { success, error } = useToast();

  const { data: detail, isLoading, isError, error: detailError, refetch } = useUserDetailQuery(userId);
  const deleteMutation = useDeleteUserMutation();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRevokeAllDialogOpen, setIsRevokeAllDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'chat'>('telemetry');

  const revokeSessionMutation = useRevokeSessionMutation();
  const revokeAllSessionsMutation = useRevokeAllSessionsMutation();
  const removeDeviceMutation = useRemoveDeviceMutation();

  usePageTitle(detail?.user?.name ? `USER // ${detail.user.name}` : detail?.user?.email ? `USER // ${detail.user.email}` : `USER // ${userId}`);

  if (isLoading) {
    return (
      <div className="space-y-6 font-mono animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>USER REGISTRY</span>
            </div>
            <span className="text-muted-foreground/40">/</span>
            <div className="h-4 bg-surface border border-border w-48"></div>
          </div>
        </div>
        <div className="border border-border bg-surface p-6 space-y-4">
          <div className="h-6 bg-border w-1/3"></div>
          <div className="h-4 bg-border/60 w-1/2"></div>
        </div>
      </div>
    );
  }

  if (isError || !detail || !detail.user) {
    return (
      <div className="space-y-4 font-mono">
        <Link
          href="/users"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO USER REGISTRY</span>
        </Link>
        <div className="border border-negative bg-surface p-8 text-center space-y-3">
          <div className="text-sm font-bold text-negative uppercase">TRADER ACCOUNT NOT FOUND</div>
          <p className="text-xs text-muted-foreground">
            {detailError instanceof Error ? detailError.message : `No account discovered matching ID "${userId}".`}
          </p>
        </div>
      </div>
    );
  }

  const { user, devices = [], sessions = [], recentActivity = [], usageSummary } = detail;

  const handleDeleteConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(user.id);
      success('ACCOUNT PURGED', `User ${user.email} was permanently deleted from the database.`);
      router.push('/users');
    } catch (err: any) {
      error('PURGE FAILED', err.message || 'Unable to delete trader account.');
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/users"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>USER REGISTRY</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-xs font-bold text-accent uppercase select-all">{user.email}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsEditDialogOpen(true)}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>EDIT PROFILE & TIER</span>
          </button>
          <button
            onClick={() => setIsResetDialogOpen(true)}
            className="flex items-center gap-1.5 border border-border bg-black hover:border-accent hover:text-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>RESET PASSWORD</span>
          </button>
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={user.isAdmin}
            title={user.isAdmin ? 'Cannot delete admin account' : 'Purge user'}
            className="flex items-center gap-1.5 border border-negative/60 bg-negative/10 hover:bg-negative hover:text-white text-negative px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>PURGE ACCOUNT</span>
          </button>
        </div>
      </div>

      {/* User Primary Identity Banner */}
      <div className="border border-border bg-surface p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 border border-accent/40 bg-accent/10 text-accent">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-foreground">{user.name || user.email.split('@')[0]}</h1>
                {user.isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold border border-accent/40 bg-accent/10 text-accent uppercase">
                    <Shield className="w-3 h-3" /> ADMIN
                  </span>
                )}
                <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase ${getUserStatusBadgeClass(user.status)}`}>
                  {user.status}
                </span>
                {user.tier && <UserTierBadge tier={user.tier} />}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 select-all">{user.email}</div>
              <div className="text-[10px] text-muted-foreground/60 select-all font-mono mt-0.5">UUID: {user.id}</div>
            </div>
          </div>

          {/* Balance & Stats Callout */}
          <div className="flex items-center gap-3">
            <div className="border border-border bg-black/60 p-3 min-w-[140px] text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">AVAILABLE CREDITS</div>
              <div className="text-lg font-bold text-accent tabular-nums">
                {formatFinancialNumber(user.credits)} <span className="text-xs font-normal">CR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-border text-xs">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold tracking-wider uppercase transition-colors cursor-pointer ${
            activeTab === 'telemetry'
              ? 'border-b-2 border-accent text-accent bg-accent/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>[1] SESSIONS & TELEMETRY</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-4 py-2 font-bold tracking-wider uppercase transition-colors cursor-pointer ${
            activeTab === 'chat'
              ? 'border-b-2 border-accent text-accent bg-accent/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>[2] AI CHAT AUDIT TRAIL</span>
        </button>
      </div>

      {/* Tab 1: Telemetry & Sessions */}
      {activeTab === 'telemetry' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Active Sessions */}
            <div className="lg:col-span-2 space-y-4">
              <div className="border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-accent" />
                    <h2 className="text-xs font-bold text-accent uppercase tracking-wider">
                      ACTIVE SESSIONS ({sessions.length})
                    </h2>
                  </div>
                  {sessions.length > 0 && (
                    <button
                      onClick={() => setIsRevokeAllDialogOpen(true)}
                      disabled={revokeAllSessionsMutation.isPending}
                      className="flex items-center gap-1 text-[9px] font-bold text-negative hover:text-negative/80 uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Key className="w-3 h-3" />
                      REVOKE ALL
                    </button>
                  )}
                </div>

                {sessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    NO ACTIVE SESSIONS REGISTERED.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 text-xs">
                    {sessions.map((s) => (
                      <div key={s.id} className="py-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground select-all">{s.ip}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              EXPIRES: {formatDateTime(s.expiresAt)}
                            </span>
                            <button
                              onClick={() => {
                                revokeSessionMutation.mutate(
                                  { userId: user.id, sessionId: s.id },
                                  {
                                    onSuccess: () => {
                                      success('SESSION REVOKED', `Session from ${s.ip} has been terminated.`);
                                      refetch();
                                    },
                                    onError: (err: any) => {
                                      error('REVOKE FAILED', err.message || 'Unable to revoke session.');
                                    }
                                  }
                                );
                              }}
                              disabled={revokeSessionMutation.isPending}
                              className="text-negative hover:text-negative/80 transition-colors disabled:opacity-40 cursor-pointer"
                              title="Revoke this session"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 truncate select-all">{s.userAgent}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Registered Devices */}
            <div className="space-y-4">
              <div className="border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-accent" />
                    <h2 className="text-xs font-bold text-accent uppercase tracking-wider">
                      DEVICES ({devices.length})
                    </h2>
                  </div>
                </div>

                {devices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    NO HARDWARE FINGERPRINTS LOGGED.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 text-xs">
                    {devices.map((d) => (
                      <div key={d.id} className="py-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-accent truncate max-w-[140px] select-all">
                            {d.fingerprint}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 border border-positive/40 bg-positive/10 text-positive">
                              TRUSTED
                            </span>
                            <button
                              onClick={() => {
                                removeDeviceMutation.mutate(
                                  { userId: user.id, deviceId: d.id },
                                  {
                                    onSuccess: () => {
                                      success('DEVICE REMOVED', `Device ${d.fingerprint.slice(0, 8)}... has been removed.`);
                                      refetch();
                                    },
                                    onError: (err: any) => {
                                      error('REMOVE FAILED', err.message || 'Unable to remove device.');
                                    }
                                  }
                                );
                              }}
                              disabled={removeDeviceMutation.isPending}
                              className="text-negative hover:text-negative/80 transition-colors disabled:opacity-40 cursor-pointer"
                              title="Remove this device"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground tabular-nums">
                          LAST SEEN: {formatDateTime(d.lastSeenAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: AI Chat Audit Trail */
        <UserChatHistory userId={user.id} userEmail={user.email} />
      )}

      {/* Edit User Dialog */}
      <UpdateUserDialog
        user={user}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          refetch();
        }}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        user={user}
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
      />

      {/* Revoke All Sessions Confirmation */}
      <DestructiveConfirmDialog
        isOpen={isRevokeAllDialogOpen}
        onClose={() => setIsRevokeAllDialogOpen(false)}
        onConfirm={async () => {
          try {
            const count = await revokeAllSessionsMutation.mutateAsync(user.id);
            success('SESSIONS REVOKED', `${count} session(s) for ${user.email} have been terminated.`);
            refetch();
          } catch (err: any) {
            error('REVOKE FAILED', err.message || 'Unable to revoke sessions.');
          }
        }}
        title="REVOKE ALL ACTIVE SESSIONS"
        description={`This will terminate all ${sessions.length} active session(s) for ${user.email}. The user will need to log in again.`}
        targetIdentifier={user.email}
        confirmButtonText="REVOKE ALL SESSIONS"
        isLoading={revokeAllSessionsMutation.isPending}
      />

      {/* Delete User Confirmation */}
      <DestructiveConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="PERMANENTLY PURGE TRADER ACCOUNT"
        description={`This action will permanently delete ${user.email} and invalidate all associated sessions, vouchers, and API tokens.`}
        targetIdentifier={user.email}
        confirmButtonText="PURGE ACCOUNT NOW"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
