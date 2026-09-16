import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';

import { registerAuthRoutes }   from './auth/discord.js';
import { registerMeRoutes }     from './routes/me.js';
import { registerBotRoutes }    from './routes/bots.js';
import { registerSystemRoutes } from './routes/system.js';
import { registerShopRoutes }   from './routes/shop.js';
import { registerAdminRoutes }  from './admin/routes.js';
import { registerFaqRoutes }    from './routes/faq.js';
import { registerPaymentRoutes } from './routes/payments.js';
import { closeDb } from './database/db.js';
import { getDb } from './database/db.js';
import { newId } from './utils/id.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

const app = Fastify({
  logger: process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : true,
});

// ─── Plugins ──────────────────────────────────────────────────────────────────

await app.register(fastifyHelmet, {
  contentSecurityPolicy: false, // handled by frontend
});

await app.register(fastifyCors, {
  origin:      /^https?:\/\/(localhost|127\.0\.0\.1):5173$/,
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

await app.register(fastifyCookie);

await app.register(fastifyRateLimit, {
  max:        100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    error: 'TooManyRequests',
    message: 'Слишком много запросов. Попробуйте позже.',
  }),
});

app.addHook('onRequest', async (req) => {
  (req as typeof req & { startedAt: number }).startedAt = Date.now();
});

app.addHook('onResponse', async (req, reply) => {
  const startedAt = (req as typeof req & { startedAt?: number }).startedAt ?? Date.now();
  const sessionId = req.cookies?.['sid'];
  const user = sessionId ? getDb().prepare('SELECT user_id FROM sessions WHERE id = ?').get(sessionId) as { user_id: string } | undefined : undefined;
  getDb().prepare('INSERT INTO request_logs (id, method, path, status_code, ip, user_id, user_agent, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(newId('log'), req.method, req.url, reply.statusCode, req.ip, user?.user_id ?? null, req.headers['user-agent'] ?? null, Date.now() - startedAt);
});

// ─── Routes ───────────────────────────────────────────────────────────────────

await registerAuthRoutes(app);
await registerMeRoutes(app);
await registerBotRoutes(app);
await registerSystemRoutes(app);
await registerShopRoutes(app);
await registerAdminRoutes(app);
await registerFaqRoutes(app);
await registerPaymentRoutes(app);

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.setNotFoundHandler((_req, reply) => {
  reply.code(404).send({ error: 'NotFound', message: 'Маршрут не найден.' });
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.setErrorHandler((err, _req, reply) => {
  app.log.error(err);
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  reply.code(status).send({
    error:   err.name ?? 'InternalError',
    message: status >= 500 ? 'Внутренняя ошибка сервера.' : err.message,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

await app.listen({ port: PORT, host: HOST });
console.log(`AFKFlow Backend listening on http://${HOST}:${PORT}`);

// Graceful shutdown
const shutdown = async () => {
  await app.close();
  closeDb();
  process.exit(0);
};

process.on('SIGINT',  () => void shutdown());
process.on('SIGTERM', () => void shutdown());
