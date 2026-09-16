import type {
  ApiResponse,
  MeResponse,
  Bot,
  BotConfig,
  Launch,
  Subscription,
  Purchase,
  UserStats,
  DiscordAuthStartResponse,
  VersionResponse,
  HealthResponse,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const SESSION_STORAGE_KEY = 'afkflow.session';
const ME_STORAGE_KEY = 'afkflow.me';

function readStoredSession(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

let sessionToken: string | null = readStoredSession();

export function setSessionToken(token: string | null): void {
  sessionToken = token;
  try {
    if (token) localStorage.setItem(SESSION_STORAGE_KEY, token);
    else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ME_STORAGE_KEY);
    }
  } catch {
    // storage may be unavailable
  }
}

export function hasStoredSession(): boolean {
  return Boolean(sessionToken);
}

export function loadCachedMe(): MeResponse | null {
  if (!sessionToken) return null;
  try {
    const raw = localStorage.getItem(ME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MeResponse;
    if (!parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedMe(me: MeResponse): void {
  try {
    localStorage.setItem(ME_STORAGE_KEY, JSON.stringify(me));
  } catch {
    // storage may be unavailable
  }
}

export function clearSessionToken(): void {
  setSessionToken(null);
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  let response: Response;
  try {
    const headers = new Headers(options?.headers);
    if (options?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (sessionToken) {
      headers.set('X-Session-Id', sessionToken);
    }

    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Нет подключения к серверу');
  }

  if (!response.ok) {
    let message = 'Произошла ошибка. Попробуйте ещё раз.';
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      if (body.message) message = body.message;
      else if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function getDiscordAuthUrl(): Promise<DiscordAuthStartResponse> {
  return request<DiscordAuthStartResponse>('/auth/discord/start', {
    method: 'POST',
  });
}

export async function getDiscordAuthStatus(state: string): Promise<{ authenticated: boolean; sessionId?: string }> {
  return request<{ authenticated: boolean; sessionId?: string }>(`/auth/discord/status/${encodeURIComponent(state)}`);
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/auth/logout', { method: 'POST' });
  } finally {
    clearSessionToken();
  }
}

// ─── User / Me ────────────────────────────────────────────────────────────────

export async function getMe(): Promise<MeResponse> {
  const me = await request<MeResponse>('/api/me');
  saveCachedMe(me);
  return me;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function getSubscription(): Promise<Subscription> {
  return request<Subscription>('/api/subscription');
}

export async function getPurchases(): Promise<Purchase[]> {
  return request<Purchase[]>('/api/purchases');
}

export async function getUserStats(): Promise<UserStats> {
  return request<UserStats>('/api/stats');
}

// ─── Bots ─────────────────────────────────────────────────────────────────────

export async function getBots(): Promise<Bot[]> {
  return request<Bot[]>('/api/bots');
}

export async function getBot(botId: string): Promise<Bot> {
  return request<Bot>(`/api/bots/${encodeURIComponent(botId)}`);
}

export async function getBotConfig(botId: string): Promise<BotConfig> {
  return request<BotConfig>(`/api/bots/${encodeURIComponent(botId)}/config`);
}

export async function updateBotConfig(
  botId: string,
  config: Record<string, unknown>,
): Promise<BotConfig> {
  return request<BotConfig>(`/api/bots/${encodeURIComponent(botId)}/config`, {
    method: 'PUT',
    body: JSON.stringify({ config }),
  });
}

export async function startBot(botId: string): Promise<Launch> {
  return request<Launch>(`/api/bots/${encodeURIComponent(botId)}/start`, {
    method: 'POST',
  });
}

export async function stopBot(botId: string): Promise<Launch> {
  return request<Launch>(`/api/bots/${encodeURIComponent(botId)}/stop`, {
    method: 'POST',
  });
}

export async function restartBot(botId: string): Promise<Launch> {
  return request<Launch>(`/api/bots/${encodeURIComponent(botId)}/restart`, {
    method: 'POST',
  });
}

export async function startAllBots(): Promise<Launch[]> {
  return request<Launch[]>('/api/bots/start-all', { method: 'POST' });
}

export async function pauseBot(botId: string): Promise<void> {
  return request<void>(`/api/bots/${encodeURIComponent(botId)}/pause`, {
    method: 'POST',
  });
}

export async function resumeBot(botId: string): Promise<void> {
  return request<void>(`/api/bots/${encodeURIComponent(botId)}/resume`, {
    method: 'POST',
  });
}

export async function getBotActionCount(botId: string): Promise<{ count: number }> {
  return request<{ count: number }>(`/api/bots/${encodeURIComponent(botId)}/action-count`);
}

// ─── Launches ─────────────────────────────────────────────────────────────────

export async function getLaunches(): Promise<Launch[]> {
  return request<Launch[]>('/api/launches');
}

// ─── System ───────────────────────────────────────────────────────────────────

export async function getVersion(): Promise<VersionResponse> {
  return request<VersionResponse>('/api/version');
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health');
}

// ─── Export singleton-style object for convenience ────────────────────────────

export const api = {
  // auth
  getDiscordAuthUrl,
  logout,
  // user
  getMe,
  // subscription
  getSubscription,
  getPurchases,
  getUserStats,
  // bots
  getBots,
  getBot,
  getBotConfig,
  updateBotConfig,
  startBot,
  stopBot,
  restartBot,
  startAllBots,
  pauseBot,
  resumeBot,
  getBotActionCount,
  // launches
  getLaunches,
  // system
  getVersion,
  getHealth,
} as const;

export { ApiError };

// Legacy alias kept for backward compat during migration
export const apiClient = {
  getMe,
  getBots,
  getBot,
  getBotConfig,
  updateBotConfig,
  startBot,
  stopBot,
  restartBot,
  startAllBots,
  getLaunches,
  logout,
  getDiscordAuthUrl,
  getVersion,
  getHealth,
} as const;
