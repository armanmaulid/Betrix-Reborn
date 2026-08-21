'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, ShieldAlert } from 'lucide-react';
import { UpdateAdminUserSchema, type UpdateAdminUserInput } from '@/lib/schemas/admin.schema';
import { useUpdateUserMutation } from '@/lib/queries/use-users';
import { useToast } from '@/components/ui/terminal-toast';
import type { AdminUser } from '@/lib/types';

interface UpdateUserDialogProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateUserDialog({ user, isOpen, onClose }: UpdateUserDialogProps) {
  const { success, error } = useToast();
  const updateMutation = useUpdateUserMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<UpdateAdminUserInput>({
    resolver: zodResolver(UpdateAdminUserSchema),
    values: user
      ? {
          name: user.name || '',
          isAdmin: user.isAdmin,
          status: user.status,
          tier: user.tier || 'free',
          credits: user.credits
        }
      : undefined
  });

  if (!isOpen || !user) return null;

  const onSubmit = async (data: UpdateAdminUserInput) => {
    try {
      await updateMutation.mutateAsync({ id: user.id, data });
      success('USER ACCOUNT UPDATED', `Successfully modified properties for ${user.email}.`);
      onClose();
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Unable to update user parameters.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md border-2 border-accent bg-surface shadow-2xl font-mono">
        {/* Header */}
        <div className="bg-accent/10 border-b border-accent/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-accent">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">
              MODIFY USER ACCOUNT // [{user.email}]
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
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              FULL NAME
            </label>
            <input
              type="text"
              {...register('name')}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
              placeholder="e.g. John Doe"
            />
            {errors.name && (
              <p className="text-[10px] text-negative">{errors.name.message}</p>
            )}
          </div>

          {/* Account Status */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              GOVERNANCE STATUS
            </label>
            <select
              {...register('status')}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="active">ACTIVE (Normal Access)</option>
              <option value="suspended">SUSPENDED (Temporary Hold)</option>
              <option value="banned">BANNED (Blocked from all services)</option>
            </select>
            {errors.status && (
              <p className="text-[10px] text-negative">{errors.status.message}</p>
            )}
          </div>

          {/* Commercial Tier */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              COMMERCIAL SUBSCRIPTION TIER
            </label>
            <select
              {...register('tier')}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent font-bold"
            >
              <option value="free">FREE (Basic Quota)</option>
              <option value="starter">STARTER (Retail Trader)</option>
              <option value="pro">PRO (Pro Analysis & Priority)</option>
              <option value="premium">PREMIUM (Dedicated Models)</option>
              <option value="vip">VIP (Institutional / Unlimited)</option>
            </select>
            {errors.tier && (
              <p className="text-[10px] text-negative">{errors.tier.message}</p>
            )}
          </div>

          {/* Credit Balance */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              CREDIT BALANCE (TOKENS / CREDITS)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              {...register('credits', { valueAsNumber: true })}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground tabular-nums focus:outline-none focus:border-accent"
            />
            {errors.credits && (
              <p className="text-[10px] text-negative">{errors.credits.message}</p>
            )}
          </div>

          {/* Administrator Role Toggle */}
          <div className="border border-border bg-black p-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground">ADMIN PRIVILEGES</div>
              <div className="text-[10px] text-muted-foreground">Grant root access to Betrix Terminal</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('isAdmin')}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-border peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border bg-black"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-1.5 text-xs font-bold bg-accent text-black hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? 'SAVING...' : 'SAVE PARAMETERS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
