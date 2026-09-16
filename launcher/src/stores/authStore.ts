import { create } from 'zustand';
import type { AuthState, User, Subscription } from '@/types';
import { loadCachedMe } from '@/api/client';

interface AuthStore {
  state: AuthState;
  user: User | null;
  subscription: Subscription | null;
  error: string | null;

  setAuthState: (state: AuthState) => void;
  setUser: (user: User | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

function readInitialAuth(): Pick<AuthStore, 'state' | 'user' | 'subscription' | 'error'> {
  const cached = loadCachedMe();
  if (!cached?.user) {
    return { state: 'LOADING', user: null, subscription: null, error: null };
  }
  return {
    state: 'AUTHENTICATED',
    user: cached.user,
    subscription: cached.subscription,
    error: null,
  };
}

const LOGGED_OUT: Pick<AuthStore, 'state' | 'user' | 'subscription' | 'error'> = {
  state: 'AUTH_REQUIRED',
  user: null,
  subscription: null,
  error: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...readInitialAuth(),

  setAuthState: (state) => set({ state }),
  setUser: (user) => set({ user }),
  setSubscription: (subscription) => set({ subscription }),
  setError: (error) => set({ error }),
  reset: () => set(LOGGED_OUT),
}));
