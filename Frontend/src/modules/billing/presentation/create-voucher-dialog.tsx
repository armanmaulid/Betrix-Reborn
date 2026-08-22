'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ticket, Sparkles } from 'lucide-react';
import { CreateVoucherSchema, type CreateVoucherInput } from '@/modules/operations/application/schemas/admin.schema';
import { useCreateVoucherMutation } from '@/modules/billing/application/queries/use-vouchers';
import { useToast } from '@/shared/presentation/ui/terminal-toast';
import { TerminalModal } from '@/shared/presentation/ui/terminal-modal';

interface CreateVoucherDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateVoucherDialog({ isOpen, onClose }: CreateVoucherDialogProps) {
  const { success, error } = useToast();
  const createMutation = useCreateVoucherMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateVoucherInput>({
    resolver: zodResolver(CreateVoucherSchema),
    defaultValues: {
      amount: 10000,
      code: '',
      expiresAt: ''
    }
  });

  // Reset form when the dialog opens (prevents stale values on cancel+reopen)
  useEffect(() => {
    if (isOpen) {
      reset({ amount: 10000, code: '', expiresAt: '' });
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: CreateVoucherInput) => {
    try {
      const payload: CreateVoucherInput = {
        amount: data.amount,
        code: data.code?.trim() || undefined,
        expiresAt: data.expiresAt?.trim() || undefined
      };

      const result: any = await createMutation.mutateAsync(payload);
      const generatedCode =
        (Array.isArray(result) ? result[0]?.code : result?.code) ||
        result?.data?.code ||
        data.code ||
        'Voucher';

      success('VOUCHER CREATED', `Code ${generatedCode} with ${data.amount} credits generated.`);
      reset();
      onClose();
    } catch (err: any) {
      error('CREATION FAILED', err.message || 'Unable to generate voucher.');
    }
  };

  return (
    <TerminalModal
      isOpen={isOpen}
      onClose={onClose}
      title="GENERATE NEW CREDIT VOUCHER"
      icon={Ticket}
      variant="accent"
      maxWidth="md"
    >
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 font-mono">
          {/* Credit Amount */}
          <div className="space-y-1">
            <label htmlFor="voucher-amount" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              CREDIT VALUE (1 - 1,000,000 CREDITS) *
            </label>
            <input
              id="voucher-amount"
              type="number"
              step="1"
              min="1"
              max="1000000"
              autoFocus
              {...register('amount')}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground tabular-nums focus:outline-none focus:border-accent"
              placeholder="e.g. 50000"
            />
            {errors.amount && (
              <p className="text-[10px] text-negative">{errors.amount.message}</p>
            )}
          </div>

          {/* Custom Code */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="voucher-code" className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                CUSTOM VOUCHER CODE (OPTIONAL)
              </label>
              <span className="text-[9px] text-accent flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Auto-generates if blank
              </span>
            </div>
            <input
              id="voucher-code"
              type="text"
              {...register('code')}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground uppercase tracking-wider focus:outline-none focus:border-accent font-bold"
              placeholder="e.g. PROMO-SUMMER26 (or leave empty)"
            />
            {errors.code && (
              <p className="text-[10px] text-negative">{errors.code.message}</p>
            )}
          </div>

          {/* Expiration Date */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground tracking-wider block">
              EXPIRATION TIMESTAMP (OPTIONAL)
            </label>
            <input
              type="datetime-local"
              {...register('expiresAt')}
              className="w-full bg-black border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
            />
            {errors.expiresAt && (
              <p className="text-[10px] text-negative">{errors.expiresAt.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border bg-black"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-1.5 text-xs font-bold bg-accent text-black hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'GENERATING...' : 'ISSUE VOUCHER'}
            </button>
          </div>
        </form>
    </TerminalModal>
  );
}
