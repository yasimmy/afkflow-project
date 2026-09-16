import { create } from 'zustand';
import type { ToastItem, ToastVariant } from '@/types';

interface NotificationStore {
  toasts: ToastItem[];
  addToast: (message: string, variant?: ToastVariant, duration?: number, loading?: boolean) => string;
  updateToast: (id: string, updates: Partial<Omit<ToastItem, 'id'>>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

let _timers: Record<string, ReturnType<typeof setTimeout>> = {};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  toasts: [],

  addToast: (message, variant = 'info', duration = 3500, loading = false) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, duration, loading }] }));

    _timers[id] = setTimeout(() => {
      get().removeToast(id);
      delete _timers[id];
    }, duration);
    return id;
  },

  updateToast: (id, updates) => {
    const existingTimer = _timers[id];
    if (existingTimer) clearTimeout(existingTimer);
    set((s) => ({
      toasts: s.toasts.map((toast) => toast.id === id ? { ...toast, ...updates } : toast),
    }));
    const duration = updates.duration;
    if (duration !== undefined) {
      _timers[id] = setTimeout(() => {
        get().removeToast(id);
        delete _timers[id];
      }, duration);
    }
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clearAll: () => {
    Object.values(_timers).forEach(clearTimeout);
    _timers = {};
    set({ toasts: [] });
  },
}));
