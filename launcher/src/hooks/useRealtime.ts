import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useBotStore } from '@/stores/botStore';
import { useModalStore } from '@/stores/modalStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { RealtimeEvent } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Opens a Server-Sent Events connection for real-time bot/subscription updates.
 * Reconnects automatically with exponential back-off on disconnect.
 */
export function useRealtime() {
  const qc         = useQueryClient();
  const authState  = useAuthStore((s) => s.state);
  const { updateBotStatus, addRunningBot, removeRunningBot } = useBotStore();
  const { openModal } = useModalStore();
  const addToast   = useNotificationStore((s) => s.addToast);

  const esRef       = useRef<EventSource | null>(null);
  const retryRef    = useRef(0);
  const retryTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authState !== 'AUTHENTICATED') return;

    const connect = () => {
      const es = new EventSource(`${API_BASE}/api/events`, {
        withCredentials: true,
      });
      esRef.current = es;

      es.onopen = () => {
        retryRef.current = 0;
      };

      es.onmessage = (e: MessageEvent<string>) => {
        let event: RealtimeEvent;
        try {
          event = JSON.parse(e.data) as RealtimeEvent;
        } catch {
          return;
        }
        handleEvent(event);
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;

        // Exponential back-off: 2s, 4s, 8s … capped at 30s
        const delay = Math.min(2000 * Math.pow(2, retryRef.current), 30_000);
        retryRef.current += 1;
        retryTimer.current = setTimeout(connect, delay);
      };
    };

    const handleEvent = (event: RealtimeEvent) => {
      const { type, payload } = event;
      const botId = payload.botId as string | undefined;

      switch (type) {
        case 'bot.starting':
          if (botId) updateBotStatus(botId, 'starting');
          break;

        case 'bot.started':
          if (botId) {
            updateBotStatus(botId, 'running');
            addRunningBot(botId);
          }
          break;

        case 'bot.stopping':
          if (botId) updateBotStatus(botId, 'stopping');
          break;

        case 'bot.stopped':
          if (botId) {
            updateBotStatus(botId, 'ready');
            removeRunningBot(botId);
          }
          break;

        case 'bot.error':
          if (botId) {
            updateBotStatus(botId, 'error');
            openModal('botError', {
              botId,
              errorMessage: payload.message as string | undefined,
            });
          }
          break;

        case 'bot.restarting':
          if (botId) updateBotStatus(botId, 'starting');
          addToast('Бот перезапускается...', 'info', 2500);
          break;

        case 'subscription.updated':
          void qc.invalidateQueries({ queryKey: ['me'] });
          void qc.invalidateQueries({ queryKey: ['subscription'] });
          break;

        case 'maintenance.started':
          addToast('Сервер на техническом обслуживании.', 'warning', 6000);
          break;

        case 'maintenance.ended':
          addToast('Сервер снова доступен.', 'success', 4000);
          void qc.invalidateQueries({ queryKey: ['me'] });
          break;

        default:
          break;
      }
    };

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState]);
}
