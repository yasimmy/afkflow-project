import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, ShieldCheck, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Modal, Button } from '@/components/ui';
import { clearAppLogs } from '@/services/desktop';
import { useToast } from '@/components/ui/Toast';
import type { LogCleanupResult } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function ClearLogsModal({ isOpen, onClose }: Props) {
  const addToast = useToast();
  const mutation = useMutation<LogCleanupResult, Error>({
    mutationFn: clearAppLogs,
    onError: () => addToast('Не удалось очистить журналы приложения.', 'error'),
  });

  const result = mutation.data;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={result ? 'Очистка журналов завершена' : 'Очистить журналы программы?'}
      size="sm"
      footer={
        result ? (
          <Button variant="primary" size="sm" onClick={onClose}>Закрыть</Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={mutation.isPending}>Отмена</Button>
            <Button
              variant="danger"
              size="sm"
              loading={mutation.isPending}
              className="!bg-[#C41E3A] hover:!bg-[#D93650]"
              leftIcon={<Trash2 size={14} />}
              onClick={() => mutation.mutate()}
            >
              Очистить
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <CheckCircle2 size={18} className="text-green-400" />
            <span>Удалено файлов: <strong>{result.deletedFiles}</strong></span>
          </div>
          <p className="text-sm text-text-secondary">Освобождено: {formatBytes(result.freedBytes)}</p>
          {result.failed.length > 0 && (
            <div className="space-y-2 rounded-md border border-warning/20 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-sm text-warning">
                <AlertTriangle size={16} />
                Не удалось удалить: {result.failed.length}
              </div>
              <div className="max-h-28 space-y-1 overflow-y-auto text-xs text-text-muted">
                {result.failed.map((item) => (
                  <p key={item.path} className="break-all">{item.path}: {item.reason}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-accent-light">
              <ClipboardCheck size={15} />
              <span>Для проверки на бота</span>
            </div>
            <p className="text-sm leading-6 text-text-secondary">
              Очистка помогает удалить диагностические следы AFKFlow перед проверкой.
            </p>
          </div>

          <div className="space-y-3 text-sm leading-6 text-text-secondary">
            <p className="m-0">
              Будут удалены диагностические данные AFKFlow: журналы приложения, связанные файлы и записи реестра.
            </p>
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={17} className="mt-1 shrink-0 text-success" />
              <div>
                <p className="m-0 text-sm font-medium leading-6 text-text-primary">Данные Windows и других программ</p>
                <p className="m-0 text-sm leading-6 text-text-secondary">не затрагиваются.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
