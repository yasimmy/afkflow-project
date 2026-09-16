import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, NumberInput, Switch, Tabs, Spinner } from '@/components/ui';
import { Pin, Search, X } from 'lucide-react';
import type { TabItem } from '@/components/ui';
import { useBotStore } from '@/stores/botStore';
import { useToast } from '@/components/ui/Toast';
import { getBotConfig, updateBotConfig } from '@/api/client';
import { markBotConfigConfirmed, saveLocalBotConfig, loadLocalBotConfig } from '@/services/desktop';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  botId?: string;
  firstLaunch?: boolean;
  onConfirmAndStart?: () => void;
}

// Per-bot field definitions
interface FieldDef {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'text' | 'select';
  /** Shown below the label in Switch and Input fields */
  hint?: string;
  tab: 'main' | 'advanced' | 'expander';
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  options?: string[];
  maxLength?: number;
}

interface CookingRecipe {
  name: string;
  ingredients: string;
  tool: string;
  sequence: string[];
}

const recipe = (name: string, ingredients: string, tool: string, ingredientCount: number): CookingRecipe => {
  const hasWater = ingredients.toLowerCase().includes('вода');
  const cellCount = hasWater ? ingredientCount - 1 : ingredientCount;
  const tools = tool
    .split(' + ')
    .filter(Boolean)
    .map((item) => ({ 'Нож': 'knife', 'Венчик': 'whisk', 'Огонь': 'fire' })[item] ?? '')
    .filter(Boolean);
  return {
    name,
    ingredients,
    tool,
    sequence: [
      ...Array.from({ length: cellCount }, (_, index) => `cell_${index + 1}`),
      ...(hasWater ? ['water'] : []),
      ...tools,
    ],
  };
};

