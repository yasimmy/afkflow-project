import { create } from 'zustand';
import type { ModalType } from '@/types';

interface ModalStore {
  type: ModalType | null;
  data: Record<string, unknown>;

  openModal: (type: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  type: null,
  data: {},

  openModal: (type, data = {}) => set({ type, data }),
  closeModal: () => set({ type: null, data: {} }),
}));
