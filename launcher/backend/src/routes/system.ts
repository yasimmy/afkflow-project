import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../database/db.js';

type AuthReq = FastifyRequest & { userId: string };

export async function registerSystemRoutes(app: FastifyInstance) {

  app.get('/api/health', async (_req, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/version', async (_req, reply) => {
    return reply.send({
      version:    process.env.APP_VERSION    ?? '1.0.0',
      minVersion: process.env.APP_MIN_VERSION ?? '1.0.0',
      changelog:  '',
      critical:   false,
    });
  });

  // ── SSE — realtime events ──────────────────────────────────────────────────
  app.get('/api/events', async (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL ?? 'http://localhost:5173',
      'Access-Control-Allow-Credentials': 'true',
    });

    // Heartbeat every 25 s to keep connection alive
    const beat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 25_000);

    req.raw.on('close', () => clearInterval(beat));
  });

  // ── GET /api/stats — user statistics ───────────────────────────────────────
  app.get('/api/stats', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as AuthReq).userId;
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
    const totalLaunches = (db.prepare('SELECT COUNT(*) as c FROM launches WHERE user_id = ?').get(userId) as { c: number }).c;
    const totalSeconds  = (db.prepare(`
      SELECT COALESCE(SUM(
        (julianday(stopped_at) - julianday(started_at)) * 86400
      ), 0) as s
      FROM launches
      WHERE user_id = ? AND status = 'stopped' AND stopped_at IS NOT NULL
    `).get(userId) as { s: number }).s;

    const sub = db.prepare(`
      SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1
    `).get(userId) as { id: string } | undefined;

    const paidBotCount = sub
      ? (db.prepare('SELECT COUNT(*) as c FROM bot_entitlements WHERE subscription_id = ?').get(sub.id) as { c: number }).c
      : 0;
    const freeBotCount = (db.prepare('SELECT COUNT(*) as c FROM bots WHERE enabled = 1 AND is_free = 1').get() as { c: number }).c;
    const botCount = paidBotCount + freeBotCount;

    return reply.send({
      totalLaunches,
      totalRuntimeSeconds: Math.round(totalSeconds),
      botCount,
      registeredAt: user?.['created_at'] as string ?? new Date().toISOString(),
    });
  });

  // ── GET /api/purchases — user purchases ────────────────────────────────────
  app.get('/api/purchases', { preHandler: requireAuth }, async (req, reply) => {
    // TODO: Implement purchases table and queries
    // For now, return empty array since purchases aren't stored in the schema
    return reply.send([]);
  });

  app.get('/api/subscription', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as AuthReq).userId;
    const db = getDb();

    const sub = db.prepare(`
      SELECT s.*, p.display_name as plan_display_name, p.bot_count
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = ?
      ORDER BY s.status = 'active' DESC, s.expires_at DESC
      LIMIT 1
    `).get(userId) as Record<string, unknown> | undefined;

    if (!sub) {
      return reply.code(404).send({ error: 'NotFound', message: 'Подписка не найдена.' });
    }

    return reply.send({
      id:              sub['id'],
      plan:            sub['plan_id'],
      planDisplayName: sub['plan_display_name'],
      status:          sub['status'],
      startedAt:       sub['started_at'],
      expiresAt:       sub['expires_at'],
      botCount:        sub['bot_count'],
      autoRenew:       Boolean(sub['auto_renew']),
    });
  });
}
