import React from 'react';

type Variant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-accent/20 text-accent-light border border-accent/30',
  success: 'bg-success/15 text-success border border-success/25',
  danger:  'bg-danger/15 text-red-400 border border-danger/25',
  warning: 'bg-warning/15 text-amber-400 border border-warning/25',
  info:    'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  muted:   'bg-bg-hover text-text-muted border border-[rgba(255,255,255,0.06)]',
};

const dotColors: Record<Variant, string> = {
  default: 'bg-accent-light',
  success: 'bg-success',
  danger:  'bg-danger',
  warning: 'bg-warning',
  info:    'bg-blue-400',
  muted:   'bg-text-muted',
};

export function Badge({ children, variant = 'default', dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
