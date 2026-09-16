const crypto = require('node:crypto');
const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const { saveReport } = require('../lib/beta-reports');

const betaChannelId = '1545398951417749674';
const teamLeadRoleId = '1545360250838712402';
const betaTesterRoleId = '1545360253519142942';

module.exports = {
  name: 'beta',

  data: new SlashCommandBuilder()
    .setName('beta')
    .setDescription('Отправить отчёт бета-тестирования')
    .addStringOption((option) => option.setName('product').setDescription('Какой бот или продукт тестировался').setRequired(true))
    .addStringOption((option) => option.setName('summary').setDescription('Кратко опишите проблему или результат тестирования').setRequired(true))
    .addStringOption((option) => option.setName('type').setDescription('Тип отчёта').setRequired(true).addChoices(
      { name: 'Баг', value: 'Баг' },
      { name: 'Предложение', value: 'Предложение' },
      { name: 'UI/UX', value: 'UI/UX' },
      { name: 'Производительность', value: 'Производительность' },
    ))
    .addStringOption((option) => option.setName('version').setDescription('Версия или сборка продукта'))
    .addStringOption((option) => option.setName('device').setDescription('Устройство и операционная система'))
    .addStringOption((option) => option.setName('steps').setDescription('Шаги для воспроизведения проблемы'))
    .addStringOption((option) => option.setName('expected').setDescription('Как должно работать'))
    .addStringOption((option) => option.setName('actual').setDescription('Что произошло фактически'))
    .addStringOption((option) => option.setName('extra').setDescription('Дополнительные детали, ссылки и комментарии')),

  async execute(interaction) {
    if (!hasBetaAccess(interaction)) {
      await interaction.reply({ content: 'Команда доступна только тимлидам и бета-тестировщикам.', ephemeral: true });
      return;
    }

    const report = {
      id: createTestId(),
      testerId: interaction.user.id,
      testerTag: interaction.user.tag,
      product: interaction.options.getString('product'),
      version: interaction.options.getString('version'),
      device: interaction.options.getString('device'),
      summary: interaction.options.getString('summary'),
      type: interaction.options.getString('type'),
      steps: interaction.options.getString('steps'),
      expected: interaction.options.getString('expected'),
      actual: interaction.options.getString('actual'),
      extra: interaction.options.getString('extra'),
    };
    const channel = await interaction.client.channels.fetch(betaChannelId);
    await channel.send({
      content: `<@&${teamLeadRoleId}>`,
      allowedMentions: { roles: [teamLeadRoleId] },
    });
    const reportMessage = await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [reportPanel(interaction.user, report)],
    });
    report.messageId = reportMessage.id;
    saveReport(report);

    await interaction.reply({ content: 'Отчёт бета-тестирования отправлен.', ephemeral: true });
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('beta:answer:') || !interaction.member.roles.cache.has(teamLeadRoleId)) {
      await interaction.reply({ content: 'Ответить на отчёт может только тимлид.', ephemeral: true });
      return;
    }

    await interaction.showModal(answerModal(interaction.customId.replace('beta:answer:', '')));
  },

  async handleModal(interaction) {
    if (!interaction.customId.startsWith('beta:answer:')) return;
    if (!interaction.member.roles.cache.has(teamLeadRoleId)) {
      await interaction.reply({ content: 'Ответить на отчёт может только тимлид.', ephemeral: true });
      return;
    }

    const reportId = interaction.customId.replace('beta:answer:', '');
    const report = require('../lib/beta-reports').getReport(reportId);
    if (!report) {
      await interaction.reply({ content: 'Отчёт с таким ID не найден.', ephemeral: true });
      return;
    }

    const response = interaction.fields.getTextInputValue('beta_response');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const responseData = { authorTag: interaction.user.tag, text: response };
    require('../lib/beta-reports').saveResponse(reportId, responseData);

    const responsePanel = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent([
        '# Ответ по бета-тестированию',
        `**ID теста:** \`${report.id}\``,
        `**Тип:** ${report.type}`,
        '',
        response,
        '',
        '**AFKFlow • Спасибо за участие в тестировании**',
      ].join('\n')));

    try {
      const tester = await interaction.client.users.fetch(report.testerId);
      await tester.send({ flags: MessageFlags.IsComponentsV2, components: [responsePanel] });
    } catch (error) {
      console.warn(`Не удалось отправить ответ тестеру ${report.testerId}:`, error.message);
    }

    const logChannel = await interaction.client.channels.fetch('1545360400072179783');
    await logChannel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [responsePanel],
    });

    try {
      const reportChannel = await interaction.client.channels.fetch(betaChannelId);
      const reportMessage = await reportChannel.messages.fetch(report.messageId);
      await reportMessage.edit({
        components: [reportPanel(`<@${report.testerId}>`, report, true)],
      });
    } catch (error) {
      console.warn(`Не удалось обновить кнопку отчёта ${report.id}:`, error.message);
    }

    await interaction.editReply({ content: `Ответ по отчёту ${report.id} отправлен тестеру и в логи.` });
  },
};

function hasBetaAccess(interaction) {
  return interaction.member.roles.cache.has(teamLeadRoleId)
    || interaction.member.roles.cache.has(betaTesterRoleId);
}

function createTestId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const values = [...crypto.randomBytes(12)].map((byte) => alphabet[byte % alphabet.length]);
  return [values.slice(0, 3), values.slice(3, 6), values.slice(6, 9), values.slice(9, 12)]
    .map((part) => part.join(''))
    .join('-');
}

function reportPanel(user, report, answered = false) {
  const metadata = [
    `**ID теста:** \`${report.id}\``,
    `**Тестер:** ${user}`,
    `**Продукт:** ${report.product}`,
    `**Тип отчёта:** ${report.type}`,
    report.version ? `**Версия / сборка:** ${report.version}` : null,
    report.device ? `**Устройство:** ${report.device}` : null,
  ].filter(Boolean).join('\n');

  const results = [
    '## Результаты тестирования',
    `**Суть:** ${report.summary}`,
    report.steps ? `**Шаги:** ${report.steps}` : null,
    report.expected ? `**Ожидалось:** ${report.expected}` : null,
    report.actual ? `**Получено:** ${report.actual}` : null,
    report.extra ? `**Дополнительно:** ${report.extra}` : null,
  ].filter(Boolean).join('\n');

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Отчёт бета-тестирования'))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(metadata))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(results))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('**AFKFlow • Спасибо за помощь в тестировании проекта**'))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`beta:answer:${report.id}`)
        .setLabel(answered ? 'Ответ дан' : 'Дать ответ')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(answered),
    ));
}

function answerModal(reportId) {
  return new (require('discord.js').ModalBuilder)()
    .setCustomId(`beta:answer:${reportId}`)
    .setTitle('Ответ бета-тестировщику')
    .addComponents(new (require('discord.js').ActionRowBuilder)().addComponents(
      new (require('discord.js').TextInputBuilder)()
        .setCustomId('beta_response')
        .setLabel('Ответ по отчёту')
        .setPlaceholder('Напишите решение, статус или комментарий')
        .setStyle(require('discord.js').TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(true),
    ));
}
