'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, X, AlertTriangle } from 'lucide-react';
import { ResetUserPasswordSchema, type ResetUserPasswordInput } from '@/lib/schemas/admin.schema';
import { useResetPasswordMutation } from '@/lib/queries/use-users';
import { useToast } from '@/components/ui/terminal-toast';
import type { AdminUser } from '@/lib/types';

interface ResetPasswordDialogProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ResetPasswordDialog({ user, isOpen, onClose }: ResetPasswordDialogProps) {
  const { success, error } = useToast();
  const resetMutation = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ResetUserPasswordInput>({
    resolver: zodResolver(ResetUserPasswordSchema)
  });

  if (!isOpen || !user) return null;

  const onSubmit = async (data: ResetUserPasswordInput) => {
    try {
      await resetMutation.mutateAsync({ id: user.id, data });
      success('PASSWORD RESET COMPLETED', `Active sessions revoked and new password applied for ${user.email}.`);
      reset();
      onClose();
    } catch (err: any) {
      error('RESET FAILED', err.message || 'Unable to reset user credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md border-2 border-accent bg-surface shadow-2xl font-mono">
        {/* Header */}
        <div className="bg-accent/10 border-b border-accent/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-accent">
            <KeyRound className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">
              FORCE PASSWORD RESET // [{user.email}]
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Security Warning Banner */}
          <div className="border border-accent/40 bg-accent/10 p-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-accent/90 leading-relaxed">
              <strong>CRITICAL SECURITY NOTICE:</strong> Applying a forced credential reset will immediately revoke all active browser sessions and API tokens across all devices for this user.
            </p>
          </div>

          {/* New Password Input */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              NEW TEMPORARY PASSWORD (MIN 8 CHARS)
            </label>
            <input
              type="password"
              {...register('newPassword')}
              autoFocus
              placeholder="••••••••••••"
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            />
            {errors.newPassword && (
              <p className="text-[10px] text-negative">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={resetMutation.isPending}
              className="px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border bg-black"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={resetMutation.isPending}
              className="px-4 py-1.5 text-xs font-bold bg-accent text-black hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {resetMutation.isPending ? 'RESETTING...' : 'FORCE RESET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
