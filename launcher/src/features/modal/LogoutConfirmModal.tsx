import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useBotStore } from '@/stores/botStore';
import { useToast } from '@/components/ui/Toast';
import { logout } from '@/api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutConfirmModal({ isOpen, onClose }: Props) {
  const navigate  = useNavigate();
  const addToast  = useToast();
  const qc        = useQueryClient();
  const authReset = useAuthStore((s) => s.reset);
  const botReset  = useBotStore((s) => s.reset);

  const mutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.clear();
      authReset();
      botReset();
      onClose();
      navigate('/login', { replace: true });
    },
    onError: () => {
      addToast('Не удалось выйти. Попробуйте ещё раз.', 'error');
      onClose();
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Выйти из аккаунта?"
      description="Вы будете возвращены на экран входа."
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
            leftIcon={<LogOut size={14} />}
            onClick={() => mutation.mutate()}
          >
            Выйти
          </Button>
        </>
      }
    />
  );
}
