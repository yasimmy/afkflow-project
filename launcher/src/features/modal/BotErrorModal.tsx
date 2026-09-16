import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useBotStore } from '@/stores/botStore';
import { useToast } from '@/components/ui/Toast';
import { startBot } from '@/api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  botId?: string;
  errorMessage?: string;
}

export function BotErrorModal({ isOpen, onClose, botId, errorMessage }: Props) {
  const addToast = useToast();
  const qc       = useQueryClient();
  const { bots, updateBotStatus, addRunningBot } = useBotStore();
  const bot = bots.find((b) => b.id === botId);

  const mutation = useMutation({
    mutationFn: () => startBot(botId!),
    onMutate:   () => { if (botId) updateBotStatus(botId, 'starting'); },
    onSuccess:  () => {
      if (botId) { updateBotStatus(botId, 'running'); addRunningBot(botId); }
      addToast(`${bot?.name ?? 'Бот'} перезапущен`, 'success');
      void qc.invalidateQueries({ queryKey: ['bots'] });
      onClose();
    },
    onError: () => {
      if (botId) updateBotStatus(botId, 'error');
      addToast('Не удалось перезапустить бота.', 'error');
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ошибка бота"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Закрыть
          </Button>
          {botId && (
            <Button
              variant="primary"
              size="sm"
              loading={mutation.isPending}
              leftIcon={<RefreshCw size={14} />}
              onClick={() => mutation.mutate()}
            >
              Перезапустить
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center">
          <AlertCircle size={22} className="text-danger" />
        </div>
        {bot && (
          <p className="text-[15px] font-semibold text-text-primary">{bot.name}</p>
        )}
        <p className="text-sm text-text-secondary max-w-xs">
          {errorMessage ?? 'Бот завершил работу с ошибкой. Попробуйте перезапустить его.'}
        </p>
      </div>
    </Modal>
  );
}
