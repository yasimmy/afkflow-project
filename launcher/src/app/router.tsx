import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage }   from '@/pages/Login/LoginPage';
import { HomePage }    from '@/pages/Home/HomePage';
import { ProfilePage } from '@/pages/Profile/ProfilePage';
import { Layout } from '@/components/layout';
import { Spinner } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

function BootScreen() {
  return (
    <Layout hideOfflineBanner>
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <Spinner size="lg" />
      </div>
    </Layout>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const state = useAuthStore((s) => s.state);
  const user  = useAuthStore((s) => s.user);

  if (state === 'LOADING' && !user) {
    return <BootScreen />;
  }

  if (!user || state === 'AUTH_REQUIRED' || state === 'AUTH_ERROR') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const state = useAuthStore((s) => s.state);
  const user  = useAuthStore((s) => s.user);

  if (state === 'LOADING' && !user) {
    return <BootScreen />;
  }

  if (user && state === 'AUTHENTICATED') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
