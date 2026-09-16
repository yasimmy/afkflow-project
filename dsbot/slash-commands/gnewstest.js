const crypto = require('node:crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { createNewsComponents, getDraft, markDraftPublished, normalizeText, reserveAssembly, saveDraft } = require('../lib/news');

const newsChannelId = '1545360330383687760';
const testChannelId = '1545360385727799376';
const teamLeadRoleId = process.env.TEAMLEAD_ROLE_ID || '1545360250838712402';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gnewstest')
    .setDescription('Предпросмотр обновления перед публикацией')
    .addStringOption((option) => option.setName('topic').setDescription('Тема обновления').setRequired(true))
    .addStringOption((option) => option.setName('title').setDescription('Заголовок сообщения').setRequired(true))
    .addStringOption((option) => option.setName('text').setDescription('Текст; используйте \\n для переноса строки').setRequired(true))
    .addStringOption((option) => option.setName('color').setDescription('Цвет HEX, например #5865F2'))
    .addStringOption((option) => option.setName('image').setDescription('Ссылка на изображение'))
    .addStringOption((option) => option.setName('footer').setDescription('Подпись внизу сообщения')),

  async execute(interaction) {
    const draft = {
      id: crypto.randomUUID(),
      authorId: interaction.user.id,
      topic: interaction.options.getString('topic'),
      title: interaction.options.getString('title'),
      description: normalizeText(interaction.options.getString('text')),
      color: parseColor(interaction.options.getString('color')),
      image: interaction.options.getString('image'),
      footer: interaction.options.getString('footer') || 'AFKFlow • Официальные обновления',
    };
    saveDraft(draft);

    const channel = await interaction.client.channels.fetch(testChannelId);
    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [createNewsComponents(draft), publishRow(draft.id)],
    });
    await interaction.reply({ content: 'Предпросмотр отправлен в тестовый канал.', ephemeral: true });
  },

  async handleButton(interaction) {
    if (!interaction.member.roles.cache.has(teamLeadRoleId)) {
      await interaction.reply({ content: 'Публикация доступна только тимлиду.', ephemeral: true });
      return;
    }

    const draftId = interaction.customId.replace('news_publish:', '');
    const draft = getDraft(draftId);
    if (!draft) {
      await interaction.reply({ content: 'Черновик не найден или уже удалён.', ephemeral: true });
      return;
    }

    const newsChannel = await interaction.client.channels.fetch(newsChannelId);
    const assembly = reserveAssembly(interaction.user.id, draft.topic);
    await newsChannel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [createNewsComponents(draft, `@everyone, assembly v.${assembly}`)],
      allowedMentions: { parse: ['everyone'] },
    });
    markDraftPublished(draftId, assembly);

    await interaction.update({
      content: `Опубликовано: assembly v.${assembly}`,
      components: [publishRow(draftId, true)],
    });
  },
};

function publishRow(draftId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`news_publish:${draftId}`)
      .setLabel('Опубликовать')
      .setEmoji({ id: '1545373693562327141', name: 'dot' })
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}

function parseColor(value) {
  const normalized = (value || '').replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return 0x5865f2;
  return Number.parseInt(normalized, 16);
}