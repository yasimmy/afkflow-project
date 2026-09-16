import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  CreditCard,
  Crown,
  Gauge,
  Layers3,
  Lightbulb,
  LifeBuoy,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  MessagesSquare,
  Moon,
  Settings,
  Send,
  ShieldCheck,
  Shield,
  Sparkles,
  Store,
  Trash2,
  Plus,
  UserRound,
  WandSparkles,
} from "lucide-react";

const faqs = [
  [
    "Есть ли ограничения по функционалу в пробной подписке?",
    "Нет, пробный период открывает полный функционал бота.",
  ],
  [
    "Нужно ли настраивать игру?",
    "Нет, AFKFlow работает через компьютерное зрение и не требует внедрения в игру.",
  ],
  [
    "Безопасно ли использовать боты?",
    "Да, бот имитирует действия обычного игрока и не изменяет файлы игры.",
  ],
  [
    "Как часто выходят обновления?",
    "Мы регулярно улучшаем ботов и добавляем новые сценарии.",
  ],
];

const API_URL = "http://localhost:3000";

const BOT_ICONS = [
  { path: "/img/botlogo/antiafk.png", label: "Анти-АФК" },
  { path: "/img/botlogo/builder.png", label: "Стройка" },
  { path: "/img/botlogo/cooking.png", label: "Кулинария" },
  { path: "/img/botlogo/gym.png", label: "Качалка" },
  { path: "/img/botlogo/mining.png", label: "Шахта" },
  { path: "/img/botlogo/port.png", label: "Порт" },
];

type AuthUser = {
  discordId: string;
  globalName: string | null;
  username: string;
  email: string | null;
  avatar: string | null;
  createdAt: string;
};

type AuthData = {
  user: AuthUser;
  subscription: {
    planDisplayName: string;
    status: string;
    expiresAt: string;
  } | null;
  stats: {
    totalLaunches: number;
    totalRuntimeSeconds: number;
    botCount: number;
  };
};

