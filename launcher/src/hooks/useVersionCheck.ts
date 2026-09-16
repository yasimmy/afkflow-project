import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModalStore } from '@/stores/modalStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getVersion } from '@/api/client';

const CURRENT_VERSION = '1.0.0';
let startupNoticeShown = false;
let checkingToastId: string | undefined;

function isNewer(remote: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const r = parse(remote);
  const c = parse(current);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rv = r[i] ?? 0;
    const cv = c[i] ?? 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }
  return false;
}

export function useVersionCheck() {
  const openModal = useModalStore((s) => s.openModal);
  const addToast = useNotificationStore((s) => s.addToast);
  const updateToast = useNotificationStore((s) => s.updateToast);

  useEffect(() => {
    if (startupNoticeShown) return;
    startupNoticeShown = true;
    checkingToastId = addToast('Проверяем обновления...', 'info', 15000, true);
  }, [addToast]);

  const { data, isError } = useQuery({
    queryKey: ['version'],
    queryFn:  getVersion,
    staleTime: 60 * 60_000, // 1 hour
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (!checkingToastId || (!data && !isError)) return;
    if (isError) {
      updateToast(checkingToastId, {
        message: 'Не удалось проверить обновления',
        variant: 'error',
        duration: 4000,
        loading: false,
      });
      checkingToastId = undefined;
      return;
    }
    if (isNewer(data.version, CURRENT_VERSION)) {
      const modalType = data.critical ? 'criticalUpdate' : 'updateAvailable';
      openModal(modalType, {
        version:   data.version,
        changelog: data.changelog,
      });
      updateToast(checkingToastId, {
        message: `Доступно обновление v${data.version}`,
        variant: 'info',
        duration: 4000,
        loading: false,
      });
    } else {
      updateToast(checkingToastId, {
        message: 'Обновлений нет',
        variant: 'info',
        duration: 3000,
        loading: false,
      });
    }
    checkingToastId = undefined;
  }, [data, isError, openModal, updateToast]);
}
