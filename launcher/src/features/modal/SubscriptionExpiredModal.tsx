import React from 'react';
import { Crown, ExternalLink } from 'lucide-react';
import { Modal, Button } from '@/components/ui';

const RENEW_URL = import.meta.env.VITE_RENEW_URL ?? 'https://afkflow.ru/subscription';

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
}

export function SubscriptionExpiredModal({ isOpen, onClose }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Подписка закончилась"
      size="sm"
      persistent
      closable={false}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Позже
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ExternalLink size={14} />}
            onClick={() => { void openExternal(RENEW_URL); onClose(); }}
          >
            Продлить подписку
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 py-3 text-center">
        <div className="w-14 h-14 rounded-xl bg-danger/10 flex items-center justify-center">
          <Crown size={24} className="text-danger" />
        </div>
        <p className="text-sm text-text-secondary max-w-xs">
          Продлите подписку, чтобы продолжить использование AFKFlow и всех ботов.
        </p>
      </div>
    </Modal>
  );
}
