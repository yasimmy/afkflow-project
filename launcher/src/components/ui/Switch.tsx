import React from 'react';
import { motion } from 'framer-motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
}: SwitchProps) {
  const switchId = id ?? `switch-${label?.toLowerCase().replace(/\s+/g, '-') ?? Math.random()}`;

  return (
    <label
      htmlFor={switchId}
      className={[
        'flex items-center justify-between gap-4',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <span className="text-sm font-medium text-text-primary">{label}</span>
          )}
          {description && (
            <span className="text-xs text-text-muted">{description}</span>
          )}
        </div>
      )}

      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={[
          'relative w-10 h-5 rounded-full shrink-0 transition-colors duration-200 outline-none',
          'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card',
          checked ? 'bg-accent' : 'bg-bg-hover',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <motion.span
          layout
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
          animate={{ left: checked ? '22px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </label>
  );
}
