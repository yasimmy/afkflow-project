import type { FastifyInstance } from 'fastify';
import { getDb } from '../database/db.js';

export async function registerShopRoutes(app: FastifyInstance) {
  app.get('/api/shop/products', async (_req, reply) => {
    const products = getDb().prepare(`
      SELECT id, slug, name, description, long_description as longDescription, price, base_price_usd as basePriceUsd, currency, image_url as imageUrl, media_urls as mediaUrls, features
      FROM products WHERE active = 1 ORDER BY created_at DESC
    `).all() as Array<Record<string, unknown>>;
    return reply.send(products.map(parseProduct));
  });

  app.get<{ Params: { slug: string } }>('/api/shop/products/:slug', async (req, reply) => {
    const product = getDb().prepare(`
      SELECT id, slug, name, description, long_description as longDescription, price, base_price_usd as basePriceUsd, currency, image_url as imageUrl, media_urls as mediaUrls, features
      FROM products WHERE slug = ? AND active = 1
    `).get(req.params.slug) as Record<string, unknown> | undefined;
    if (!product) return reply.code(404).send({ error: 'ProductNotFound', message: 'Товар не найден.' });
    return reply.send(parseProduct(product));
  });
}

function parseProduct(product: Record<string, unknown>) {
  return {
    ...product,
    mediaUrls: parseJsonArray(product['mediaUrls']),
    features: parseJsonArray(product['features']),
  };
}

function parseJsonArray(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
