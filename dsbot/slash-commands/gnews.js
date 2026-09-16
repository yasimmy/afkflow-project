const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { createNewsComponents, normalizeText, reserveAssembly } = require('../lib/news');

const newsChannelId = '1545360330383687760';
const teamLeadRoleId = process.env.TEAMLEAD_ROLE_ID || '1545360250838712402';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gnews')
    .setDescription('Опубликовать обновление в новостном канале')
    .addStringOption((option) => option.setName('topic').setDescription('Тема обновления').setRequired(true))
    .addStringOption((option) => option.setName('title').setDescription('Заголовок сообщения').setRequired(true))
    .addStringOption((option) => option.setName('text').setDescription('Текст; используйте \\n для переноса строки').setRequired(true))
    .addStringOption((option) => option.setName('color').setDescription('Цвет HEX, например #5865F2'))
    .addStringOption((option) => option.setName('image').setDescription('Ссылка на изображение'))
    .addStringOption((option) => option.setName('footer').setDescription('Подпись внизу сообщения')),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(teamLeadRoleId)) {
      await interaction.reply({ content: 'Команда доступна только тимлиду.', ephemeral: true });
      return;
    }

    const options = readOptions(interaction);
    const channel = await interaction.client.channels.fetch(newsChannelId);
    const assembly = reserveAssembly(interaction.user.id, options.topic);
    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [createNewsComponents(options, `@everyone, assembly v.${assembly}`)],
      allowedMentions: { parse: ['everyone'] },
    });

    await interaction.reply({ content: `Обновление опубликовано: assembly v.${assembly}.`, ephemeral: true });
  },
};

function readOptions(interaction) {
  const color = interaction.options.getString('color');
  return {
    topic: interaction.options.getString('topic'),
    title: interaction.options.getString('title'),
    description: normalizeText(interaction.options.getString('text')),
    color: color ? parseColor(color) : undefined,
    image: interaction.options.getString('image'),
    footer: interaction.options.getString('footer') || 'AFKFlow • Официальные обновления',
  };
}

function parseColor(value) {
  const normalized = value.replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return 0x5865f2;
  return Number.parseInt(normalized, 16);
}