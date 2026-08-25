'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldAlert, Lock } from 'lucide-react';
import {
  UpdateAdminUserSchema,
  type UpdateAdminUserInput
} from '@identity/application/schemas/admin-user.schema';
import { useUpdateUserMutation } from '@/modules/identity/application/queries/use-users';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { TerminalModal } from '@/shared/presentation/ui/terminal-modal';
import { useSession } from '@/shared/presentation/hooks/use-session';
import type { AdminUser } from '@/modules/identity/domain/entities/User';

interface UpdateUserDialogProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateUserDialog({ user, isOpen, onClose }: UpdateUserDialogProps) {
  const { success, error } = useToast();
  const updateMutation = useUpdateUserMutation();
  const { currentUser } = useSession();

  const isEditingSelf = Boolean(
    currentUser && user && (currentUser.id === user.id || currentUser.email === user.email)
  );

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<UpdateAdminUserInput>({
    resolver: zodResolver(UpdateAdminUserSchema),
    values: user
      ? {
          name: user.name || '',
          isAdmin: isEditingSelf ? true : user.isAdmin,
          status: isEditingSelf ? 'active' : user.status,
          tier: user.tier || 'free',
          credits: user.credits
        }
      : undefined
  });

  if (!isOpen || !user) return null;

  const onSubmit = async (data: UpdateAdminUserInput) => {
    try {
      const payload = {
        ...data,
        isAdmin: isEditingSelf ? true : data.isAdmin,
        status: isEditingSelf ? 'active' : data.status
      };
      await updateMutation.mutateAsync({ id: user.id, data: payload });
      success('USER ACCOUNT UPDATED', `Successfully modified properties for ${user.email}.`);
      onClose();
    } catch (err: any) {
      error('UPDATE FAILED', err.message || 'Unable to update user parameters.');
    }
  };

  return (
    <TerminalModal
      isOpen={isOpen}
      onClose={onClose}
      title={`MODIFY USER ACCOUNT // [${user.email}]`}
      icon={ShieldAlert}
      variant="accent"
      maxWidth="md"
    >
      {/* Form Body */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 font-mono">
        {/* Self-Edit Warning Badge */}
        {isEditingSelf && (
          <div className="border border-accent/40 bg-accent/10 p-3 text-[11px] text-accent flex items-start gap-2.5">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ACTIVE ADMINISTRATOR SESSION (SELF):</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                You are managing your active root account. Self-demotion, suspension, and banning
                are locked to prevent loss of administrative access.
              </p>
            </div>
          </div>
        )}
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
          {errors.name && <p className="text-[10px] text-negative">{errors.name.message}</p>}
        </div>

        {/* Account Status */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              GOVERNANCE STATUS
            </label>
            {isEditingSelf && (
              <span className="text-[9px] text-accent font-bold">LOCKED (ACTIVE SESSION)</span>
            )}
          </div>
          <select
            {...register('status')}
            disabled={isEditingSelf}
            className={`w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent ${
              isEditingSelf ? 'opacity-60 cursor-not-allowed bg-surface' : ''
            }`}
          >
            <option value="active">ACTIVE (Normal Access)</option>
            {!isEditingSelf && (
              <>
                <option value="suspended">SUSPENDED (Temporary Hold)</option>
                <option value="banned">BANNED (Blocked from all services)</option>
              </>
            )}
          </select>
          {errors.status && <p className="text-[10px] text-negative">{errors.status.message}</p>}
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
          {errors.tier && <p className="text-[10px] text-negative">{errors.tier.message}</p>}
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
          {errors.credits && <p className="text-[10px] text-negative">{errors.credits.message}</p>}
        </div>

        {/* Administrator Role Toggle */}
        <div
          className={`border border-border bg-black p-3 flex items-center justify-between ${
            isEditingSelf ? 'border-accent/40 bg-accent/5' : ''
          }`}
        >
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>ADMIN PRIVILEGES</span>
              {isEditingSelf && (
                <span className="px-1.5 py-0.2 text-[9px] border border-accent bg-accent text-black font-bold">
                  ROOT (LOCKED)
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {isEditingSelf
                ? 'Cannot revoke administrator privileges from your active session'
                : 'Grant root access to Betrix Terminal'}
            </div>
          </div>
          <label
            className={`relative inline-flex items-center ${isEditingSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              {...register('isAdmin')}
              disabled={isEditingSelf}
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
    </TerminalModal>
  );
}