const COOKING_RECIPES: CookingRecipe[] = [
  recipe('Борщ', 'Мясо, овощи, бульон', 'Огонь', 3),
  recipe('Бульон', 'Мясо, вода', 'Огонь', 2),
  recipe('Бургер', 'Мясная котлета, овощи, хлеб', 'Огонь', 3),
  recipe('Буррито', 'Сваренный рис, мясной фарш, хлеб, овощи, сыр', 'Огонь', 5),
  recipe('Жаренная на масле рыба с овощами', 'Любая рыба, овощи, масло', 'Огонь', 3),
  recipe('Жаренное на масле мясо с овощами', 'Мясо, овощи, масло', 'Огонь', 3),
  recipe('Карамель', 'Сахар', 'Огонь', 1),
  recipe('Карамельное мороженое', 'Мороженое, карамель', '', 2),
  recipe('Карамельный молочный коктейль', 'Молочный коктейль, карамель', '', 2),
  recipe('Карамельный чизкейк', 'Чизкейк, карамель', '', 2),
  recipe('Картофельное пюре', 'Овощи, масло, молоко', 'Венчик + Огонь', 3),
  recipe('Компот', 'Фрукты, сахар, вода', 'Огонь', 3),
  recipe('Крем-брюле', 'Молоко, сахар, яйцо', 'Огонь', 3),
  recipe('Лазанья', 'Мясной фарш, овощи, молоко, мука, сыр', 'Огонь', 5),
  recipe('Макароны', 'Тесто, вода', 'Нож + Огонь', 2),
  recipe('Макароны с мясной котлетой', 'Макароны, мясная котлета', '', 2),
  recipe('Макароны с сыром', 'Макароны, сыр', 'Огонь', 2),
  recipe('Мальма в сливочном соусе', 'Мальма, овощи, молоко', 'Огонь', 3),
  recipe('Масло', 'Молоко', 'Венчик', 1),
  recipe('Молочный коктейль', 'Мороженое, молоко', 'Венчик', 2),
  recipe('Мороженое', 'Яйцо, молоко, сахар, лёд', 'Венчик', 4),
  recipe('Мясная котлета', 'Мясной фарш, масло', 'Огонь', 2),
  recipe('Мясная котлета с пюре', 'Картофельное пюре, мясная котлета', '', 2),
  recipe('Мясная котлета с рисом', 'Сваренный рис, мясная котлета', '', 2),
  recipe('Мясной фарш', 'Мясо', 'Нож', 1),
  recipe('Мясо по-французски', 'Мясо, овощи, сыр', 'Огонь', 3),
  recipe('Мясо с овощами', 'Мясо, овощи', 'Огонь', 2),
  recipe('Овощной омлет', 'Овощи, яйцо, молоко', 'Венчик + Огонь', 3),
  recipe('Овощной ролл', 'Овощи, сваренный рис', 'Нож', 2),
  recipe('Овощной салат', 'Овощи', 'Нож', 1),
  recipe('Овощной смузи', 'Овощи, вода', 'Венчик', 2),
  recipe('Овощной суп', 'Бульон, овощи', 'Огонь', 2),
  recipe('Оладьи', 'Яйцо, молоко, сахар, мука', 'Венчик + Огонь', 4),
  recipe('Оливье', 'Мясо, яйцо, овощи, вода', 'Нож + Огонь', 4),
  recipe('Омлет', 'Яйцо, молоко', 'Венчик + Огонь', 2),
  recipe('Паста Болоньезе', 'Мясной фарш, макароны, овощи, сыр', 'Огонь', 4),
  recipe('Паста Карбонара', 'Мясо, макароны, сыр, яйцо', 'Огонь', 4),
  recipe('Пельмени', 'Мясной фарш, тесто, вода', 'Огонь', 3),
  recipe('Пицца', 'Мясо, тесто, овощи, сыр', 'Огонь', 4),
  recipe('Поке', 'Сваренный рис, лосось, овощи, сыр', '', 4),
  recipe('Рагу', 'Мясо, овощи, вода', '', 3),
  recipe('Рамен', 'Мясо, макароны, яйцо, бульон', 'Огонь', 4),
  recipe('Ризотто', 'Рисовая крупа, бульон, сыр', '', 3),
  recipe('Ролл с Лососем', 'Лосось, сваренный рис', 'Нож', 2),
  recipe('Ролл с Тунцом', 'Тунец, сваренный рис', 'Нож', 2),
  recipe('Рыба с овощами', 'Любая рыба, овощи', 'Огонь', 2),
  recipe('Рыба с рисом', 'Любая рыба, сваренный рис', 'Огонь', 2),
  recipe('Рыба с фруктовым соусом', 'Любая рыба, фрукты, сахар', 'Огонь', 3),
  recipe('Рыба с фруктовым соусом и пюре', 'Рыба с фруктовым соусом, картофельное пюре', '', 2),
  recipe('Рыба с фруктовым соусом и рисом', 'Рыба с фруктовым соусом, сваренный рис', '', 2),
  recipe('Рыбная котлета', 'Рыбный фарш, масло', 'Огонь', 2),
  recipe('Рыбная котлета с макаронами', 'Макароны, рыбная котлета', '', 2),
  recipe('Рыбная котлета с пюре', 'Картофельное пюре, рыбная котлета', '', 2),
  recipe('Рыбная котлета с рисом', 'Сваренный рис, рыбная котлета', '', 2),
  recipe('Рыбный фарш', 'Любая рыба', 'Нож', 1),
  recipe('Салат Капрезе', 'Сыр, овощи', 'Нож', 2),
  recipe('Сашими из Фугу', 'Фугу', 'Нож', 1),
  recipe('Сваренный рис', 'Рисовая крупа, вода', 'Огонь', 2),
  recipe('Стейк', 'Мясо', 'Огонь', 1),
  recipe('Стейк с макаронами', 'Стейк, макароны', '', 2),
  recipe('Стейк с рисом', 'Сваренный рис, стейк', 'Огонь', 2),
  recipe('Стейк с салатом', 'Стейк, овощной салат', '', 2),
  recipe('Стейк с фруктовым соусом', 'Мясо, фрукты, сахар', 'Огонь', 3),
  recipe('Стейк с фруктовым соусом и пюре', 'Стейк с фруктовым соусом, картофельное пюре', '', 2),
  recipe('Стейк с фруктовым соусом и рисом', 'Стейк с фруктовым соусом, сваренный рис', '', 2),
  recipe('Суфле', 'Яйцо, сахар', 'Венчик + Огонь', 2),
  recipe('Сухая мясная котлета', 'Мясной фарш', 'Огонь', 1),
  recipe('Сухая рыбная котлета', 'Рыбный фарш', 'Огонь', 1),
  recipe('Сыр', 'Молоко', 'Венчик + Огонь', 1),
  recipe('Сэндвич с сыром', 'Сыр, хлеб', 'Нож + Огонь', 2),
  recipe('Тако с мясом', 'Мясной фарш, хлеб, овощи, сыр', 'Огонь', 4),
  recipe('Тако с рыбой', 'Рыбный фарш, хлеб, овощи, сыр', 'Огонь', 4),
  recipe('Тесто', 'Мука, яйцо, вода', 'Венчик', 3),
  recipe('Фруктовый лёд', 'Фрукты, лёд, сахар', 'Венчик', 3),
  recipe('Фруктовый салат', 'Фрукты', 'Нож', 1),
  recipe('Фруктовый салат с карамелью', 'Фруктовый салат, карамель', '', 2),
  recipe('Фруктовый смузи', 'Фрукты, вода', 'Венчик', 2),
  recipe('Фруктовый чизкейк', 'Чизкейк, фрукты', '', 2),
  recipe('Хлеб', 'Тесто', 'Огонь', 1),
  recipe('Чизкейк', 'Тесто, сыр, сахар', 'Венчик + Огонь', 3),
  recipe('Яблоко в карамели', 'Фрукты, карамель', '', 2),
  recipe('Яичница', 'Яйцо', 'Огонь', 1),
  recipe('Яичница с беконом', 'Мясо, яйцо, масло', 'Огонь', 3),
];

