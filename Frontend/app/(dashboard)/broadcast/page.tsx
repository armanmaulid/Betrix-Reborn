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
import { BroadcastMessageSchema, type BroadcastMessageInput } from '@/lib/schemas/admin.schema';
import { useBroadcastMutation, type BroadcastResponse } from '@/lib/queries/use-broadcast';
import { useUsersQuery } from '@/lib/queries/use-users';
import { useToast } from '@/components/ui/terminal-toast';
import { formatFinancialNumber } from '@/lib/utils';
import type { AdminUser } from '@/lib/types';

export default function BroadcastPage() {
  const { success, error } = useToast();
  const broadcastMutation = useBroadcastMutation();

  const [targetMode, setTargetMode] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedUsers, setSelectedUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [lastResult, setLastResult] = useState<BroadcastResponse | null>(null);

  // User search query for specific targeting
  const { data: searchResults } = useUsersQuery({
    search: userSearch || undefined,
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

  const subjectValue = watch('subject', '');
  const bodyValue = watch('body', '');

  const handleSelectUser = (user: AdminUser) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const onSubmit = async (data: BroadcastMessageInput) => {
    if (targetMode === 'SPECIFIC' && selectedUsers.length === 0) {
      error('TARGET SELECTION REQUIRED', 'Please select at least one specific user or switch to All Active Users.');
      return;
    }

    try {
      const payload: BroadcastMessageInput = {
        subject: data.subject.trim(),
        body: data.body.trim(),
        targetUserIds: targetMode === 'SPECIFIC' ? selectedUsers.map((u) => u.id) : undefined
      };

      const result = await broadcastMutation.mutateAsync(payload);
      setLastResult(result);
      success('BROADCAST DISPATCHED', `Successfully transmitted to ${result.recipientsCount} recipient(s).`);
      reset();
      setSelectedUsers([]);
    } catch (err: any) {
      error('BROADCAST FAILED', err.message || 'Unable to transmit message.');
    }
  };

  return (
    <div className="space-y-6 font-mono max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-accent animate-pulse" />
            <h1 className="text-sm font-bold tracking-wider text-accent uppercase">
              GLOBAL MESSAGE BROADCAST CENTER
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dispatch announcements, maintenance notifications, or market alerts directly to user inboxes
          </p>
        </div>
      </div>

      {/* Execution Feedback Result Banner */}
      {lastResult && (
        <div className="border-2 border-positive bg-positive/10 p-4 animate-in fade-in space-y-2">
          <div className="flex items-center gap-2 text-positive font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>BROADCAST TRANSMISSION CONFIRMED</span>
          </div>
          <div className="text-xs text-foreground leading-relaxed pl-6">
            Message was successfully routed and delivered to <strong className="text-positive tabular-nums">{formatFinancialNumber(lastResult.recipientsCount)}</strong> active user account(s).
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Panel 1: Target Audience Selection */}
        <div className="border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-bold text-foreground tracking-wider uppercase">
                TARGET AUDIENCE SPECIFICATION
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground">RECIPIENT FILTERING</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label
              onClick={() => setTargetMode('ALL')}
              className={`p-3.5 border cursor-pointer flex items-center justify-between transition-colors ${
                targetMode === 'ALL'
                  ? 'border-accent bg-accent/10 text-accent font-bold'
                  : 'border-border bg-black text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <div>
                  <div>ALL ACTIVE TRADERS</div>
                  <div className="text-[10px] font-normal text-muted-foreground">Broadcast to all registered users</div>
                </div>
              </div>
              <input
                type="radio"
                name="targetMode"
                checked={targetMode === 'ALL'}
                onChange={() => setTargetMode('ALL')}
                className="accent-accent"
              />
            </label>

            <label
              onClick={() => setTargetMode('SPECIFIC')}
              className={`p-3.5 border cursor-pointer flex items-center justify-between transition-colors ${
                targetMode === 'SPECIFIC'
                  ? 'border-accent bg-accent/10 text-accent font-bold'
                  : 'border-border bg-black text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4" />
                <div>
                  <div>SPECIFIC USER RECIPIENTS</div>
                  <div className="text-[10px] font-normal text-muted-foreground">Select individual account IDs</div>
                </div>
              </div>
              <input
                type="radio"
                name="targetMode"
                checked={targetMode === 'SPECIFIC'}
                onChange={() => setTargetMode('SPECIFIC')}
                className="accent-accent"
              />
            </label>
          </div>

          {/* Specific User Search & Multi-Select Drawer */}
          {targetMode === 'SPECIFIC' && (
            <div className="border border-border bg-black p-4 space-y-3 pt-4 animate-in fade-in">
              <div className="text-[11px] text-muted-foreground uppercase font-bold">
                SELECT RECIPIENT ACCOUNTS ({selectedUsers.length} SELECTED)
              </div>

              {/* Selected Pills */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 bg-surface border border-border px-2 py-0.5 text-[11px] text-foreground"
                    >
                      <span>{u.email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(u.id)}
                        className="text-muted-foreground hover:text-negative p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search User Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Type user email to search & select..."
                  className="w-full bg-surface border border-border pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              {/* User Results Dropdown */}
              {userSearch && searchResults?.data && searchResults.data.length > 0 && (
                <div className="border border-border bg-surface max-h-40 overflow-y-auto divide-y divide-border">
                  {searchResults.data.map((u) => {
                    const isSelected = selectedUsers.some((sel) => sel.id === u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`p-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-accent/10 text-accent font-bold' : 'hover:bg-black text-foreground'
                        }`}
                      >
                        <span>{u.email}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{u.id}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel 2: Message Content */}
        <div className="border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-bold text-foreground tracking-wider uppercase">
                TRANSMISSION MESSAGE PAYLOAD
              </h2>
            </div>
            <span className="text-[10px] text-muted-foreground">MARKDOWN & PLAINTEXT</span>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="broadcast-subject" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                MESSAGE SUBJECT LINE (1 - 255 CHARS) *
              </label>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {subjectValue.length} / 255
              </span>
            </div>
            <input
              id="broadcast-subject"
              type="text"
              {...register('subject')}
              placeholder="e.g. Scheduled Infrastructure Maintenance Window [2026.08.22]"
              className="w-full bg-black border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent font-bold"
            />
            {errors.subject && <p className="text-[10px] text-negative">{errors.subject.message}</p>}
          </div>

          {/* Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="broadcast-body" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                MESSAGE BODY (MAX 5,000 CHARACTERS) *
              </label>
              <span className={`text-[10px] tabular-nums ${bodyValue.length > 5000 ? 'text-negative font-bold' : 'text-muted-foreground'}`}>
                {bodyValue.length} / 5,000
              </span>
            </div>
            <textarea
              id="broadcast-body"
              rows={8}
              {...register('body')}
              placeholder="Enter broadcast message text or Markdown here..."
              className="w-full bg-black border border-border p-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent leading-relaxed"
            />
            {errors.body && <p className="text-[10px] text-negative">{errors.body.message}</p>}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-accent" />
            <span>Broadcasts are immediate and logged to Audit Trail.</span>
          </div>

          <button
            type="submit"
            disabled={broadcastMutation.isPending || bodyValue.length > 5000}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-accent text-black hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{broadcastMutation.isPending ? 'TRANSMITTING...' : 'DISPATCH BROADCAST'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