function App() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const isSupportPage = window.location.pathname === "/support";
  const isShopPage = window.location.pathname === "/shop";
  const isBotsPage = window.location.pathname === "/bots" || window.location.pathname === "/sets";
  const isFaqPage = window.location.pathname === "/faq";
  const isProductPage = window.location.pathname.startsWith("/shop/");
  const isAdminPage = window.location.pathname === "/admin";
  const isProfilePage = window.location.pathname === "/profile";
  const isLoginPage = window.location.pathname === "/login";
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: AuthData | null) => setAuthData(data?.user ? data : null))
      .catch(() => setAuthData(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (isLoginPage && authChecked && authData)
      window.location.replace("/profile");
  }, [isLoginPage, authChecked, authData]);

  useEffect(() => {
    const sections =
      document.querySelectorAll<HTMLElement>(".reveal-on-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 28);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let frame = 0;

    const updateScrollMotion = () => {
      document.documentElement.style.setProperty(
        "--page-scroll",
        `${window.scrollY}px`,
      );
      frame = 0;
    };

    const handleScrollMotion = () => {
      if (!frame) frame = requestAnimationFrame(updateScrollMotion);
    };

    updateScrollMotion();
    window.addEventListener("scroll", handleScrollMotion, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScrollMotion);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className={`navbar ${isScrolled ? "is-scrolled" : ""}`}>
        <a className="brand" href="/" aria-label="AFKFlow">
          <img src="/img/Logo/icon_bot.png" alt="" />
          <span>AFKFlow</span>
        </a>
        <nav className="nav-links" aria-label="Основная навигация">
          <a href="/shop" aria-label="Магазин" title="Магазин">
            <span className="nav-label">Магазин</span>
            <Store className="nav-icon" size={17} />
          </a>
          <a href="/sets" aria-label="Наборы ботов" title="Наборы ботов">
            <span className="nav-label">Наборы ботов</span>
            <Bot className="nav-icon" size={17} />
          </a>
          <a href="/faq" aria-label="FAQ" title="FAQ">
            <span className="nav-label">FAQ</span>
            <CircleHelp className="nav-icon" size={17} />
          </a>
          <a href="/support" aria-label="Поддержка" title="Поддержка">
            <span className="nav-label">Поддержка</span>
            <LifeBuoy className="nav-icon" size={17} />
          </a>
        </nav>
        <div className="nav-actions">
          <button className="icon-button" aria-label="Discord">
            <MessageCircle size={18} />
          </button>
          <button className="icon-button" aria-label="Переключить тему">
            <Moon size={17} />
          </button>
          <a className="download-button" href="/#start">
            <ArrowDownToLine size={16} /> Скачать лаунчер
          </a>
          {authData ? (
            <a className="login-link" href="/profile">
              <UserRound size={15} /> Профиль
            </a>
          ) : (
            <a className="login-link" href="/login">
              <LogIn size={15} /> Войти
            </a>
          )}
        </div>
        <button className="mobile-menu" aria-label="Открыть меню">
          <Command size={20} />
        </button>
      </header>

      {isSupportPage ? (
        <SupportPage />
      ) : isLoginPage ? (
        <LoginPage />
      ) : isProductPage ? (
        <ProductDetailPage />
      ) : isBotsPage ? (
        <BotsPage />
      ) : isFaqPage ? (
        <FaqPage />
      ) : isShopPage ? (
        <ShopPage />
      ) : isAdminPage ? (
        <AdminPage data={authData} authChecked={authChecked} />
      ) : isProfilePage ? (
        <ProfilePage data={authData} authChecked={authChecked} />
      ) : (
        <main id="top">
          <section className="hero section-wrap">
            <div className="hero-copy reveal">
              <span className="eyebrow">
                <Sparkles size={14} /> <span>AFKFlow BOT LAUNCHER</span>
              </span>
              <h1>
                Все что нужно чтобы
                <br />
                <em>сделать игру проще</em>
              </h1>
              <p>
                Твой личный помощник для автоматизации рутинных задач.
                <br />
                Играй в свое удовольствие!
              </p>
              <a className="primary-button" href="#bots">
                К ботам <ArrowRight size={20} />
              </a>
            </div>
            <div className="hero-art-wrap">
              <div className="hero-glow" />
              <img
                className="hero-art"
                src="/img/hero-art.png"
                alt="Персонаж AFKFlow"
              />
            </div>
          </section>

          <section className="feature-strip section-wrap" id="bots">
            <Feature
              icon={<ShieldCheck />}
              title="Безопасность"
              text="Работает без внедрения в игру"
            />
            <Feature
              icon={<WandSparkles />}
              title="Функционал"
              text="Обширный функционал для разных задач"
            />
            <Feature
              icon={<MessageCircle />}
              title="Поддержка"
              text="Мы всегда на связи и готовы помочь"
            />
          </section>

          <section
            className="split-section section-wrap reveal-on-scroll"
            id="sets"
          >
            <div className="illustration-frame">
              <img
                src="/img/how-it-works-art.png"
                alt="Как работает компьютерное зрение"
              />
            </div>
            <div className="section-copy">
              <span className="section-kicker">01 / ПРОСТО И ПОНЯТНО</span>
              <h2>Как это работает?</h2>
              <p>
                Боты используют компьютерное зрение для распознавания элементов
                игры на экране и выполняют действия так же, как это делает
                обычный игрок. Такой подход не требует внедрения в игру и не
                влияет на игровой баланс. Это позволяет автоматизировать рутину
                и освободить время для более интересных аспектов игры.
              </p>
            </div>
          </section>

          <section
            className="split-section idea-section section-wrap reveal-on-scroll"
            id="support"
          >
            <div className="section-copy">
              <span className="section-kicker">
                02 / БУДЕМ РАЗВИВАТЬСЯ ВМЕСТЕ
              </span>
              <h2>
                Участвуйте в жизни
                <br />
                проекта!
              </h2>
              <p>
                Мы активно развиваем продукт и всегда открыты к идеям,
                предложениям и обратной связи от сообщества.
              </p>
              <a className="primary-button" href="mailto:hello@afkflow.ru">
                <Lightbulb size={18} /> Предложить идею
              </a>
            </div>
            <div className="illustration-frame idea-art">
              <img src="/img/suggest-idea-art.png" alt="Идея для проекта" />
            </div>
          </section>

          <section
            className="trial-section section-wrap reveal-on-scroll"
            id="start"
          >
            <div className="trial-copy">
              <span className="section-kicker">03 / ПОПРОБУЙ САМ</span>
              <h2>
                Начни бесплатно
                <br />с пробной подпиской
              </h2>
              <p>
                Ознакомься с полным функционалом каждого бота перед покупкой
              </p>
              <a className="primary-button" href="#bots">
                Попробовать бесплатно <ArrowRight size={20} />
              </a>
              <small>Платежные данные не требуются</small>
            </div>
            <div className="trial-art">
              <img src="/img/cta-art.png" alt="Бот AFKFlow" />
            </div>
          </section>

          <section
            className="faq-section section-wrap reveal-on-scroll"
            id="faq"
          >
            <span className="section-kicker centered">04 / ЧАСТЫЕ ВОПРОСЫ</span>
            <h2>Часто задаваемые вопросы</h2>
            <div className="faq-list">
              {faqs.map(([question, answer], index) => (
                <button
                  className={`faq-item ${openFaq === index ? "is-open" : ""}`}
                  key={question}
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span>{question}</span>
                  <ChevronDown size={19} />
                  <p className="faq-answer">{answer}</p>
                </button>
              ))}
            </div>
            <div className="question-box" id="login">
              <CircleHelp size={28} />
              <h3>Остались вопросы?</h3>
              <p>
                Не нашли ответ на свой вопрос?
                <br />
                Пожалуйста, оставьте его для нашей поддержки
              </p>
              <a className="secondary-button" href="mailto:support@afkflow.ru">
                Задать вопрос
              </a>
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <span>Copyright © 2026 AFKFlow</span>
        <nav className="footer-links" aria-label="Ссылки в футере">
          <a href="#terms">Условия использования</a>
          <a href="#privacy">Политика конфиденциальности</a>
          <a href="#refund">Политика возврата</a>
          <a href="mailto:support@afkflow.com">Свяжитесь с нами</a>
        </nav>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="feature">
      <div className="feature-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function SupportPage() {
  const [sent, setSent] = useState(false);

  return (
    <main className="support-page" id="top">
      <section className="support-hero section-wrap">
        <span className="section-kicker">
          <LifeBuoy size={15} /> 05 / ПОДДЕРЖКА
        </span>
        <h1>
          Как мы можем <em>помочь?</em>
        </h1>
        <p>Свяжитесь с нами и дайте нам знать, как мы можем помочь.</p>
      </section>

      <section className="support-layout section-wrap">
        <div className="support-content">
          <article className="support-card support-card-main">
            <div className="support-card-heading">
              <div className="support-card-icon">
                <MessagesSquare size={22} />
              </div>
              <div>
                <span className="section-kicker">БЫСТРЫЙ ОТВЕТ</span>
                <h2>Поддержка</h2>
              </div>
            </div>
            <p>
              Мы здесь, чтобы помочь с любыми вопросами. Напишите нам удобным
              способом, и команда AFKFlow разберется в ситуации.
            </p>
            <div className="contact-list">
              <a
                className="contact-row"
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
              >
                <span className="contact-row-icon">
                  <MessageCircle size={18} />
                </span>
                <span>
                  <strong>Discord</strong>
                  <small>Канал #поддержка</small>
                </span>
                <span className="contact-arrow">↗</span>
              </a>
              <a
                className="contact-row"
                href="https://t.me/afkflow_support_bot"
                target="_blank"
                rel="noreferrer"
              >
                <span className="contact-row-icon">
                  <Bot size={18} />
                </span>
                <span>
                  <strong>@afkflow_support_bot</strong>
                  <small>Telegram-бот для быстрого ответа</small>
                </span>
                <span className="contact-arrow">↗</span>
              </a>
              <a className="contact-row" href="mailto:support@afkflow.com">
                <span className="contact-row-icon">
                  <Mail size={18} />
                </span>
                <span>
                  <strong>support@afkflow.com</strong>
                  <small>Для подробных обращений</small>
                </span>
                <span className="contact-arrow">↗</span>
              </a>
            </div>
          </article>

          <article className="support-card cooperation-card">
            <div className="support-card-icon">
              <LifeBuoy size={22} />
            </div>
            <div>
              <span className="section-kicker">ПАРТНЕРСТВО</span>
              <h2>Сотрудничество</h2>
              <p>Давайте обсудим, как мы можем работать вместе.</p>
              <a className="text-link" href="mailto:connect@afkmate.com">
                connect@afkmate.com <ArrowRight size={16} />
              </a>
              <p className="bot-handle">@afkmate_connect_bot</p>
            </div>
          </article>
        </div>

        <form
          className="support-form"
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
        >
          <span className="section-kicker">НАПИШИТЕ НАМ</span>
          <h2>Расскажите, что случилось</h2>
          <p>Опишите вопрос в свободной форме. Мы ответим на почту.</p>
          <label>
            Ваш email
            <input type="email" placeholder="you@example.com" required />
          </label>
          <label>
            Сообщение
            <textarea placeholder="Чем мы можем помочь?" rows={5} required />
          </label>
          <button className="primary-button" type="submit">
            <Send size={17} />{" "}
            {sent ? "Сообщение подготовлено" : "Отправить обращение"}
          </button>
          {sent && (
            <span className="form-note">
              Спасибо! Мы свяжемся с вами по указанному адресу.
            </span>
          )}
        </form>
      </section>

      <section className="support-topics section-wrap">
        <div>
          <span className="section-kicker">ЧЕМ МЫ ПОМОГАЕМ</span>
          <h2>Нужна помощь с чем-то конкретным?</h2>
        </div>
        <div className="topic-grid">
          <div>
            <ShieldCheck size={19} />
            <strong>Безопасность</strong>
            <span>Разберем вопросы о работе ботов и игре.</span>
          </div>
          <div>
            <Bot size={19} />
            <strong>Настройка</strong>
            <span>Поможем запустить и настроить сценарий.</span>
          </div>
          <div>
            <Clock3 size={19} />
            <strong>Статус</strong>
            <span>Расскажем об обновлениях и известных проблемах.</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    new URLSearchParams(window.location.search).get("error"),
  );

  const startDiscordLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/discord/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok)
        throw new Error("Не удалось начать вход через Discord.");
      const data = (await response.json()) as { url: string };
      window.location.href = data.url;
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Не удалось выполнить вход.",
      );
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page section-wrap" id="top">
      <section className="login-card">
        <div className="login-mark">
          <MessageCircle size={25} />
        </div>
        <span className="section-kicker">AFKFLOW ACCOUNT</span>
        <h1>
          Войди в свой
          <br />
          <em>личный кабинет</em>
        </h1>
        <p>
          Используй Discord, чтобы управлять подпиской, ботами и настройками
          AFKFlow.
        </p>
        <button
          className="discord-login-button"
          type="button"
          onClick={startDiscordLogin}
          disabled={isLoading}
        >
          <MessageCircle size={19} />{" "}
          {isLoading ? "Переходим в Discord..." : "Войти через Discord"}
        </button>
        {error && (
          <span className="login-error">
            {error === "discord_denied"
              ? "Вход через Discord был отменён."
              : "Не удалось выполнить вход. Попробуйте ещё раз."}
          </span>
        )}
        <small>
          Мы не храним пароль. Discord передаёт только данные профиля.
        </small>
      </section>
    </main>
  );
}

type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  price: number;
  basePriceUsd?: number;
  priceWeekUsd?: number;
  priceMonthUsd?: number;
  priceYearUsd?: number;
  currency: string;
  imageUrl?: string | null;
  mediaUrls?: string[];
  features?: string[];
  active?: boolean;
};
type AdminProfile = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
};
type AdminUser = {
  id: string;
  discordId: string;
  username: string;
  globalName: string | null;
  email: string | null;
  adminProfile: string | null;
};
type AdminOrder = { id: string; amount: number; currency: string; status: string; productName: string; username: string; createdAt: string };
type AdminLog = { id: string; method: string; path: string; statusCode: number; ip: string; userId: string | null; userAgent: string | null; durationMs: number; createdAt: string };

