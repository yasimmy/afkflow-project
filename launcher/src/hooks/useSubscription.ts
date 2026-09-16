import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useModalStore } from '@/stores/modalStore';
import { getSubscription } from '@/api/client';
import { useEffect } from 'react';

export function useSubscription() {
  const setSubscription = useAuthStore((s) => s.setSubscription);
  const subscription    = useAuthStore((s) => s.subscription);
  const openModal       = useModalStore((s) => s.openModal);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn:  getSubscription,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (data) {
      setSubscription(data);

      // Show expiry warning if within 3 days
      if (data.status === 'active') {
        const msLeft = new Date(data.expiresAt).getTime() - Date.now();
        const daysLeft = msLeft / (1000 * 60 * 60 * 24);
        if (daysLeft <= 3 && daysLeft > 0) {
          // Toast is shown via App-level check, not here to avoid repeat
        }
      } else if (data.status === 'expired') {
        openModal('subscriptionExpired');
      }
    }
  }, [data, setSubscription, openModal]);

  return {
    subscription: data ?? subscription,
    isLoading,
    refetch,
    isActive:    (data ?? subscription)?.status === 'active',
    expiresAt:   (data ?? subscription)?.expiresAt,
    botCount:    (data ?? subscription)?.botCount ?? 0,
  };
}
