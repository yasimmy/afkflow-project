/**
 * useLocalBotSync
 *
 * На старте приложения опрашивает Tauri о живых Python-процессах и
 * синхронизирует statuses в botStore. После этого периодически проверяет
 * каждые 5 секунд — если процесс упал, помечает бот как 'error'.
 *
 * Работает только внутри Tauri (в браузере — no-op).
 */
import { useEffect, useRef } from 'react';
import { useBotStore } from '@/stores/botStore';
import { getRunningBots, getLocalBotStatus } from '@/services/desktop';

const POLL_INTERVAL_MS = 5_000;

export function useLocalBotSync() {
  const { bots, updateBotStatus, addRunningBot, removeRunningBot } = useBotStore();
  // Keep a stable ref so the interval always sees the latest bots list
  const botsRef = useRef(bots);
  useEffect(() => { botsRef.current = bots; }, [bots]);

  useEffect(() => {
    let cancelled = false;

    // ── Initial sync: mark already-running processes ─────────────────────────
    void (async () => {
      try {
        const running = await getRunningBots();
        if (cancelled) return;

        for (const proc of running) {
          if (proc.status === 'running' || proc.status === 'starting') {
            updateBotStatus(proc.botId, 'running');
            addRunningBot(proc.botId);
          }
        }
      } catch {
        // Tauri not available or no processes — silently skip
      }
    })();

    // ── Periodic health check ─────────────────────────────────────────────────
    const timer = setInterval(async () => {
      if (cancelled) return;

      const currentBots = botsRef.current;
      // Only check bots we believe are running or starting
      const activeBots = currentBots.filter(
        (b) => b.status === 'running' || b.status === 'starting',
      );

      for (const bot of activeBots) {
        try {
          const state = await getLocalBotStatus(bot.id);
          if (cancelled) break;

          if (!state) {
            updateBotStatus(bot.id, 'ready');
            removeRunningBot(bot.id);
          } else if (state.status === 'crashed') {
            updateBotStatus(bot.id, 'error');
            removeRunningBot(bot.id);
          } else if (state.status === 'idle') {
            updateBotStatus(bot.id, 'ready');
            removeRunningBot(bot.id);
          }
          // 'running' / 'starting' → keep as-is
        } catch {
          // IPC error — don't change status, try again next tick
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  // Run once on mount — the interval captures botsRef dynamically
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
