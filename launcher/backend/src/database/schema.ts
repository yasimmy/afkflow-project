/**
 * SQLite schema — applied by migrate.ts
 * Uses ONLY .db files as required.
 */
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─── Plans ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  display_name TEXT NOT NULL,
  price       INTEGER NOT NULL DEFAULT 0,   -- cents
  duration    INTEGER NOT NULL DEFAULT 30,  -- days
  bot_count   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  discord_id    TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL,
  global_name   TEXT NOT NULL DEFAULT '',
  email         TEXT,
  avatar        TEXT,
  last_ip       TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','blocked','suspended')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);

-- ─── Subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id     TEXT NOT NULL REFERENCES plans(id),
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','expired','cancelled','paused')),
  started_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  auto_renew  INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- ─── Bots ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bots (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version     TEXT NOT NULL DEFAULT '1.0.0',
  enabled     INTEGER NOT NULL DEFAULT 1,
  is_free     INTEGER NOT NULL DEFAULT 0,
  icon_url    TEXT,
  long_description TEXT NOT NULL DEFAULT '',
  features    TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Bot entitlements (which bots a subscription includes) ───────────────────
CREATE TABLE IF NOT EXISTS bot_entitlements (
  id              TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  bot_id          TEXT NOT NULL REFERENCES bots(id),
  UNIQUE(subscription_id, bot_id)
);
CREATE INDEX IF NOT EXISTS idx_bot_entitlements_sub ON bot_entitlements(subscription_id);

-- ─── Bot configs (per user per bot) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_configs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_id      TEXT NOT NULL REFERENCES bots(id),
  config_json TEXT NOT NULL DEFAULT '{}',
  -- Extended fields for common Python bot settings
  resolution_mode TEXT NOT NULL DEFAULT 'FullHD',
  delay_between_presses INTEGER DEFAULT 120,
  color_tolerance INTEGER DEFAULT 10,
  counter_visible INTEGER DEFAULT 0,
  -- Bot-specific settings stored in config_json
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, bot_id)
);

-- ─── Launches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS launches (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  bot_id      TEXT NOT NULL REFERENCES bots(id),
  started_at  TEXT NOT NULL DEFAULT (datetime('now')),
  stopped_at  TEXT,
  status      TEXT NOT NULL DEFAULT 'running'
                CHECK (status IN ('running','paused','stopped','error','crashed'))
);
CREATE INDEX IF NOT EXISTS idx_launches_user_id ON launches(user_id);
CREATE INDEX IF NOT EXISTS idx_launches_bot_id  ON launches(bot_id);

-- ─── Purchases ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  product_id  TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount      INTEGER NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'RUB',
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','expired','refunded')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Orders and payments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id      TEXT NOT NULL REFERENCES products(id),
  amount          INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'RUB',
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','waiting_for_capture','paid','cancelled','refunded','failed')),
  provider        TEXT NOT NULL DEFAULT 'yookassa',
  provider_id     TEXT,
  checkout_url    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at        TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_id);

CREATE TABLE IF NOT EXISTS payment_events (
  id              TEXT PRIMARY KEY,
  provider        TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  order_id        TEXT,
  event_type      TEXT NOT NULL,
  payload         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Sessions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ─── Shop products ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL DEFAULT 0,
  base_price_usd INTEGER NOT NULL DEFAULT 0,
  price_week_usd INTEGER NOT NULL DEFAULT 0,
  price_month_usd INTEGER NOT NULL DEFAULT 0,
  price_year_usd INTEGER NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'RUB',
  image_url   TEXT,
  long_description TEXT NOT NULL DEFAULT '',
  media_urls  TEXT NOT NULL DEFAULT '[]',
  features    TEXT NOT NULL DEFAULT '[]',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

CREATE TABLE IF NOT EXISTS request_logs (
  id TEXT PRIMARY KEY,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip TEXT,
  user_id TEXT,
  user_agent TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at);

-- ─── Admin sessions and custom admin profiles ───────────────────────────────
CREATE TABLE IF NOT EXISTS admin_sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id  TEXT,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);

CREATE TABLE IF NOT EXISTS admin_profiles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  description   TEXT NOT NULL DEFAULT '',
  permissions   TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_admin_profiles (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_id    TEXT NOT NULL REFERENCES admin_profiles(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Admin roles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  role     TEXT NOT NULL DEFAULT 'VIEWER'
             CHECK (role IN ('OWNER','ADMIN','SUPPORT','VIEWER')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Audit log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  admin_id    TEXT NOT NULL REFERENCES admins(id),
  action      TEXT NOT NULL,
  target_user TEXT,
  target_bot  TEXT,
  metadata    TEXT DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Public FAQ ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id          TEXT PRIMARY KEY,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(active, sort_order);
`;
