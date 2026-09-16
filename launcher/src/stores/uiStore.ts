import { create } from 'zustand';

interface UiStore {
  isOnline: boolean;
  isInitializing: boolean;
  offlineBannerDismissed: boolean;

  setOnline: (online: boolean) => void;
  setInitializing: (v: boolean) => void;
  dismissOfflineBanner: () => void;
  resetOfflineBanner: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  isOnline: navigator.onLine,
  isInitializing: true,
  offlineBannerDismissed: false,

  setOnline: (online) => set({ isOnline: online }),
  setInitializing: (v) => set({ isInitializing: v }),
  dismissOfflineBanner: () => set({ offlineBannerDismissed: true }),
  resetOfflineBanner: () => set({ offlineBannerDismissed: false }),
}));
