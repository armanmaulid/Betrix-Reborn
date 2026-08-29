'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Radio,
  Send,
  Users,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  X
} from 'lucide-react';
import {
  BroadcastMessageSchema,
  type BroadcastMessageInput
} from '@/modules/operations/application/schemas/admin.schema';
import {
  useBroadcastMutation,
  type BroadcastResponse
} from '@/modules/operations/application/queries/use-broadcast';
import { useUsersQuery } from '@/modules/identity/application/queries/use-users';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { DestructiveConfirmDialog } from '@/shared/presentation/ui/destructive-confirm-dialog';
import { formatFinancialNumber } from '@/shared/utils';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';
import { PageHeader } from '@/shared/presentation/ui/page-header';
import type { User } from '@/modules/identity/domain/entities/User';

export function BroadcastContainer() {
  usePageTitle('SYSTEM BROADCAST');
  const { success, error } = useToast();
  const broadcastMutation = useBroadcastMutation();

  const [targetMode, setTargetMode] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lastResult, setLastResult] = useState<BroadcastResponse | null>(null);
  const [pendingBroadcast, setPendingBroadcast] = useState<BroadcastMessageInput | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(userSearch), 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  const {
    data: searchResults,
    isLoading: isSearchLoading,
    isError: isSearchError
  } = useUsersQuery({
    search: debouncedSearch || undefined,
    limit: 10
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<BroadcastMessageInput>({
    resolver: zodResolver(BroadcastMessageSchema),
    defaultValues: {
      subject: '',
      body: ''
    }
  });

  const subjectWatch = watch('subject', '');
  const bodyWatch = watch('body', '');

  const handleToggleUser = (u: User) => {
    if (selectedUsers.some((x) => x.id === u.id)) {
      setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id));
    } else {
      setSelectedUsers((prev) => [...prev, u]);
    }
  };

  const handleRemoveSelectedUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((x) => x.id !== id));
  };

  const dispatchBroadcast = async (data: BroadcastMessageInput) => {
    try {
      const result = await broadcastMutation.mutateAsync(data);
      setLastResult(result);
      success(
        'TRANSMISSION BROADCASTED',
        `Dispatched to ${result.recipientsCount} recipient${result.recipientsCount === 1 ? '' : 's'}.`
      );
      reset();
      setSelectedUsers([]);
      setUserSearch('');
    } catch (err: any) {
      error('TRANSMISSION FAILED', err.message || 'Unable to broadcast message.');
    }
  };

  const onSubmit = async (data: BroadcastMessageInput) => {
    if (targetMode === 'SPECIFIC' && selectedUsers.length === 0) {
      error(
        'RECIPIENTS REQUIRED',
        'Please select at least one trader account to send a targeted broadcast.'
      );
      return;
    }

    const payload: BroadcastMessageInput = {
      subject: data.subject,
      body: data.body,
      targetUserIds: targetMode === 'SPECIFIC' ? selectedUsers.map((u) => u.id) : undefined
    };

    // Global blast is irreversible — require an explicit type-to-confirm step.
    if (targetMode === 'ALL') {
      setPendingBroadcast(payload);
      return;
    }
    await dispatchBroadcast(payload);
  };

  const handleConfirmGlobalBroadcast = () =>
    pendingBroadcast
      ? dispatchBroadcast(pendingBroadcast).then(() => setPendingBroadcast(null))
      : undefined;

  return (
    <div className="space-y-3 font-mono">
      <PageHeader
        title="HIGH-PRIORITY SYSTEM BROADCAST"
        icon={Radio}
        subtitle="Dispatch operational alerts, scheduled maintenance bulletins, or compliance notices to traders"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Input */}
        <div className="lg:col-span-2 space-y-4">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="border border-border bg-surface p-5 space-y-4"
          >
            <div className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border pb-2">
              DISPATCH PARAMETERS
            </div>

            {/* Target Audience Mode */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                TARGET AUDIENCE SCOPE
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetMode('ALL')}
                  className={`p-3 border text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                    targetMode === 'ALL'
                      ? 'border-accent bg-accent/10 text-accent font-bold'
                      : 'border-border bg-black hover:bg-surface-hover text-muted-foreground'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs">ALL ACTIVE TRADERS</div>
                    <div className="text-[10px] text-muted-foreground font-normal">
                      Global push to all registered accounts
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetMode('SPECIFIC')}
                  className={`p-3 border text-left flex items-start gap-2.5 transition-colors cursor-pointer ${
                    targetMode === 'SPECIFIC'
                      ? 'border-accent bg-accent/10 text-accent font-bold'
                      : 'border-border bg-black hover:bg-surface-hover text-muted-foreground'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs">SPECIFIC ACCOUNTS</div>
                    <div className="text-[10px] text-muted-foreground font-normal">
                      Target selected individual trader accounts
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* User Selector (If Specific Target Mode) */}
            {targetMode === 'SPECIFIC' && (
              <div className="border border-border/80 bg-black/60 p-3 space-y-3">
                <div className="text-[11px] font-bold text-foreground flex items-center justify-between">
                  <span>SELECT TARGET RECIPIENTS</span>
                  <span className="text-accent">{selectedUsers.length} SELECTED</span>
                </div>

                {/* Selected Pills */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {selectedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 border border-accent/40 bg-accent/10 text-accent text-[10px] font-bold"
                      >
                        <span>{u.email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedUser(u.id)}
                          className="hover:text-negative cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* User Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search accounts to add..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-surface border border-border pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Search Results Dropdown/List */}
                {userSearch.trim() && (
                  <div className="border border-border bg-surface max-h-36 overflow-y-auto divide-y divide-border/60">
                    {isSearchLoading ? (
                      <div className="p-2 text-center text-[10px] text-muted-foreground animate-pulse">
                        SEARCHING TRADER REGISTRY...
                      </div>
                    ) : isSearchError ? (
                      <div className="p-2 text-center text-[10px] text-negative">
                        ERROR QUERYING USERS.
                      </div>
                    ) : searchResults?.data?.length === 0 ? (
                      <div className="p-2 text-center text-[10px] text-muted-foreground">
                        NO USERS FOUND MATCHING QUERY.
                      </div>
                    ) : (
                      searchResults?.data?.map((u: User) => {
                        const isSelected = selectedUsers.some((x) => x.id === u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => handleToggleUser(u)}
                            className={`p-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                              isSelected ? 'bg-accent/10 text-accent' : 'hover:bg-surface-hover'
                            }`}
                          >
                            <div>
                              <div className="font-bold">{u.email}</div>
                              <div className="text-[10px] text-muted-foreground select-all">
                                {u.id}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-accent cursor-pointer"
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1">
              <label
                htmlFor="broadcast-subject"
                className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider"
              >
                SUBJECT HEADLINE *
              </label>
              <input
                id="broadcast-subject"
                type="text"
                placeholder="e.g. URGENT: Scheduled Database Maintenance at 02:00 UTC"
                {...register('subject')}
                className={`w-full bg-black border p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none ${
                  errors.subject ? 'border-negative' : 'border-border focus:border-accent'
                }`}
              />
              {errors.subject && (
                <div className="text-[10px] text-negative flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.subject.message}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="space-y-1">
              <label
                htmlFor="broadcast-body"
                className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider"
              >
                TRANSMISSION MESSAGE BODY *
              </label>
              <textarea
                id="broadcast-body"
                rows={6}
                placeholder="Enter complete bulletin message for institutional broadcast..."
                {...register('body')}
                className={`w-full bg-black border p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none font-mono ${
                  errors.body ? 'border-negative' : 'border-border focus:border-accent'
                }`}
              />
              {errors.body && (
                <div className="text-[10px] text-negative flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.body.message}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="text-[10px] text-muted-foreground">
                Targeting:{' '}
                <strong>
                  {targetMode === 'ALL'
                    ? 'GLOBAL AUDIENCE'
                    : `${selectedUsers.length} SELECTED USERS`}
                </strong>
              </div>

              <button
                type="submit"
                disabled={broadcastMutation.isPending}
                className="flex items-center gap-1.5 border border-accent/40 bg-accent hover:bg-accent-dim text-black px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{broadcastMutation.isPending ? 'DISPATCHING...' : 'DISPATCH BROADCAST'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Transmission Preview */}
        <div className="space-y-4">
          <div className="border border-border bg-surface p-5 space-y-4">
            <div className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border pb-2">
              TERMINAL PREVIEW
            </div>

            <div className="border border-accent/40 bg-black p-4 space-y-3">
              <div className="flex items-center justify-between text-[10px] pb-2 border-b border-border/80">
                <span className="px-1.5 py-0.5 border border-accent/60 bg-accent/20 text-accent font-bold">
                  [BROADCAST]
                </span>
                <span className="text-muted-foreground">NOW</span>
              </div>

              <div>
                <div className="text-xs font-bold text-foreground uppercase">
                  {subjectWatch || 'BULLETIN SUBJECT LINE'}
                </div>
                <p className="text-xs text-muted-foreground/90 whitespace-pre-wrap mt-2 leading-relaxed">
                  {bodyWatch ||
                    'Message transmission contents will display here in real-time as you compose...'}
                </p>
              </div>
            </div>

            {lastResult && (
              <div className="border border-positive/40 bg-positive/10 p-3 space-y-1 text-xs">
                <div className="font-bold text-positive flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>TRANSMISSION CONFIRMED</span>
                </div>
                <div className="text-[11px] text-foreground">
                  Delivered to <strong>{formatFinancialNumber(lastResult.recipientsCount)}</strong>{' '}
                  recipient accounts.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DestructiveConfirmDialog
        isOpen={pendingBroadcast !== null}
        onClose={() => setPendingBroadcast(null)}
        onConfirm={handleConfirmGlobalBroadcast}
        title="DISPATCH BROADCAST TO ALL USERS?"
        description="This transmission will be pushed to every registered account on the platform. It cannot be recalled once dispatched."
        targetIdentifier="ALL USERS"
        confirmButtonText="DISPATCH TO ALL"
        isLoading={broadcastMutation.isPending}
      />
    </div>
  );
}
