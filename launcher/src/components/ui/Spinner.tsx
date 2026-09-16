import React from 'react';
import { motion } from 'framer-motion';

type Size = 'xs' | 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: Size;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-5 h-5 border-2',
  lg: 'w-7 h-7 border-2',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <motion.span
      aria-label="Загрузка"
      role="status"
      className={[
        sizeClasses[size],
        'border-text-muted border-t-accent rounded-full shrink-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  /** Pulse animation enabled (default true) */
  animate?: boolean;
}

export function Skeleton({ className = '', animate = true }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={[
        'bg-bg-card rounded-md',
        animate ? 'animate-pulse' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

// ─── BotCardSkeleton ──────────────────────────────────────────────────────────

export function BotCardSkeleton() {
  return (
    <div className="bg-bg-card border border-[rgba(255,255,255,0.06)] rounded-lg p-5 flex flex-col gap-4">
      {/* icon */}
      <Skeleton className="w-14 h-14 rounded-lg" />
      {/* name + desc */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      {/* status dot + label */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      {/* buttons */}
      <div className="flex gap-2 mt-auto">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
      </div>
    </div>
  );
}
