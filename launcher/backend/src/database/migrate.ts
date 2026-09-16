/**
 * Run migrations and seed default data.
 * Usage: npm run db:migrate
 */
import 'dotenv/config';
import { getDb } from './db.js';

const db = getDb();

// ─── Seed default plans ───────────────────────────────────────────────────────
const seedPlans = db.prepare(`
  INSERT OR IGNORE INTO plans (id, name, display_name, price, duration, bot_count)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const plans = [
  ['plan_start',   'start',   'Старт',   49900, 30, 2],
  ['plan_premium', 'premium', 'Премиум', 99900, 30, 10],
  ['plan_full',    'full',    'Полный',  149900, 30, 10],
  ['plan_farm',    'farm',    'Ферма',   39900, 30, 1],
  ['plan_luck',    'luck',    'Удача',   29900, 30, 1],
];

const seedMany = db.transaction(() => {
  for (const p of plans) seedPlans.run(...p);
});
seedMany();

// ─── Seed bots ────────────────────────────────────────────────────────────────
const seedBot = db.prepare(`
  INSERT OR IGNORE INTO bots (id, slug, name, description, version, enabled)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const bots = [
  ['bot_anti_afk',     'anti-afk',     'АнтиАФК',          'Бот для имитации активности в игре.',              '1.0.0', 1],
  ['bot_wheel',        'wheel',        'Колесо удачи',      'Автоматический запуск колеса удачи.',              '1.0.0', 1],
  ['bot_cooking',      'cooking',      'Кулинария',         'Автоматическая готовка блюд и ингредиентов.',      '1.0.0', 1],
  ['bot_gym',          'gym',          'Качалка',           'Автоматические тренировки и прокачка навыков.',    '1.0.0', 1],
  ['bot_construction', 'construction', 'Стройка',           'Автоматическая стройка и улучшение объектов.',     '1.0.0', 1],
  ['bot_port',         'port',         'Порт',              'Автоматическая торговля и доставка грузов.',       '1.0.0', 1],
  ['bot_mine',         'mine',         'Шахта',             'Автоматическая добыча руды и ресурсов.',           '1.0.0', 1],
  ['bot_farm',         'farm',         'Ферма (коровник)',  'Автоматический уход и сбор ресурсов.',            '1.0.0', 1],
  ['bot_turner',       'turner',       'Токарь',            'Автоматическая работа токарного станка.',          '1.0.0', 1],
  ['bot_seamstress',   'seamstress',   'Швея',              'Автоматическое шитье и создание одежды.',         '1.0.0', 1],
  ['bot_catch_pda',    'catch-pda',    'Ловля КПК',          'Автоматически ловит уведомления КПК.',             '1.0.0', 1],
  ['bot_rutine_helper', 'rutine-helper', 'Помощник рутины',   'Почтальон, дальнобойщик и аквалангист.', '1.0.0', 1],
];

const seedBots = db.transaction(() => {
  for (const b of bots) seedBot.run(...b);
});
seedBots();

// ─── Seed public FAQ ─────────────────────────────────────────────────────────
const seedFaq = db.prepare(`
  INSERT OR IGNORE INTO faqs (id, question, answer, sort_order)
  VALUES (?, ?, ?, ?)
`);

const faqItems = [
  ['faq_trial', 'Есть ли ограничения по функционалу в пробной подписке?', 'В пробной подписке доступны все функции, как и в платной подписке. Наша цель — полноценно познакомить вас с нашим продуктом перед покупкой.', 1],
  ['faq_setup', 'Нужно ли настраивать игру?', 'В большинстве случаев дополнительная настройка не требуется. Для корректной работы убедитесь, что игра в оконном или безрамочном режиме, а также отключены модификации и настройки, влияющие на цвета изображения: фильтры NVIDIA, ENB, ReShade и тому подобное. Для функций, требующих дополнительной настройки, информация доступна в настройках бота рядом с соответствующей функцией.', 2],
  ['faq_safe', 'Безопасно ли использовать боты?', 'Наши боты взаимодействуют с игрой точно так же, как обычный игрок, без вмешательства в игровой процесс, память или файлы игры. Правила использования стороннего ПО могут отличаться в зависимости от конкретной игры или проекта, поэтому рекомендуем учитывать правила проекта, на котором вы играете.', 3],
  ['faq_updates', 'Как часто выходят обновления?', 'Мы регулярно улучшаем наш продукт и выпускаем обновления. Все изменения и новости публикуются в нашем Discord-сообществе.', 4],
];

for (const item of faqItems) seedFaq.run(...item);

try {
  db.prepare(`ALTER TABLE bots ADD COLUMN is_free INTEGER NOT NULL DEFAULT 0`).run();
} catch (e) {
}

db.prepare(`UPDATE bots SET is_free = 1 WHERE slug = 'rutine-helper'`).run();
db.prepare(`
  UPDATE bots
  SET name = ?, description = ?
  WHERE slug = 'rutine-helper'
`).run(
  'Помощник рутины',
  'Почтальон, дальнобойщик и аквалангист.',
);

// ─── Add new columns to bot_configs if they don't exist ─────────────────────
try {
  db.prepare(`
    ALTER TABLE bot_configs ADD COLUMN resolution_mode TEXT NOT NULL DEFAULT 'FullHD'
  `).run();
} catch (e) {
  // Column might already exist
}

try {
  db.prepare(`
    ALTER TABLE bot_configs ADD COLUMN delay_between_presses INTEGER DEFAULT 120
  `).run();
} catch (e) {
  // Column might already exist
}

try {
  db.prepare(`
    ALTER TABLE bot_configs ADD COLUMN color_tolerance INTEGER DEFAULT 10
  `).run();
} catch (e) {
  // Column might already exist
}

try {
  db.prepare(`
    ALTER TABLE bot_configs ADD COLUMN counter_visible INTEGER DEFAULT 0
  `).run();
} catch (e) {
  // Column might already exist
}

// ─── Provision CBT access for the beta tester ────────────────────────────────
const cbtUser = db
  .prepare('SELECT id FROM users WHERE discord_id = ?')
  .get('815488650111746058') as { id: string } | undefined;

if (cbtUser) {
  const cbtPlanId = 'plan_cbt_closing_beta_test';
  db.prepare(`
    INSERT OR IGNORE INTO plans (id, name, display_name, price, duration, bot_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(cbtPlanId, 'cbt-closing-beta-test', 'CBT Closing Beta Test', 0, 3650, 10);

  const cbtSubscriptionId = 'sub_cbt_closing_beta_test';
  db.prepare(`
    INSERT OR IGNORE INTO subscriptions (id, user_id, plan_id, status, started_at, expires_at, auto_renew)
    VALUES (?, ?, ?, 'active', datetime('now'), '2099-12-31T23:59:59.000Z', 0)
  `).run(cbtSubscriptionId, cbtUser.id, cbtPlanId);

  const cbtBots = db.prepare('SELECT id FROM bots WHERE enabled = 1').all() as Array<{ id: string }>;
  const addCbtEntitlement = db.prepare(
    'INSERT OR IGNORE INTO bot_entitlements (id, subscription_id, bot_id) VALUES (?, ?, ?)',
  );
  for (const bot of cbtBots) {
    addCbtEntitlement.run(`ent_cbt_${bot.id}`, cbtSubscriptionId, bot.id);
  }
}

console.log('✓ Migration complete — database ready at', process.env.DB_PATH ?? './data/afkflow.db');
