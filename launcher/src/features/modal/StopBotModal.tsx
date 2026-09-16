import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button } from '@/components/ui';
import { useBotStore } from '@/stores/botStore';
import { useToast } from '@/components/ui/Toast';
import { stopBot } from '@/api/client';
import { closeBotDashboardWindow, stopLocalBot } from '@/services/desktop';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  botId?: string;
}

export function StopBotModal({ isOpen, onClose, botId }: Props) {
  const addToast = useToast();
  const qc       = useQueryClient();
  const { bots, updateBotStatus, removeRunningBot } = useBotStore();
  const bot = bots.find((b) => b.id === botId);

  const mutation = useMutation({
    mutationFn: async () => {
      try {
        await stopBot(botId!);
      } catch {
      }
      try {
        await stopLocalBot(botId!);
      } catch {
      }
      await closeBotDashboardWindow().catch(() => undefined);
    },
    onMutate: () => {
      if (botId) updateBotStatus(botId, 'stopping');
    },
    onSuccess: () => {
      if (botId) {
        updateBotStatus(botId, 'ready');
        removeRunningBot(botId);
      }
      const name = bot?.name ?? 'Бот';
      addToast(`${name} остановлен`, 'success');
      void qc.invalidateQueries({ queryKey: ['bots'] });
      onClose();
    },
    onError: () => {
      if (botId) updateBotStatus(botId, 'running');
      addToast('Не удалось остановить бота. Попробуйте ещё раз.', 'error');
      onClose();
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Остановить бота?"
      description={`Текущий процесс «${bot?.name ?? ''}» будет завершён.`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Отмена
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Остановить
          </Button>
        </>
      }
    />
  );
}
