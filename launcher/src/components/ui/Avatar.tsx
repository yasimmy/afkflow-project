import React, { useState } from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: Size;
  className?: string;
  /** Purple ring for profile highlight */
  ring?: boolean;
}

const sizeClasses: Record<Size, string> = {
  xs:  'w-6 h-6 text-[10px]',
  sm:  'w-8 h-8 text-xs',
  md:  'w-9 h-9 text-sm',
  lg:  'w-11 h-11 text-base',
  xl:  'w-14 h-14 text-lg',
  '2xl': 'w-20 h-20 text-2xl',
};

export function Avatar({
  src,
  alt = 'Avatar',
  fallback = '?',
  size = 'md',
  className = '',
  ring = false,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const ringClass = ring
    ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-card'
    : '';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        className={[
          sizeClasses[size],
          'rounded-full object-cover shrink-0',
          ringClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    );
  }

  return (
    <span
      aria-label={alt}
      className={[
        sizeClasses[size],
        'rounded-full shrink-0 flex items-center justify-center font-semibold select-none',
        'bg-gradient-to-br from-accent to-accent-light text-white',
        ringClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {fallback.charAt(0).toUpperCase()}
    </span>
  );
}
