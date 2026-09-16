const {
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require('discord.js');

const teamLeadRoleId = process.env.TEAMLEAD_ROLE_ID || '1545360250838712402';
const adminRoleId = process.env.ADMIN_ROLE_ID || '1545360252088623125';
const betaTesterRoleId = '1545360253519142942';

module.exports = {
  name: 'help',

  async execute(message) {
    const roleIds = new Set(message.member?.roles.cache.keys() || []);
    const isTeamLead = roleIds.has(teamLeadRoleId);
    const isAdmin = roleIds.has(adminRoleId);
    const isBetaTester = roleIds.has(betaTesterRoleId);
    const sections = [
      '## Основные команды',
      '`.help` — открыть список доступных команд.',
    ];

    if (isTeamLead) {
      sections.push(
        '',
        '## Команды тимлида',
        '`.wlc` — отправить приветственную панель сообщества.',
        '`.creators` — отправить панель для сотрудничества с авторами.',
        '`.ide` — опубликовать панель предложений и идей.',
        '`.supp` — опубликовать панель службы поддержки.',
        '`/gnews` — опубликовать обновление в новостном канале.',
        '`/gnewstest` — отправить предпросмотр обновления.',
        '`.bhelp` — открыть инструкцию по заполнению `/beta`.',
      );
    }

    if (isAdmin) {
      sections.push(
        '',
        '## Модерация',
        '`/ban`, `/kick`, `/timeout`, `/warn`, `/unwarn`, `/warnings` — управление нарушениями.',
        '`/clear`, `/lock`, `/unlock` — управление сообщениями и каналом.',
      );
    }

    if (isBetaTester || isTeamLead) {
      sections.push(
        '',
        '## Бета-тестирование',
        '`/beta` — отправить отчёт о тестировании продукта.',
      );
    }

    if (!isTeamLead && !isBetaTester) {
      sections.push('', 'Для доступа к закрытым командам обратитесь к администрации сервера.');
    }

    sections.push('', '**AFKFlow • Используйте команды с пользой**');

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent([
            '# Помощь AFKFlow',
            'Список команд, доступных вам на сервере.',
            '',
            ...sections,
          ].join('\n')))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('`Префикс: .`  |  Slash-команды начинаются с `/`')),
      ],
    });
  },
};
