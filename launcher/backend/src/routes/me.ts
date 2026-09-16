import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../database/db.js';

export async function registerMeRoutes(app: FastifyInstance) {

  // ── GET /api/me ────────────────────────────────────────────────────────────
  app.get('/api/me', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as FastifyRequest & { userId: string }).userId;
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;

    const sub = db.prepare(`
      SELECT s.*, p.display_name as plan_display_name, p.bot_count
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = ? AND s.status = 'active'
      ORDER BY s.expires_at DESC
      LIMIT 1
    `).get(userId) as Record<string, unknown> | undefined;

    const allBots = db.prepare('SELECT * FROM bots WHERE enabled = 1').all() as Array<Record<string, unknown>>;

    // Determine entitlements
    const entitledBotIds = sub
      ? new Set(
          (db.prepare('SELECT bot_id FROM bot_entitlements WHERE subscription_id = ?')
            .all(sub['id']) as Array<{ bot_id: string }>)
            .map((r) => r.bot_id),
        )
      : new Set<string>();

    const bots = allBots.map((b) => ({
      id:          b['id'],
      slug:        b['slug'],
      name:        b['name'],
      description: b['description'],
      version:     b['version'],
      enabled:     Boolean(b['enabled']),
      entitled:    Boolean(b['is_free']) || entitledBotIds.has(b['id'] as string),
      status:      'ready',
      icon:        '',
    }));

    // Stats
    const totalLaunches = (db.prepare('SELECT COUNT(*) as c FROM launches WHERE user_id = ?').get(userId) as { c: number }).c;
    const totalSeconds  = (db.prepare(`
      SELECT COALESCE(SUM(
        (julianday(stopped_at) - julianday(started_at)) * 86400
      ), 0) as s
      FROM launches
      WHERE user_id = ? AND status = 'stopped' AND stopped_at IS NOT NULL
    `).get(userId) as { s: number }).s;

    return reply.send({
      user: {
        id:          user['id'],
        discordId:   user['discord_id'],
        username:    user['username'],
        globalName:  user['global_name'],
        email:       user['email'],
        avatar:      user['avatar'],
        status:      user['status'],
        createdAt:   user['created_at'],
        updatedAt:   user['updated_at'],
        lastLoginAt: user['last_login_at'],
      },
      subscription: sub
        ? {
            id:              sub['id'],
            plan:            sub['plan_id'],
            planDisplayName: sub['plan_display_name'],
            status:          sub['status'],
            startedAt:       sub['started_at'],
            expiresAt:       sub['expires_at'],
            botCount:        sub['bot_count'],
            autoRenew:       Boolean(sub['auto_renew']),
          }
        : null,
      bots,
      stats: {
        totalLaunches,
        totalRuntimeSeconds: Math.round(totalSeconds),
        botCount: bots.filter((b) => b.entitled).length,
        registeredAt: user['created_at'],
      },
    });
  });

}
