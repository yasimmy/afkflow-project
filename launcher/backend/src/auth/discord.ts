/**
 * Discord OAuth2 — Authorization Code Flow
 * Client Secret is NEVER sent to the frontend.
 */
import type { FastifyInstance } from 'fastify';
import { getDb } from '../database/db.js';
import { newId } from '../utils/id.js';

const DISCORD_API    = 'https://discord.com/api/v10';
const SESSION_TTL_DAYS = 30;
const pendingAuth = new Map<string, { sessionId: string; expiresAt: number }>();
const CBT_DISCORD_ID = '815488650111746058';

interface DiscordUser {
  id:          string;
  username:    string;
  global_name: string | null;
  email:       string | null;
  verified?:   boolean;
  avatar:      string | null;
}

export async function registerAuthRoutes(app: FastifyInstance) {

  // ── POST /auth/discord/start ───────────────────────────────────────────────
  app.post('/auth/discord/start', async (_req, reply) => {
    const clientId    = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return reply.code(503).send({ error: 'AuthNotConfigured', message: 'Discord OAuth не настроен.' });
    }
    const state       = newId('state');

    const url = new URL('https://discord.com/oauth2/authorize');
    url.searchParams.set('client_id',     clientId);
    url.searchParams.set('redirect_uri',  redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope',         'identify email');
    url.searchParams.set('state',         state);
    pendingAuth.set(state, { sessionId: '', expiresAt: Date.now() + 5 * 60 * 1000 });

    return reply.send({ url: url.toString(), state });
  });

  // ── GET /auth/discord/callback ─────────────────────────────────────────────
  app.get<{ Querystring: { code?: string; error?: string; state?: string } }>(
    '/auth/discord/callback',
    async (req, reply) => {
      const { code, error, state } = req.query;
      const pending = state ? pendingAuth.get(state) : undefined;

      if (error || !code || !state || !pending || pending.expiresAt < Date.now()) {
        if (state) pendingAuth.delete(state);
        return reply.redirect(
          `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/login?error=discord_denied`,
        );
      }
      pendingAuth.delete(state);

      // Exchange code for token
      const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     process.env.DISCORD_CLIENT_ID!,
          client_secret: process.env.DISCORD_CLIENT_SECRET!,
          grant_type:    'authorization_code',
          code,
          redirect_uri:  process.env.DISCORD_REDIRECT_URI!,
        }),
      });

      if (!tokenRes.ok) {
        return reply.redirect(
          `${process.env.FRONTEND_URL}/login?error=token_exchange_failed`,
        );
      }

      const { access_token } = (await tokenRes.json()) as { access_token: string };

      // Fetch Discord user — access_token is NEVER stored in DB or sent to client
      const userRes = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!userRes.ok) {
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=user_fetch_failed`);
      }

      const discordUser = (await userRes.json()) as DiscordUser;

      const db = getDb();

      // Upsert user
      const userId = newId('usr');
      db.prepare(`
        INSERT INTO users (id, discord_id, username, global_name, email, avatar, last_ip, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(discord_id) DO UPDATE SET
          username      = excluded.username,
          global_name   = excluded.global_name,
          email         = excluded.email,
          avatar        = excluded.avatar,
          last_ip       = excluded.last_ip,
          last_login_at = datetime('now'),
          updated_at    = datetime('now')
      `).run(
        userId,
        discordUser.id,
        discordUser.username,
        discordUser.global_name ?? discordUser.username,
        discordUser.email,
        discordUser.avatar,
        req.ip,
      );

      // Fetch the actual user id (might differ from userId if existing user)
      const user = db
        .prepare('SELECT id FROM users WHERE discord_id = ?')
        .get(discordUser.id) as { id: string };

      if (discordUser.id === CBT_DISCORD_ID) {
        const planId = 'plan_cbt_closing_beta_test';
        db.prepare(`
          INSERT OR IGNORE INTO plans (id, name, display_name, price, duration, bot_count)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(planId, 'cbt-closing-beta-test', 'CBT Closing Beta Test', 0, 3650, 8);

        const subscriptionId = 'sub_cbt_closing_beta_test';
        db.prepare(`
          INSERT OR IGNORE INTO subscriptions (id, user_id, plan_id, status, started_at, expires_at, auto_renew)
          VALUES (?, ?, ?, 'active', datetime('now'), '2099-12-31T23:59:59.000Z', 0)
        `).run(subscriptionId, user.id, planId);

        const entitledBots = db.prepare('SELECT id FROM bots WHERE enabled = 1').all() as Array<{ id: string }>;
        const addEntitlement = db.prepare(`
          INSERT OR IGNORE INTO bot_entitlements (id, subscription_id, bot_id) VALUES (?, ?, ?)
        `);
        for (const bot of entitledBots) {
          addEntitlement.run(newId('ent'), subscriptionId, bot.id);
        }
      }

      // Create session
      const sessionId = newId('sess');
      const expiresAt = new Date(
        Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

      db.prepare(`
        INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)
      `).run(sessionId, user.id, expiresAt);

      const authenticatedPending = {
        sessionId,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      pendingAuth.set(state, authenticatedPending);

      // Set secure HTTP-only session cookie
      reply.setCookie('sid', sessionId, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path:     '/',
        expires:  new Date(expiresAt),
      });

      // Redirect back to app — frontend reads /api/me to confirm auth
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
      const callbackUrl = new URL('/login', frontendUrl);
      callbackUrl.searchParams.set('auth', 'success');
      if (state) callbackUrl.searchParams.set('state', state);
      return reply.redirect(callbackUrl.toString());
    },
  );

  // The OAuth callback runs in the system browser. This endpoint transfers
  // the resulting session cookie to the Tauri webview that started the flow.
  app.get<{ Params: { state: string } }>(
    '/auth/discord/status/:state',
    async (req, reply) => {
      const pending = pendingAuth.get(req.params.state);

      if (!pending) {
        return reply.send({ authenticated: false });
      }

      if (pending.expiresAt < Date.now()) {
        pendingAuth.delete(req.params.state);
        return reply.send({ authenticated: false });
      }

      reply.setCookie('sid', pending.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
      });
      pendingAuth.delete(req.params.state);
      return reply.send({ authenticated: true });
    },
  );

  // ── POST /auth/logout ──────────────────────────────────────────────────────
  app.post('/auth/logout', async (req, reply) => {
    const sessionId = req.cookies?.['sid'] ?? (req.headers['x-session-id'] as string | undefined);
    if (sessionId) {
      getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    }
    reply.clearCookie('sid', { path: '/' });
    return reply.send({ ok: true });
  });
}
