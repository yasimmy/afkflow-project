import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { SCHEMA_SQL } from './schema.js';

const require = createRequire(import.meta.url);

const DB_PATH = process.env.DB_PATH ?? './data/afkflow.db';
const resolved = path.resolve(DB_PATH);
const DB_JSON_PATH = resolved.replace('.db', '.json');

// Ensure data directory exists
fs.mkdirSync(path.dirname(resolved), { recursive: true });

let _fileDb: any = null;

// File-based database for development
function getFileDb() {
  if (_fileDb === null) {
    if (fs.existsSync(DB_JSON_PATH)) {
      _fileDb = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf-8'));
    } else {
      _fileDb = {
        users: [],
        plans: [],
        subscriptions: [],
        bots: [],
        bot_entitlements: [],
        bot_configs: [],
        launches: [],
        sessions: [],
      };
    }
  }
  return _fileDb;
}

function saveFileDb() {
  fs.writeFileSync(DB_JSON_PATH, JSON.stringify(_fileDb, null, 2));
}

function migrateLaunchesForPause(db: any) {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'launches'").get() as { sql?: string } | undefined;
  if (!table?.sql || table.sql.includes("'paused'")) return;
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec(`
    ALTER TABLE launches RENAME TO launches_old;
    CREATE TABLE launches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      bot_id TEXT NOT NULL REFERENCES bots(id),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      stopped_at TEXT,
      status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','paused','stopped','error','crashed'))
    );
    INSERT INTO launches (id, user_id, bot_id, started_at, stopped_at, status)
      SELECT id, user_id, bot_id, started_at, stopped_at, status FROM launches_old;
    DROP TABLE launches_old;
    CREATE INDEX IF NOT EXISTS idx_launches_user_id ON launches(user_id);
    CREATE INDEX IF NOT EXISTS idx_launches_bot_id ON launches(bot_id);
  `);
  db.exec('PRAGMA foreign_keys = ON');
}

function migrateFreeBots(db: any) {
  try {
    db.exec('ALTER TABLE bots ADD COLUMN is_free INTEGER NOT NULL DEFAULT 0');
  } catch {
  }
  db.prepare("UPDATE bots SET is_free = 1 WHERE slug = 'rutine-helper'").run();
  db.prepare(`
    INSERT OR IGNORE INTO bots (id, slug, name, description, version, enabled, is_free)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'bot_catch_pda',
    'catch-pda',
    'Ловля КПК',
    'Автоматически ловит уведомления КПК.',
    '1.0.0',
    1,
    0,
  );
  db.prepare(`
    INSERT OR IGNORE INTO bots (id, slug, name, description, version, enabled, is_free)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'bot_rutine_helper',
    'rutine-helper',
    'Помощник рутины',
    'Почтальон, дальнобойщик и аквалангист.',
    '1.0.0',
    1,
    1,
  );
  db.prepare(`
    UPDATE bots
    SET name = ?, description = ?
    WHERE slug = 'rutine-helper'
  `).run(
    'Помощник рутины',
    'Почтальон, дальнобойщик и аквалангист.',
  );
}

function migrateUsersForEmail(db: any) {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get() as { sql?: string } | undefined;
  if (!table?.sql || /\bemail\b/i.test(table.sql)) return;
  db.exec('ALTER TABLE users ADD COLUMN email TEXT');
}

function migrateProductsForDetails(db: any) {
  const columns = db.prepare('PRAGMA table_info(products)').all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  if (!names.has('long_description')) db.exec("ALTER TABLE products ADD COLUMN long_description TEXT NOT NULL DEFAULT ''");
  if (!names.has('media_urls')) db.exec("ALTER TABLE products ADD COLUMN media_urls TEXT NOT NULL DEFAULT '[]'");
  if (!names.has('features')) db.exec("ALTER TABLE products ADD COLUMN features TEXT NOT NULL DEFAULT '[]'");
  if (!names.has('base_price_usd')) db.exec("ALTER TABLE products ADD COLUMN base_price_usd INTEGER NOT NULL DEFAULT 0");
  if (!names.has('price_week_usd')) db.exec("ALTER TABLE products ADD COLUMN price_week_usd INTEGER NOT NULL DEFAULT 0");
  if (!names.has('price_month_usd')) db.exec("ALTER TABLE products ADD COLUMN price_month_usd INTEGER NOT NULL DEFAULT 0");
  if (!names.has('price_year_usd')) db.exec("ALTER TABLE products ADD COLUMN price_year_usd INTEGER NOT NULL DEFAULT 0");
}

