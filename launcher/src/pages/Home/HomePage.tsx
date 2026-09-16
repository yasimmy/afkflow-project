import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Trash2, Users } from 'lucide-react';
import { Layout } from '@/components/layout';
import { ProfileHeader } from '@/components/layout/ProfileHeader';
import { BotCardSkeleton, IconButton } from '@/components/ui';
import { BotCard } from '@/components/bot/BotCard';
import { useBotStore } from '@/stores/botStore';
import { useModalStore } from '@/stores/modalStore';
import { useToast } from '@/components/ui/Toast';
import { getBots, startBot, stopBot, pauseBot, resumeBot, getBotConfig } from '@/api/client';
import { prepareHomeBots } from '@/assets/botIcons';
import { hasConfirmedBotConfig, startLocalBot, formatInvokeError, sendBotCommand, saveLocalBotConfig } from '@/services/desktop';
import { Sounds } from '@/hooks/useSound';
const STORE_URL = import.meta.env.VITE_STORE_URL ?? 'https://afkflow.ru/shop';

export function HomePage() {
  const addToast     = useToast();
  const { bots, setBots, updateBotStatus, addRunningBot, runningBots, runningSince } = useBotStore();
  const { openModal } = useModalStore();
  const { isLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: async () => {
      const data = await getBots();
      const enriched = prepareHomeBots(data);
      setBots(enriched);
      return enriched;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const startMutation = useMutation({
    mutationFn: async ({ botId, extraConfig = {} }: { botId: string; extraConfig?: Record<string, unknown> }) => {
      await startBot(botId);

      let config: Record<string, unknown> = {};
      try {
        const saved = await getBotConfig(botId);
        config = saved.config ?? {};
      } catch {
        // defaults from settings.json
      }

      const merged = { ...config, ...extraConfig };

      try {
        await startLocalBot(botId, '', merged);
      } catch (err) {
        try { await stopBot(botId); } catch { /* ignore */ }
        throw err;
      }

      return botId;
    },
    onMutate: ({ botId }) => updateBotStatus(botId, 'starting'),
    onSuccess: (botId) => {
      updateBotStatus(botId, 'running');
      addRunningBot(botId);
      Sounds.botStart();
      const name = bots.find((b) => b.id === botId)?.name ?? 'Бот';
      addToast(`${name} запущен`, 'success');
    },
    onError: (err, { botId }) => {
      updateBotStatus(botId, 'error');
      addToast(formatInvokeError(err) || 'Не удалось запустить бота. Попробуйте ещё раз.', 'error');
    },
  });

  const handleStart = useCallback(async (botId: string) => {
    const bot = bots.find((item) => item.id === botId);
    if (bot?.slug === 'rutine-helper') {
      openModal('routineHelper', {
        botId,
        onPick: (profile: string) => {
          void saveLocalBotConfig(botId, { profile }).catch(() => undefined);
          startMutation.mutate({ botId, extraConfig: { profile } });
        },
      });
      return;
    }
    if (!hasConfirmedBotConfig(botId)) {
      openModal('botSettings', { botId, firstLaunch: true, onConfirmAndStart: () => startMutation.mutate({ botId }) });
      return;
    }
    startMutation.mutate({ botId });
  }, [bots, openModal, startMutation]);

  const handleStop = useCallback((botId: string) => openModal('stopBot', { botId }), [openModal]);
  const handleSettings = useCallback((botId: string) => {
    const bot = bots.find((item) => item.id === botId);
    if (bot?.slug === 'rutine-helper') {
      openModal('routineHelper', {
        onPick: (profile: string) => {
          void saveLocalBotConfig(botId, { profile }).catch(() => undefined);
        },
      });
      return;
    }
    openModal('botSettings', { botId });
  }, [bots, openModal]);
  const handlePause = useCallback(async (botId: string) => {
    try {
      await sendBotCommand(botId, 'pause').catch(() => undefined);
      await pauseBot(botId);
      updateBotStatus(botId, 'paused');
      addToast(`${bots.find((b) => b.id === botId)?.name ?? 'Бот'} на паузе`, 'success');
    } catch {
      addToast('Не удалось поставить бота на паузу', 'error');
    }
  }, [addToast, bots, updateBotStatus]);

  const handleResume = useCallback(async (botId: string) => {
    try {
      await sendBotCommand(botId, 'resume').catch(() => undefined);
      await resumeBot(botId);
      updateBotStatus(botId, 'running');
      addToast(`${bots.find((b) => b.id === botId)?.name ?? 'Бот'} возобновлен`, 'success');
    } catch {
      addToast('Не удалось возобновить бота', 'error');
    }
  }, [addToast, bots, updateBotStatus]);

  const handleBuy = useCallback(async (botId: string) => {
    const bot = bots.find((b) => b.id === botId);
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(`${STORE_URL}?bot=${bot?.slug ?? botId}`);
    } catch {
      window.open(`${STORE_URL}?bot=${bot?.slug ?? botId}`, '_blank');
    }
  }, [bots]);

  const loadingBotIds = new Set(
    startMutation.isPending && startMutation.variables ? [startMutation.variables.botId] : [],
  );

  const activeBotId = bots.find((bot) =>
    bot.status === 'running' || bot.status === 'starting' || bot.status === 'paused' || bot.status === 'stopping',
  )?.id ?? [...runningBots][0];

  // Actual entitled bot count from the bots list (source of truth)
  const entitledCount = bots.filter((b) => b.entitled).length;

  return (
    <Layout>
      {/*
        The outer div fills the full height given by Layout (which is 100% - titlebar).
        We use a flex column with NO overflow so nothing scrolls.
        Heights are distributed with flex so cards fill available space exactly.
      */}
      <div className="home-shell" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: '#0B0B0F',
        position: 'relative',
        isolation: 'isolate',
      }}>

        {/* Title + Profile — single row */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 36,
          paddingRight: 28,
          paddingTop: 18,   /* breathing room below titlebar */
          paddingBottom: 16,
        }}>
          {/* Left: title */}
          <div className="home-title-block">
            <h1 style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: '-0.3px',
            }}>
              Мои боты
            </h1>
            <p style={{
              fontSize: 12,
              color: '#555563',
              margin: '3px 0 0 0',
            }}>
              Боты в подписке
            </p>
          </div>

          {/* Right: emergency action and profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="group relative">
              <IconButton
                icon={<Trash2 size={15} strokeWidth={2} />}
                label="Экстренная очистка логов"
                onClick={() => openModal('clearLogs')}
                className="border border-white/[0.08] text-text-muted hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
              />
              <span className="pointer-events-none absolute right-full top-1/2 z-20 mr-2 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md border border-white/[0.1] bg-[#1B1B27] px-2.5 py-1.5 text-[11px] font-medium text-text-primary opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
                Очистить логи AFKFlow
                <span className="absolute left-full top-1/2 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-[#1B1B27]" />
              </span>
            </div>
            <ProfileHeader />
          </div>
        </div>

        {/* Grid — flex: 1 fills everything between title and footer */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          paddingLeft: 32,
          paddingRight: 32,
          /* paddingTop gives space so cards don't clip at top when hover lifts them */
          paddingTop: 4,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {isLoading ? (
            <div className="home-bot-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <BotCardSkeleton key={i} />
              ))}
            </div>
          ) : bots.length === 0 ? (
            <EmptyBots />
          ) : (
            <motion.div
              className="home-bot-grid"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {bots.slice(0, 10).map((bot) => (
                <motion.div
                  key={bot.id}
                  style={{ minHeight: 0, display: 'flex' }}
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}
                >
                  <BotCard
                    bot={bot}
                    isRunning={bot.status === 'running'}
                    isLoading={loadingBotIds.has(bot.id)}
                      isBlockedByOtherBot={Boolean(activeBotId && activeBotId !== bot.id)}
                      runningSince={runningSince[bot.id]}
                    onStart={handleStart}
                    onStop={handleStop}
                    onPause={handlePause}
                    onResume={handleResume}
                    onSettings={handleSettings}
                    onBuy={handleBuy}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Footer — fixed height ~34px */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '8px 20px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <Users size={13} color="#7C5CFF" />
          <span style={{ fontSize: 12, color: '#A7A7B4' }}>
            Ботов в подписке:{' '}
            <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
              {isLoading ? '...' : entitledCount}
            </span>
          </span>
        </div>

      </div>
    </Layout>
  );
}

function EmptyBots() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 12,
      textAlign: 'center',
    }}>
      <div style={{
        width: 52,
        height: 52,
        borderRadius: 12,
        background: '#15151D',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Users size={20} color="#666673" />
      </div>
      <p style={{ fontSize: 15, fontWeight: 500, color: '#FFFFFF', margin: 0 }}>
        Ботов пока нет
      </p>
      <p style={{ fontSize: 13, color: '#A7A7B4', maxWidth: 280, margin: 0, lineHeight: 1.5 }}>
        Ваша подписка не содержит ботов. Посетите магазин AFKFlow, чтобы получить доступ.
      </p>
    </div>
  );
}
