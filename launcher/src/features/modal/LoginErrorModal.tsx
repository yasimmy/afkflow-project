import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { getDiscordAuthUrl } from '@/api/client';
import { useToast } from '@/components/ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string;
}

export function LoginErrorModal({ isOpen, onClose, errorMessage }: Props) {
  const addToast = useToast();

  const handleRetry = async () => {
    try {
      const { url } = await getDiscordAuthUrl();
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
      } catch {
        window.open(url, 'discord-oauth', 'width=480,height=680');
      }
      onClose();
    } catch {
      addToast('Не удалось подключиться к серверу.', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ошибка авторизации"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Закрыть
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleRetry()}>
            Попробовать снова
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
          <AlertTriangle size={22} className="text-warning" />
        </div>
        <p className="text-sm text-text-secondary max-w-xs">
          {errorMessage ?? 'Не удалось войти через Discord. Попробуйте ещё раз.'}
        </p>
      </div>
    </Modal>
  );
}
