import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useBotStore } from '@/stores/botStore';
import { useToast } from '@/components/ui/Toast';
import { getBotConfig, startAllBots } from '@/api/client';
import { formatInvokeError, startLocalBot } from '@/services/desktop';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function StartAllBotsModal({ isOpen, onClose }: Props) {
  const addToast = useToast();
  const qc       = useQueryClient();
  const { bots, updateBotStatus, addRunningBot } = useBotStore();

  const eligible = bots.filter(
    (b) => b.entitled && b.enabled && b.status === 'ready',
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const launches = await startAllBots();
      const started: typeof launches = [];

      try {
        for (const launch of launches) {
          const saved = await getBotConfig(launch.botId);
          await startLocalBot(launch.botId, '', saved.config ?? {});
          started.push(launch);
        }
        return started;
      } catch (error) {
        throw new Error(formatInvokeError(error));
      }
    },
    onMutate: () => {
      eligible.forEach((b) => updateBotStatus(b.id, 'starting'));
    },
    onSuccess: (launches) => {
      launches.forEach((l) => {
        updateBotStatus(l.botId, 'running');
        addRunningBot(l.botId);
      });
      addToast(
        `${launches.length} ${launches.length === 1 ? 'бот запущен' : 'ботов запущено'}`,
        'success',
      );
      void qc.invalidateQueries({ queryKey: ['bots'] });
      onClose();
    },
    onError: (error) => {
      eligible.forEach((b) => updateBotStatus(b.id, 'ready'));
      addToast(formatInvokeError(error) || 'Не удалось запустить ботов. Попробуйте ещё раз.', 'error');
      onClose();
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Запустить все боты?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Отмена
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={mutation.isPending}
            leftIcon={<Play size={14} />}
            onClick={() => mutation.mutate()}
            disabled={eligible.length === 0}
          >
            Запустить все
          </Button>
        </>
      }
    >
      <div className="space-y-2 py-1">
        <p className="text-sm text-text-secondary">
          Будут запущены все доступные и настроенные боты.
        </p>
        {eligible.length === 0 ? (
          <p className="text-xs text-warning">
            Нет ботов, готовых к запуску.
          </p>
        ) : (
          <p className="text-xs text-text-muted">
            Готово к запуску:{' '}
            <span className="text-text-primary font-medium">{eligible.length}</span>
          </p>
        )}
      </div>
    </Modal>
  );
}
