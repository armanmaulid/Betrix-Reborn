'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
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
import { useUserDetailQuery, useDeleteUserMutation } from '@/lib/queries/use-users';
import { UpdateUserDialog } from '@/components/users/update-user-dialog';
import { ResetPasswordDialog } from '@/components/users/reset-password-dialog';
import { UserChatHistory } from '@/components/users/user-chat-history';
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog';
import { UserTierBadge } from '@/components/users/user-tier-badge';
import { useToast } from '@/components/ui/terminal-toast';
import { formatFinancialNumber } from '@/lib/utils';

export default function UserDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { success, error } = useToast();

  const { data: detail, isLoading, isError, refetch } = useUserDetailQuery(id);
  const deleteMutation = useDeleteUserMutation();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'chat'>('telemetry');


  if (isLoading) {
    return (
      <div className="p-12 text-center font-mono text-xs text-muted-foreground animate-pulse">
        LOADING USER TELEMETRY & HARDWARE BINDINGS...
      </div>
    );
  }

  if (isError || !detail?.user) {
    return (
      <div className="space-y-4 font-mono">
        <Link
          href="/users"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO DIRECTORY</span>
        </Link>
        <div className="border border-negative bg-surface p-8 text-center text-negative text-xs">
          USER RECORD NOT FOUND OR INVALID IDENTIFIER: {id}
        </div>
      </div>
    );
  }

  const { user, devices = [], sessions = [], usageSummary } = detail;

  const handleDeleteConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(user.id);
      success('USER DELETED', `User ${user.email} purged successfully.`);
      router.push('/users');
    } catch (err: any) {
      error('DELETE FAILED', err.message || 'Unable to purge user.');
    }
  };

  const statusBadge =
    user.status === 'active'
      ? 'border-positive/40 bg-positive/10 text-positive'
      : user.status === 'suspended'
      ? 'border-accent/40 bg-accent/10 text-accent'
      : 'border-negative/40 bg-negative/10 text-negative';

  return (
    <div className="space-y-6 font-mono">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <Link
          href="/users"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO USER DIRECTORY</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditDialogOpen(true)}
            className="flex items-center gap-1.5 border border-border bg-surface hover:border-accent hover:text-accent text-foreground px-3 py-1 text-xs transition-colors"
          >
            <Edit2 className="w-3 h-3" />
            <span>EDIT PARAMETERS</span>
          </button>
          <button
            onClick={() => setIsResetDialogOpen(true)}
            className="flex items-center gap-1.5 border border-border bg-surface hover:border-accent hover:text-accent text-foreground px-3 py-1 text-xs transition-colors"
          >
            <KeyRound className="w-3 h-3" />
            <span>FORCE RESET</span>
          </button>
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-1.5 border border-negative/50 bg-negative/10 hover:bg-negative text-negative hover:text-white px-3 py-1 text-xs transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>PURGE ACCOUNT</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-colors border ${
            activeTab === 'telemetry'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>IDENTITY & TELEMETRY</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-colors border ${
            activeTab === 'chat'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>CHAT CONVERSATION HISTORY</span>
        </button>
      </div>

      {activeTab === 'telemetry' ? (
        /* Main 2-Column Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity Panel (Span 1) */}
        <div className="border border-border bg-surface p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-foreground tracking-wider uppercase">
                IDENTITY PROFILE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserTierBadge tier={user.tier} size="sm" />
              <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase ${statusBadge}`}>
                {user.status}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">EMAIL ADDRESS</div>
              <div className="text-foreground font-bold select-all mt-0.5">{user.email}</div>
            </div>

            <div>
              <div className="text-[10px] text-muted-foreground uppercase">FULL NAME</div>
              <div className="text-foreground mt-0.5">{user.name || 'N/A'}</div>
            </div>

            <div>
              <div className="text-[10px] text-muted-foreground uppercase">COMMERCIAL TIER</div>
              <div className="mt-1">
                <UserTierBadge tier={user.tier} size="md" />
              </div>
            </div>

            <div>
              <div className="text-[10px] text-muted-foreground uppercase">USER ID</div>
              <div className="text-muted-foreground select-all text-[11px] mt-0.5">{user.id}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">ROLE</div>
                <div className="mt-0.5">
                  {user.isAdmin ? (
                    <span className="text-accent font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3" /> ROOT_ADMIN
                    </span>
                  ) : (
                    <span className="text-muted-foreground">TRADER</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-muted-foreground uppercase">EMAIL VERIFIED</div>
                <div className="mt-0.5 flex items-center gap-1">
                  {user.emailVerified ? (
                    <span className="text-positive font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> YES
                    </span>
                  ) : (
                    <span className="text-negative font-bold flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> NO
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60">
              <div className="text-[10px] text-muted-foreground uppercase">TOKEN CREDIT BALANCE</div>
              <div className="text-lg font-bold text-accent tabular-nums mt-0.5">
                {formatFinancialNumber(user.credits)} CREDITS
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>REGISTERED:</span>
                <span className="text-foreground">
                  {user.createdAt ? new Date(user.createdAt).toISOString().replace('T', ' ').substring(0, 19) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>UPDATED:</span>
                <span className="text-foreground">
                  {user.updatedAt ? new Date(user.updatedAt).toISOString().replace('T', ' ').substring(0, 19) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry, Devices & Sessions (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Usage Summary Panel */}
          <div className="border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold text-foreground tracking-wider uppercase">
                  INTELLIGENCE USAGE METRICS
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">LIFETIME USAGE</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-border bg-black p-3">
                <div className="text-[10px] text-muted-foreground uppercase">TOTAL TOKENS</div>
                <div className="text-base font-bold text-accent tabular-nums mt-1">
                  {formatFinancialNumber((usageSummary?.totalInputTokens || 0) + (usageSummary?.totalOutputTokens || 0))}
                </div>
              </div>

              <div className="border border-border bg-black p-3">
                <div className="text-[10px] text-muted-foreground uppercase">INPUT TOKENS</div>
                <div className="text-base font-bold text-foreground tabular-nums mt-1">
                  {formatFinancialNumber(usageSummary?.totalInputTokens || 0)}
                </div>
              </div>

              <div className="border border-border bg-black p-3">
                <div className="text-[10px] text-muted-foreground uppercase">OUTPUT TOKENS</div>
                <div className="text-base font-bold text-info tabular-nums mt-1">
                  {formatFinancialNumber(usageSummary?.totalOutputTokens || 0)}
                </div>
              </div>

              <div className="border border-border bg-black p-3">
                <div className="text-[10px] text-muted-foreground uppercase">CREDITS SPENT</div>
                <div className="text-base font-bold text-positive tabular-nums mt-1">
                  {formatFinancialNumber(usageSummary?.totalCreditsSpent || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Bound Hardware Devices Panel */}
          <div className="border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-info" />
                <span className="text-xs font-bold text-foreground tracking-wider uppercase">
                  BOUND HARDWARE DEVICES ({devices.length})
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">DEVICE FINGERPRINTING</span>
            </div>

            {devices.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/80">
                NO HARDWARE DEVICES BOUND TO THIS USER ACCOUNT.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border bg-black">
                {devices.map((d: any, index: number) => (
                  <div key={d.id || index} className="p-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-bold text-foreground select-all font-mono">
                          {d.fingerprint || 'Generic Hardware Fingerprint'}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Device ID: {d.id}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <div>LAST SEEN:</div>
                      <div className="text-foreground">
                        {d.lastSeenAt ? new Date(d.lastSeenAt).toISOString().substring(0, 19).replace('T', ' ') : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Login Sessions Panel */}
          <div className="border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-positive" />
                <span className="text-xs font-bold text-foreground tracking-wider uppercase">
                  ACTIVE AUTHENTICATION SESSIONS ({sessions.length})
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">POSTGRESQL SESSIONS</span>
            </div>

            {sessions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/80">
                NO ACTIVE SESSIONS CURRENTLY OPEN FOR THIS USER.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border bg-black">
                {sessions.map((s: any, index: number) => (
                  <div key={s.id || index} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-positive" />
                        <span className="font-bold text-foreground">{s.ipAddress || '127.0.0.1'}</span>
                        <span className="text-[10px] text-muted-foreground">({s.userAgent || 'Web Browser'})</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 select-all mt-0.5">
                        Session: {s.id}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <div>EXPIRES:</div>
                      <div className="text-accent">
                        {s.expiresAt ? new Date(s.expiresAt).toISOString().substring(0, 19).replace('T', ' ') : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        <UserChatHistory userId={user.id} userEmail={user.email} />
      )}

      {/* Edit User Dialog */}
      <UpdateUserDialog
        user={user}
        isOpen={isEditDialogOpen}
        onClose={() => { setIsEditDialogOpen(false); refetch(); }}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        user={user}
        isOpen={isResetDialogOpen}
        onClose={() => { setIsResetDialogOpen(false); refetch(); }}
      />

      {/* Delete User Modal (Two-Step Verification) */}
      <DestructiveConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="PERMANENTLY PURGE USER ACCOUNT"
        description="This action is irreversible. It will delete the user profile, revoke all sessions across all devices, and cascade all associated transaction history."
        targetIdentifier={user.email}
        confirmButtonText="PURGE USER NOW"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
