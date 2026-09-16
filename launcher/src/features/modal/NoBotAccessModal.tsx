import React from 'react';
import { Lock, ShoppingCart } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useBotStore } from '@/stores/botStore';

const STORE_URL = import.meta.env.VITE_STORE_URL ?? 'https://afkflow.ru/shop';

async function openExternal(url: string) {
  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  botId?: string;
}

export function NoBotAccessModal({ isOpen, onClose, botId }: Props) {
  const bots = useBotStore((s) => s.bots);
  const bot  = bots.find((b) => b.id === botId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Нет доступа"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Закрыть
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ShoppingCart size={14} />}
            onClick={() => {
              void openExternal(`${STORE_URL}?bot=${bot?.slug ?? botId}`);
              onClose();
            }}
          >
            Получить доступ
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 py-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-bg-hover flex items-center justify-center">
          <Lock size={20} className="text-text-muted" />
        </div>
        <p className="text-sm text-text-secondary max-w-xs">
          {bot
            ? `Бот «${bot.name}» недоступен в вашей подписке.`
            : 'Этот бот недоступен в вашей подписке.'}
          {' '}Посетите магазин AFKFlow, чтобы получить доступ.
        </p>
      </div>
    </Modal>
  );
}
