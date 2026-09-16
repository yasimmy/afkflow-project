import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getDb } from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/admin.js';
import { newId } from '../utils/id.js';
import { detectCurrency, formatMoney, getRates, type Currency } from '../services/currency.js';
import { getProviderOptions, getRegion, type PaymentProvider } from '../services/providers.js';

type AuthRequest = FastifyRequest & { userId: string };
type PaymentStatus = 'pending' | 'waiting_for_capture' | 'paid' | 'cancelled' | 'refunded' | 'failed';

export async function registerPaymentRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { region?: string } }>('/api/payments/options', async (req, reply) => {
    const region = req.query.region ? getRegion(req.query.region) : getRegion(detectCurrency(req.headers as Record<string, unknown>) === 'RUB' ? 'RU' : detectCurrency(req.headers as Record<string, unknown>) === 'UAH' ? 'UA' : 'EU');
    const rates = await getRates();
    const currency = region === 'RU' ? 'RUB' : region === 'UA' ? 'UAH' : 'USD';
    return reply.send({ region, currency, rates, providers: getProviderOptions(region) });
  });

  app.post<{ Body: { productId?: string; returnUrl?: string; region?: string; provider?: PaymentProvider; period?: 'week' | 'month' | 'year' } }>('/api/payments/checkout', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as AuthRequest).userId;
    const productId = req.body?.productId;
    if (!productId) return reply.code(400).send({ error: 'ProductRequired', message: 'Товар не выбран.' });

    const db = getDb();
    const product = db.prepare('SELECT id, name, price, currency, base_price_usd, price_week_usd, price_month_usd, price_year_usd FROM products WHERE id = ? AND active = 1').get(productId) as { id: string; name: string; price: number; currency: string; base_price_usd: number; price_week_usd: number; price_month_usd: number; price_year_usd: number } | undefined;
    if (!product) return reply.code(404).send({ error: 'ProductNotFound', message: 'Товар не найден.' });
    const region = getRegion(req.body?.region);
    const rates = await getRates();
    const currency = (region === 'RU' ? 'RUB' : region === 'UA' ? 'UAH' : 'USD') as Currency;
    const period = req.body?.period ?? 'month';
    const periodPrice = period === 'week' ? product.price_week_usd : period === 'year' ? product.price_year_usd : product.price_month_usd;
    const amountUsd = periodPrice > 0 ? periodPrice : product.base_price_usd > 0 ? product.base_price_usd : product.price;
    if (amountUsd <= 0) return reply.code(400).send({ error: 'FreeProduct', message: 'Бесплатный товар не требует оплаты.' });
    const selectedProvider = req.body?.provider ?? getProviderOptions(region).find((option) => option.configured)?.provider;
    if (!selectedProvider) return reply.code(503).send({ error: 'PaymentProviderNotConfigured', message: 'Для этого региона пока не настроен ни один платёжный провайдер.' });
    const amount = formatMoney(amountUsd, currency, rates);

    const orderId = newId('order');
    db.prepare('INSERT INTO orders (id, user_id, product_id, amount, currency, provider) VALUES (?, ?, ?, ?, ?, ?)').run(orderId, userId, product.id, Math.round(amount.value * 100), amount.currency, selectedProvider);

    try {
      if (selectedProvider !== 'yookassa') throw new Error(`${selectedProvider} выбран, но его merchant API ещё не настроен в этом окружении.`);
      const payment = await createYooKassaPayment({ orderId, product: { ...product, price: Math.round(amount.value * 100), currency: amount.currency }, returnUrl: req.body?.returnUrl });
      db.prepare('UPDATE orders SET provider_id = ?, checkout_url = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(payment.id, payment.confirmationUrl, payment.status === 'waiting_for_capture' ? 'waiting_for_capture' : 'pending', orderId);
      return reply.code(201).send({ orderId, status: payment.status, checkoutUrl: payment.confirmationUrl });
    } catch (error) {
      db.prepare('UPDATE orders SET status = \'failed\', updated_at = datetime(\'now\') WHERE id = ?').run(orderId);
      return reply.code(503).send({ error: 'PaymentUnavailable', message: error instanceof Error ? error.message : 'Платёжный сервис временно недоступен.' });
    }
  });

  app.get('/api/payments/orders', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as AuthRequest).userId;
    return reply.send(getDb().prepare(`SELECT o.id, o.amount, o.currency, o.status, o.provider, o.created_at as createdAt, o.paid_at as paidAt, p.name as productName FROM orders o JOIN products p ON p.id = o.product_id WHERE o.user_id = ? ORDER BY o.created_at DESC`).all(userId));
  });

  app.post<{ Body: Record<string, unknown> }>('/api/payments/webhook/yookassa', async (req, reply) => {
    const signature = req.headers['x-payment-signature'];
    if (process.env.NODE_ENV === 'production' && !isValidWebhook(req.body, signature)) return reply.code(401).send({ error: 'InvalidWebhook' });
    const event = req.body as { type?: string; event?: string; object?: { id?: string; status?: string; metadata?: { orderId?: string } } };
    const payment = event.object;
    if (!payment?.id || !event.event) return reply.code(400).send({ error: 'InvalidWebhook' });

    const db = getDb();
    const eventId = `${payment.id}:${event.event}`;
    try {
      db.prepare('INSERT INTO payment_events (id, provider, provider_event_id, order_id, event_type, payload) VALUES (?, ?, ?, ?, ?, ?)').run(newId('payment_event'), 'yookassa', eventId, payment.metadata?.orderId ?? null, event.event, JSON.stringify(req.body));
    } catch { return reply.send({ ok: true }); }

    const order = db.prepare('SELECT id, user_id, product_id, status FROM orders WHERE provider_id = ? OR id = ?').get(payment.id, payment.metadata?.orderId ?? '') as { id: string; user_id: string; product_id: string; status: PaymentStatus } | undefined;
    if (!order) return reply.send({ ok: true });
    const nextStatus = payment.status === 'succeeded' ? 'paid' : payment.status === 'canceled' ? 'cancelled' : payment.status === 'waiting_for_capture' ? 'waiting_for_capture' : order.status;
    if (nextStatus !== order.status) {
      db.prepare('UPDATE orders SET status = ?, paid_at = CASE WHEN ? = \'paid\' THEN datetime(\'now\') ELSE paid_at END, updated_at = datetime(\'now\') WHERE id = ?').run(nextStatus, nextStatus, order.id);
      if (nextStatus === 'paid') grantProduct(order.user_id, order.product_id, db);
    }
    return reply.send({ ok: true });
  });

  app.get('/api/admin/orders', { preHandler: requirePermission('payments.read') }, async (_req, reply) => {
    return reply.send(getDb().prepare(`SELECT o.id, o.amount, o.currency, o.status, o.provider, o.provider_id as providerId, o.created_at as createdAt, o.paid_at as paidAt, p.name as productName, u.discord_id as discordId, u.username FROM orders o JOIN products p ON p.id = o.product_id JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`).all());
  });

  app.post<{ Params: { id: string } }>('/api/admin/orders/:id/refund', { preHandler: requirePermission('payments.refund') }, async (req, reply) => {
    const db = getDb();
    const order = db.prepare('SELECT id, provider_id, status FROM orders WHERE id = ?').get(req.params.id) as { id: string; provider_id: string | null; status: PaymentStatus } | undefined;
    if (!order) return reply.code(404).send({ error: 'OrderNotFound', message: 'Заказ не найден.' });
    if (order.status !== 'paid') return reply.code(409).send({ error: 'OrderNotPaid', message: 'Вернуть можно только оплаченный заказ.' });
    try {
      await createYooKassaRefund(order.provider_id ?? '', order.id);
      db.prepare('UPDATE orders SET status = \'refunded\', updated_at = datetime(\'now\') WHERE id = ?').run(order.id);
      return reply.send({ ok: true });
    } catch (error) { return reply.code(503).send({ error: 'RefundUnavailable', message: error instanceof Error ? error.message : 'Возврат недоступен.' }); }
  });
}

