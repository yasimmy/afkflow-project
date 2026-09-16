import type { FastifyInstance } from 'fastify';
import { getDb } from '../database/db.js';

export async function registerFaqRoutes(app: FastifyInstance) {
  app.get('/api/faq', async (_req, reply) => {
    return reply.send(getDb().prepare('SELECT id, question, answer FROM faqs WHERE active = 1 ORDER BY sort_order, created_at').all());
  });
}