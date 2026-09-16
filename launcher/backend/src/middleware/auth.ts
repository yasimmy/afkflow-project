import type { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../database/db.js';

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const sessionId = req.cookies?.['sid'] ?? req.headers['x-session-id'];
  if (!sessionId) {
    return reply.code(401).send({ error: 'Unauthorised', message: 'Необходимо войти в аккаунт.' });
  }

  const db = getDb();
  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')")
    .get(sessionId) as { user_id: string } | undefined;

  if (!session) {
    return reply.code(401).send({ error: 'SessionExpired', message: 'Сессия истекла. Войдите снова.' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(session.user_id) as { id: string; status: string } | undefined;

  if (!user) {
    return reply.code(401).send({ error: 'Unauthorised', message: 'Пользователь не найден.' });
  }

  if (user.status === 'blocked') {
    return reply.code(403).send({ error: 'AccountBlocked', message: 'Аккаунт заблокирован.' });
  }

  // Attach user id to request for downstream handlers
  (req as FastifyRequest & { userId: string }).userId = user.id;
}
