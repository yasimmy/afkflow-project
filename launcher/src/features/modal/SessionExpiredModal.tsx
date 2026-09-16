import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Clock } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionExpiredModal({ isOpen, onClose }: Props) {
  const navigate  = useNavigate();
  const authReset = useAuthStore((s) => s.reset);
  const qc        = useQueryClient();

  const handleLogin = () => {
    qc.clear();
    authReset();
    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleLogin}
      title="Сессия истекла"
      description="Ваша сессия завершена. Войдите через Discord снова, чтобы продолжить."
      size="sm"
      persistent
      closable={false}
      footer={
        <Button
          variant="primary"
          size="sm"
          leftIcon={<LogIn size={14} />}
          onClick={handleLogin}
          fullWidth
        >
          Войти
        </Button>
      }
    >
      <div className="flex items-center justify-center py-4">
        <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
          <Clock size={22} className="text-warning" />
        </div>
      </div>
    </Modal>
  );
}
