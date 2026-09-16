import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  version?: string;
  changelog?: string;
  critical?: boolean;
}

export function UpdateAvailableModal({
  isOpen,
  onClose,
  version = '1.0.0',
  changelog = '',
  critical = false,
}: Props) {
  const handleUpdate = async () => {
    try {
      // Tauri updater v2
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) await update.downloadAndInstall();
    } catch {
      // Fallback: open releases page
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open('https://afkflow.ru/download');
      } catch {
        window.open('https://afkflow.ru/download', '_blank');
      }
    }
    if (!critical) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Доступно обновление"
      size="sm"
      persistent={critical}
      closable={!critical}
      footer={
        <>
          {!critical && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Позже
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={() => void handleUpdate()}
          >
            Обновить
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        {/* Version + critical badge */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-text-primary">v{version}</p>
            {critical && (
              <Badge variant="danger" dot>
                Обязательное обновление
              </Badge>
            )}
          </div>
        </div>

        {/* Changelog */}
        {changelog && (
          <div className="bg-bg-primary rounded-lg p-3 border border-[rgba(255,255,255,0.06)]">
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">
              Что нового
            </p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
              {changelog}
            </p>
          </div>
        )}

        {critical && (
          <p className="text-xs text-danger text-center">
            Это обновление обязательно для продолжения работы.
          </p>
        )}
      </div>
    </Modal>
  );
}