const DEFAULT_PINNED_RECIPES = ['Овощной салат', 'Овощной смузи'];
const PINNED_RECIPES_STORAGE_KEY = 'afkflow.cooking.pinned-recipes';
const SEQUENCE_ACTIONS = [
  { value: 'knife', label: 'Нож' },
  { value: 'whisk', label: 'Венчик' },
  { value: 'fire', label: 'Огонь' },
  { value: 'water', label: 'Вода' },
  ...Array.from({ length: 20 }, (_, index) => ({ value: `cell_${index + 1}`, label: `Ячейка ${index + 1}` })),
];

const RESOLUTION_OPTIONS = ['FullHD', 'QuadHD'];

const BOT_FIELDS: Record<string, FieldDef[]> = {
  default: [
    { key: 'resolution_mode', label: 'Разрешение экрана', type: 'select', tab: 'main', defaultValue: 'FullHD', options: RESOLUTION_OPTIONS },
    { key: 'delay_between_presses', label: 'Задержка между нажатиями (мс)', type: 'number', tab: 'main', defaultValue: 120, min: 50, max: 5000 },
    { key: 'color_tolerance', label: 'Допуск цвета', type: 'number', tab: 'main', defaultValue: 10, min: 1, max: 50 },
  ],
  'anti-afk': [
    { key: 'fast_mode', label: 'Быстрый режим', type: 'boolean', tab: 'main', defaultValue: false, hint: 'Ускоряет действие бота' },
  ],
  wheel: [
    { key: 'hours', label: 'Часы до старта', type: 'number', tab: 'main', defaultValue: 0, min: 0, max: 24, hint: '0 — сразу' },
    { key: 'minutes', label: 'Минуты до старта', type: 'number', tab: 'main', defaultValue: 0, min: 0, max: 59 },
    { key: 'resolution_mode', label: 'Разрешение экрана', type: 'select', tab: 'main', defaultValue: 'FullHD', options: RESOLUTION_OPTIONS },
  ],
  cooking: [
    { key: 'cycles', label: 'Количество циклов', type: 'number', tab: 'main', defaultValue: 1, min: 1, max: 100 },
    { key: 'resolution_mode', label: 'Разрешение экрана', type: 'select', tab: 'main', defaultValue: 'FullHD', options: RESOLUTION_OPTIONS },
    { key: 'sequence', label: 'Рецепт', type: 'text', tab: 'main', defaultValue: '' },
  ],
  gym: [
    { key: 'cycles', label: 'Количество подходов', type: 'number', tab: 'main', defaultValue: 0, min: 0, max: 9999, hint: '0 — бесконечно' },
    { key: 'key_with_food', label: 'Клавиша с едой', type: 'text', tab: 'main', defaultValue: '5', maxLength: 1 },
    { key: 'miss_chance', label: 'Шанс промаха (%)', type: 'number', tab: 'main', defaultValue: 0, min: 0, max: 100 },
    { key: 'espander', label: 'Использовать эспандер', type: 'boolean', tab: 'expander', defaultValue: false },
    { key: 'bind_espander', label: 'Клавиша эспандера', type: 'text', tab: 'expander', defaultValue: 'p', maxLength: 1 },
    { key: 'min_time_between_sets', label: 'Мин. время между подходами (сек)', type: 'number', tab: 'main', defaultValue: 10, min: 1, max: 120 },
    { key: 'max_time_between_sets', label: 'Макс. время между подходами (сек)', type: 'number', tab: 'main', defaultValue: 15, min: 1, max: 180 },
  ],
  construction: [
    { key: 'delay_between_presses', label: 'Задержка между нажатиями (мс)', type: 'number', tab: 'main', defaultValue: 120, min: 50, max: 5000 },
    { key: 'resolution_mode', label: 'Разрешение экрана', type: 'select', tab: 'main', defaultValue: 'FullHD', options: RESOLUTION_OPTIONS },
    { key: 'color_tolerance', label: 'Допуск цвета', type: 'number', tab: 'main', defaultValue: 10, min: 1, max: 50 },
    { key: 'auto_run', label: 'Автобег', type: 'boolean', tab: 'main', defaultValue: false, hint: 'Автоматически зажимает Shift + W' },
  ],
  port: [
    { key: 'auto_run', label: 'Автобег (Shift + W)', type: 'boolean', tab: 'main', defaultValue: false },
    { key: 'resolution_mode', label: 'Разрешение экрана', type: 'select', tab: 'main', defaultValue: 'FullHD', options: RESOLUTION_OPTIONS },
  ],
  mine: [
    { key: 'delay_between_presses', label: 'Задержка между нажатиями (мс)', type: 'number', tab: 'main', defaultValue: 120, min: 50, max: 5000 },
    { key: 'resolution_mode', label: 'Разрешение экрана', type: 'select', tab: 'main', defaultValue: 'FullHD', options: RESOLUTION_OPTIONS },
    { key: 'color_tolerance', label: 'Допуск цвета', type: 'number', tab: 'main', defaultValue: 10, min: 1, max: 50 },
  ],
  farm: [
    { key: 'delay_between_presses', label: 'Задержка между нажатиями (мс)', type: 'number', tab: 'main', defaultValue: 180, min: 50, max: 5000 },
    { key: 'resolution_mode', label: 'Разрешение экрана', type: 'select', tab: 'main', defaultValue: 'FullHD', options: RESOLUTION_OPTIONS },
    { key: 'color_tolerance', label: 'Допуск цвета', type: 'number', tab: 'main', defaultValue: 15, min: 1, max: 50 },
  ],
  turner: [
    { key: 'vertical_offset', label: 'Вертикальное смещение', type: 'number', tab: 'main', defaultValue: 50, min: 0, max: 200 },
    { key: 'horizontal_offset', label: 'Горизонтальное смещение', type: 'number', tab: 'main', defaultValue: 5, min: 0, max: 50 },
  ],
  seamstress: [
    { key: 'total_time_sec', label: 'Общее время (сек)', type: 'number', tab: 'main', defaultValue: 35, min: 10, max: 300 },
  ],
  'catch-pda': [
    { key: 'confidence', label: 'Порог совпадения изображения', type: 'number', tab: 'main', defaultValue: 0.7, min: 0.1, max: 1, hint: 'От 0.1 до 1.0' },
    { key: 'click_cooldown', label: 'Пауза между кликами (сек)', type: 'number', tab: 'main', defaultValue: 2.5, min: 0.1, max: 60 },
  ],
};

