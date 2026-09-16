import { create } from 'zustand';
import type { Bot, BotStatus } from '@/types';

interface BotStore {
  bots: Bot[];
  /** Set of botIds currently running */
  runningBots: Set<string>;
  /** Unix timestamps for the current run of each active bot */
  runningSince: Record<string, number>;
  /** BotId currently selected for detail view */
  selectedBotId: string | null;

  setBots: (bots: Bot[]) => void;
  updateBot: (botId: string, partial: Partial<Bot>) => void;
  updateBotStatus: (botId: string, status: BotStatus) => void;
  addRunningBot: (botId: string) => void;
  removeRunningBot: (botId: string) => void;
  setSelectedBot: (botId: string | null) => void;
  reset: () => void;
}

export const useBotStore = create<BotStore>((set) => ({
  bots: [],
  runningBots: new Set<string>(),
  runningSince: {},
  selectedBotId: null,

  setBots: (bots) =>
    set((s) => ({
      // Preserve in-flight statuses that the backend doesn't know about
      bots: bots.map((b) => {
        const existing = s.bots.find((e) => e.id === b.id);
        const liveStatus = existing?.status;
        // Keep local status if the bot is actively running/starting/paused/stopping
        const keepLocal =
          liveStatus === 'running' ||
          liveStatus === 'starting' ||
          liveStatus === 'paused' ||
          liveStatus === 'stopping' ||
          liveStatus === 'error';
        return keepLocal ? { ...b, status: liveStatus! } : b;
      }),
    })),

  updateBot: (botId, partial) =>
    set((s) => ({
      bots: s.bots.map((b) => (b.id === botId ? { ...b, ...partial } : b)),
    })),

  updateBotStatus: (botId, status) =>
    set((s) => ({
      bots: s.bots.map((b) => (b.id === botId ? { ...b, status } : b)),
    })),

  addRunningBot: (botId) =>
    set((s) => ({
      runningBots: new Set(s.runningBots).add(botId),
      runningSince: s.runningSince[botId]
        ? s.runningSince
        : { ...s.runningSince, [botId]: Date.now() },
    })),

  removeRunningBot: (botId) =>
    set((s) => {
      const next = new Set(s.runningBots);
      next.delete(botId);
      const runningSince = { ...s.runningSince };
      delete runningSince[botId];
      return { runningBots: next, runningSince };
    }),

  setSelectedBot: (botId) => set({ selectedBotId: botId }),

  reset: () => set({ bots: [], runningBots: new Set(), runningSince: {}, selectedBotId: null }),
}));
