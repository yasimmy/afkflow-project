import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, X } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';

export function OfflineBanner() {
  const isOnline              = useUiStore((s) => s.isOnline);
  const dismissed             = useUiStore((s) => s.offlineBannerDismissed);
  const dismissOfflineBanner  = useUiStore((s) => s.dismissOfflineBanner);

  const visible = !isOnline && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="offline-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-6 py-2.5 bg-warning/10 border-b border-warning/20">
            <div className="flex items-center gap-2 text-amber-400">
              <WifiOff size={14} className="shrink-0" />
              <span className="text-xs font-medium">
                Нет подключения к серверу
              </span>
            </div>
            <button
              onClick={dismissOfflineBanner}
              aria-label="Скрыть"
              className="text-amber-400/60 hover:text-amber-400 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
