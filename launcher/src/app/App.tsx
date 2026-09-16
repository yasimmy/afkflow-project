import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter }     from './router';
import { QueryProvider } from './providers';
import { ModalManager }  from '@/features/modal/ModalManager';
import { useAuth }       from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useRealtime }   from '@/hooks/useRealtime';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useLocalBotSync } from '@/hooks/useLocalBotSync';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore }  from '@/stores/authStore';
import { BotDashboardWindow } from '@/features/modal/BotDashboardWindow';
import { installGlobalHoverSound } from '@/hooks/useSound';

// Install once at module load — before any React render
installGlobalHoverSound();

// ─── Inner app — has access to QueryClient context ────────────────────────────

function InnerApp() {
  // Bootstrap auth on mount
  useAuth();
  // Track online/offline status + backend polling
  useOnlineStatus();
  // SSE realtime events (only when authenticated)
  useRealtime();
  // Version check on startup
  useVersionCheck();
  // Sync local Python bot process statuses with UI
  useLocalBotSync();
  // Subscription expiry proximity warning
  useExpiryWarning();

  if (new URLSearchParams(window.location.search).has('dashboard')) {
    return <BotDashboardWindow />;
  }

  return (
    <>
      <AppRouter />
      <ModalManager />
    </>
  );
}

// ─── Expiry warning hook (inline — lightweight) ───────────────────────────────

function useExpiryWarning() {
  const subscription = useAuthStore((s) => s.subscription);
  const addToast = useNotificationStore((s) => s.addToast);

  useEffect(() => {
    if (!subscription || subscription.status !== 'active') return;

    const msLeft  = new Date(subscription.expiresAt).getTime() - Date.now();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);

    if (daysLeft > 0 && daysLeft <= 3) {
      const days = Math.ceil(daysLeft);
      addToast(
        `Подписка истекает через ${days} ${days === 1 ? 'день' : 'дня'}`,
        'warning',
        6000,
      );
    }
  // Run once when subscription data arrives
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription?.expiresAt]);
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <InnerApp />
      </BrowserRouter>
    </QueryProvider>
  );
}
