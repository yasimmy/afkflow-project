import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useModalStore } from '@/stores/modalStore';
import { getMe, ApiError, loadCachedMe, clearSessionToken } from '@/api/client';

const cachedMe = loadCachedMe();

/**
 * Bootstraps auth on mount and re-checks on window focus.
 * Handles every AuthState transition including ACCOUNT_BLOCKED,
 * SUBSCRIPTION_EXPIRED, MAINTENANCE, OFFLINE.
 */
export function useAuth() {
  const qc = useQueryClient();
  const { setAuthState, setUser, setSubscription, state } = useAuthStore();
  const { openModal } = useModalStore();
  const setInitializing = useUiStore((s) => s.setInitializing);

  const { data, isPending, error } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    initialData: cachedMe ?? undefined,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return false;
      return failureCount < 2;
    },
    retryDelay: 800,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (isPending && !data) {
      setAuthState('LOADING');
      return;
    }

    if (data) {
      setUser(data.user);
      setSubscription(data.subscription);

      if (data.user.status === 'blocked') {
        setAuthState('ACCOUNT_BLOCKED');
        openModal('accountBlocked');
        return;
      }

      if (!data.subscription || data.subscription.status === 'expired') {
        setAuthState('SUBSCRIPTION_EXPIRED');
        openModal('subscriptionExpired');
        return;
      }

      setAuthState('AUTHENTICATED');
      setInitializing(false);
      return;
    }

    if (error) {
      if (error instanceof ApiError) {
        if (error.status === 0) {
          setAuthState('OFFLINE');
          return;
        }
        if (error.status === 401 || error.status === 403) {
          if (state === 'AUTHENTICATED') {
            openModal('sessionExpired');
          }
          clearSessionToken();
          setAuthState('AUTH_REQUIRED');
          return;
        }
        if (error.status === 503) {
          setAuthState('MAINTENANCE');
          return;
        }
      }
      setAuthState('AUTH_ERROR');
    }
  }, [data, isPending, error, state, setAuthState, setUser, setSubscription, setInitializing, openModal]);

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['me'] });
  }, [qc]);

  return {
    isLoading: isPending && !data,
    refresh,
    refetch: () => void qc.invalidateQueries({ queryKey: ['me'] }),
    authState: state,
  };
}
