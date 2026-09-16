import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, LoaderCircle, X } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import type { ToastVariant, ToastItem } from '@/types';

// ─── Icons & colours per variant ─────────────────────────────────────────────

const CONFIG: Record<
  ToastVariant,
  { icon: React.ReactNode; title: string; accent: string; iconBg: string }
> = {
  success: {
    icon: <CheckCircle size={16} className="text-success shrink-0" />,
    title: 'Готово',
    accent: 'bg-success',
    iconBg: 'bg-success/10',
  },
  error: {
    icon: <AlertCircle size={16} className="text-danger shrink-0" />,
    title: 'Ошибка',
    accent: 'bg-danger',
    iconBg: 'bg-danger/10',
  },
  warning: {
    icon: <AlertTriangle size={16} className="text-warning shrink-0" />,
    title: 'Внимание',
    accent: 'bg-warning',
    iconBg: 'bg-warning/10',
  },
  info: {
    icon: <Info size={16} className="text-blue-400 shrink-0" />,
    title: 'Информация',
    accent: 'bg-blue-400',
    iconBg: 'bg-blue-400/10',
  },
};

// ─── Single toast ─────────────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: ToastItem }) {
  const removeToast = useNotificationStore((s) => s.removeToast);
  const { icon, title, accent, iconBg } = CONFIG[toast.variant];
  const displayIcon = toast.loading
    ? <LoaderCircle size={15} className="animate-spin text-blue-400" />
    : icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      role="alert"
      aria-live="polite"
      className={[
        'relative flex items-center gap-2 w-[300px] max-w-[calc(100vw-1.5rem)] px-2.5 py-2',
        'bg-[#171720] border border-white/[0.08] rounded-[9px] shadow-[0_7px_18px_rgba(0,0,0,0.24)] overflow-hidden',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={["flex h-6 w-6 shrink-0 items-center justify-center rounded-full", iconBg].join(' ')}>
        {displayIcon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[8px] font-semibold uppercase tracking-[0.07em] text-text-muted">
          {title}
        </span>
        <span className="break-words text-[11px] font-medium leading-snug text-text-primary">
          {toast.message}
        </span>
      </span>
      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Закрыть"
        className="shrink-0 rounded-md p-0.5 text-text-muted transition-colors hover:bg-white/[0.07] hover:text-text-primary"
      >
        <X size={12} />
      </button>
      <motion.span
        key={`${toast.id}-${toast.duration}-${toast.loading ? 'loading' : 'done'}`}
        aria-hidden
        className={["absolute bottom-0 left-0 h-0.5", accent].join(' ')}
        initial={{ width: '100%' }}
        animate={{ width: 0 }}
        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 sm:bottom-5 sm:right-5"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence mode="sync" initial={false}>
        {[...toasts].reverse().map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Convenience hook ─────────────────────────────────────────────────────────

export function useToast() {
  const addToast = useNotificationStore((s) => s.addToast);
  return addToast;
}
