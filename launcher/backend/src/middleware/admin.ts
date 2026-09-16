import type { FastifyReply, FastifyRequest } from 'fastify';
import { getDb } from '../database/db.js';

export const OWNER_DISCORD_ID = '815488650111746058';
export const ADMIN_PERMISSIONS = ['products.read', 'products.write', 'users.read', 'users.write', 'admins.manage', 'faq.write', 'bots.write', 'payments.read', 'payments.refund'] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

type AdminRequest = FastifyRequest & { userId: string; adminId: string; adminPermissions: Set<string>; isOwner: boolean };

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const sessionId = req.cookies?.['admin_sid'];
  if (!sessionId) return reply.code(401).send({ error: 'AdminUnauthorised', message: 'Войдите в админ-панель.' });

  const db = getDb();
  const session = db.prepare(`
    SELECT a.id, a.user_id, u.discord_id, ap.permissions
    FROM admin_sessions a
    JOIN users u ON u.id = a.user_id
    LEFT JOIN user_admin_profiles uap ON uap.user_id = u.id
    LEFT JOIN admin_profiles ap ON ap.id = uap.profile_id
    WHERE a.id = ? AND a.expires_at > datetime('now') AND u.status = 'active'
  `).get(sessionId) as { id: string; user_id: string; discord_id: string; permissions: string | null } | undefined;

  if (!session) return reply.code(401).send({ error: 'AdminSessionExpired', message: 'Сессия админ-панели истекла.' });

  const isOwner = session.discord_id === OWNER_DISCORD_ID;
  const permissions = isOwner ? new Set<string>(ADMIN_PERMISSIONS) : new Set<string>(JSON.parse(session.permissions ?? '[]'));
  (req as AdminRequest).userId = session.user_id;
  (req as AdminRequest).adminId = session.id;
  (req as AdminRequest).adminPermissions = permissions;
  (req as AdminRequest).isOwner = isOwner;
}

export function requirePermission(permission: AdminPermission) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(req, reply);
    if (reply.sent) return;
    const adminReq = req as AdminRequest;
    if (!adminReq.adminPermissions.has(permission)) {
      return reply.code(403).send({ error: 'AdminForbidden', message: 'Недостаточно прав.' });
    }
  };
}

export function getAdminRequest(req: FastifyRequest): AdminRequest {
  return req as AdminRequest;
}
