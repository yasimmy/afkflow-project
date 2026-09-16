import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  LogOut,
  Crown,
  Bot,
  Play,
  Clock,
  Calendar,
  ExternalLink,
  ShoppingBag,
  UserRound,
  ShieldCheck,
  ArrowRight,
  BarChart3,
  Copy,
  Check,
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Avatar, Badge, Button, Card, Skeleton } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useModalStore } from '@/stores/modalStore';
import { useToast } from '@/components/ui/Toast';
import { getPurchases, getUserStats } from '@/api/client';
import type { Purchase, UserStats } from '@/types';

const MANAGE_URL = import.meta.env.VITE_MANAGE_URL ?? 'https://afkflow.ru/subscription';
const APP_VERSION = 'Alpha 0.0.3';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatRuntime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

function formatRemainingDays(iso: string) {
  const days = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
}

function subscriptionIcon(plan: string) {
  const icons: Record<string, string> = {
    'plan_start': '/icons/subscription-icons/start-sub.png',
    'plan_premium': '/icons/subscription-icons/premium-sub.png',
    'plan_full': '/icons/subscription-icons/full-sub.png',
    'plan_farm': '/icons/subscription-icons/farm-sub.png',
    'plan_luck': '/icons/subscription-icons/luck-sub.png',
    'plan_cbt_closing_beta_test': '/icons/subscription-icons/beta-test-sub.png',
    start: '/icons/subscription-icons/start-sub.png',
    premium: '/icons/subscription-icons/premium-sub.png',
    full: '/icons/subscription-icons/full-sub.png',
    farm: '/icons/subscription-icons/farm-sub.png',
    luck: '/icons/subscription-icons/luck-sub.png',
    'cbt-closing-beta-test': '/icons/subscription-icons/beta-test-sub.png',
  };
  return icons[plan] ?? icons.premium;
}

async function openExternal(url: string) {
  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-muted">{icon}</span>
        <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="bg-bg-card border border-[rgba(255,255,255,0.06)] rounded-lg p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-md bg-accent/10 flex items-center justify-center shrink-0 text-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[18px] font-bold text-text-primary leading-tight">{value}</div>
        <div className="text-[11px] text-text-secondary mt-0.5 truncate">{label}</div>
      </div>
    </div>
  );
}

