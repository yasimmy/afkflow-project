import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** Enable hover lift effect */
  interactive?: boolean;
  /** Show accent border on hover */
  accentHover?: boolean;
  as?: React.ElementType;
}

export function Card({
  children,
  className = '',
  onClick,
  interactive = false,
  accentHover = false,
  as: Tag = 'div',
}: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={[
        'bg-bg-card border border-[rgba(255,255,255,0.06)] rounded-lg',
        interactive
          ? 'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card cursor-pointer'
          : '',
        accentHover
          ? 'hover:border-accent/30'
          : '',
        onClick && !interactive ? 'cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  );
}
