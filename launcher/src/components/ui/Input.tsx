import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, '-') ?? Math.random()}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-text-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            'w-full h-9 rounded-md bg-bg-primary border text-sm text-text-primary placeholder:text-text-muted',
            'transition-colors duration-150 outline-none',
            'focus:border-accent focus:ring-1 focus:ring-accent/30',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/30'
              : 'border-[rgba(255,255,255,0.08)]',
            leftIcon  ? 'pl-9'  : 'pl-3',
            rightIcon ? 'pr-9' : 'pr-3',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-text-muted pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

// ─── NumberInput shortcut ─────────────────────────────────────────────────────

export function NumberInput(props: Omit<InputProps, 'type'>) {
  const { className = '', ...inputProps } = props;
  return <Input type="number" className={`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${className}`} {...inputProps} />;
}
