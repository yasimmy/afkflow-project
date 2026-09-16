import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getHealth } from '@/api/client';

const POLL_INTERVAL_MS = 30_000;

/**
 * Tracks both native navigator.onLine and backend reachability.
 * Shows a toast when connectivity is restored.
 */
export function useOnlineStatus() {
  const { isOnline, setOnline, resetOfflineBanner } = useUiStore();
  const addToast = useNotificationStore((s) => s.addToast);

  // Native browser online/offline events
  useEffect(() => {
    const handleOnline  = () => { setOnline(true);  resetOfflineBanner(); };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, resetOfflineBanner]);

  // Backend health polling
  useEffect(() => {
    let prevOnline = isOnline;

    const check = async () => {
      try {
        await getHealth();
        if (!prevOnline) {
          setOnline(true);
          resetOfflineBanner();
          addToast('Соединение восстановлено', 'success', 3000);
        }
        prevOnline = true;
      } catch {
        if (prevOnline) {
          setOnline(false);
        }
        prevOnline = false;
      }
    };

    const id = setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isOnline;
}
