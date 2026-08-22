import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-mono text-xs font-bold uppercase tracking-wider transition-colors select-none disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-black hover:bg-accent/90 border border-accent',
        secondary: 'bg-surface hover:bg-surface-hover text-foreground border border-border hover:border-accent/60',
        danger: 'bg-negative/20 text-negative border border-negative/60 hover:bg-negative hover:text-white',
        positive: 'bg-positive/20 text-positive border border-positive/60 hover:bg-positive hover:text-black',
        ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface/50 border border-transparent'
      },
      size: {
        sm: 'px-2.5 py-1 text-[10px] gap-1',
        md: 'px-3.5 py-1.5 text-xs gap-1.5',
        lg: 'px-5 py-2.5 text-xs gap-2'
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md'
    }
  }
);

export interface TerminalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export function TerminalButton({
  children,
  variant,
  size,
  isLoading,
  disabled,
  className = '',
  ...props
}: TerminalButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {isLoading && (
        <span className="h-2 w-2 rounded-full bg-current animate-ping mr-1" />
      )}
      {children}
    </button>
  );
}
