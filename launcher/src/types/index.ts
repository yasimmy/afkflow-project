// ─── Bot ────────────────────────────────────────────────────────────────────

export type BotStatus =
  | 'ready'
  | 'starting'
  | 'running'
  | 'paused'
  | 'stopping'
  | 'error'
  | 'updating'
  | 'unavailable'
  | 'locked';

export interface Bot {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Path to bot icon asset */
  icon: string;
  status: BotStatus;
  /** Whether this user has entitlement to this bot */
  entitled: boolean;
  version: string;
  enabled: boolean;
}

export interface BotConfig {
  id: string;
  userId: string;
  botId: string;
  config: Record<string, unknown>;
  updatedAt: string;
}

export interface LogCleanupFailure {
  path: string;
  reason: string;
}

export interface LogCleanupResult {
  deletedFiles: number;
  freedBytes: number;
  failed: LogCleanupFailure[];
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  discordId: string;
  username: string;
  globalName: string;
  /** Discord CDN avatar URL or null */
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  status: 'active' | 'blocked' | 'suspended';
}

// ─── Subscription ────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'paused';

export interface Subscription {
  id: string;
  plan: string;
  planDisplayName: string;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  botCount: number;
  autoRenew: boolean;
}

// ─── Purchase ────────────────────────────────────────────────────────────────

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  amount: number;
  currency: string;
  status: 'active' | 'expired' | 'refunded';
  createdAt: string;
}

// ─── Launch ──────────────────────────────────────────────────────────────────

export type LaunchStatus = 'running' | 'stopped' | 'error' | 'crashed';

export interface Launch {
  id: string;
  botId: string;
  userId: string;
  startedAt: string;
  stoppedAt: string | null;
  status: LaunchStatus;
  durationSeconds: number | null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export type AuthState =
  | 'LOADING'
  | 'AUTH_REQUIRED'
  | 'AUTHENTICATED'
  | 'AUTH_ERROR'
  | 'SUBSCRIPTION_EXPIRED'
  | 'ACCOUNT_BLOCKED'
  | 'MAINTENANCE'
  | 'OFFLINE';

// ─── Statistics ──────────────────────────────────────────────────────────────

export interface UserStats {
  totalLaunches: number;
  totalRuntimeSeconds: number;
  botCount: number;
  registeredAt: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface MeResponse {
  user: User;
  subscription: Subscription | null;
  bots: Bot[];
  stats: UserStats;
}

export interface DiscordAuthStartResponse {
  url: string;
  state: string;
}

export interface VersionResponse {
  version: string;
  minVersion: string;
  changelog: string;
  critical: boolean;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
}

// ─── Realtime Events ─────────────────────────────────────────────────────────

export type RealtimeEventType =
  | 'bot.started'
  | 'bot.starting'
  | 'bot.stopped'
  | 'bot.stopping'
  | 'bot.error'
  | 'bot.restarting'
  | 'subscription.updated'
  | 'maintenance.started'
  | 'maintenance.ended';

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ─── UI / Modal ───────────────────────────────────────────────────────────────

export type ModalType =
  | 'botSettings'
  | 'routineHelper'
  | 'botDetails'
  | 'startAllBots'
  | 'stopBot'
  | 'subscriptionExpired'
  | 'noBotAccess'
  | 'updateAvailable'
  | 'criticalUpdate'
  | 'logoutConfirm'
  | 'sessionExpired'
  | 'botError'
  | 'accountBlocked'
  | 'loginError'
  | 'clearLogs'
  | 'botDashboard';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  loading?: boolean;
}

// ─── Tauri IPC ────────────────────────────────────────────────────────────────

export type LocalBotStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'crashed';

export interface LocalBotState {
  botId: string;
  status: LocalBotStatus;
  pid?: number;
  startedAt?: string;
}

export interface TauriStartBotArgs {
  botId: string;
  executablePath: string;
  config: Record<string, unknown>;
}

export interface TauriStopBotArgs {
  botId: string;
}
