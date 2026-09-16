/**
 * Centralised bot icon asset paths.
 * All paths are relative to the public/ root so Vite/Tauri serves them directly.
 *
 * Icon file names from icons/bot-icons/:
 *   01_crane.png     → construction (Стройка)
 *   02_boat.png      → port (Порт)
 *   03_pickaxe.png   → mine (Шахта)
 *   04_barn.png      → farm (Ферма)
 *   05_afk.png       → anti-afk (АнтиАФК)
 *   07_chef.png      → cooking (Кулинария)
 *   08_dumbbell.png  → gym (Качалка)
 *   09_turner.png    → turner (Токарь)
 *   10_RH.png        → rutine-helper (Помощник рутины)
 *   AFKFlow_Shveya-removebackgrounds-ai.png → seamstress (Швея)
 */
export const BOT_ICON_MAP: Record<string, string> = {
  'anti-afk':    '/icons/bot-icons/05_afk.png',
  'cooking':     '/icons/bot-icons/07_chef.png',
  'gym':         '/icons/bot-icons/08_dumbbell.png',
  'construction':'/icons/bot-icons/01_crane.png',
  'port':        '/icons/bot-icons/02_boat.png',
  'mine':        '/icons/bot-icons/03_pickaxe.png',
  'farm':        '/icons/bot-icons/04_barn.png',
  'turner':      '/icons/bot-icons/09_turner.png',
  'seamstress':  '/icons/bot-icons/AFKFlow_Shveya-removebackgrounds-ai.png',
  'catch-pda':   '/icons/bot-icons/05_afk.png',
  'rutine-helper': '/icons/bot-icons/10_RH.png',
};

/** Скрытые с главной; бэкенд и запуск не трогаем. */
export const HIDDEN_HOME_BOT_SLUGS = new Set<string>();

export const HOME_BOT_ORDER = [
  'anti-afk',
  'cooking',
  'gym',
  'construction',
  'port',
  'mine',
  'farm',
  'rutine-helper',
  'turner',
  'seamstress',
  'catch-pda',
];

export const BOT_DISPLAY_OVERRIDE: Record<string, { name: string; description: string }> = {
  'rutine-helper': {
    name: 'Помощник рутины',
    description: 'Почтальон, дальнобойщик и аквалангист.',
  },
};

export function prepareHomeBots<T extends { slug: string; name: string; description: string; icon: string }>(bots: T[]): T[] {
  return bots
    .filter((b) => !HIDDEN_HOME_BOT_SLUGS.has(b.slug))
    .map((b) => {
      const display = BOT_DISPLAY_OVERRIDE[b.slug];
      return {
        ...b,
        name: display?.name ?? b.name,
        description: display?.description ?? b.description,
        icon: BOT_ICON_MAP[b.slug] ?? b.icon,
      };
    })
    .sort((a, b) => {
      const ia = HOME_BOT_ORDER.indexOf(a.slug);
      const ib = HOME_BOT_ORDER.indexOf(b.slug);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
}

export const SUBSCRIPTION_ICON_MAP: Record<string, string> = {
  'start':     '/icons/subscription-icons/start-sub.png',
  'premium':   '/icons/subscription-icons/premium-sub.png',
  'full':      '/icons/subscription-icons/full-sub.png',
  'farm':      '/icons/subscription-icons/farm-sub.png',
  'luck':      '/icons/subscription-icons/luck-sub.png',
  'beta-test': '/icons/subscription-icons/beta-test-sub.png',
};

export const APP_ICON = '/icons/app-icon/icon_bot.png';

/**
 * Preload all bot icons into the browser cache immediately.
 * Call this once at app startup so images are ready when the home page renders.
 */
export function preloadBotIcons(): void {
  const allPaths = [
    ...Object.values(BOT_ICON_MAP),
    APP_ICON,
  ];
  allPaths.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}