function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/shop/products`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="shop-page section-wrap" id="top">
      <section className="shop-heading">
        <div>
          <span className="section-kicker">
            <Store size={15} /> 06 / МАГАЗИН
          </span>
          <h1>Всё для твоей игры</h1>
          <p>Выбирай нужные инструменты и управляй ими из личного кабинета.</p>
        </div>
      </section>
      {loading ? (
        <div className="profile-loading">Загружаем товары...</div>
      ) : products.length === 0 ? (
        <div className="shop-empty">
          <Store size={30} />
          <h2>Товары скоро появятся</h2>
          <p>Каталог наполняется командой AFKFlow.</p>
        </div>
      ) : (
        <div className="shop-grid">
          {products.map((product) => (
            <article className="shop-product" key={product.id}>
              <div className="product-art">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className="product-mark"><Sparkles size={28} /></div>}
              </div>
              <div className="product-copy">
                <span className="product-badge"><WandSparkles size={15} /> АВТОМАТИЗАЦИЯ</span>
                <h2>{product.name}</h2>
                <p>{product.description || "Инструмент для комфортной игры и автоматизации рутинных задач."}</p>
                <div className="product-benefits"><span><Sparkles size={16} /> Полная автоматизация</span><span><Clock3 size={16} /> Стабильная работа</span><span><Gauge size={16} /> Экономит ваше время</span></div>
                <a className="product-detail-link" href={`/shop/${product.slug}`}>Подробнее <ArrowRight size={16} /></a>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function FaqPage() {
  const [items, setItems] = useState<Array<{ id: string; question: string; answer: string }>>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { fetch(`${API_URL}/api/faq`).then((response) => response.ok ? response.json() : []).then(setItems); }, []);
  return <main className="content-page section-wrap"><span className="section-kicker"><CircleHelp size={15} /> 08 / FAQ</span><h1>Частые вопросы</h1><p className="page-intro">Ответы на главные вопросы о AFKFlow и наших ботах.</p><div className="faq-list public-faq">{items.length ? items.map((item) => <button className={`faq-item ${open === item.id ? 'is-open' : ''}`} key={item.id} onClick={() => setOpen(open === item.id ? null : item.id)}><span>{item.question}</span><ChevronDown size={19} /><p className="faq-answer">{item.answer}</p></button>) : <div className="shop-empty"><CircleHelp size={28} /><h2>FAQ скоро появится</h2><p>Команда добавит вопросы через админку.</p></div>}</div></main>;
}

type CatalogBot = { id: string; slug: string; name: string; description: string; iconUrl?: string | null; longDescription?: string; features?: string[] };

function BotsPage() {
  const [bots, setBots] = useState<CatalogBot[]>([]);
  useEffect(() => { fetch(`${API_URL}/api/catalog/bots`).then((response) => response.ok ? response.json() : []).then(setBots); }, []);
  return <main className="content-page section-wrap"><span className="section-kicker"><Layers3 size={15} /> 09 / НАБОРЫ БОТОВ</span><h1>Наборы ботов</h1><p className="page-intro">Выбирай готовый набор автоматизации для любимой игры.</p><div className="bot-catalog-grid">{bots.length ? bots.map((bot) => <article className="catalog-bot-card" key={bot.id}>{bot.iconUrl ? <img src={bot.iconUrl} alt={bot.name} /> : <div className="catalog-bot-placeholder"><Layers3 size={30} /></div>}<div><span className="card-label">НАБОР БОТОВ</span><h2>{bot.name}</h2><p>{bot.description}</p><a className="product-detail-link" href={`/bots/${bot.slug}`}>Подробнее <ArrowRight size={16} /></a></div></article>) : <div className="shop-empty"><Layers3 size={28} /><h2>Наборы скоро появятся</h2><p>Каталог наполняется через админку.</p></div>}</div></main>;
}

function ProductDetailPage() {
  const slug = window.location.pathname.split("/").pop();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [period, setPeriod] = useState("30 дней");
  const [detailTab, setDetailTab] = useState<"description" | "features">(
    "description",
  );
  const [paymentError, setPaymentError] = useState("");
  const [toast, setToast] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [localizedPrice, setLocalizedPrice] = useState("");
  useEffect(() => {
    fetch(`${API_URL}/api/shop/products/${encodeURIComponent(slug ?? "")}`)
      .then((response) => (response.ok ? response.json() : null))
      .then(setProduct);
  }, [slug]);
  useEffect(() => {
    fetch(`${API_URL}/api/payments/options`)
      .then((response) => (response.ok ? response.json() : null))
      .then((options: { currency?: string; rates?: Record<string, number> } | null) => {
        if (!options || !product) return;
        const usdCents = period === "7 дней" ? (product.priceWeekUsd || product.basePriceUsd || product.price) : period === "365 дней" ? (product.priceYearUsd || product.basePriceUsd || product.price) : (product.priceMonthUsd || product.basePriceUsd || product.price);
        const currency = options.currency ?? "USD";
        const value = (usdCents / 100) * (options.rates?.[currency] ?? 1);
        setLocalizedPrice(`${value.toFixed(currency === "USD" || currency === "EUR" ? 2 : 0)} ${currency}`);
      });
  }, [product, period]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("payment") === "success") setToast("Платёж принят. Доступ будет выдан после подтверждения провайдера.");
  }, []);
  if (!product)
    return (
      <main className="shop-page section-wrap">
        <div className="profile-loading">Загружаем товар...</div>
      </main>
    );
  const startPayment = async () => {
    setPaymentError("");
    setIsPaying(true);
    const periodKey = period === "7 дней" ? "week" : period === "365 дней" ? "year" : "month";
    const response = await fetch(`${API_URL}/api/payments/checkout`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, period: periodKey, returnUrl: window.location.href }) });
    const body = await response.json() as { checkoutUrl?: string; message?: string };
    if (response.status === 401) { window.location.href = "/login"; return; }
    if (!response.ok || !body.checkoutUrl) { const message = body.message ?? "Не удалось создать платёж."; setPaymentError(message); setToast(message); setIsPaying(false); return; }
    window.location.href = body.checkoutUrl;
  };
  const mediaUrls = product.mediaUrls ?? [];
  const heroImage = mediaUrls[0] ?? product.imageUrl;
  const featureItems = product.features?.length
    ? product.features
    : [
        "Автоматическое выполнение игровых задач",
        "Работа в фоновом режиме",
        "Поддержка популярных разрешений экрана",
        "Настройка сценария в личном кабинете",
      ];
  return (
    <main className="product-detail-page section-wrap" id="top">
      {toast && <div className="toast-notification toast-error" role="status">{toast}<button type="button" onClick={() => setToast("")} aria-label="Закрыть уведомление">×</button></div>}
      <div className="detail-breadcrumb">
        <a href="/">AFKFlow</a>
        <span>›</span>
        <a href="/shop">Магазин</a>
        <span>›</span>
        <strong>{product.name}</strong>
      </div>
      <section className="product-detail">
        <div>
          <div className="detail-visual">
            {heroImage ? (
              <img src={heroImage} alt={product.name} />
            ) : (
              <div className="product-mark">
                <Sparkles size={42} />
              </div>
            )}
            <span>AFKFLOW STORE</span>
          </div>
          {mediaUrls.length > 0 && <div className="detail-thumbnails">{mediaUrls.map((mediaUrl, index) => <div className={`thumbnail ${index === 0 ? "is-active" : ""}`} key={mediaUrl}><img src={mediaUrl} alt="" /></div>)}</div>}
        </div>
        <div className="detail-copy">
          <span className="section-kicker">
            СТАТУС: <b className="status-online">РАБОТАЕТ</b>
          </span>
          <h1>{product.name}</h1>
          <p>
            {product.description ||
              "Инструмент для комфортной игры и автоматизации рутинных задач."}
          </p>
          <span className="period-label">Период подписки</span>
          <div className="period-switcher">
            {["7 дней", "30 дней", "365 дней"].map((option) => (
              <button
                key={option}
                className={period === option ? "is-active" : ""}
                type="button"
                onClick={() => setPeriod(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="detail-price">
            <small>Стоимость доступа на {period}</small>
            <strong>
              {localizedPrice || `${((product.basePriceUsd || product.price) / 100).toFixed(2)} USD`}
            </strong>
          </div>
          <button className="primary-button detail-buy" type="button" onClick={startPayment} disabled={isPaying}>
            <CreditCard size={17} /> {isPaying ? "Создаём платёж..." : "Купить подписку"}
          </button>
          {paymentError && <span className="login-error">{paymentError}</span>}
          <span className="detail-note">
            или <a href="/login">начать бесплатный пробный период</a>
          </span>
          <div className="bundle-note">
            <Layers3 size={16} /> Доступен в наборе ботов{" "}
            <a href="/shop">
              Подробнее <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>
      <section className="detail-info">
        <div className="detail-tabs">
          <button
            className={detailTab === "description" ? "is-active" : ""}
            onClick={() => setDetailTab("description")}
          >
            Описание
          </button>
          <button
            className={detailTab === "features" ? "is-active" : ""}
            onClick={() => setDetailTab("features")}
          >
            Функционал
          </button>
        </div>
        {detailTab === "description" ? (
          <div className="detail-text">
            <p>
              {product.longDescription || product.description ||
                "На серверах AFKFlow этот инструмент помогает автоматизировать повторяющиеся игровые задачи. Настройте сценарий один раз и освободите время для более интересных занятий."}
            </p>
            <p>
              Бот работает аккуратно и не требует внедрения в игру. Все
              настройки и доступ к продукту будут доступны в личном кабинете
              после покупки.
            </p>
          </div>
        ) : (
          <ul className="feature-list">{featureItems.map((feature) => <li key={feature}><Check size={17} /> {feature}</li>)}</ul>
        )}
      </section>
    </main>
  );
}

function AdminPage({
  data,
  authChecked,
}: {
  data: AuthData | null;
  authChecked: boolean;
}) {
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"products" | "users" | "profiles" | "faq" | "bots" | "payments" | "logs">("products");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([]);
  const [catalogBots, setCatalogBots] = useState<CatalogBot[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productError, setProductError] = useState("");
  const [productForm, setProductForm] = useState({
    slug: "",
    name: "",
    description: "",
    longDescription: "",
    imageUrl: "",
    mediaUrls: "",
    features: "",
    price: "0",
    basePriceUsd: "0",
    priceWeekUsd: "0",
    priceMonthUsd: "0",
    priceYearUsd: "0",
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    description: "",
    permissions: ["products.read", "products.write"],
  });
  const [faqForm, setFaqForm] = useState({ question: "", answer: "" });
  const [botForm, setBotForm] = useState({ slug: "", name: "", description: "", iconUrl: "", longDescription: "", features: "" });

  const loadAdmin = async () => {
    const response = await fetch(`${API_URL}/api/admin/me`, {
      credentials: "include",
    });
    if (!response.ok) return false;
    const [productResponse, userResponse, profileResponse, faqResponse, botResponse, orderResponse, logResponse] = await Promise.all([
      fetch(`${API_URL}/api/admin/products`, { credentials: "include" }),
      fetch(`${API_URL}/api/admin/users`, { credentials: "include" }),
      fetch(`${API_URL}/api/admin/profiles`, { credentials: "include" }),
      fetch(`${API_URL}/api/admin/faq`, { credentials: "include" }),
      fetch(`${API_URL}/api/admin/bots`, { credentials: "include" }),
      fetch(`${API_URL}/api/admin/orders`, { credentials: "include" }),
      fetch(`${API_URL}/api/admin/logs`, { credentials: "include" }),
    ]);
    if (productResponse.ok) setProducts(await productResponse.json());
    if (userResponse.ok) setUsers(await userResponse.json());
    if (profileResponse.ok) setProfiles(await profileResponse.json());
    if (faqResponse.ok) setFaqs(await faqResponse.json());
    if (botResponse.ok) setCatalogBots(await botResponse.json());
    if (orderResponse.ok) setOrders(await orderResponse.json());
    if (logResponse.ok) setLogs(await logResponse.json());
    return true;
  };

  useEffect(() => {
    if (authChecked && data) loadAdmin().then(setAdminAuthed);
  }, [authChecked, data]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setLoginError((await response.json()).message ?? "Не удалось войти.");
      return;
    }
    setAdminAuthed(await loadAdmin());
    setPassword("");
  };
  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setProductError("");
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      basePriceUsd: Number(productForm.basePriceUsd),
      priceWeekUsd: Number(productForm.priceWeekUsd),
      priceMonthUsd: Number(productForm.priceMonthUsd),
      priceYearUsd: Number(productForm.priceYearUsd),
      mediaUrls: productForm.mediaUrls
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      features: productForm.features
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const response = await fetch(
      `${API_URL}/api/admin/products${editingProduct ? `/${editingProduct}` : ""}`,
      {
        method: editingProduct ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (response.ok) {
      setProductForm({
        slug: "",
        name: "",
        description: "",
        longDescription: "",
        imageUrl: "",
        mediaUrls: "",
        features: "",
        price: "0",
        basePriceUsd: "0",
        priceWeekUsd: "0",
        priceMonthUsd: "0",
        priceYearUsd: "0",
      });
      setEditingProduct(null);
      await loadAdmin();
    } else {
      const error = await response.json().catch(() => ({ message: "Не удалось сохранить товар." }));
      setProductError(error.message ?? "Не удалось сохранить товар.");
    }
  };
  const editProduct = (product: ShopProduct) => {
    setEditingProduct(product.id);
    setProductForm({
      slug: product.slug,
      name: product.name,
      description: product.description,
      longDescription: product.longDescription ?? "",
      imageUrl: product.imageUrl ?? "",
      mediaUrls: (product.mediaUrls ?? []).join("\n"),
      features: (product.features ?? []).join("\n"),
      price: String(product.price),
      basePriceUsd: String((product as ShopProduct & { basePriceUsd?: number }).basePriceUsd ?? 0),
      priceWeekUsd: String(product.priceWeekUsd ?? 0),
      priceMonthUsd: String(product.priceMonthUsd ?? 0),
      priceYearUsd: String(product.priceYearUsd ?? 0),
    });
  };
  const deleteProduct = async (id: string) => {
    await fetch(`${API_URL}/api/admin/products/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await loadAdmin();
  };
  const addProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch(`${API_URL}/api/admin/profiles`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    });
    if (response.ok) {
      setProfileForm({
        name: "",
        description: "",
        permissions: ["products.read", "products.write"],
      });
      await loadAdmin();
    }
  };
  const addFaq = async (event: React.FormEvent) => { event.preventDefault(); const response = await fetch(`${API_URL}/api/admin/faq`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(faqForm) }); if (response.ok) { setFaqForm({ question: "", answer: "" }); await loadAdmin(); } };
  const addBot = async (event: React.FormEvent) => { event.preventDefault(); const response = await fetch(`${API_URL}/api/admin/bots`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...botForm, features: botForm.features.split("\n").filter(Boolean) }) }); if (response.ok) { setBotForm({ slug: "", name: "", description: "", iconUrl: "", longDescription: "", features: "" }); await loadAdmin(); } };
  const assignProfile = async (userId: string, profileId: string) => {
    if (!profileId) return;
    await fetch(`${API_URL}/api/admin/users/${userId}/profile`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    await loadAdmin();
  };

  if (!authChecked)
    return (
      <main className="admin-page section-wrap">
        <div className="profile-loading">Проверяем доступ...</div>
      </main>
    );
  if (!data)
    return (
      <main className="admin-page section-wrap">
        <div className="profile-locked">
          <Shield size={30} />
          <h1>Сначала войдите через Discord</h1>
          <a className="primary-button" href="/login">
            <LogIn size={17} /> Войти
          </a>
        </div>
      </main>
    );
  if (!adminAuthed)
    return (
      <main className="admin-page section-wrap">
        <form className="admin-login-card" onSubmit={login}>
          <div className="login-mark">
            <Shield size={24} />
          </div>
          <span className="section-kicker">AFKFLOW CONTROL</span>
          <h1>Вход в админку</h1>
          <p>Доступ определяется Discord-правами аккаунта.</p>
          <label>
            Пароль owner
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Введите пароль"
              autoFocus
            />
          </label>
          <button className="primary-button" type="submit">
            <Shield size={17} /> Войти в панель
          </button>
          {loginError && <span className="login-error">{loginError}</span>}
        </form>
      </main>
    );

  return (
    <main className="admin-page section-wrap" id="top">
      <section className="admin-heading">
        <div>
          <span className="section-kicker">
            <Shield size={15} /> 07 / ADMIN CONTROL
          </span>
          <h1>Панель управления</h1>
          <p>Товары, пользователи и роли в одном месте.</p>
        </div>
        <button
          className="logout-button"
          type="button"
          onClick={async () => {
            await fetch(`${API_URL}/api/admin/logout`, {
              method: "POST",
              credentials: "include",
            });
            setAdminAuthed(false);
          }}
        >
          <LogOut size={15} /> Выйти
        </button>
      </section>
      <div className="admin-tabs">
        <button
          className={tab === "products" ? "is-active" : ""}
          onClick={() => setTab("products")}
        >
          <Store size={16} /> Товары
        </button>
        <button
          className={tab === "users" ? "is-active" : ""}
          onClick={() => setTab("users")}
        >
          <UserRound size={16} /> Пользователи
        </button>
        <button
          className={tab === "profiles" ? "is-active" : ""}
          onClick={() => setTab("profiles")}
        >
          <Shield size={16} /> Профили прав
        </button>
        <button className={tab === "faq" ? "is-active" : ""} onClick={() => setTab("faq")}><CircleHelp size={16} /> FAQ</button>
        <button className={tab === "bots" ? "is-active" : ""} onClick={() => setTab("bots")}><Bot size={16} /> Боты</button>
        <button className={tab === "payments" ? "is-active" : ""} onClick={() => setTab("payments")}><CreditCard size={16} /> Платежи</button>
        <button className={tab === "logs" ? "is-active" : ""} onClick={() => setTab("logs")}><Clock3 size={16} /> Логи</button>
      </div>
      {tab === "products" && (
        <section className="admin-content">
          <form className="admin-form" onSubmit={saveProduct}>
            <span className="card-label">{editingProduct ? "РЕДАКТИРОВАНИЕ" : "НОВЫЙ ТОВАР"}</span>
            <h2>{editingProduct ? "Настроить страницу" : "Добавить товар"}</h2>
            <input
              required
              placeholder="slug товара"
              value={productForm.slug}
              onChange={(event) =>
                setProductForm({ ...productForm, slug: event.target.value })
              }
            />
            <input
              required
              placeholder="Название"
              value={productForm.name}
              onChange={(event) =>
                setProductForm({ ...productForm, name: event.target.value })
              }
            />
            <div className="icon-picker">
              <span className="form-field-label">Иконка товара</span>
              <div className="icon-picker-grid">
                {BOT_ICONS.map((icon) => (
                  <button
                    className={`icon-choice ${productForm.imageUrl === icon.path ? "is-selected" : ""}`}
                    type="button"
                    key={icon.path}
                    onClick={() => setProductForm({ ...productForm, imageUrl: icon.path })}
                    title={icon.label}
                  >
                    <img src={icon.path} alt={icon.label} />
                    <span>{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="Описание"
              rows={3}
              value={productForm.description}
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  description: event.target.value,
                })
              }
            />
            <textarea
              placeholder="Подробное описание для страницы товара"
              rows={5}
              value={productForm.longDescription}
              onChange={(event) =>
                setProductForm({ ...productForm, longDescription: event.target.value })
              }
            />
            <textarea
              placeholder="Ссылки на изображения или GIF, по одной на строку"
              rows={4}
              value={productForm.mediaUrls}
              onChange={(event) =>
                setProductForm({ ...productForm, mediaUrls: event.target.value })
              }
            />
            <textarea
              placeholder="Функции товара, по одной на строку"
              rows={4}
              value={productForm.features}
              onChange={(event) =>
                setProductForm({ ...productForm, features: event.target.value })
              }
            />
            <input
              type="number"
              min="0"
              placeholder="Цена в рублях"
              value={productForm.price}
              onChange={(event) =>
                setProductForm({ ...productForm, price: event.target.value })
              }
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Базовая цена в USD"
              value={productForm.basePriceUsd}
              onChange={(event) => setProductForm({ ...productForm, basePriceUsd: event.target.value })}
            />
            <input type="number" min="0" step="0.01" placeholder="Цена за неделю, USD" value={productForm.priceWeekUsd} onChange={(event) => setProductForm({ ...productForm, priceWeekUsd: event.target.value })} />
            <input type="number" min="0" step="0.01" placeholder="Цена за месяц, USD" value={productForm.priceMonthUsd} onChange={(event) => setProductForm({ ...productForm, priceMonthUsd: event.target.value })} />
            <input type="number" min="0" step="0.01" placeholder="Цена за год, USD" value={productForm.priceYearUsd} onChange={(event) => setProductForm({ ...productForm, priceYearUsd: event.target.value })} />
            <button className="primary-button" type="submit">
              <Plus size={16} /> {editingProduct ? "Сохранить настройки" : "Добавить товар"}
            </button>
            {productError && <span className="login-error">{productError}</span>}
            {editingProduct && <button className="secondary-button admin-cancel" type="button" onClick={() => { setEditingProduct(null); setProductForm({ slug: "", name: "", description: "", longDescription: "", imageUrl: "", mediaUrls: "", features: "", price: "0", basePriceUsd: "0", priceWeekUsd: "0", priceMonthUsd: "0", priceYearUsd: "0" }) }}>Отменить</button>}
          </form>
          <div className="admin-list">
            <h2>Каталог товаров</h2>
            {products.map((product) => (
              <div className="admin-row" key={product.id}>
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {product.slug} · {product.price} {product.currency}
                  </small>
                </span>
                <button
                  className="outline-button admin-edit"
                  type="button"
                  onClick={() => editProduct(product)}
                >
                  Настроить
                </button>
                <button
                  className="icon-button danger-button"
                  type="button"
                  onClick={() => deleteProduct(product.id)}
                  aria-label={`Удалить ${product.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "faq" && <section className="admin-content"><form className="admin-form" onSubmit={addFaq}><span className="card-label">НОВЫЙ FAQ</span><h2>Добавить вопрос</h2><input required placeholder="Вопрос" value={faqForm.question} onChange={(event) => setFaqForm({ ...faqForm, question: event.target.value })} /><textarea required rows={6} placeholder="Ответ" value={faqForm.answer} onChange={(event) => setFaqForm({ ...faqForm, answer: event.target.value })} /><button className="primary-button" type="submit"><Plus size={16} /> Добавить FAQ</button></form><div className="admin-list"><h2>Вопросы</h2>{faqs.map((item) => <div className="admin-row" key={item.id}><span><strong>{item.question}</strong><small>{item.answer}</small></span><button className="icon-button danger-button" type="button" onClick={async () => { await fetch(`${API_URL}/api/admin/faq/${item.id}`, { method: "DELETE", credentials: "include" }); await loadAdmin(); }} aria-label="Удалить FAQ"><Trash2 size={16} /></button></div>)}</div></section>}
      {tab === "bots" && <section className="admin-content"><form className="admin-form" onSubmit={addBot}><span className="card-label">НОВЫЙ БОТ</span><h2>Добавить бота</h2><input required placeholder="slug бота" value={botForm.slug} onChange={(event) => setBotForm({ ...botForm, slug: event.target.value })} /><input required placeholder="Название" value={botForm.name} onChange={(event) => setBotForm({ ...botForm, name: event.target.value })} /><input placeholder="URL иконки PNG" value={botForm.iconUrl} onChange={(event) => setBotForm({ ...botForm, iconUrl: event.target.value })} /><textarea rows={3} placeholder="Короткое описание" value={botForm.description} onChange={(event) => setBotForm({ ...botForm, description: event.target.value })} /><textarea rows={5} placeholder="Подробное описание" value={botForm.longDescription} onChange={(event) => setBotForm({ ...botForm, longDescription: event.target.value })} /><textarea rows={4} placeholder="Функции, по одной на строку" value={botForm.features} onChange={(event) => setBotForm({ ...botForm, features: event.target.value })} /><button className="primary-button" type="submit"><Plus size={16} /> Добавить бота</button></form><div className="admin-list"><h2>Боты</h2>{catalogBots.map((bot) => <div className="admin-row" key={bot.id}><span><strong>{bot.name}</strong><small>{bot.slug}</small></span></div>)}</div></section>}
      {tab === "payments" && <section className="admin-content admin-users"><h2>Платежи и заказы</h2>{orders.length === 0 ? <div className="shop-empty"><CreditCard size={28} /><h2>Заказов пока нет</h2><p>Платежи появятся после первой покупки.</p></div> : orders.map((order) => <div className="admin-row" key={order.id}><span><strong>{order.productName} · {order.amount / 100} {order.currency}</strong><small>{order.username} · {order.status} · {new Date(order.createdAt).toLocaleString("ru-RU")}</small></span>{order.status === "paid" && <button className="outline-button" type="button" onClick={async () => { await fetch(`${API_URL}/api/admin/orders/${order.id}/refund`, { method: "POST", credentials: "include" }); await loadAdmin(); }}>Оформить возврат</button>}</div>)}</section>}
      {tab === "logs" && <section className="admin-content admin-users"><h2>Логи сайта</h2>{logs.map((log) => <div className="admin-row" key={log.id}><span><strong>{log.method} {log.path}</strong><small>{log.ip} · HTTP {log.statusCode} · {log.durationMs} ms · {new Date(log.createdAt).toLocaleString("ru-RU")}</small></span></div>)}</section>}
      {tab === "profiles" && (
        <section className="admin-content">
          <form className="admin-form" onSubmit={addProfile}>
            <span className="card-label">НОВЫЙ ПРОФИЛЬ</span>
            <h2>Создать роль</h2>
            <input
              required
              placeholder="Название профиля"
              value={profileForm.name}
              onChange={(event) =>
                setProfileForm({ ...profileForm, name: event.target.value })
              }
            />
            <input
              placeholder="Описание"
              value={profileForm.description}
              onChange={(event) =>
                setProfileForm({
                  ...profileForm,
                  description: event.target.value,
                })
              }
            />
            <div className="permission-list">
              {[
                "products.read",
                "products.write",
                "users.read",
                "users.write",
                "admins.manage",
                "faq.write",
                "bots.write",
                "payments.read",
                "payments.refund",
              ].map((permission) => (
                <label key={permission}>
                  <input
                    type="checkbox"
                    checked={profileForm.permissions.includes(permission)}
                    onChange={(event) =>
                      setProfileForm({
                        ...profileForm,
                        permissions: event.target.checked
                          ? [...profileForm.permissions, permission]
                          : profileForm.permissions.filter(
                              (item) => item !== permission,
                            ),
                      })
                    }
                  />{" "}
                  {permission}
                </label>
              ))}
            </div>
            <button className="primary-button" type="submit">
              <Plus size={16} /> Создать профиль
            </button>
          </form>
          <div className="admin-list">
            <h2>Профили прав</h2>
            {profiles.map((profile) => (
              <div className="admin-row" key={profile.id}>
                <span>
                  <strong>{profile.name}</strong>
                  <small>{profile.permissions.join(" · ") || "Без прав"}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "users" && (
        <section className="admin-content admin-users">
          <h2>Пользователи и назначения</h2>
          {users.map((user) => (
            <div className="admin-row" key={user.id}>
              <span>
                <strong>{user.globalName || user.username}</strong>
                <small>
                  @{user.username} · {user.discordId}
                </small>
              </span>
              <select
                value={
                  profiles.find((profile) => profile.name === user.adminProfile)
                    ?.id ?? ""
                }
                onChange={(event) => assignProfile(user.id, event.target.value)}
              >
                <option value="">Без admin-профиля</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function ProfilePage({
  data,
  authChecked,
}: {
  data: AuthData | null;
  authChecked: boolean;
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!authChecked)
    return (
      <main className="profile-page section-wrap">
        <div className="profile-loading">Проверяем авторизацию...</div>
      </main>
    );
  if (!data)
    return (
      <main className="profile-page section-wrap">
        <div className="profile-locked">
          <UserRound size={28} />
          <h1>Профиль доступен после входа</h1>
          <p>Авторизуйся через Discord, чтобы открыть личный кабинет.</p>
          <a className="primary-button" href="/login">
            <LogIn size={17} /> Войти через Discord
          </a>
        </div>
      </main>
    );

  const { user } = data;
  const displayName = user.globalName || user.username;
  const initials = displayName.slice(0, 2).toUpperCase();
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`
    : null;
  const logout = async () => {
    setIsLoggingOut(true);
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    window.location.href = "/login";
  };

  return (
    <main className="profile-page section-wrap" id="top">
      <section className="profile-heading">
        <div>
          <span className="section-kicker">
            <UserRound size={15} /> 05 / ЛИЧНЫЙ КАБИНЕТ
          </span>
          <h1>Твой профиль</h1>
          <p>Управляй подпиской, ботами и настройками AFKFlow в одном месте.</p>
        </div>
        <button
          className="profile-settings"
          type="button"
          aria-label="Настройки профиля"
        >
          <Settings size={18} />
        </button>
      </section>

      <section className="profile-grid">
        <article className="profile-card profile-user-card">
          {avatarUrl ? (
            <img
              className="profile-avatar profile-avatar-image"
              src={avatarUrl}
              alt={`Аватар ${displayName}`}
            />
          ) : (
            <div className="profile-avatar">{initials}</div>
          )}
          <div className="profile-user-copy profile-identity">
            <h2>{displayName}</h2>
            <p>{user.email || `@${user.username}`}</p>
            <span className="profile-status">
              <span /> Аккаунт активен
            </span>
          </div>
          <button
            className="logout-button profile-logout"
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
          >
            <LogOut size={15} /> {isLoggingOut ? "Выход..." : "Выйти"}
          </button>
          <div className="profile-account-details">
            <span>
              <small>Discord username</small>
              <strong>@{user.username}</strong>
            </span>
            <span>
              <small>Discord ID</small>
              <strong>{user.discordId}</strong>
            </span>
            <span>
              <small>Аккаунт создан</small>
              <strong>
                {new Date(user.createdAt).toLocaleDateString("ru-RU")}
              </strong>
            </span>
          </div>
        </article>

        <article className="profile-card subscription-card">
          <div className="card-topline">
            <span className="card-label">
              <Crown size={15} /> ТЕКУЩАЯ ПОДПИСКА
            </span>
            <span className="subscription-badge">ПРОБНЫЙ ПЕРИОД</span>
          </div>
          <h2>AFKFlow Pro</h2>
          <p className="subscription-copy">
            Полный доступ ко всем ботам и функциям.
          </p>
          <div className="trial-progress">
            <div>
              <span>Пробный период</span>
              <strong>12 из 14 дней</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: "86%" }} />
            </div>
          </div>
          <div className="subscription-footer">
            <span>Заканчивается 18 сентября 2026</span>
            <button className="primary-button" type="button">
              <CreditCard size={16} /> Управлять подпиской
            </button>
          </div>
        </article>

        <div className="profile-stats">
          <StatCard
            icon={<Gauge />}
            value="38 ч 24 м"
            label="Сэкономлено времени"
          />
          <StatCard icon={<Bot />} value="3" label="Активных бота" />
          <StatCard icon={<Layers3 />} value="247" label="Выполнено задач" />
        </div>

        <article className="profile-card bots-card">
          <div className="section-card-heading">
            <div>
              <span className="card-label">АКТИВНЫЕ БОТЫ</span>
              <h2>Твои боты</h2>
            </div>
            <a href="/#bots" className="text-link">
              Все боты <ArrowRight size={15} />
            </a>
          </div>
          <div className="bot-list">
            <ProfileBot
              icon="WF"
              name="Warframe Helper"
              description="Фарм ресурсов"
              status="Работает"
            />
            <ProfileBot
              icon="ST"
              name="Steam Tasks"
              description="Ежедневные задания"
              status="На паузе"
              paused
            />
          </div>
        </article>

        <article className="profile-card activity-card">
          <div className="section-card-heading">
            <div>
              <span className="card-label">ПОСЛЕДНЯЯ АКТИВНОСТЬ</span>
              <h2>История</h2>
            </div>
            <Clock3 size={18} className="muted-icon" />
          </div>
          <div className="activity-list">
            <Activity
              icon={<Check />}
              title="Warframe Helper запущен"
              time="Сегодня, 14:32"
            />
            <Activity
              icon={<CreditCard />}
              title="Активирован пробный период"
              time="5 сентября 2026"
            />
            <Activity
              icon={<Settings />}
              title="Изменены настройки бота"
              time="3 сентября 2026"
            />
          </div>
        </article>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="profile-stat">
      <div className="stat-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProfileBot({
  icon,
  name,
  description,
  status,
  paused = false,
}: {
  icon: string;
  name: string;
  description: string;
  status: string;
  paused?: boolean;
}) {
  return (
    <div className="profile-bot">
      <span className="bot-monogram">{icon}</span>
      <span className="bot-info">
        <strong>{name}</strong>
        <small>{description}</small>
      </span>
      <span className={`bot-state ${paused ? "is-paused" : ""}`}>
        <span /> {status}
      </span>
      <button
        className="bot-more"
        type="button"
        aria-label={`Настройки ${name}`}
      >
        <Settings size={16} />
      </button>
    </div>
  );
}

function Activity({
  icon,
  title,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  time: string;
}) {
  return (
    <div className="activity-row">
      <span className="activity-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{time}</small>
      </span>
    </div>
  );
}

export default App;
