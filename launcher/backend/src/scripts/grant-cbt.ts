/**
 * grant-cbt.ts
 * Выдаёт CBT Closing Beta Test подписку указанным Discord ID.
 * Запуск: npx tsx src/scripts/grant-cbt.ts
 */
import 'dotenv/config';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH ?? './data/afkflow.db';
const db = new Database(path.resolve(DB_PATH));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Discord IDs которым выдаём CBT ──────────────────────────────────────────

const DISCORD_IDS = [
  '1019379306369134682',
  '1503043754850779380',
  '787291305667461130',
  '899284048545984543',
];

// ─── Ensure CBT plan exists ───────────────────────────────────────────────────

const CBT_PLAN_ID   = 'plan_cbt';
const CBT_PLAN_NAME = 'CBT Closing Beta Test';

db.prepare(`
  INSERT OR IGNORE INTO plans (id, name, display_name, price, duration, bot_count)
  VALUES (?, ?, ?, 0, 3650, 8)
`).run(CBT_PLAN_ID, 'cbt-closing-beta-test', CBT_PLAN_NAME);

console.log(`✓ Plan "${CBT_PLAN_NAME}" ready`);

// ─── All enabled bots ─────────────────────────────────────────────────────────

const allBots = db
  .prepare('SELECT id FROM bots WHERE enabled = 1')
  .all() as Array<{ id: string }>;

console.log(`✓ Found ${allBots.length} bots to entitle`);

// ─── Grant function ───────────────────────────────────────────────────────────

function grantCbt(discordId: string) {
  const user = db
    .prepare('SELECT id, username FROM users WHERE discord_id = ?')
    .get(discordId) as { id: string; username: string } | undefined;

  if (!user) {
    console.log(`  ⚠  Discord ID ${discordId} — пользователь не найден в БД (не логинился)`);
    return;
  }

  // Deactivate any existing CBT subscription for this user
  db.prepare(`
    UPDATE subscriptions
    SET status = 'cancelled'
    WHERE user_id = ? AND plan_id = ?
  `).run(user.id, CBT_PLAN_ID);

  // Create fresh subscription
  const subId = `sub_cbt_${user.id}`;
  db.prepare(`
    INSERT OR REPLACE INTO subscriptions
      (id, user_id, plan_id, status, started_at, expires_at, auto_renew)
    VALUES
      (?, ?, ?, 'active', datetime('now'), '2099-12-31T23:59:59.000Z', 0)
  `).run(subId, user.id, CBT_PLAN_ID);

  // Grant entitlements to all bots
  const addEnt = db.prepare(`
    INSERT OR IGNORE INTO bot_entitlements (id, subscription_id, bot_id)
    VALUES (?, ?, ?)
  `);
  for (const bot of allBots) {
    addEnt.run(`ent_${subId}_${bot.id}`, subId, bot.id);
  }

  console.log(`  ✓ @${user.username} (${discordId}) — CBT подписка выдана, ${allBots.length} ботов`);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log('\n=== Выдача CBT подписки ===\n');

const grantAll = db.transaction(() => {
  for (const id of DISCORD_IDS) {
    grantCbt(id);
  }
});

grantAll();
db.close();

console.log('\n✓ Готово');
