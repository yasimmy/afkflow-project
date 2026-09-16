import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBotStore } from '@/stores/botStore';
import { useToast } from '@/components/ui/Toast';
import { getBots, startBot, stopBot, restartBot } from '@/api/client';
import { prepareHomeBots } from '@/assets/botIcons';

export function useBots() {
  const addToast = useToast();
  const qc       = useQueryClient();
  const { setBots, updateBotStatus, addRunningBot, removeRunningBot, bots } = useBotStore();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const query = useQuery({
    queryKey: ['bots'],
    queryFn:  async () => {
      const data = await getBots();
      const enriched = prepareHomeBots(data);
      setBots(enriched);
      return enriched;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // ── Start ──────────────────────────────────────────────────────────────────
  const startMutation = useMutation({
    mutationFn: (botId: string) => startBot(botId),
    onMutate:  (botId) => updateBotStatus(botId, 'starting'),
    onSuccess: (_, botId) => {
      updateBotStatus(botId, 'running');
      addRunningBot(botId);
      const name = bots.find((b) => b.id === botId)?.name ?? 'Бот';
      addToast(`${name} запущен`, 'success');
      void qc.invalidateQueries({ queryKey: ['bots'] });
    },
    onError: (_, botId) => {
      updateBotStatus(botId, 'error');
      addToast('Не удалось запустить бота. Попробуйте ещё раз.', 'error');
    },
  });

  // ── Stop ───────────────────────────────────────────────────────────────────
  const stopMutation = useMutation({
    mutationFn: (botId: string) => stopBot(botId),
    onMutate:  (botId) => updateBotStatus(botId, 'stopping'),
    onSuccess: (_, botId) => {
      updateBotStatus(botId, 'ready');
      removeRunningBot(botId);
      const name = bots.find((b) => b.id === botId)?.name ?? 'Бот';
      addToast(`${name} остановлен`, 'success');
      void qc.invalidateQueries({ queryKey: ['bots'] });
    },
    onError: (_, botId) => {
      updateBotStatus(botId, 'running');
      addToast('Не удалось остановить бота. Попробуйте ещё раз.', 'error');
    },
  });

  // ── Restart ────────────────────────────────────────────────────────────────
  const restartMutation = useMutation({
    mutationFn: (botId: string) => restartBot(botId),
    onMutate:  (botId) => updateBotStatus(botId, 'starting'),
    onSuccess: (_, botId) => {
      updateBotStatus(botId, 'running');
      addRunningBot(botId);
      const name = bots.find((b) => b.id === botId)?.name ?? 'Бот';
      addToast(`${name} перезапущен`, 'success');
      void qc.invalidateQueries({ queryKey: ['bots'] });
    },
    onError: (_, botId) => {
      updateBotStatus(botId, 'error');
      addToast('Не удалось перезапустить бота.', 'error');
    },
  });

  return {
    bots,
    isLoading:     query.isLoading,
    refetch:       query.refetch,
    startBot:      (id: string) => startMutation.mutate(id),
    stopBot:       (id: string) => stopMutation.mutate(id),
    restartBot:    (id: string) => restartMutation.mutate(id),
    isStarting:    (id: string) => startMutation.isPending && startMutation.variables === id,
    isStopping:    (id: string) => stopMutation.isPending   && stopMutation.variables === id,
  };
}
