import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Power, LogOut, Settings, Lock, ShoppingCart, Pause } from 'lucide-react';
import type { Bot, BotStatus } from '@/types';

// ─── Status config ────────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  dotColor: string;
  pulse: boolean;
}

const STATUS_CONFIG: Record<BotStatus, StatusConfig> = {
  ready:       { label: 'Готов к запуску', dotColor: '#4B4B5A', pulse: false },
  starting:    { label: 'Запуск...',        dotColor: '#D6A06F', pulse: true  },
  running:     { label: 'Запущен',          dotColor: '#62C7A5', pulse: true  },
  paused:      { label: 'Пауза',            dotColor: '#A9A071', pulse: false },
  stopping:    { label: 'Остановка...',     dotColor: '#9B8FC4', pulse: true  },
  error:       { label: 'Ошибка',           dotColor: '#EF4444', pulse: false },
  updating:    { label: 'Обновление...',    dotColor: '#60A5FA', pulse: true  },
  unavailable: { label: 'Недоступен',       dotColor: '#4B4B5A', pulse: false },
  locked:      { label: 'Нет доступа',      dotColor: '#4B4B5A', pulse: false },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface BotCardProps {
  bot: Bot;
  isRunning?: boolean;
  isLoading?: boolean;
  isBlockedByOtherBot?: boolean;
  runningSince?: number;
  onStart:    (botId: string) => void;
  onStop:     (botId: string) => void;
  onPause?:   (botId: string) => void;
  onResume?:  (botId: string) => void;
  onSettings: (botId: string) => void;
  onBuy?:     (botId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BotCard({
  bot,
  isRunning  = false,
  isLoading  = false,
  isBlockedByOtherBot = false,
  runningSince,
  onStart,
  onStop,
  onPause,
  onResume,
  onSettings,
  onBuy,
}: BotCardProps) {
  const statusConfig = STATUS_CONFIG[bot.status];
  const isInDevelopment = bot.slug === 'seamstress';
  const { label, dotColor, pulse } = statusConfig;
  const isLocked   = !bot.entitled;
  const isDisabled = !bot.enabled || bot.status === 'unavailable' || isInDevelopment || isBlockedByOtherBot;
  const isActive   = bot.status === 'running';
  const isPaused   = bot.status === 'paused';
  const isBusy     = isRunning || bot.status === 'running' || bot.status === 'starting';
  const isSmallIcon = bot.slug === 'gym' || bot.slug === 'farm';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!runningSince || (bot.status !== 'running' && bot.status !== 'paused')) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [bot.status, runningSince]);

  useEffect(() => {
    const clearHover = () => setHovered(false);
    window.addEventListener('blur', clearHover);
    return () => window.removeEventListener('blur', clearHover);
  }, []);

  const elapsedSeconds = runningSince ? Math.max(0, Math.floor((now - runningSince) / 1000)) : 0;
  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

  const [hovered, setHovered] = useState(false);
  const showHoverBorder = hovered && !isLocked && !isDisabled;

  // Border: active=purple, hover=semi-transparent purple, default=subtle white
  const borderColor = isActive
    ? 'rgba(124,92,255,0.35)'
    : showHoverBorder
    ? 'rgba(124,92,255,0.25)'
    : 'rgba(255,255,255,0.07)';

  return (
    <motion.article
      data-sound-hover="card"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={!isLocked && !isDisabled ? { y: -2 } : {}}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{
        width: '100%',
        height: '100%',
        background: '#151520',
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        opacity: isLocked ? 0.65 : 1,
        cursor: isLocked ? 'default' : 'unset',
        boxSizing: 'border-box',
        boxShadow: showHoverBorder ? '0 8px 24px rgba(124,92,255,0.10)' : '0 4px 14px rgba(0,0,0,0.12)',
        transition: 'border-color 0.15s, box-shadow 0.18s ease-out',
      }}
      aria-label={`Бот ${bot.name}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('button')) return;
      }}
    >
      {/* Active top strip — very subtle, just 2px */}
      {isActive && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 1,
            right: 1,
            height: 2,
            borderRadius: 999,
            background: 'linear-gradient(90deg, transparent, rgba(124,92,255,0.26) 20%, rgba(155,123,255,0.5) 50%, rgba(124,92,255,0.26) 80%, transparent)',
            boxShadow: '0 0 3px rgba(139,107,255,0.16)',
            flexShrink: 0,
          }}
        />
      )}

      {/* Lock icon top-right */}
      {isLocked && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
          <Lock size={12} color="#555563" />
        </div>
      )}

      {/*
        Inner padding wrapper — flex column, fills height.
        Padding top a little extra to clear the strip.
      */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: isActive ? '18px 16px 14px' : '16px 16px 14px',
        boxSizing: 'border-box',
      }}>

        {/* ── Icon — fixed size, centred ── */}
        <div style={{
          flexShrink: 0,
          width: '100%',
          height: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Keep every card's text block at the same vertical position.
          flex: '0 0 96px',
          marginBottom: 8,
        }}>
          <motion.img
            src={bot.icon}
            alt={bot.name}
            style={{
              width: isSmallIcon ? '78%' : '70%',
              maxWidth: isSmallIcon ? 102 : 90,
              height: 'auto',
              maxHeight: 90,
              objectFit: 'contain',
              filter: isLocked ? 'grayscale(1) opacity(0.45)' : 'none',
              display: 'block',
            }}
            animate={{ scale: hovered && !isLocked && !isDisabled ? 1.08 : 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            loading="eager"
            decoding="async"
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        {/* ── Name ── */}
        <div style={{
          position: 'relative',
          flexShrink: 0,
          height: 24,
          width: '100%',
          marginBottom: 0,
        }}>
          <motion.h3
            animate={{
              y: hovered && !isLocked && !isDisabled ? -1 : 0,
              textShadow: hovered && !isLocked && !isDisabled
                ? '0 0 10px rgba(155,123,255,0.3)'
                : '0 0 0 rgba(155,123,255,0)',
            }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              height: 19,
              fontSize: 15,
              fontWeight: 600,
              color: '#FFFFFF',
              textAlign: 'center',
              lineHeight: 1.25,
              margin: 0,
              width: '100%',
              padding: '0 14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {bot.name}
          </motion.h3>
        </div>

        {/* ── Description — grows to fill space ── */}
        <p style={{
          flex: isInDevelopment ? '0 0 32px' : '0 0 56px',
          minHeight: 0,
          fontSize: 13,
          color: '#8B8B9E',
          textAlign: 'center',
          lineHeight: 1.45,
          margin: isInDevelopment ? '0 0 4px 0' : '0 0 10px 0',
          width: '100%',
          // Keep descriptions readable while preserving the card layout.
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {bot.description}
        </p>

        {/* ── Buttons ── */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          gap: 7,
          width: '100%',
          alignItems: 'center',
        }}>
          {isLocked ? (
            <button
              onClick={() => onBuy?.(bot.id)}
              aria-label={`Получить доступ к ${bot.name}`}
              style={{ ...shopBtnStyle, flex: 1 }}
            >
              <ShoppingCart size={12} style={{ flexShrink: 0 }} />
              <span>Получить доступ</span>
            </button>
          ) : isInDevelopment ? null : isDisabled ? (
            <button
              disabled
              title={isBlockedByOtherBot ? 'Недоступен: работает другой бот' : 'Недоступен'}
              style={{
                ...playBtnStyle,
                flex: 1,
                minWidth: 0,
                opacity: 0.4,
                cursor: 'not-allowed',
              }}
            >
                <span>Недоступен</span>
            </button>
          ) : (
            <>
              {isBusy ? (
                <StopButton
                  onClick={() => onStop(bot.id)}
                  isStopping={bot.status === 'stopping'}
                  disabled={isLoading || bot.status === 'stopping'}
                />
              ) : isPaused ? (
                <ResumeButton
                  onClick={() => onResume?.(bot.id)}
                  disabled={isLoading}
                />
              ) : isActive ? (
                <PauseButton
                  onClick={() => onPause?.(bot.id)}
                  disabled={isLoading}
                />
              ) : (
                <PlayButton
                  onClick={() => onStart(bot.id)}
                  isStarting={isLoading || bot.status === 'starting'}
                />
              )}
              <button
                onClick={() => onSettings(bot.id)}
                disabled={isLoading}
                aria-label={`Настройки — ${bot.name}`}
                style={settingsBtnStyle}
              >
                <Settings size={14} color="#8B8B9E" />
              </button>
            </>
          )}
        </div>

        {/* ── Status row ── */}
        {!isLocked && (!isDisabled || isInDevelopment) && (
          <div style={{
            flexShrink: 0,
            width: '100%',
            marginTop: isInDevelopment ? 14 : 8,
            padding: isInDevelopment ? '7px 8px' : 0,
            border: isInDevelopment ? '1px solid rgba(124,92,255,0.16)' : 'none',
            borderRadius: 7,
            background: isInDevelopment ? 'rgba(124,92,255,0.06)' : 'transparent',
            textAlign: 'center',
          }}>
            {isInDevelopment ? (
              <>
                <span style={{ display: 'inline-block', marginBottom: 3, fontSize: 9, fontWeight: 700, color: '#A9A2D8', letterSpacing: '0.06em' }}>
                  В РАЗРАБОТКЕ
                </span>
                <p style={{ margin: 0, fontSize: 10, color: '#77718F', lineHeight: 1.35 }}>
                  Наша команда готовит бота к запуску. Скоро он ворвётся на рынок!
                </p>
              </>
            ) : (
              <>
                <motion.span
                  style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, display: 'inline-block' }}
                  animate={{ backgroundColor: dotColor, opacity: pulse ? [1, 0.25, 1] : 1 }}
                  transition={{
                    backgroundColor: { duration: 0.3, ease: 'easeOut' },
                    opacity: pulse ? { duration: 1.5, repeat: Infinity } : { duration: 0.2 },
                  }}
                />
                <span style={{ marginLeft: 5, fontSize: 10, color: '#555563', letterSpacing: '0.01em' }}>
                  {isActive || isPaused ? `${label} · ${elapsedLabel}` : label}
                </span>
              </>
            )}
          </div>
        )}

      </div>
    </motion.article>
  );
}

// ─── Sub-buttons ──────────────────────────────────────────────────────────────

function PlayButton({ onClick, isStarting }: { onClick: () => void; isStarting: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={isStarting}
      aria-label="Запустить бота"
      style={{ ...playBtnStyle, flex: 1, opacity: isStarting ? 0.7 : 1 }}
    >
      {isStarting
        ? <SpinnerMini />
        : <Power size={14} strokeWidth={2.2} color="white" style={{ flexShrink: 0 }} />
      }
      <span>{isStarting ? 'Запуск...' : 'Запустить'}</span>
    </button>
  );
}

function StopButton({
  onClick, isStopping, disabled,
}: { onClick: () => void; isStopping: boolean; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Остановить бота"
      style={{ ...stopBtnStyle, flex: 1, opacity: disabled ? 0.55 : 1 }}
    >
      {isStopping
        ? <SpinnerMini />
        : <LogOut size={14} strokeWidth={2.2} color="white" style={{ flexShrink: 0 }} />
      }
      <span>{isStopping ? 'Остановка...' : 'Остановить'}</span>
    </button>
  );
}

function PauseButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Пауза"
      style={{ ...pauseBtnStyle, flex: 1, opacity: disabled ? 0.55 : 1 }}
    >
      <Pause size={13} strokeWidth={2.4} color="white" style={{ flexShrink: 0 }} />
      <span>Пауза</span>
    </button>
  );
}

function ResumeButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Возобновить"
      style={{ ...playBtnStyle, flex: 1, opacity: disabled ? 0.55 : 1 }}
    >
      <Power size={14} strokeWidth={2.2} color="white" style={{ flexShrink: 0 }} />
      <span>Возобновить</span>
    </button>
  );
}

function SpinnerMini() {
  return (
    <motion.span
      style={{
        width: 12,
        height: 12,
        border: '1.5px solid rgba(255,255,255,0.25)',
        borderTopColor: 'white',
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-block',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ─── Button styles ────────────────────────────────────────────────────────────

const playBtnStyle: React.CSSProperties = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            5,
  minWidth:       0,
  height:         34,
  paddingLeft:    12,
  paddingRight:   12,
  borderRadius:   8,
  border:         'none',
  cursor:         'pointer',
  fontSize:       12,
  fontWeight:     500,
  color:          '#FFFFFF',
  background:     '#5B4DCC',
  transition:     'background 0.12s',
  fontFamily:     'inherit',
  whiteSpace:     'nowrap',
};

const stopBtnStyle: React.CSSProperties = {
  ...playBtnStyle,
  background: '#252535',
  border:     '1px solid rgba(255,255,255,0.09)',
};

const pauseBtnStyle: React.CSSProperties = {
  ...playBtnStyle,
  background: '#5B47B8',
};

const shopBtnStyle: React.CSSProperties = {
  ...playBtnStyle,
  background: 'transparent',
  border:     '1px solid rgba(255,255,255,0.1)',
  color:      '#8B8B9E',
};

const settingsBtnStyle: React.CSSProperties = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  width:          34,
  height:         34,
  borderRadius:   8,
  border:         '1px solid rgba(255,255,255,0.09)',
  background:     'transparent',
  cursor:         'pointer',
  flexShrink:     0,
  transition:     'background 0.12s, border-color 0.12s',
};
