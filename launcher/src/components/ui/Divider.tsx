import React from 'react';

interface DividerProps {
  label?: string;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({
  label,
  className = '',
  orientation = 'horizontal',
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className={['w-px self-stretch bg-[rgba(255,255,255,0.06)]', className]
          .filter(Boolean)
          .join(' ')}
      />
    );
  }

  if (label) {
    return (
      <div
        className={['flex items-center gap-3', className].filter(Boolean).join(' ')}
      >
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
        <span className="text-xs text-text-muted select-none">{label}</span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
      </div>
    );
  }

  return (
    <div
      className={['h-px bg-[rgba(255,255,255,0.06)] w-full', className]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
