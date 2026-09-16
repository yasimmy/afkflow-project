import React from 'react';
import { motion } from 'framer-motion';
import { Spinner } from './Spinner';
import { Sounds } from '@/hooks/useSound';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-light shadow-glow-sm hover:shadow-glow ' +
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
  secondary:
    'bg-bg-card text-text-primary border border-[rgba(255,255,255,0.08)] hover:bg-bg-hover hover:border-[rgba(255,255,255,0.14)] ' +
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
  danger:
    'bg-danger text-white hover:bg-red-500 ' +
    'focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover ' +
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
  outline:
    'bg-transparent text-accent border border-accent hover:bg-accent-dim ' +
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
};

const sizeClasses: Record<Size, string> = {
  xs: 'h-7 px-3 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3.5 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-md',
  lg: 'h-11 px-6 text-[15px] gap-2 rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  fullWidth = false,
  className = '',
  onClick,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    Sounds.click();
    onClick?.(e);
  };

  return (
    <motion.button
      whileTap={!isDisabled ? { scale: 0.97 } : {}}
      transition={{ duration: 0.1 }}
      className={[
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 outline-none',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={isDisabled}
      data-sound-click="handled"
      onClick={handleClick}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </motion.button>
  );
}
