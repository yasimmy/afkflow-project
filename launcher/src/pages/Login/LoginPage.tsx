import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';
import { getDiscordAuthStatus, getDiscordAuthUrl, setSessionToken } from '@/api/client';
import { openExternal } from '@/services/desktop';

// Discord logo SVG
function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToast();
  const { user, state } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (state === 'AUTHENTICATED' && user) {
      navigate('/', { replace: true });
    }
  }, [state, user, navigate]);

  // Listen for auth completion from OAuth popup / callback
  useEffect(() => {
    const onMessage = (e: MessageEvent<unknown>) => {
      if (
        typeof e.data === 'object' &&
        e.data !== null &&
        'type' in e.data &&
        (e.data as Record<string, unknown>).type === 'AUTH_SUCCESS'
      ) {
        // App.tsx will recheck /api/me via query invalidation — just navigate
        navigate('/', { replace: true });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);

  // Complete OAuth when Discord redirects the browser back to /login.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackState = params.get('state');
    if (params.get('auth') !== 'success' || !callbackState) return;

    void getDiscordAuthStatus(callbackState).then((result) => {
      if (!result.authenticated) return;
      if (result.sessionId) setSessionToken(result.sessionId);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/', { replace: true });
    });
  }, [navigate, queryClient]);

  const handleDiscordLogin = async () => {
    setLoading(true);
    try {
      const { url, state: authState } = await getDiscordAuthUrl();

      await openExternal(url);

      // The system browser completes OAuth separately. Poll until the backend
      // transfers the new session cookie to this Tauri webview.
      const deadline = Date.now() + 5 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const result = await getDiscordAuthStatus(authState);
        if (result.authenticated) {
          if (result.sessionId) setSessionToken(result.sessionId);
          await queryClient.invalidateQueries({ queryKey: ['me'] });
          navigate('/', { replace: true });
          return;
        }
      }
    } catch {
      addToast('Не удалось подключиться к серверу. Попробуйте ещё раз.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideTitleBar={false} hideOfflineBanner>
      {/* Full-screen centered layout */}
      <div className="flex-1 flex items-center justify-center bg-bg-primary overflow-hidden relative">

        {/* Subtle background radial */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(124,92,255,0.07) 0%, transparent 70%)',
          }}
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[360px] mx-6 flex flex-col items-center text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.3 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-glow mb-7"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <circle cx="16" cy="16" r="11" stroke="white" strokeWidth="2.5" />
              <path
                d="M16 10v7l4.5 3"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
          >
            <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-none">
              AFKFlow
            </h1>
            <p className="text-sm text-text-muted mt-1 mb-3 font-medium tracking-widest uppercase">
              Bot Launcher
            </p>
            <p className="text-[15px] text-text-secondary leading-relaxed mb-8">
              Запускайте свои боты в одном месте.
            </p>
          </motion.div>

          {/* Discord button */}
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.25 }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              leftIcon={<DiscordIcon />}
              onClick={handleDiscordLogin}
              aria-label="Войти через Discord"
            >
              Войти через Discord
            </Button>
          </motion.div>

          {/* Help text */}
          <motion.p
            className="mt-4 text-xs text-text-muted leading-relaxed max-w-[280px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22, duration: 0.25 }}
          >
            Для использования AFKFlow необходимо войти через Discord.
          </motion.p>
        </motion.div>
      </div>
    </Layout>
  );
}
