# AFKFlow

AFKFlow — проект из desktop-лаунчера, backend API, набора Python-ботов для GTA5RP, Discord-бота и публичного сайта.

## Возможности

- управление ботами из Windows-приложения на Tauri и React;
- запуск и настройка Python-модулей через единый launcher;
- API на Fastify, TypeScript и SQLite;
- авторизация через Discord OAuth2;
- магазин, подписки, платежные интеграции и административные маршруты;
- Discord-бот для поддержки, идей, beta-отчётов, новостей и модерации;
- отдельный Vite-сайт проекта.

## Структура

```text
AFKFlow/
├── launcher/                 # Desktop-приложение и его backend
│   ├── src/                  # React-интерфейс лаунчера
│   ├── src-tauri/            # Tauri-конфигурация и Rust-обвязка
│   ├── all-bots/             # Python-боты и launcher.py
│   └── backend/              # Fastify API и SQLite
├── dsbot/                    # Discord-бот на Node.js
├── site/                     # Публичный сайт на React/Vite
└── README.md
```

## Требования

- Windows 10/11;
- Node.js 20 или новее и npm;
- Python 3.10 или новее;
- Rust и Cargo для Tauri-сборки desktop-приложения;
- зависимости Python из раздела [Python-боты](#python-боты).

Для сборки Tauri также нужны системные инструменты Microsoft Visual Studio Build Tools и WebView2.

## Быстрый запуск лаунчера

Откройте PowerShell в корне репозитория:

```powershell
cd launcher
npm install
Copy-Item .env.example .env
```

Заполните `launcher/.env`. Для локального запуска минимально достаточно:

```env
VITE_API_URL=http://localhost:3000
```

В отдельной вкладке установите зависимости backend и создайте его конфигурацию:

```powershell
cd launcher/backend
npm install
Copy-Item .env.example .env
npm run db:migrate
```

Вернитесь в каталог `launcher` и запустите frontend вместе с backend:

```powershell
npm run dev:all
```

Для запуска только отдельных частей:

```powershell
# React/Vite-интерфейс: http://localhost:5173
npm run dev

# Backend API: http://localhost:3000
npm run backend:dev
```

### Backend configuration

Файл `launcher/backend/.env` содержит серверные секреты и параметры интеграций. До production-запуска обязательно замените:

- `SESSION_SECRET`;
- `ADMIN_PASSWORD`;
- данные Discord OAuth2;
- ключи платёжного провайдера и `PAYMENT_WEBHOOK_SECRET`.

Основные настройки по умолчанию: API слушает `127.0.0.1:3000`, база находится в `launcher/backend/data/afkflow.db`, frontend — на `http://localhost:5173`.

## Desktop-сборка

Проверка типов и production-сборка frontend:

```powershell
cd launcher
npm run type-check
npm run build
```

Сборка установщика Tauri:

```powershell
npm run tauri:build
```

Артефакты сборки появятся в `launcher/src-tauri/target/release/bundle/`.

## Python-боты

Исходники находятся в `launcher/all-bots`. Поддерживаются Anti-AFK, колесо удачи, готовка, тренажёрный зал, стройка, порт, шахта, ферма, токарь, швея, ловля PDA и Rutine Helper.

Установите зависимости:

```powershell
cd launcher/all-bots
py -m pip install PyQt5 opencv-python numpy pyautogui keyboard pynput mss pillow pyinstaller
```

Обычно Python-бот запускается самим desktop-лаунчером. Для ручного запуска используется переменная `BOT_ID`:

```powershell
$env:BOT_ID = "bot_anti_afk"
py launcher.py
```

Доступные идентификаторы перечислены в `launcher.py`: `bot_anti_afk`, `bot_wheel`, `bot_cooking`, `bot_gym`, `bot_construction`, `bot_port`, `bot_mine`, `bot_farm`, `bot_turner`, `bot_seamstress`, `bot_catch_pda`, `bot_rutine_helper`.

Общие и индивидуальные настройки сохраняются в `launcher/all-bots/settings.json`. Файл `settings.json.backup` можно использовать как резервную копию.

> Автоматизация действий в игре может нарушать правила GTA5RP и привести к блокировке аккаунта. Используйте проект на свой риск.

## Discord-бот

`dsbot` — независимый CommonJS-сервис на `discord.js`.

```powershell
cd dsbot
npm install
```

Создайте `dsbot/.env`:

```env
DISCORD_TOKEN=ваш_токен_бота
PREFIX=.
GUILD_ID=идентификатор_сервера
TEAMLEAD_ROLE_ID=идентификатор_роли_тимлида
ADMIN_ROLE_ID=идентификатор_администратора
```

Запуск:

```powershell
npm start

# режим разработки с перезапуском при изменениях
npm run dev
```

Подробности по тикетам, beta-отчётам, новостям и модерации находятся в [dsbot/README.md](dsbot/README.md). Боту нужны права на просмотр истории, отправку сообщений, управление каналами и прикрепление файлов; для публикации новостей также нужен `Mention @everyone`.

## Публичный сайт

Сайт в `site` — отдельное React/Vite-приложение:

```powershell
cd site
npm install
npm run dev
```

Production-сборка:

```powershell
npm run build
npm run preview
```

## Проверки

Перед изменениями в desktop-приложении рекомендуется выполнить:

```powershell
cd launcher
npm run type-check
npm run lint
```

Для backend:

```powershell
cd launcher/backend
npm run type-check
npm run build
```

Для Discord-бота и Python-ботов отдельные автоматические тесты в проекте не настроены; проверяйте запуск и работу в тестовом Discord-сервере и в безопасной игровой среде.

## Безопасность

- не коммитьте `.env`, токены, OAuth-секреты и платёжные ключи;
- не используйте production-секреты локально без необходимости;
- смените значения `CHANGE_ME_BEFORE_PRODUCTION` перед публикацией backend;
- не храните реальные токены Discord в README, issue или логах;
- перед обновлением базы делайте резервную копию `launcher/backend/data/`.

## Разработка

Изменения frontend находятся в `launcher/src`, API — в `launcher/backend/src`, Python-логика — в `launcher/all-bots`, а команды Discord-бота — в `dsbot/commands` и `dsbot/slash-commands`. Старайтесь сохранять раздельность этих приложений: у каждого есть собственные зависимости, переменные окружения и команда запуска.