async function createYooKassaPayment(input: { orderId: string; product: { id: string; name: string; price: number; currency: string }; returnUrl?: string }) {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) throw new Error('Платёжный провайдер не настроен. Добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в backend/.env.');
  const response = await fetch('https://api.yookassa.ru/v3/payments', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json', 'Idempotence-Key': input.orderId }, body: JSON.stringify({ amount: { value: (input.product.price / 100).toFixed(2), currency: input.product.currency }, capture: true, description: input.product.name, metadata: { orderId: input.orderId, productId: input.product.id }, confirmation: { type: 'redirect', return_url: input.returnUrl ?? `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/profile?payment=success` } }) });
  if (!response.ok) throw new Error(`YooKassa вернула ошибку ${response.status}.`);
  const data = await response.json() as { id: string; status: PaymentStatus; confirmation?: { confirmation_url?: string } };
  if (!data.confirmation?.confirmation_url) throw new Error('Платёж не вернул ссылку на оплату.');
  return { id: data.id, status: data.status, confirmationUrl: data.confirmation.confirmation_url };
}

async function createYooKassaRefund(paymentId: string, orderId: string) {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret || !paymentId) throw new Error('Платёжный провайдер не настроен или платёж не найден.');
  const db = getDb();
  const order = db.prepare('SELECT amount, currency FROM orders WHERE id = ?').get(orderId) as { amount: number; currency: string };
  const response = await fetch('https://api.yookassa.ru/v3/refunds', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json', 'Idempotence-Key': `refund:${orderId}` }, body: JSON.stringify({ payment_id: paymentId, amount: { value: (order.amount / 100).toFixed(2), currency: order.currency } }) });
  if (!response.ok) throw new Error(`YooKassa вернула ошибку возврата ${response.status}.`);
}

function grantProduct(userId: string, productId: string, db: any) {
  const product = db.prepare('SELECT name, price, currency FROM products WHERE id = ?').get(productId) as { name: string; price: number; currency: string } | undefined;
  if (!product) return;
  db.prepare('INSERT INTO purchases (id, user_id, product_id, product_name, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, \'active\')').run(newId('purchase'), userId, productId, product.name, product.price, product.currency);
}

function isValidWebhook(payload: unknown, signature: string | string[] | undefined) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || typeof signature !== 'string') return false;
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
