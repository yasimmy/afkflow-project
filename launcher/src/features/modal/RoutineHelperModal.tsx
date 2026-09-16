import React from 'react';
import { Modal, Button } from '@/components/ui';

const PROFILES = [
  { id: 'postman', label: 'Почтальон' },
  { id: 'trucker', label: 'Дальнобойщик' },
  { id: 'diver', label: 'Аквалангист' },
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPick?: (profile: string) => void;
}

export function RoutineHelperModal({ isOpen, onClose, onPick }: Props) {
  const handlePick = (profile: string) => {
    onPick?.(profile);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Что запустить:"
      size="sm"
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Отмена
        </Button>
      }
    >
      <div className="flex flex-col gap-2 py-1">
        {PROFILES.map((profile) => (
          <Button
            key={profile.id}
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => handlePick(profile.id)}
          >
            {profile.label}
          </Button>
        ))}
      </div>
    </Modal>
  );
}
