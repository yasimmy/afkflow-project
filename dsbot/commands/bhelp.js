const {
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require('discord.js');

const teamLeadRoleId = process.env.TEAMLEAD_ROLE_ID || '1545360250838712402';
const betaChannelId = '1545398951417749674';
const numberEmojiIds = {
  one: '1545373741293244456',
  two: '1545374090318315590',
  three: '1545373857303625810',
  four: '1545373821291339854',
  five: '1545374157926178876',
};

module.exports = {
  name: 'bhelp',

  async execute(message) {
    const roleIds = new Set(message.member?.roles.cache.keys() || []);
    if (!roleIds.has(teamLeadRoleId)) return;

    const number = (key, fallback) => message.guild?.emojis.cache.get(numberEmojiIds[key])?.toString() || fallback;
    const one = number('one', '1.');
    const two = number('two', '2.');
    const three = number('three', '3.');
    const four = number('four', '4.');
    const five = number('five', '5.');

    const text = new TextDisplayBuilder().setContent([
      '# Помощь бета-тестировщика',
      'Используйте slash-команду `/beta`, чтобы отправить отчёт о тестировании.',
      '',
      '## Обязательные поля',
      '**product** — название бота или продукта.',
      '**summary** — краткая суть проблемы или результат тестирования.',
      '**type** — тип отчёта: баг, предложение, UI/UX или производительность.',
      '',
      '## Дополнительные поля',
      '**version** — версия или номер сборки.',
      '**device** — устройство и операционная система.',
      '**steps** — шаги для воспроизведения проблемы.',
      '**expected** — ожидаемое поведение.',
      '**actual** — фактический результат.',
      '**extra** — ссылки, скриншоты и дополнительные детали.',
      '',
      '## Правила хорошего отчёта',
      `${one} Описывайте одну проблему в одном отчёте.`,
      `${two} Пишите конкретно: что произошло, где и при каких условиях.`,
      `${three} Добавляйте точные шаги воспроизведения и ожидаемый результат.`,
      `${four} Не используйте общие формулировки вроде «не работает» без деталей.`,
      `${five} Не отправляйте дубликаты одного и того же отчёта.`,
      '',
      '## Скриншоты и видео',
      'Прикрепляйте скриншот или видео прямо к сообщению после отправки отчёта. Для больших файлов используйте ссылку с доступом на просмотр.',
      '',
      '## Перед отправкой проверьте',
      `${one} Правильно ли выбран продукт и тип отчёта.`,
      `${two} Можно ли повторить проблему по вашим шагам.`,
      `${three} Указаны ли версия, устройство и фактический результат.`,
      `${four} Есть ли скриншот, видео или ссылка, если они нужны для проверки.`,
      '',
      '## Пример',
      '`/beta product: Bot GYM summary: Не работает кнопка входа version: v0.0.1 device: PC`',
      '',
      '## Поиск отчёта',
      'Тимлид может найти отчёт по ID командой `/betasearch id: ABC-123-XYZ-789`.',
      '',
      `Отчёт будет отправлен в канал <#${betaChannelId}>. Каждому тесту автоматически присваивается уникальный ID формата ABC-123-XYZ-789.`,
      '',
      '**Чем подробнее отчёт, тем быстрее мы найдём и исправим проблему.**',
    ].join('\n'));

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder()
          .addTextDisplayComponents(text)
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('AFKFlow • Команда бета-тестирования')),
      ],
    });
  },
};
