import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** If true, clicking backdrop or pressing ESC is disabled */
  persistent?: boolean;
  /** Show close button in header (default true) */
  closable?: boolean;
  frameless?: boolean;
  className?: string;
}

const sizeClasses = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  persistent = false,
  closable = true,
  frameless = false,
  className = '',
}: ModalProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !persistent) onClose();
    },
    [onClose, persistent],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
    return undefined;
  }, [isOpen, handleEsc]);

  const handleBackdropClick = () => {
    if (!persistent) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={frameless ? 'hidden' : 'fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]'}
            onClick={handleBackdropClick}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={[
              frameless ? 'fixed inset-0 h-full w-full bg-[#080A0F]' : 'fixed z-50 inset-0 m-auto h-fit max-h-[calc(100%-2rem)] w-[calc(100%-2rem)]',
              sizeClasses[size],
              frameless ? '' : 'bg-bg-secondary border border-[rgba(255,255,255,0.08)] rounded-xl shadow-modal',
              'flex flex-col',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {/* Header */}
            {!frameless && <div
              className={frameless ? 'flex items-start justify-between gap-4 px-5 pt-4 pb-3 cursor-move select-none' : 'flex items-start justify-between gap-4 px-6 pt-6 pb-4'}
              onMouseDown={frameless ? () => {
                void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().startDragging());
              } : undefined}
            >
              <div>
                <h2
                  id="modal-title"
                  className="text-base font-semibold text-text-primary leading-snug"
                >
                  {title}
                </h2>
                {description && (
                  <p className="text-sm text-text-secondary mt-1">{description}</p>
                )}
              </div>
              {closable && (
                <IconButton
                  icon={<X size={16} />}
                  label="Закрыть"
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="shrink-0 -mr-1 -mt-1"
                />
              )}
            </div>}

            {/* Body */}
            {children && (
              <div className={frameless ? 'px-5 pb-3 flex-1 min-h-0 overflow-hidden' : 'px-6 pb-2 flex-1 overflow-y-auto scrollbar-thin'}>
                {children}
              </div>
            )}

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 flex items-center justify-end gap-2 border-t border-[rgba(255,255,255,0.06)]">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
