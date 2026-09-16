/**
 * services/desktop.ts
 *
 * Single abstraction layer over Tauri IPC.
 * All Tauri calls in the app MUST go through this module.
 * Components and hooks import from here — never from @tauri-apps/api directly.
 *
 * In a browser dev environment every call gracefully no-ops or returns a mock.
 */

import type { Bot, LocalBotState, LogCleanupResult } from '@/types';

// ─── Tauri availability guard ─────────────────────────────────────────────────

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function formatInvokeError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const rec = error as Record<string, unknown>;
    if (typeof rec.message === 'string') return rec.message;
    if (typeof rec.error === 'string') return rec.error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Неизвестная ошибка запуска';
  }
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error('Запуск ботов доступен только в приложении AFKFlow (Tauri), не в браузере.');
  }
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

// ─── Bot process management ───────────────────────────────────────────────────

/**
 * Start a local bot process via the Rust Bot Manager.
 * Backend entitlement check happens first on the HTTP layer.
 * Tauri only launches the process after backend approval.
 */
export async function startLocalBot(
  botId: string,
  executablePath: string,
  config: Record<string, unknown> = {},
): Promise<void> {
  await invoke<void>('start_bot', { botId, executablePath, config });
}

export async function stopLocalBot(botId: string): Promise<void> {
  await invoke<void>('stop_bot', { botId });
}

export async function restartLocalBot(
  botId: string,
  config: Record<string, unknown> = {},
): Promise<void> {
  await invoke<void>('restart_bot', { botId, config });
}

export async function saveLocalBotConfig(
  botId: string,
  config: Record<string, unknown>,
): Promise<void> {
  if (!isTauri()) return;
  await invoke<void>('save_bot_config', { botId, config });
}

export async function loadLocalBotConfig(
  botId: string,
): Promise<Record<string, unknown>> {
  if (!isTauri()) return {};
  const result = await invoke<Record<string, unknown> | null>('load_bot_config', { botId });
  return result ?? {};
}

export async function clearAppLogs(): Promise<LogCleanupResult> {
  return invoke<LogCleanupResult>('clear_app_logs');
}

export async function sendBotCommand(botId: string, command: 'pause' | 'resume'): Promise<void> {
  await invoke<void>('send_bot_command', { botId, command });
}

export async function getLocalBotActionCount(botId: string): Promise<number> {
  return invoke<number>('get_bot_action_count', { botId });
}

export async function openBotDashboardWindow(bot: Bot): Promise<void> {
  if (!isTauri()) return;
  localStorage.setItem('afkflow.dashboard.bot', JSON.stringify(bot));
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const existing = await WebviewWindow.getByLabel('bot-dashboard');
  if (existing) {
    void existing.show().catch(() => undefined);
    void existing.setFocus().catch(() => undefined);
    return;
  }
  const dashboard = new WebviewWindow('bot-dashboard', {
    url: `${window.location.origin}/?dashboard=${encodeURIComponent(bot.id)}`,
    title: `Бот — ${bot.name}`,
    width: 420,
    height: 260,
    resizable: false,
    decorations: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    x: Math.max(0, window.screen.availWidth - 580),
    y: 12,
  });
  void dashboard.show().catch(() => undefined);
  void dashboard.setFocus().catch(() => undefined);
}

export async function closeBotDashboardWindow(): Promise<void> {
  if (!isTauri()) return;
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const dashboard = await WebviewWindow.getByLabel('bot-dashboard');
  if (dashboard) await dashboard.destroy();
}

const BOT_CONFIG_CONFIRMED_PREFIX = 'afkflow.bot-config-confirmed.';

export function hasConfirmedBotConfig(botId: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(`${BOT_CONFIG_CONFIRMED_PREFIX}${botId}`) === '1';
}

export function markBotConfigConfirmed(botId: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`${BOT_CONFIG_CONFIRMED_PREFIX}${botId}`, '1');
  }
}

export async function getLocalBotStatus(botId: string): Promise<LocalBotState | null> {
  return invoke<LocalBotState | null>('get_bot_status', { botId });
}

export async function getRunningBots(): Promise<LocalBotState[]> {
  const result = await invoke<LocalBotState[] | null>('get_running_bots');
  return result ?? [];
}

// ─── Native notifications ─────────────────────────────────────────────────────

export async function sendNativeNotification(
  title: string,
  body: string,
): Promise<void> {
  if (!isTauri()) return;
  try {
    const { sendNotification, isPermissionGranted, requestPermission } =
      await import('@tauri-apps/plugin-notification');

    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    if (granted) {
      sendNotification({ title, body });
    }
  } catch {
    // Plugin not available — silently skip
  }
}

// ─── Window management ────────────────────────────────────────────────────────

export async function minimizeWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().minimize();
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().toggleMaximize();
}

export async function closeWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().close();
}

// ─── Open external URL ────────────────────────────────────────────────────────

export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
      await tauriInvoke('open_external_url', { url });
      return;
    } catch {
      // Fall through to the browser fallback when the IPC transport is unavailable.
    }
  }

  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ─── App data directory ───────────────────────────────────────────────────────

export async function getAppDataDir(): Promise<string> {
  if (!isTauri()) return '.';
  const { appDataDir } = await import('@tauri-apps/api/path');
  return appDataDir();
}

// ─── Default export ───────────────────────────────────────────────────────────

export const desktop = {
  startLocalBot,
  stopLocalBot,
  restartLocalBot,
  saveLocalBotConfig,
  loadLocalBotConfig,
  getLocalBotStatus,
  getRunningBots,
  sendNativeNotification,
  minimizeWindow,
  toggleMaximizeWindow,
  closeWindow,
  openExternal,
  getAppDataDir,
  isTauri,
} as const;
