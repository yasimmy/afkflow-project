import React, { useEffect, useState } from 'react';
import { Activity, Clock3, Flame, Info, RefreshCw, X } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useBotStore } from '@/stores/botStore';
import { useToast } from '@/components/ui/Toast';
import { pauseBot, resumeBot, stopBot, getBotActionCount } from '@/api/client';
import { getLocalBotActionCount, getLocalBotStatus, sendBotCommand, stopLocalBot } from '@/services/desktop';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  botId?: string;
  standalone?: boolean;
}

const statusText = { running: 'Работает', paused: 'Пауза', ready: 'Остановлен', error: 'Ошибка' } as const;
const statusColor = { running: '#62C7A5', paused: '#A9A071', ready: '#89909D', error: '#F87171' } as const;

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${rest}`;
}

export function BotDashboard({ isOpen, onClose, botId, standalone = false }: Props) {
  const addToast = useToast();
  const bot = useBotStore((state) => state.bots.find((item) => item.id === botId));
  const updateBotStatus = useBotStore((state) => state.updateBotStatus);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [actions, setActions] = useState(0);
  const [lastAction, setLastAction] = useState('Нет данных');
  const [stateChanging, setStateChanging] = useState(false);

  useEffect(() => {
    if (!isOpen || !bot || (bot.status !== 'running' && bot.status !== 'paused')) return;
    if (standalone) {
      void getLocalBotStatus(bot.id).then((state) => {
        if (state?.startedAt) setStartedAt(Number(state.startedAt) * 1000);
      }).catch(() => undefined);
      void getLocalBotActionCount(bot.id).then((count) => {
        setActions(count);
        if (count > 0) setLastAction('Получено сейчас');
      }).catch(() => undefined);
    } else {
      setStartedAt((value) => value ?? Date.now());
      void getBotActionCount(bot.id).then((result) => {
        setActions(result.count);
        if (result.count > 0) setLastAction('Получено сейчас');
      }).catch(() => undefined);
    }
  }, [isOpen, bot, standalone]);

  useEffect(() => {
    if (standalone || !isOpen || !bot || (bot.status !== 'running' && bot.status !== 'paused')) return;
    const timer = window.setInterval(() => {
      const request = standalone
        ? getLocalBotActionCount(bot.id).then((count) => ({ count }))
        : getBotActionCount(bot.id);
      void request.then((result) => {
        setActions((previous) => {
          if (result.count !== previous) setLastAction(new Date().toLocaleTimeString('ru-RU'));
          return result.count;
        });
      }).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isOpen, bot, standalone]);

  useEffect(() => {
    if (!startedAt || bot?.status !== 'running') return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, bot?.status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || event.repeat) return;
      if (event.key === 'F7') {
        event.preventDefault();
        if (bot?.status === 'paused') void handleResume();
      }
      if (event.key === 'F8') {
        event.preventDefault();
        if (bot?.status === 'running') void handlePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!bot) return null;
  const status = bot.status === 'running' || bot.status === 'paused' ? bot.status : bot.status === 'error' ? 'error' : 'ready';
  const color = statusColor[status];
  const statItems: Array<{ icon: React.ReactNode; label: string; value: string; accent: string }> = [
    { icon: <Activity size={24} />, label: 'Выполнено действий', value: actions.toLocaleString('ru-RU'), accent: '#9B6CFF' },
    { icon: <RefreshCw size={24} />, label: 'Прокрутов / действий', value: actions.toLocaleString('ru-RU'), accent: '#4DA3FF' },
    { icon: <Clock3 size={24} />, label: 'Время работы', value: formatTime(elapsed), accent: '#8EDC38' },
    { icon: <Flame size={24} />, label: 'Действий в час', value: elapsed > 0 ? Math.round(actions * 3600 / elapsed).toLocaleString('ru-RU') : '--', accent: '#FF9B35' },
  ];
  const handlePause = async () => {
    await sendBotCommand(bot.id, 'pause');
    if (!standalone) await pauseBot(bot.id);
    updateBotStatus(bot.id, 'paused');
  };
  const handleResume = async () => {
    await sendBotCommand(bot.id, 'resume');
    if (!standalone) await resumeBot(bot.id);
    updateBotStatus(bot.id, 'running');
  };
  const handleStop = async () => {
    if (!standalone) await stopBot(bot.id);
    await stopLocalBot(bot.id).catch(() => undefined);
    updateBotStatus(bot.id, 'ready');
    addToast(`${bot.name} остановлен`, 'success');
    onClose();
  };
  const runAction = async (action: () => Promise<void>, message: string) => {
    try { await action(); } catch { addToast(message, 'error'); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Бот — ${bot.name}`} size="xl" closable={false} frameless={standalone}>
      <div className={standalone ? 'h-full overflow-hidden bg-[#0D1016] p-1 text-[#F5F7FA]' : 'h-full overflow-hidden bg-[#0D1016] p-3 text-[#F5F7FA]'}>
    <div className={standalone ? 'rounded-lg border border-white/[0.1] bg-[#0D1016]/95 p-2' : 'h-full rounded-xl border border-white/[0.1] bg-[#0D1016]/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)]'}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={standalone ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#8EDC38]' : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#8EDC38] bg-white/[0.02] shadow-[0_0_18px_rgba(142,220,56,0.18)]'}>
              <img src="/icons/start-bots-ico/botlogo.png?v=2" alt="" className={standalone ? 'h-5 w-5 object-contain' : 'h-8 w-8 object-contain'} />
            </div>
            <div className="min-w-0">
              <h2 className={standalone ? 'truncate text-xs font-bold' : 'truncate text-lg font-bold'}>Бот — <span className="text-[#8EDC38]">{bot.name}</span></h2>
              <p className="mt-0.5 text-[9px] text-white/50">{status === 'running' ? `Работает ${formatTime(elapsed)}` : statusText[status]}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" disabled={stateChanging} onClick={() => {
              setStateChanging(true);
              void runAction(status === 'running' ? handlePause : handleResume, 'Не удалось изменить состояние бота').finally(() => setStateChanging(false));
            }} className="flex items-center gap-1 rounded-lg border border-[#FFC83D]/50 bg-[#FFC83D]/[0.04] px-1.5 py-1 text-[#FFC83D] transition hover:bg-[#FFC83D]/[0.1] disabled:cursor-not-allowed disabled:opacity-50">
              <kbd className="rounded border border-[#FFC83D]/50 px-1 py-0.5 text-[10px] font-semibold">{status === 'running' ? 'F8' : 'F7'}</kbd>
              <span className="text-[10px]">{status === 'running' ? 'Пауза' : 'Старт'}</span>
            </button>
            <span className="hidden items-center gap-1 text-[10px] sm:flex" style={{ color }}><span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />{statusText[status]}</span>
            <button type="button" onClick={() => void runAction(handleStop, 'Не удалось остановить бота')} aria-label="Остановить бота" title="Остановить бота" className="rounded p-1 text-white/40 hover:bg-white/[0.08] hover:text-white"><X size={15} /></button>
          </div>
        </div>

        <div className={standalone ? 'mt-2 grid grid-cols-4 divide-x divide-white/[0.08] rounded-lg border border-white/[0.1]' : 'mt-3 grid grid-cols-4 divide-x divide-white/[0.08] rounded-xl border border-white/[0.1]'}>
          {statItems.map(({ icon, label, value, accent }) => (
            <div key={label} className={standalone ? 'min-w-0 p-1' : 'min-w-0 p-3'}>
              <span className={standalone ? 'block h-5' : 'block h-8'} style={{ color: accent }}>{icon}</span>
              <div><p className={standalone ? 'mt-0.5 min-h-[1.4rem] text-[7px] leading-3 text-white/45' : 'mt-1 min-h-[2rem] text-[11px] leading-4 text-white/45'}>{label}</p><strong className={standalone ? 'mt-0.5 block text-xs' : 'mt-1 block text-lg'} style={{ color: accent }}>{value}</strong></div>
            </div>
          ))}
        </div>

        <div className={standalone ? 'hidden' : 'mt-3 grid gap-3 lg:grid-cols-2'}>
          <section className="rounded-2xl border border-white/[0.1] bg-white/[0.015] p-5 lg:col-span-2"><h3 className="flex items-center gap-2 text-xl font-semibold"><Info size={20} className="text-white/60" />Информация</h3><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div className="flex justify-between gap-4"><dt className="text-white/45">Состояние</dt><dd>{statusText[status]}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/45">Последнее действие</dt><dd className="text-white/70">{lastAction}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/45">Ошибок</dt><dd>0</dd></div><div className="flex justify-between gap-4"><dt className="text-white/45">Режим работы</dt><dd className="text-white/70">Автоматический</dd></div></dl></section>
        </div>
        {!standalone && <div className="mt-3 flex justify-end"><Button variant="danger" size="xs" onClick={() => void runAction(handleStop, 'Не удалось остановить бота')}>Остановить</Button></div>}
        </div>
      </div>
    </Modal>
  );
}
