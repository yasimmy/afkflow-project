import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../database/db.js';
import { newId } from '../utils/id.js';

type AuthReq = FastifyRequest & { userId: string };

export async function registerBotRoutes(app: FastifyInstance) {
  const pre = { preHandler: requireAuth };

  app.get('/api/catalog/bots', async (_req, reply) => {
    const bots = getDb().prepare(`SELECT id, slug, name, description, version, icon_url as iconUrl, long_description as longDescription, features FROM bots WHERE enabled = 1 ORDER BY created_at DESC`).all() as Array<Record<string, unknown>>;
    return reply.send(bots.map((bot) => ({ ...bot, features: parseJsonArray(bot.features) })));
  });

  // ── GET /api/bots ──────────────────────────────────────────────────────────
  app.get('/api/bots', pre, async (req, reply) => {
    const userId = (req as AuthReq).userId;
    const db = getDb();

    const bots = db.prepare('SELECT * FROM bots WHERE enabled = 1').all() as Array<Record<string, unknown>>;
    const sub  = db.prepare(`
      SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY expires_at DESC LIMIT 1
    `).get(userId) as { id: string } | undefined;

    const entitled = sub
      ? new Set(
          (db.prepare('SELECT bot_id FROM bot_entitlements WHERE subscription_id = ?')
            .all(sub.id) as Array<{ bot_id: string }>)
            .map((r) => r.bot_id),
        )
      : new Set<string>();

    return reply.send(
      bots.map((b) => ({
        id:          b['id'],
        slug:        b['slug'],
        name:        b['name'],
        description: b['description'],
        version:     b['version'],
        enabled:     Boolean(b['enabled']),
        entitled:    Boolean(b['is_free']) || entitled.has(b['id'] as string),
        status:      'ready',
        icon:        '',
      })),
    );
  });

  // ── GET /api/bots/:id/config ───────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/bots/:id/config', pre, async (req, reply) => {
    const userId = (req as AuthReq).userId;
    const botId  = req.params.id;
    const db = getDb();

    const row = db
      .prepare('SELECT * FROM bot_configs WHERE user_id = ? AND bot_id = ?')
      .get(userId, botId) as Record<string, unknown> | undefined;

    if (!row) {
      return reply.send({
        id: null, userId, botId,
        config: { 
          resolution_mode: 'FullHD',
          delay_between_presses: 120,
          color_tolerance: 10,
          counter_visible: false
        }, 
        updatedAt: new Date().toISOString(),
      });
    }

    const config = JSON.parse(row['config_json'] as string);
    
    // Merge database columns with config JSON
    return reply.send({
      id:        row['id'],
      userId:    row['user_id'],
      botId:     row['bot_id'],
      config: {
        ...config,
        resolution_mode: row['resolution_mode'] ?? 'FullHD',
        delay_between_presses: row['delay_between_presses'] ?? 120,
        color_tolerance: row['color_tolerance'] ?? 10,
        counter_visible: Boolean(row['counter_visible']),
      },
      updatedAt: row['updated_at'],
    });
  });

  // ── PUT /api/bots/:id/config ───────────────────────────────────────────────
  app.put<{ Params: { id: string }; Body: { config: Record<string, unknown> } }>(
    '/api/bots/:id/config', pre,
    async (req, reply) => {
      const userId = (req as AuthReq).userId;
      const botId  = req.params.id;
      const config = req.body?.config ?? {};
      const db = getDb();

      const existing = db
        .prepare('SELECT id FROM bot_configs WHERE user_id = ? AND bot_id = ?')
        .get(userId, botId) as { id: string } | undefined;

      const id = existing?.id ?? newId('cfg');
      const json = JSON.stringify(config);

      // Extract common settings for database columns
      const resolutionMode = (config.resolution_mode as string) ?? 'FullHD';
      const delayBetweenPresses = (config.delay_between_presses as number) ?? 120;
      const colorTolerance = (config.color_tolerance as number) ?? 10;
      const counterVisible = (config.counter_visible as boolean) ?? false;

      if (existing) {
        db.prepare(`
          UPDATE bot_configs 
          SET config_json = ?, 
              resolution_mode = ?, 
              delay_between_presses = ?, 
              color_tolerance = ?, 
              counter_visible = ?,
              updated_at = datetime('now') 
          WHERE id = ?
        `).run(json, resolutionMode, delayBetweenPresses, colorTolerance, counterVisible ? 1 : 0, id);
      } else {
        db.prepare(`
          INSERT INTO bot_configs (id, user_id, bot_id, config_json, resolution_mode, delay_between_presses, color_tolerance, counter_visible) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, userId, botId, json, resolutionMode, delayBetweenPresses, colorTolerance, counterVisible ? 1 : 0);
      }

      return reply.send({ id, userId, botId, config, updatedAt: new Date().toISOString() });
    },
  );

  // ── POST /api/bots/:id/start ───────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/bots/:id/start', pre, async (req, reply) => {
    const userId = (req as AuthReq).userId;
    const botId  = req.params.id;
    const db = getDb();

    // Entitlement check — backend is source of truth
    const sub = db.prepare(`
      SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1
    `).get(userId) as { id: string } | undefined;

    const bot = db.prepare('SELECT is_free FROM bots WHERE id = ?').get(botId) as { is_free?: number } | undefined;
    if (!bot?.is_free) {
      if (!sub) {
        return reply.code(403).send({ error: 'NoSubscription', message: 'Активная подписка не найдена.' });
      }

      const ent = db
        .prepare('SELECT id FROM bot_entitlements WHERE subscription_id = ? AND bot_id = ?')
        .get(sub.id, botId);

      if (!ent) {
        return reply.code(403).send({ error: 'NotEntitled', message: 'Нет доступа к этому боту.' });
      }
    }

    const launchId = newId('launch');
    db.prepare(`
      INSERT INTO launches (id, user_id, bot_id) VALUES (?, ?, ?)
    `).run(launchId, userId, botId);

    return reply.send({
      id: launchId, botId, userId,
      startedAt: new Date().toISOString(),
      stoppedAt: null, status: 'running', durationSeconds: null,
    });
  });

  // ── POST /api/bots/:id/stop ────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/bots/:id/stop', pre, async (req, reply) => {
    const userId = (req as AuthReq).userId;
    const botId  = req.params.id;
    const db = getDb();

    const launch = db
      .prepare(`SELECT * FROM launches WHERE user_id = ? AND bot_id = ? AND status IN ('running', 'paused') ORDER BY started_at DESC LIMIT 1`)
      .get(userId, botId) as Record<string, unknown> | undefined;

    if (!launch) {
      return reply.code(404).send({ error: 'NotRunning', message: 'Бот не запущен.' });
    }

    db.prepare(`
      UPDATE launches SET status = 'stopped', stopped_at = datetime('now') WHERE id = ?
    `).run(launch['id']);

    return reply.send({
      id: launch['id'], botId, userId,
      startedAt: launch['started_at'], stoppedAt: new Date().toISOString(),
      status: 'stopped', durationSeconds: null,
    });
  });

  // ── POST /api/bots/:id/restart ─────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/bots/:id/restart', pre, async (req, reply) => {
    // Stop then start
    await app.inject({ method: 'POST', url: `/api/bots/${req.params.id}/stop`, headers: req.headers });
    return app.inject({ method: 'POST', url: `/api/bots/${req.params.id}/start`, headers: req.headers });
  });

  // ── POST /api/bots/start-all ───────────────────────────────────────────────
  app.post('/api/bots/start-all', pre, async (req, reply) => {
    const userId = (req as AuthReq).userId;
    const db = getDb();

    const sub = db.prepare(`
      SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1
    `).get(userId) as { id: string } | undefined;

    if (!sub) {
      return reply.code(403).send({ error: 'NoSubscription', message: 'Активная подписка не найдена.' });
    }

    const entitled = db
      .prepare(`
        SELECT be.bot_id FROM bot_entitlements be
        JOIN bots b ON b.id = be.bot_id
        WHERE be.subscription_id = ? AND b.enabled = 1
      `)
      .all(sub.id) as Array<{ bot_id: string }>;

    const launches = entitled.map(({ bot_id }) => {
      const id = newId('launch');
      db.prepare('INSERT INTO launches (id, user_id, bot_id) VALUES (?, ?, ?)').run(id, userId, bot_id);
      return { id, botId: bot_id, userId, startedAt: new Date().toISOString(), stoppedAt: null, status: 'running', durationSeconds: null };
    });

    return reply.send(launches);
  });

  // ── POST /api/bots/:id/pause ───────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/bots/:id/pause', pre, async (req, reply) => {
    const userId = (req as AuthReq).userId;
    const botId  = req.params.id;
    const db = getDb();

    const launch = db
      .prepare(`SELECT * FROM launches WHERE user_id = ? AND bot_id = ? AND status = 'running' ORDER BY started_at DESC LIMIT 1`)
      .get(userId, botId) as Record<string, unknown> | undefined;

    if (!launch) {
      return reply.code(404).send({ error: 'NotRunning', message: 'Бот не запущен.' });
    }

    // Update launch status to paused
    db.prepare(`
      UPDATE launches SET status = 'paused' WHERE id = ?
    `).run(launch['id']);

    return reply.send({ success: true });
  });

  // ── POST /api/bots/:id/resume ──────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/bots/:id/resume', pre, async (req, reply) => {
    const userId = (req as AuthReq).userId;
    const botId  = req.params.id;
    const db = getDb();

    const launch = db
      .prepare(`SELECT * FROM launches WHERE user_id = ? AND bot_id = ? AND status = 'paused' ORDER BY started_at DESC LIMIT 1`)
      .get(userId, botId) as Record<string, unknown> | undefined;

    if (!launch) {
      return reply.code(404).send({ error: 'NotPaused', message: 'Бот не на паузе.' });
    }

    // Update launch status to running
    db.prepare(`
      UPDATE launches SET status = 'running' WHERE id = ?
    `).run(launch['id']);

    return reply.send({ success: true });
  });

  // ── GET /api/bots/:id/action-count ────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/bots/:id/action-count', pre, async (req, reply) => {
    // This would normally come from Tauri, for now return 0
    return reply.send({ count: 0 });
  });
}

function parseJsonArray(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
