'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, KeyRound, Copy, Check, Eye, EyeOff } from 'lucide-react';
import {
  CreateAdminUserSchema,
  type CreateAdminUserInput
} from '@identity/application/schemas/admin-user.schema';
import { useCreateUserMutation } from '@/modules/identity/application/queries/use-users';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { useCopyFeedback } from '@/shared/presentation/hooks/use-copy-feedback';
import { TerminalModal } from '@/shared/presentation/ui/terminal-modal';

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateUserDialog({ isOpen, onClose }: CreateUserDialogProps) {
  const { success, error } = useToast();
  const { isCopied, copy } = useCopyFeedback();
  const createUserMutation = useCreateUserMutation();
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateAdminUserInput>({
    resolver: zodResolver(CreateAdminUserSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      tier: 'free',
      credits: 100,
      isAdmin: false
    }
  });

  if (!isOpen) return null;

  const isAdmin = watch('isAdmin');

  const onSubmit = async (data: CreateAdminUserInput) => {
    try {
      const result = await createUserMutation.mutateAsync(data);
      if (result.generatedPassword) {
        // Show the generated password once — never retrievable again
        setGeneratedPassword(result.generatedPassword);
      } else {
        success('USER CREATED', `Account for ${data.email} provisioned successfully.`);
        reset();
        onClose();
      }
    } catch (err: any) {
      error('CREATION FAILED', err.message || 'Unable to create user.');
    }
  };

  const handleCopyPassword = () => {
    if (!generatedPassword) return;
    copy(generatedPassword, 'password');
  };

  const finishAfterPassword = () => {
    setGeneratedPassword(null);
    reset();
    onClose();
  };

  return (
    <TerminalModal
      isOpen={isOpen}
      onClose={generatedPassword ? finishAfterPassword : onClose}
      title="PROVISION NEW USER ACCOUNT"
      icon={UserPlus}
      variant="accent"
      maxWidth="md"
    >
      {generatedPassword ? (
        /* Generated password reveal — one-time */
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-negative">
            <KeyRound className="w-3.5 h-3.5" />
            <span>SAVE THIS PASSWORD NOW — SHOWN ONLY ONCE</span>
          </div>
          <div className="border border-accent/40 bg-black p-3 flex items-center justify-between gap-2">
            <code className="text-sm text-accent select-all font-bold tracking-wider break-all">
              {generatedPassword}
            </code>
            <button
              onClick={handleCopyPassword}
              title="Copy password"
              className="text-muted-foreground hover:text-foreground p-1 transition-colors shrink-0"
            >
              {isCopied('password') ? (
                <Check className="w-4 h-4 text-positive" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The password is hashed on the server — it cannot be retrieved later. If lost, use the
            RESET PASSWORD action on the user detail page.
          </p>
          <button
            onClick={finishAfterPassword}
            className="w-full border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            I HAVE SAVED THE PASSWORD — DONE
          </button>
        </div>
      ) : (
        /* Create form */
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="new-user-email"
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              EMAIL ADDRESS *
            </label>
            <input
              id="new-user-email"
              type="email"
              {...register('email')}
              className="w-full bg-black border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
              placeholder="trader@betrix.io"
            />
            {errors.email && <p className="text-[10px] text-negative">{errors.email.message}</p>}
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label
              htmlFor="new-user-name"
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              DISPLAY NAME *
            </label>
            <input
              id="new-user-name"
              type="text"
              {...register('name')}
              className="w-full bg-black border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
              placeholder="John Trader"
            />
            {errors.name && <p className="text-[10px] text-negative">{errors.name.message}</p>}
          </div>

          {/* Password (optional) */}
          <div className="space-y-1">
            <label
              htmlFor="new-user-password"
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              PASSWORD (OPTIONAL — AUTO-GENERATED IF EMPTY)
            </label>
            <div className="relative">
              <input
                id="new-user-password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full bg-black border border-border px-3 py-2 pr-9 text-xs text-foreground focus:outline-none focus:border-accent font-mono"
                placeholder="Leave blank for a secure generated password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[10px] text-negative">{errors.password.message}</p>
            )}
          </div>

          {/* Commercial Tier */}
          <div className="space-y-1">
            <label
              htmlFor="new-user-tier"
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              COMMERCIAL SUBSCRIPTION TIER
            </label>
            <select
              id="new-user-tier"
              {...register('tier')}
              className="w-full bg-black border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent font-bold"
            >
              <option value="free">FREE (Basic Quota)</option>
              <option value="starter">STARTER (Retail Trader)</option>
              <option value="pro">PRO (Pro Analysis & Priority)</option>
              <option value="premium">PREMIUM (Dedicated Models)</option>
              <option value="vip">VIP (Institutional / Unlimited)</option>
            </select>
            {errors.tier && <p className="text-[10px] text-negative">{errors.tier.message}</p>}
          </div>

          {/* Credits */}
          <div className="space-y-1">
            <label
              htmlFor="new-user-credits"
              className="text-[10px] uppercase text-muted-foreground tracking-wider block"
            >
              INITIAL CREDIT BALANCE
            </label>
            <input
              id="new-user-credits"
              type="number"
              {...register('credits')}
              className="w-full bg-black border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent tabular-nums"
              placeholder="100"
            />
            {errors.credits && (
              <p className="text-[10px] text-negative">{errors.credits.message}</p>
            )}
          </div>

          {/* Admin flag */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('isAdmin')}
              className="accent-accent cursor-pointer"
            />
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider">
              GRANT ADMINISTRATOR PRIVILEGES
              {isAdmin && (
                <span className="text-negative font-bold ml-2">— FULL SYSTEM ACCESS</span>
              )}
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border bg-black hover:bg-surface-hover text-muted-foreground hover:text-foreground px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="flex-1 border border-accent/40 bg-accent/10 hover:bg-accent hover:text-black text-accent px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createUserMutation.isPending ? 'PROVISIONING...' : 'CREATE USER'}
            </button>
          </div>
        </form>
      )}
    </TerminalModal>
  );
}
