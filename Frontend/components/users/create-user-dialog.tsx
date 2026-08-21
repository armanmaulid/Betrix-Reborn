'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, X, KeyRound, Copy, Check } from 'lucide-react';
import { CreateAdminUserSchema, type CreateAdminUserInput } from '@/lib/schemas/admin.schema';
import { useCreateUserMutation } from '@/lib/queries/use-users';
import { useToast } from '@/components/ui/terminal-toast';

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateUserDialog({ isOpen, onClose }: CreateUserDialogProps) {
  const { success, error } = useToast();
  const createUserMutation = useCreateUserMutation();
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

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
      const gen = result?.data?.generatedPassword || null;
      if (gen) {
        // Show the generated password once — never retrievable again
        setGeneratedPassword(gen);
      } else {
        success('USER CREATED', `Account for ${data.email} provisioned successfully.`);
        reset();
        onClose();
      }
    } catch (err: any) {
      error('CREATION FAILED', err.message || 'Unable to create user.');
    }
  };

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {}
  };

  const finishAfterPassword = () => {
    setGeneratedPassword(null);
    setCopiedPassword(false);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md border-2 border-accent bg-surface shadow-2xl font-mono">
        {/* Header */}
        <div className="bg-accent/10 border-b border-accent/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-accent">
            <UserPlus className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">
              PROVISION NEW USER ACCOUNT
            </span>
          </div>
          <button
            onClick={generatedPassword ? finishAfterPassword : onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

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
                {copiedPassword ? <Check className="w-4 h-4 text-positive" /> : <Copy className="w-4 h-4" />}
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
              <label htmlFor="new-user-email" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
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
              <label htmlFor="new-user-name" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
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
              <label htmlFor="new-user-password" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                PASSWORD (OPTIONAL — AUTO-GENERATED IF EMPTY)
              </label>
              <input
                id="new-user-password"
                type="text"
                {...register('password')}
                className="w-full bg-black border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent font-mono"
                placeholder="Leave blank for a secure generated password"
              />
              {errors.password && <p className="text-[10px] text-negative">{errors.password.message}</p>}
            </div>

            {/* Commercial Tier */}
            <div className="space-y-1">
              <label htmlFor="new-user-tier" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
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
              <label htmlFor="new-user-credits" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                INITIAL CREDIT BALANCE
              </label>
              <input
                id="new-user-credits"
                type="number"
                {...register('credits')}
                className="w-full bg-black border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent tabular-nums"
                placeholder="100"
              />
              {errors.credits && <p className="text-[10px] text-negative">{errors.credits.message}</p>}
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
                {isAdmin && <span className="text-negative font-bold ml-2">— FULL SYSTEM ACCESS</span>}
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
      </div>
    </div>
  );
}
