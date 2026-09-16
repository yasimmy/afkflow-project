import React from 'react';
import { TitleBar }     from './TitleBar';
import { OfflineBanner } from './OfflineBanner';
import { ToastContainer } from '@/components/ui';

interface LayoutProps {
  children: React.ReactNode;
  /** Hide title bar on login screen */
  hideTitleBar?: boolean;
  /** Hide offline banner */
  hideOfflineBanner?: boolean;
}

export function Layout({
  children,
  hideTitleBar = false,
  hideOfflineBanner = false,
}: LayoutProps) {
  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-bg-primary">
      {!hideTitleBar && <TitleBar />}
      {!hideOfflineBanner && <OfflineBanner />}

      {/* Scrollable content area */}
      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </main>

      {/* Global toast portal */}
      <ToastContainer />
    </div>
  );
}
