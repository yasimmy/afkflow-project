import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export function AccountBlockedModal({ isOpen, onClose, reason }: Props) {
  const navigate  = useNavigate();
  const authReset = useAuthStore((s) => s.reset);
  const qc        = useQueryClient();

  const handleDismiss = () => {
    qc.clear();
    authReset();
    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title="Аккаунт заблокирован"
      size="sm"
      persistent
      closable={false}
      footer={
        <Button variant="secondary" size="sm" onClick={handleDismiss} fullWidth>
          Закрыть
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-3 py-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center">
          <ShieldOff size={22} className="text-danger" />
        </div>
        <p className="text-sm text-text-secondary max-w-xs">
          {reason
            ? reason
            : 'Ваш аккаунт был заблокирован. Обратитесь в поддержку AFKFlow для получения информации.'}
        </p>
      </div>
    </Modal>
  );
}
