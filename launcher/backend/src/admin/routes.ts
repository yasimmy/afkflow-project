import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getDb } from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import { getAdminRequest, OWNER_DISCORD_ID, requireAdmin, requirePermission, type AdminPermission } from '../middleware/admin.js';
import { newId } from '../utils/id.js';

const adminCookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

type Body = Record<string, unknown>;
type Params = { id: string };

function getUserId(req: FastifyRequest) {
  return (req as FastifyRequest & { userId: string }).userId;
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post<{ Body: { password?: string } }>('/api/admin/login', { preHandler: requireAuth }, async (req, reply) => {
    const db = getDb();
    const user = db.prepare('SELECT id, discord_id, status FROM users WHERE id = ?').get(getUserId(req)) as { id: string; discord_id: string; status: string } | undefined;
    if (!user || user.status !== 'active') return reply.code(403).send({ error: 'AccountBlocked', message: 'Аккаунт недоступен.' });

    const profile = db.prepare(`
      SELECT ap.id, ap.name, ap.permissions FROM admin_profiles ap
      JOIN user_admin_profiles uap ON uap.profile_id = ap.id WHERE uap.user_id = ?
    `).get(user.id) as { id: string; name: string; permissions: string } | undefined;
    const isOwner = user.discord_id === OWNER_DISCORD_ID;
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin';
    if (!isOwner && !profile) return reply.code(403).send({ error: 'NotAdmin', message: 'У вас нет доступа к админ-панели.' });
    if (isOwner && req.body?.password !== adminPassword) return reply.code(401).send({ error: 'InvalidAdminPassword', message: 'Неверный пароль админ-панели.' });

    const id = newId('admin_session');
    db.prepare('INSERT INTO admin_sessions (id, user_id, profile_id, expires_at) VALUES (?, ?, ?, datetime(\'now\', \'+8 hours\'))').run(id, user.id, profile?.id ?? null);
    reply.setCookie('admin_sid', id, { ...adminCookie, maxAge: 8 * 60 * 60 });
    return reply.send({ ok: true, owner: isOwner, profile: isOwner ? 'OWNER' : profile?.name });
  });

  app.post('/api/admin/logout', async (req, reply) => {
    const id = req.cookies?.['admin_sid'];
    if (id) getDb().prepare('DELETE FROM admin_sessions WHERE id = ?').run(id);
    reply.clearCookie('admin_sid', { path: '/' });
    return reply.send({ ok: true });
  });

  app.get('/api/admin/me', { preHandler: requireAdmin }, async (req, reply) => {
    const admin = getAdminRequest(req);
    return reply.send({ owner: admin.isOwner, permissions: [...admin.adminPermissions] });
  });

  app.get('/api/admin/products', { preHandler: requirePermission('products.read') }, async (_req, reply) => {
    return reply.send(getDb().prepare('SELECT id, slug, name, description, long_description as longDescription, price, base_price_usd as basePriceUsd, price_week_usd as priceWeekUsd, price_month_usd as priceMonthUsd, price_year_usd as priceYearUsd, currency, image_url as imageUrl, media_urls as mediaUrls, features, active, created_at as createdAt FROM products ORDER BY created_at DESC').all().map((product: Record<string, unknown>) => ({ ...product, mediaUrls: parseJsonArray(product.mediaUrls), features: parseJsonArray(product.features) })));
  });

  app.post<{ Body: Body }>('/api/admin/products', { preHandler: requirePermission('products.write') }, async (req, reply) => {
    const { slug, name, description = '', longDescription = '', mediaUrls = [], features = [], price = 0, basePriceUsd = 0, priceWeekUsd = 0, priceMonthUsd = 0, priceYearUsd = 0, currency = 'USD', imageUrl = null, active = true } = req.body ?? {};
    if (typeof slug !== 'string' || typeof name !== 'string' || !slug.trim() || !name.trim()) return reply.code(400).send({ error: 'InvalidProduct', message: 'Укажите slug и название товара.' });
    const id = newId('product');
    try {
      getDb().prepare('INSERT INTO products (id, slug, name, description, long_description, media_urls, features, price, base_price_usd, price_week_usd, price_month_usd, price_year_usd, currency, image_url, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, slug.trim(), name.trim(), String(description), String(longDescription), JSON.stringify(toStringArray(mediaUrls)), JSON.stringify(toStringArray(features)), Number(price), Math.round(Number(basePriceUsd) * 100), Math.round(Number(priceWeekUsd) * 100), Math.round(Number(priceMonthUsd) * 100), Math.round(Number(priceYearUsd) * 100), String(currency), imageUrl ? String(imageUrl) : null, active === false ? 0 : 1);
    } catch (error) {
      if (String(error).includes('UNIQUE')) return reply.code(409).send({ error: 'ProductExists', message: 'Товар с таким slug уже существует.' });
      throw error;
    }
    return reply.code(201).send({ id });
  });

  app.put<{ Params: Params; Body: Body }>('/api/admin/products/:id', { preHandler: requirePermission('products.write') }, async (req, reply) => {
    const { slug, name, description = '', longDescription = '', mediaUrls = [], features = [], price = 0, basePriceUsd = 0, priceWeekUsd = 0, priceMonthUsd = 0, priceYearUsd = 0, currency = 'USD', imageUrl = null, active = true } = req.body ?? {};
    if (typeof slug !== 'string' || !slug.trim() || typeof name !== 'string' || !name.trim()) return reply.code(400).send({ error: 'InvalidProduct', message: 'Укажите slug и название товара.' });
    let result;
    try {
      result = getDb().prepare('UPDATE products SET slug = ?, name = ?, description = ?, long_description = ?, media_urls = ?, features = ?, price = ?, base_price_usd = ?, price_week_usd = ?, price_month_usd = ?, price_year_usd = ?, currency = ?, image_url = ?, active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(slug.trim(), name.trim(), String(description), String(longDescription), JSON.stringify(toStringArray(mediaUrls)), JSON.stringify(toStringArray(features)), Number(price), Math.round(Number(basePriceUsd) * 100), Math.round(Number(priceWeekUsd) * 100), Math.round(Number(priceMonthUsd) * 100), Math.round(Number(priceYearUsd) * 100), String(currency), imageUrl ? String(imageUrl) : null, active === false ? 0 : 1, req.params.id);
    } catch (error) {
      if (String(error).includes('UNIQUE')) return reply.code(409).send({ error: 'ProductExists', message: 'Товар с таким slug уже существует.' });
      throw error;
    }
    if (!result.changes) return reply.code(404).send({ error: 'ProductNotFound', message: 'Товар не найден.' });
    return reply.send({ ok: true });
  });

  app.delete<{ Params: Params }>('/api/admin/products/:id', { preHandler: requirePermission('products.write') }, async (req, reply) => {
    const result = getDb().prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (!result.changes) return reply.code(404).send({ error: 'ProductNotFound', message: 'Товар не найден.' });
    return reply.send({ ok: true });
  });

  app.get('/api/admin/faq', { preHandler: requirePermission('faq.write') }, async (_req, reply) => {
    return reply.send(getDb().prepare('SELECT id, question, answer, sort_order as sortOrder, active FROM faqs ORDER BY sort_order, created_at').all());
  });

  app.post<{ Body: { question?: string; answer?: string; sortOrder?: number } }>('/api/admin/faq', { preHandler: requirePermission('faq.write') }, async (req, reply) => {
    if (!req.body?.question?.trim() || !req.body.answer?.trim()) return reply.code(400).send({ error: 'InvalidFaq', message: 'Заполните вопрос и ответ.' });
    const id = newId('faq');
    getDb().prepare('INSERT INTO faqs (id, question, answer, sort_order) VALUES (?, ?, ?, ?)').run(id, req.body.question.trim(), req.body.answer.trim(), Number(req.body.sortOrder ?? 0));
    return reply.code(201).send({ id });
  });

  app.put<{ Params: Params; Body: { question?: string; answer?: string; sortOrder?: number; active?: boolean } }>('/api/admin/faq/:id', { preHandler: requirePermission('faq.write') }, async (req, reply) => {
    const result = getDb().prepare('UPDATE faqs SET question = ?, answer = ?, sort_order = ?, active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(req.body?.question?.trim() ?? '', req.body?.answer?.trim() ?? '', Number(req.body?.sortOrder ?? 0), req.body?.active === false ? 0 : 1, req.params.id);
    if (!result.changes) return reply.code(404).send({ error: 'FaqNotFound', message: 'FAQ не найден.' });
    return reply.send({ ok: true });
  });

  app.delete<{ Params: Params }>('/api/admin/faq/:id', { preHandler: requirePermission('faq.write') }, async (req, reply) => {
    getDb().prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
    return reply.send({ ok: true });
  });

  app.get('/api/admin/bots', { preHandler: requirePermission('bots.write') }, async (_req, reply) => {
    return reply.send(getDb().prepare('SELECT id, slug, name, description, version, icon_url as iconUrl, long_description as longDescription, features, enabled, is_free as isFree FROM bots ORDER BY created_at DESC').all().map((bot: Record<string, unknown>) => ({ ...bot, features: parseJsonArray(bot.features) })));
  });

  app.post<{ Body: Body }>('/api/admin/bots', { preHandler: requirePermission('bots.write') }, async (req, reply) => {
    const { slug, name, description = '', version = '1.0.0', iconUrl = null, longDescription = '', features = [], enabled = true, isFree = false } = req.body ?? {};
    if (typeof slug !== 'string' || typeof name !== 'string' || !slug.trim() || !name.trim()) return reply.code(400).send({ error: 'InvalidBot', message: 'Укажите slug и название бота.' });
    const id = newId('bot');
    try { getDb().prepare('INSERT INTO bots (id, slug, name, description, version, icon_url, long_description, features, enabled, is_free) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, slug.trim(), name.trim(), String(description), String(version), iconUrl ? String(iconUrl) : null, String(longDescription), JSON.stringify(toStringArray(features)), enabled === false ? 0 : 1, isFree === true ? 1 : 0); }
    catch (error) { if (String(error).includes('UNIQUE')) return reply.code(409).send({ error: 'BotExists', message: 'Такой slug уже существует.' }); throw error; }
    return reply.code(201).send({ id });
  });

  app.put<{ Params: Params; Body: Body }>('/api/admin/bots/:id', { preHandler: requirePermission('bots.write') }, async (req, reply) => {
    const { name, description = '', version = '1.0.0', iconUrl = null, longDescription = '', features = [], enabled = true, isFree = false } = req.body ?? {};
    const result = getDb().prepare('UPDATE bots SET name = ?, description = ?, version = ?, icon_url = ?, long_description = ?, features = ?, enabled = ?, is_free = ? WHERE id = ?').run(String(name ?? ''), String(description), String(version), iconUrl ? String(iconUrl) : null, String(longDescription), JSON.stringify(toStringArray(features)), enabled === false ? 0 : 1, isFree === true ? 1 : 0, req.params.id);
    if (!result.changes) return reply.code(404).send({ error: 'BotNotFound', message: 'Бот не найден.' });
    return reply.send({ ok: true });
  });

  app.get('/api/admin/users', { preHandler: requirePermission('users.read') }, async (_req, reply) => {
    return reply.send(getDb().prepare(`SELECT u.id, u.discord_id as discordId, u.username, u.global_name as globalName, u.email, u.avatar, u.last_ip as lastIp, u.status, u.created_at as createdAt, ap.name as adminProfile FROM users u LEFT JOIN user_admin_profiles uap ON uap.user_id = u.id LEFT JOIN admin_profiles ap ON ap.id = uap.profile_id ORDER BY u.created_at DESC`).all());
  });

  app.get('/api/admin/logs', { preHandler: requirePermission('users.read') }, async (_req, reply) => {
    return reply.send(getDb().prepare('SELECT id, method, path, status_code as statusCode, ip, user_id as userId, user_agent as userAgent, duration_ms as durationMs, created_at as createdAt FROM request_logs ORDER BY created_at DESC LIMIT 500').all());
  });

  app.get('/api/admin/profiles', { preHandler: requirePermission('admins.manage') }, async (_req, reply) => {
    return reply.send(getDb().prepare('SELECT id, name, description, permissions, created_at as createdAt FROM admin_profiles ORDER BY name').all().map((profile: { permissions: string }) => ({ ...profile, permissions: JSON.parse(profile.permissions) })));
  });

  app.post<{ Body: { name?: string; description?: string; permissions?: string[] } }>('/api/admin/profiles', { preHandler: requirePermission('admins.manage') }, async (req, reply) => {
    const name = req.body?.name?.trim();
    const permissions = (req.body?.permissions ?? []).filter((permission): permission is AdminPermission => ['products.read', 'products.write', 'users.read', 'users.write', 'admins.manage', 'faq.write', 'bots.write', 'payments.read', 'payments.refund'].includes(permission));
    if (!name) return reply.code(400).send({ error: 'InvalidProfile', message: 'Укажите название профиля.' });
    const id = newId('admin_profile');
    try {
      getDb().prepare('INSERT INTO admin_profiles (id, name, description, permissions) VALUES (?, ?, ?, ?)').run(id, name, req.body?.description ?? '', JSON.stringify(permissions));
    } catch (error) {
      if (String(error).includes('UNIQUE')) return reply.code(409).send({ error: 'ProfileExists', message: 'Такой профиль уже существует.' });
      throw error;
    }
    return reply.code(201).send({ id });
  });

  app.put<{ Params: Params; Body: { name?: string; description?: string; permissions?: string[] } }>('/api/admin/profiles/:id', { preHandler: requirePermission('admins.manage') }, async (req, reply) => {
    const permissions = (req.body?.permissions ?? []).filter((permission): permission is AdminPermission => ['products.read', 'products.write', 'users.read', 'users.write', 'admins.manage', 'faq.write', 'bots.write', 'payments.read', 'payments.refund'].includes(permission));
    const result = getDb().prepare('UPDATE admin_profiles SET name = ?, description = ?, permissions = ? WHERE id = ?').run(req.body?.name?.trim() ?? '', req.body?.description ?? '', JSON.stringify(permissions), req.params.id);
    if (!result.changes) return reply.code(404).send({ error: 'ProfileNotFound', message: 'Профиль не найден.' });
    return reply.send({ ok: true });
  });

  app.post<{ Params: { userId: string }; Body: { profileId?: string } }>('/api/admin/users/:userId/profile', { preHandler: requirePermission('admins.manage') }, async (req, reply) => {
    if (!req.body?.profileId) return reply.code(400).send({ error: 'InvalidProfile', message: 'Укажите профиль.' });
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
    const profile = db.prepare('SELECT id FROM admin_profiles WHERE id = ?').get(req.body.profileId);
    if (!user || !profile) return reply.code(404).send({ error: 'NotFound', message: 'Пользователь или профиль не найден.' });
    db.prepare('INSERT INTO user_admin_profiles (user_id, profile_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET profile_id = excluded.profile_id').run(req.params.userId, req.body.profileId);
    return reply.send({ ok: true });
  });

  app.delete<{ Params: { userId: string } }>('/api/admin/users/:userId/profile', { preHandler: requirePermission('admins.manage') }, async (req, reply) => {
    getDb().prepare('DELETE FROM user_admin_profiles WHERE user_id = ?').run(req.params.userId);
    return reply.send({ ok: true });
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

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : [];
}
