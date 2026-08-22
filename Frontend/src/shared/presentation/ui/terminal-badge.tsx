import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center font-mono font-bold uppercase tracking-wider select-none border',
  {
    variants: {
      variant: {
        accent: 'border-accent/40 bg-accent/10 text-accent',
        positive: 'border-positive/40 bg-positive/10 text-positive',
        negative: 'border-negative/40 bg-negative/10 text-negative',
        info: 'border-info/40 bg-info/10 text-info',
        muted: 'border-border bg-black text-muted-foreground'
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[9px]',
        md: 'px-2 py-0.5 text-[10px]'
      }
    },
    defaultVariants: {
      variant: 'muted',
      size: 'sm'
    }
  }
);

export interface TerminalBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function TerminalBadge({
  children,
  variant,
  size,
  dot = false,
  className = '',
  ...props
}: TerminalBadgeProps) {
  return (
    <span className={badgeVariants({ variant, size, className })} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current mr-1 animate-pulse" />}
      {children}
    </span>
  );
}