const TABS: TabItem[] = [
  { id: 'main',     label: 'Основные'     },
];

const GYM_TABS: TabItem[] = [
  { id: 'main', label: 'Основные' },
  { id: 'expander', label: 'Эспандер' },
];

export function BotSettingsModal({ isOpen, onClose, botId, firstLaunch = false, onConfirmAndStart }: Props) {
  const addToast  = useToast();
  const qc        = useQueryClient();
  const bots      = useBotStore((s) => s.bots);
  const bot       = bots.find((b) => b.id === botId);

  const [activeTab, setActiveTab] = useState<string>('main');
  const [cfg, setCfg] = useState<Record<string, unknown>>({});
  const [isRecipePickerOpen, setRecipePickerOpen] = useState(false);
  const [pinnedRecipes, setPinnedRecipes] = useState<string[]>(DEFAULT_PINNED_RECIPES);
  const [pickerTab, setPickerTab] = useState<'recipe' | 'sequence'>('recipe');
  const [recipeSearch, setRecipeSearch] = useState('');
  const recipeGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PINNED_RECIPES_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setPinnedRecipes(parsed.filter((name): name is string => typeof name === 'string'));
    } catch {
      // Keep the default pinned recipes when storage is unavailable or invalid.
    }
  }, []);

  const fields: FieldDef[] = BOT_FIELDS[bot?.slug ?? ''] ?? BOT_FIELDS['default'];

  // Fetch saved config
  const { data: configData, isLoading } = useQuery({
    queryKey: ['botConfig', botId],
    queryFn:  async () => {
      const local = await loadLocalBotConfig(botId!).catch(() => ({} as Record<string, unknown>));
      try {
        const remote = await getBotConfig(botId!);
        return { ...remote, config: { ...(remote.config ?? {}), ...local } };
      } catch {
        return { id: null, userId: '', botId: botId!, config: local, updatedAt: new Date().toISOString() };
      }
    },
    enabled:  isOpen && !!botId,
    staleTime: 30_000,
  });

  // Hydrate from the saved config. Keeping this in one effect prevents the
  // modal-open reset from overwriting values fetched moments earlier.
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('main');
    setRecipePickerOpen(false);
    const hydrated: Record<string, unknown> = {};
    fields.forEach((f) => { hydrated[f.key] = f.defaultValue; });
    Object.assign(hydrated, configData?.config ?? {});
    if (typeof hydrated.sequence === 'string') {
      hydrated.sequence = hydrated.sequence
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    setCfg(hydrated);
  // fields is derived from the selected bot and intentionally captured for this open cycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, botId, configData]);

  const mutation = useMutation({
    mutationFn: async () => {
      const nextConfig = { ...cfg };
      await saveLocalBotConfig(botId!, nextConfig);
      return updateBotConfig(botId!, nextConfig);
    },
    onSuccess: () => {
      markBotConfigConfirmed(botId!);
      addToast('Настройки сохранены', 'success');
      void qc.invalidateQueries({ queryKey: ['botConfig', botId] });
      onClose();
      onConfirmAndStart?.();
    },
    onError: () => {
      addToast('Не удалось сохранить настройки', 'error');
    },
  });

  if (!bot) return null;

  const visibleFields = fields.filter((f) => f.tab === activeTab);

  const setField = (key: string, val: unknown) =>
    setCfg((prev) => ({ ...prev, [key]: val }));

  const currentSequence = Array.isArray(cfg.sequence) ? cfg.sequence as string[] : [];
  const selectedRecipe = COOKING_RECIPES.find((recipe) =>
    JSON.stringify(recipe.sequence) === JSON.stringify(cfg.sequence),
  );
  const sequenceLabel = currentSequence
    .map((action) => SEQUENCE_ACTIONS.find((item) => item.value === action)?.label ?? action.replace(/^cell_(\d+)$/, 'Ячейка $1'))
    .join(' → ');
  const orderedRecipes = [...COOKING_RECIPES].sort((a, b) => {
    const aPinned = pinnedRecipes.includes(a.name) ? 0 : 1;
    const bPinned = pinnedRecipes.includes(b.name) ? 0 : 1;
    return aPinned - bPinned;
  });
  const filteredRecipes = orderedRecipes.filter((recipeItem) => {
    const query = recipeSearch.trim().toLocaleLowerCase();
    return !query || `${recipeItem.name} ${recipeItem.ingredients}`.toLocaleLowerCase().includes(query);
  });
  const togglePinnedRecipe = (name: string) => {
    setPinnedRecipes((current) => {
      const next = current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name];
      try {
        localStorage.setItem(PINNED_RECIPES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Pinning still works for the current session when storage is unavailable.
      }
      return next;
    });
  };

  useEffect(() => {
    const grid = recipeGridRef.current;
    if (!isRecipePickerOpen || !grid) return;

    let animationFrame = 0;
    let animationStart = 0;
    let animationFrom = grid.scrollTop;
    let animationTo = grid.scrollTop;

    const animateScroll = (time: number) => {
      if (!animationStart) animationStart = time;
      const progress = Math.min(1, (time - animationStart) / 260);
      const eased = 1 - Math.pow(1 - progress, 3);
      grid.scrollTop = animationFrom + (animationTo - animationFrom) * eased;
      if (progress < 1) animationFrame = requestAnimationFrame(animateScroll);
    };

    const handleWheel = (event: WheelEvent) => {
      if (grid.scrollHeight <= grid.clientHeight) return;
      event.preventDefault();
      const maxScroll = grid.scrollHeight - grid.clientHeight;
      animationFrom = grid.scrollTop;
      animationTo = Math.max(0, Math.min(maxScroll, animationTo + event.deltaY * 0.85));
      animationStart = 0;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(animateScroll);
    };

    grid.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      cancelAnimationFrame(animationFrame);
      grid.removeEventListener('wheel', handleWheel);
    };
  }, [isRecipePickerOpen]);

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={firstLaunch ? `Подтверждение настроек — ${bot.name}` : `Настройки — ${bot.name}`}
      description={firstLaunch ? 'Проверьте настройки первого запуска. После подтверждения бот будет запущен.' : undefined}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {firstLaunch ? 'Подтвердить и запустить' : 'Сохранить'}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="space-y-5">
          <Tabs tabs={bot.slug === 'gym' ? GYM_TABS : TABS} activeTab={activeTab} onChange={setActiveTab} />

          <div className="space-y-4 pt-1">
            {visibleFields.map((f) => {
              const val = cfg[f.key] ?? f.defaultValue;

              if (f.type === 'boolean') {
                return (
                  <Switch
                    key={f.key}
                    id={`setting-${f.key}`}
                    label={f.label}
                    description={f.hint}
                    checked={Boolean(val)}
                    onChange={(v) => setField(f.key, v)}
                  />
                );
              }

              if (f.type === 'number') {
                return (
                  <NumberInput
                    key={f.key}
                    id={`setting-${f.key}`}
                    label={f.label}
                    hint={f.hint}
                    value={val === '' ? '' : Number(val)}
                    min={f.min}
                    max={f.max}
                    onChange={(e) => setField(f.key, e.target.value === '' ? '' : Number(e.target.value))}
                  />
                );
              }

              if (f.type === 'select') {
                return (
                  <div key={f.key} className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-text-secondary">{f.label}</span>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label={f.label}>
                      {f.options?.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={val === option}
                          onClick={() => setField(f.key, option)}
                          className={[
                            'h-9 rounded-md border text-sm font-medium transition-colors outline-none',
                            'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
                            val === option
                              ? 'border-accent bg-accent text-white'
                              : 'border-[rgba(255,255,255,0.08)] bg-bg-primary text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                          ].join(' ')}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (bot.slug === 'cooking' && f.key === 'sequence') {
                return (
                  <div key={f.key} className="space-y-2">
                    <span className="text-sm font-medium text-text-secondary">Рецепт</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPickerTab('recipe');
                        setRecipeSearch('');
                        setRecipePickerOpen(true);
                      }}
                      className="recipe-picker-trigger"
                    >
                      <span className={selectedRecipe || sequenceLabel ? 'text-text-primary' : 'text-text-muted'}>
                        {selectedRecipe?.name ?? (sequenceLabel || 'Выбрать рецепт')}
                      </span>
                      <span className="text-xs text-text-muted">{selectedRecipe || sequenceLabel ? 'Изменить' : 'Открыть список'}</span>
                    </button>
                    {selectedRecipe && (
                      <p className="text-xs text-text-muted">
                        {selectedRecipe.ingredients} · {selectedRecipe.tool}
                      </p>
                    )}
                    {!selectedRecipe && sequenceLabel && (
                      <p className="recipe-sequence-preview">{sequenceLabel}</p>
                    )}
                  </div>
                );
              }

              return (
                <Input
                  key={f.key}
                  id={`setting-${f.key}`}
                  label={f.label}
                  hint={f.hint}
                  maxLength={f.maxLength}
                  value={Array.isArray(val) ? val.join(', ') : String(val)}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              );
            })}
          </div>
        </div>
      )}
    </Modal>

    <Modal
      isOpen={isRecipePickerOpen}
      onClose={() => setRecipePickerOpen(false)}
      title="Выберите рецепт"
      description="Последовательность ингредиентов и инструмента будет сохранена автоматически."
      size="lg"
      className="recipe-picker-modal"
      footer={pickerTab === 'sequence' ? (
        <Button
          variant="primary"
          size="sm"
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Сохранить последовательность
        </Button>
      ) : undefined}
    >
      <div className="picker-tabs" role="tablist" aria-label="Режим выбора">
        <button
          type="button"
          role="tab"
          aria-selected={pickerTab === 'recipe'}
          className={pickerTab === 'recipe' ? 'picker-tab picker-tab-active' : 'picker-tab'}
          onClick={() => setPickerTab('recipe')}
        >
          Рецепт
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pickerTab === 'sequence'}
          className={pickerTab === 'sequence' ? 'picker-tab picker-tab-active' : 'picker-tab'}
          onClick={() => setPickerTab('sequence')}
        >
          Последовательность
        </button>
      </div>

      {pickerTab === 'recipe' ? (
        <>
          <div className="recipe-search-wrap">
            <Search size={15} />
            <input
              value={recipeSearch}
              onChange={(event) => setRecipeSearch(event.target.value)}
              placeholder="Поиск рецепта или ингредиента"
              aria-label="Поиск рецепта"
            />
          </div>
          <div className="recipe-count">Доступно рецептов: {filteredRecipes.length}</div>
          <div ref={recipeGridRef} className="recipe-grid">
        {filteredRecipes.map((recipe) => (
          <div
            key={recipe.name}
            className={[
              'recipe-card',
              selectedRecipe?.name === recipe.name ? 'recipe-card-selected' : '',
            ].join(' ')}
            onClick={() => {
              setField('sequence', recipe.sequence);
              setRecipePickerOpen(false);
            }}
          >
            <div className="recipe-card-heading">
              <span className="recipe-card-name">{recipe.name}</span>
              <button
                type="button"
                className={pinnedRecipes.includes(recipe.name) ? 'recipe-pin recipe-pin-active' : 'recipe-pin'}
                aria-label={pinnedRecipes.includes(recipe.name) ? `Открепить ${recipe.name}` : `Закрепить ${recipe.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  togglePinnedRecipe(recipe.name);
                }}
              >
                <Pin size={14} strokeWidth={2} />
              </button>
            </div>
            <span className="recipe-card-ingredients">{recipe.ingredients}</span>
            <span className="recipe-card-tool">Инструмент: {recipe.tool || 'Без инструмента'}</span>
          </div>
        ))}
          </div>
        </>
      ) : (
        <div className="sequence-picker">
          <div className="sequence-picker-header">
            <span>Текущая последовательность</span>
            <button
              type="button"
              className="sequence-clear"
              onClick={() => setField('sequence', [])}
              disabled={currentSequence.length === 0}
            >
              Очистить
            </button>
          </div>
          <div className="sequence-chips">
            {currentSequence.length === 0 ? (
              <span className="sequence-empty">Последовательность пуста</span>
            ) : currentSequence.map((action, index) => (
              <span className="sequence-chip" key={`${action}-${index}`}>
                {SEQUENCE_ACTIONS.find((item) => item.value === action)?.label ?? action.replace(/^cell_(\d+)$/, 'Ячейка $1')}
                <button type="button" aria-label="Удалить действие" onClick={() => setField('sequence', currentSequence.filter((_, itemIndex) => itemIndex !== index))}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <span className="sequence-picker-label">Добавить действие</span>
          <div className="sequence-actions">
            {SEQUENCE_ACTIONS.map((action) => (
              <button key={action.value} type="button" onClick={() => setField('sequence', [...currentSequence, action.value])}>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
    </>
  );
}
