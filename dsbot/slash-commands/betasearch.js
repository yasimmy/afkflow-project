const { ContainerBuilder, MessageFlags, SlashCommandBuilder, TextDisplayBuilder } = require('discord.js');
const { getReport } = require('../lib/beta-reports');

const teamLeadRoleId = '1545360250838712402';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('betasearch')
    .setDescription('Найти отчёт бета-тестирования по ID')
    .addStringOption((option) => option.setName('id').setDescription('ID отчёта формата ABC-123-XYZ-789').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(teamLeadRoleId)) {
      await interaction.reply({ content: 'Поиск отчётов доступен только тимлиду.', ephemeral: true });
      return;
    }

    const reportId = interaction.options.getString('id').toUpperCase();
    const report = getReport(reportId);
    if (!report) {
      await interaction.reply({ content: `Отчёт ${reportId} не найден.`, ephemeral: true });
      return;
    }

    const response = report.response
      ? `\n## Ответ тимлида\n**${report.response.authorTag}:** ${report.response.text}`
      : '\n## Ответ тимлида\nОтвет ещё не предоставлен.';
    const text = [
      '# Найденный отчёт',
      `**ID:** \`${report.id}\``,
      `**Тестер:** <@${report.testerId}>`,
      `**Тип:** ${report.type}`,
      `**Продукт:** ${report.product}`,
      report.version ? `**Версия:** ${report.version}` : null,
      report.device ? `**Устройство:** ${report.device}` : null,
      '',
      '## Результаты',
      `**Суть:** ${report.summary}`,
      report.steps ? `**Шаги:** ${report.steps}` : null,
      report.expected ? `**Ожидалось:** ${report.expected}` : null,
      report.actual ? `**Получено:** ${report.actual}` : null,
      report.extra ? `**Дополнительно:** ${report.extra}` : null,
      response,
    ].filter(Boolean).join('\n');

    await interaction.reply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text))],
    });
  },
};