function migrateUserIp(db: any) {
  const columns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === 'last_ip')) db.exec('ALTER TABLE users ADD COLUMN last_ip TEXT');
}

function migrateBotsAndFaq(db: any) {
  const columns = db.prepare('PRAGMA table_info(bots)').all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  if (!names.has('icon_url')) db.exec("ALTER TABLE bots ADD COLUMN icon_url TEXT");
  if (!names.has('long_description')) db.exec("ALTER TABLE bots ADD COLUMN long_description TEXT NOT NULL DEFAULT ''");
  if (!names.has('features')) db.exec("ALTER TABLE bots ADD COLUMN features TEXT NOT NULL DEFAULT '[]'");
}

// Simple file-based statement handler
class FileStatement {
  constructor(private sql: string, private db: any) {}

  run(...params: any[]) {
    const table = this.sql.match(/(?:INSERT INTO|UPDATE|DELETE FROM)\s+(\w+)/i)?.[1];
    if (!table || !this.db[table]) return { changes: 0, lastID: null };

    if (this.sql.includes('INSERT')) {
      const record: any = { id: `id_${Date.now()}_${Math.random()}` };
      for (let i = 0; i < params.length; i++) {
        record[`field_${i}`] = params[i];
      }
      this.db[table].push(record);
      return { changes: 1, lastID: record.id };
    }

    if (this.sql.includes('DELETE') || this.sql.includes('UPDATE')) {
      return { changes: 1, lastID: null };
    }

    return { changes: 0, lastID: null };
  }

  get(...params: any[]) {
    const table = this.sql.match(/FROM\s+(\w+)/i)?.[1];
    if (!table || !this.db[table] || this.db[table].length === 0) return null;
    return this.db[table][0];
  }

  all(...params: any[]) {
    const table = this.sql.match(/FROM\s+(\w+)/i)?.[1];
    if (!table || !this.db[table]) return [];
    return this.db[table];
  }
}

// Create database proxy that works with both backends
class DatabaseProxy {
  private db: any;
  private isFileDb: boolean;

  constructor(db: any, isFileDb: boolean) {
    this.db = db;
    this.isFileDb = isFileDb;
  }

  exec(sql: string) {
    if (!this.isFileDb) {
      this.db.exec(sql);
    }
  }

  prepare(sql: string) {
    if (this.isFileDb) {
      return new FileStatement(sql, this.db);
    }
    return this.db.prepare(sql);
  }

  transaction(fn: () => void) {
    if (this.isFileDb) {
      return () => {
        fn();
        saveFileDb();
      };
    }
    return this.db.transaction(fn);
  }

  close() {
    if (!this.isFileDb && this.db?.close) {
      this.db.close();
    }
  }
}

let dbInstance: DatabaseProxy | null = null;

export function getDb(): any {
  if (dbInstance === null) {
    try {
      // Try to load better-sqlite3
      const Database = require('better-sqlite3');
      const db = new Database(resolved);
      db.exec(SCHEMA_SQL);
      migrateLaunchesForPause(db);
      migrateUsersForEmail(db);
      migrateUserIp(db);
      migrateProductsForDetails(db);
      migrateBotsAndFaq(db);
      migrateFreeBots(db);
      dbInstance = new DatabaseProxy(db, false);
      console.log('✓ Using SQLite database');
    } catch (e: any) {
      // Fallback to file-based database
      console.warn('⚠️  better-sqlite3 not available, using file-based database');
      const fileDb = getFileDb();
      dbInstance = new DatabaseProxy(fileDb, true);
    }
  }
  return dbInstance;
}

export function closeDb(): void {
  dbInstance?.close();
  dbInstance = null;
}
