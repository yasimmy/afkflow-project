import React from 'react';
import { Minus, X } from 'lucide-react';

async function tauriMinimize() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  } catch { /* browser no-op */ }
}

async function tauriClose() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  } catch { /* browser no-op */ }
}

export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="titlebar-shell drag-region h-11 w-full shrink-0 bg-bg-secondary flex items-center justify-between select-none z-50"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* ── Left: logo ── */}
      <div className="no-drag flex items-center gap-2.5 pl-4 pointer-events-none">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: 'rgba(124,92,255,0.18)' }}
        >
          <img
            src="/icons/app-icon/icon_bot.png"
            alt="AFKFlow"
            className="w-6 h-6 object-contain"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = 'none';
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* AFKFlow logotype — inter-font, two-weight style */}
          <span style={{
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            lineHeight: 1,
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
          }}>
            AFKFlow
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.12em',
            lineHeight: 1,
            color: '#666673',
            textTransform: 'uppercase',
            paddingTop: 1,
          }}>
            Bot Launcher
          </span>
        </div>
      </div>

      {/* ── Right: Minimize + Close only ── */}
      <div className="no-drag flex items-center">
        <WinBtn onClick={tauriMinimize} label="Свернуть" hoverClass="hover:bg-white/10">
          <Minus size={12} />
        </WinBtn>
        <WinBtn onClick={tauriClose} label="Закрыть" hoverClass="hover:bg-red-500 hover:text-white">
          <X size={12} />
        </WinBtn>
      </div>
    </div>
  );
}

interface WinBtnProps {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  hoverClass: string;
}

function WinBtn({ children, onClick, label, hoverClass }: WinBtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      tabIndex={-1}
      className={[
        'w-10 h-11 flex items-center justify-center text-[#666673]',
        'transition-all duration-100 outline-none',
        hoverClass,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
