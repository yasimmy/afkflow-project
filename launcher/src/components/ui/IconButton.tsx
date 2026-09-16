import React from 'react';
import { motion } from 'framer-motion';
import { Sounds } from '@/hooks/useSound';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'ghost' | 'secondary' | 'danger';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: Size;
  variant?: Variant;
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-7 h-7 rounded-md',
  md: 'w-8 h-8 rounded-md',
  lg: 'w-9 h-9 rounded-lg',
};

const variantClasses: Record<Variant, string> = {
  ghost:
    'text-text-muted hover:text-text-primary hover:bg-bg-hover ' +
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
  secondary:
    'bg-bg-card text-text-secondary border border-[rgba(255,255,255,0.08)] hover:bg-bg-hover hover:text-text-primary ' +
    'focus-visible:ring-2 focus-visible:ring-accent',
  danger:
    'text-text-muted hover:text-danger hover:bg-red-500/10 ' +
    'focus-visible:ring-2 focus-visible:ring-danger',
};

export function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  className = '',
  onClick,
  ...props
}: IconButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    Sounds.click();
    onClick?.(e);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      transition={{ duration: 0.1 }}
      aria-label={label}
      data-sound-click="handled"
      className={[
        'inline-flex items-center justify-center transition-all duration-150 outline-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {icon}
    </motion.button>
  );
}