// ─── Purchase row ─────────────────────────────────────────────────────────────

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const statusMap: Record<Purchase['status'], { label: string; variant: 'success' | 'danger' | 'muted' }> = {
    active:   { label: 'Доступен',  variant: 'success' },
    expired:  { label: 'Истёк',     variant: 'danger'  },
    refunded: { label: 'Возврат',   variant: 'muted'   },
  };
  const { label, variant } = statusMap[purchase.status];

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
          <ShoppingBag size={14} className="text-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{purchase.productName}</p>
          <p className="text-[11px] text-text-muted">{formatDate(purchase.createdAt)}</p>
        </div>
      </div>
      <Badge variant={variant}>{label}</Badge>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const navigate     = useNavigate();
  const { openModal } = useModalStore();
  const addToast = useToast();
  const user         = useAuthStore((s) => s.user);
  const subscription = useAuthStore((s) => s.subscription);

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ['purchases'],
    queryFn:  getPurchases,
    staleTime: 60_000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['userStats'],
    queryFn:  getUserStats,
    staleTime: 60_000,
  });

  if (!user) return null;

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.webp?size=160`
    : null;

  const isSubActive = subscription?.status === 'active';
  const [copiedDiscordId, setCopiedDiscordId] = React.useState(false);

  const copyDiscordId = async () => {
    try {
      await navigator.clipboard.writeText(user.discordId);
      setCopiedDiscordId(true);
      addToast('Discord ID скопирован', 'success');
      window.setTimeout(() => setCopiedDiscordId(false), 1600);
    } catch {
      addToast('Не удалось скопировать Discord ID', 'error');
    }
  };

  // Stagger children
  const container = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.07 } },
  };
  const item = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
  };

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Scrollable content ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-6xl mx-auto w-full px-8 py-7">
            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
              <aside className="bg-bg-card border border-[rgba(255,255,255,0.06)] rounded-lg p-4 sticky top-0 lg:min-h-[642px] flex flex-col">
                <button
                  onClick={() => navigate(-1)}
                  className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <ChevronLeft size={16} />
                  Назад
                </button>
                <div className="h-px bg-white/[0.06] my-4" />
                <div className="flex flex-col items-center text-center px-2 py-3">
                  <motion.div
                    className="rounded-full"
                    animate={{
                      boxShadow: [
                        '0 0 0 1px rgba(124,92,255,0.45), 0 0 12px rgba(124,92,255,0.18)',
                        '0 0 0 3px rgba(124,92,255,0.8), 0 0 24px rgba(124,92,255,0.42)',
                        '0 0 0 1px rgba(124,92,255,0.45), 0 0 12px rgba(124,92,255,0.18)',
                      ],
                    }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Avatar
                      src={avatarUrl}
                      fallback={user.username}
                      size="2xl"
                      ring
                      alt={`Аватар ${user.username}`}
                    />
                  </motion.div>
                  <p className="mt-3 text-base font-bold text-text-primary truncate max-w-full">
                    {user.username}
                  </p>
                  {subscription && (
                    <Badge variant={isSubActive ? 'default' : 'danger'} className="mt-2">
                      {isSubActive ? subscription.planDisplayName : 'Подписка истекла'}
                    </Badge>
                  )}
                </div>
                <nav className="mt-4 space-y-1">
                  <div className="flex items-center gap-3 rounded-md bg-accent/15 text-text-primary px-3 py-2.5 text-sm font-medium">
                    <UserRound size={16} className="text-accent" />
                    Основное
                  </div>
                  <div className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-muted">
                    <ShieldCheck size={16} />
                    Безопасность
                  </div>
                </nav>
                <div className="mt-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<LogOut size={14} />}
                    onClick={() => openModal('logoutConfirm')}
                    className="w-full border border-white/[0.08] text-text-secondary hover:text-red-300 hover:bg-danger/10 hover:border-danger/25"
                  >
                    Выйти из аккаунта
                  </Button>
                  <div className="mt-3 pt-3 border-t border-white/[0.08] text-center">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Версия лаунчера</p>
                    <p className="mt-1 text-[12px] font-semibold text-text-secondary">{APP_VERSION}</p>
                  </div>
                </div>
              </aside>

            <motion.div
              className="flex flex-col gap-6 min-w-0"
              variants={container}
              initial="hidden"
              animate="visible"
            >
              <div>
                <h1 className="text-[22px] leading-7 font-bold text-text-primary">Профиль</h1>
                <p className="text-[13px] text-text-muted mt-1">Управление аккаунтом и подпиской</p>
              </div>

              {/* ── Main account card ───────────────────────────────────────── */}
              <motion.div variants={item}>
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
                    <UserRound size={19} className="text-text-secondary" />
                    <h2 className="text-[15px] font-semibold text-text-primary">Основное</h2>
                  </div>
                  <div className="px-6">
                    {[
                      { label: 'Имя пользователя', value: user.username },
                      { label: 'Discord ID', value: user.discordId },
                      { label: 'Дата регистрации', value: formatDate(user.createdAt) },
                    ].map((row, index) => (
                      <div
                        key={row.label}
                        className={`min-h-[48px] flex items-center justify-between gap-4 ${index < 2 ? 'border-b border-white/[0.06]' : ''}`}
                      >
                        <span className="text-[13px] text-text-secondary">{row.label}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[13px] text-text-primary truncate">{row.value}</span>
                          {row.label === 'Discord ID' && (
                            <button
                              type="button"
                              aria-label="Скопировать Discord ID"
                              onClick={() => void copyDiscordId()}
                              className="w-8 h-8 shrink-0 rounded-md border border-white/[0.08] text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors flex items-center justify-center"
                            >
                              {copiedDiscordId ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>

              {/* ── Subscription ───────────────────────────────────────────── */}
              <motion.div variants={item}>
                <div id="profile-subscription">
                <Section title="Подписка" icon={<Crown size={14} />}>
                  {!subscription ? (
                    <Card className="p-5">
                      <p className="text-sm text-text-secondary">Активная подписка не найдена.</p>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<ExternalLink size={13} />}
                        className="mt-3"
                        onClick={() => openExternal(MANAGE_URL)}
                      >
                        Купить подписку
                      </Button>
                    </Card>
                  ) : (
                  <Card className="p-4 lg:p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                      <div className="flex items-center gap-3 lg:w-[250px] shrink-0">
                        <div className="w-16 h-16 flex items-center justify-center shrink-0">
                          <img src={subscriptionIcon(subscription.plan)} alt="" className="w-16 h-16 object-contain" />
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-text-primary">
                            {subscription.planDisplayName}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            Доступ ко всем ботам и функциям
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 lg:w-[280px] shrink-0 text-sm">
                        <div>
                          <p className="text-text-muted text-xs mb-0.5 whitespace-nowrap">Статус</p>
                          <p className="font-medium text-success whitespace-nowrap">Активна</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs mb-0.5 whitespace-nowrap">Действует до</p>
                          <p className="font-medium text-text-primary whitespace-nowrap">
                          {formatDate(subscription.expiresAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs mb-0.5 whitespace-nowrap">Автопродление</p>
                          <p className="font-medium text-text-primary whitespace-nowrap">Включено</p>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        rightIcon={<ArrowRight size={14} />}
                        onClick={() => openExternal(MANAGE_URL)}
                        className="shrink-0"
                      >
                        Управление подпиской
                      </Button>
                    </div>
                  </Card>
                  )}
                </Section>
                </div>
              </motion.div>

              {/* ── Statistics ─────────────────────────────────────────────── */}
              <motion.div variants={item}>
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
                    <BarChart3 size={19} className="text-accent" />
                    <h2 className="text-[15px] font-semibold text-text-primary">Быстрая статистика</h2>
                  </div>
                  <div className="p-4">
                  {statsLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[72px] rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <StatCard
                        icon={<Bot size={16} />}
                        value={stats?.botCount ?? subscription?.botCount ?? 0}
                        label="Ботов в подписке"
                      />
                      <StatCard
                        icon={<Play size={16} />}
                        value={stats?.totalLaunches ?? '—'}
                        label="Всего запусков"
                      />
                      <StatCard
                        icon={<Clock size={16} />}
                        value={
                          stats?.totalRuntimeSeconds
                            ? formatRuntime(stats.totalRuntimeSeconds)
                            : '—'
                        }
                        label="Общее время работы"
                      />
                      <StatCard
                        icon={<Calendar size={16} />}
                        value={subscription ? formatRemainingDays(subscription.expiresAt) : '—'}
                        label="Подписка активна"
                      />
                    </div>
                  )}
                  </div>
                </Card>
              </motion.div>

            </motion.div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
