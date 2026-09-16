import React, { useEffect, useRef } from 'react';
import { BotDashboard } from './BotDashboard';
import { useBotStore } from '@/stores/botStore';
import { closeBotDashboardWindow, getLocalBotStatus, stopLocalBot } from '@/services/desktop';
import type { Bot } from '@/types';

export function BotDashboardWindow() {
  const setBots = useBotStore((state) => state.setBots);
  const bot = useBotStore((state) => state.bots[0]);
  const closing = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('afkflow.dashboard.bot');
      if (raw) setBots([JSON.parse(raw) as Bot]);
    } catch {
      void closeBotDashboardWindow();
    }
  }, [setBots]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
        if (closing.current) return;
        closing.current = true;
        event.preventDefault();
        if (bot?.id) await stopLocalBot(bot.id).catch(() => undefined);
        await closeBotDashboardWindow();
      });
    });
    return () => unlisten?.();
  }, [bot?.id]);

  useEffect(() => {
    if (!bot?.id) return;
    const timer = window.setInterval(() => {
      void getLocalBotStatus(bot.id).then((state) => {
        if (!state || state.status === 'idle' || state.status === 'crashed') {
          void closeBotDashboardWindow().catch(() => undefined);
        }
      }).catch(() => undefined);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [bot?.id]);

  return <BotDashboard isOpen standalone botId={bot?.id} onClose={() => void closeBotDashboardWindow()} />;
}
