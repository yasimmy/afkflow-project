const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  ModalBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { getIdea, getRateLimitRemaining, markIdeaCreated, saveIdea, slugifyUsername } = require('../lib/ideas');

const teamLeadRoleId = process.env.TEAMLEAD_ROLE_ID || '1545360250838712402';
const categoryId = '1545360278198161409';
const logChannelId = '1545360395902910474';

const ideaFields = [
  ['idea_summary', 'Суть вашей идеи', 'Кратко опишите предложение', 1000],
  ['idea_problem', 'Какую проблему это решает', 'Опишите проблему или задачу', 1000],
  ['idea_experience', 'Как это улучшит ваш опыт', 'Расскажите об ожидаемом результате', 1000],
  ['idea_extra', 'Дополнительные детали', 'Ссылки, примеры или комментарии', 1000],
];

module.exports = {
  name: 'ide',

  async execute(message) {
    if (!message.member?.roles.cache.has(teamLeadRoleId)) return;

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [ideaPanel()],
    });
  },

  async handleButton(interaction) {
    if (interaction.customId === 'ide:open') {
      await interaction.showModal(createIdeaModal());
      return;
    }

    if (interaction.customId === 'ide:force-close') {
      await forceClose(interaction);
      return;
    }

    if (interaction.customId === 'ide:close') {
      if (!isTeamLead(interaction)) {
        await interaction.reply({ content: 'Закрыть тикет может только тимлид.', ephemeral: true });
        return;
      }

      await interaction.reply({
        content: 'Сначала выберите статус предложения:',
        components: [statusRow()],
        ephemeral: true,
      });
    }
  },

  async handleModal(interaction) {
    if (interaction.customId === 'ide:create') {
      await createTicket(interaction);
      return;
    }

    if (interaction.customId.startsWith('ide:close-result:')) {
      await submitCloseResult(interaction);
    }
  },

  async handleSelect(interaction) {
    if (interaction.customId !== 'ide:status') return;
    if (!isTeamLead(interaction)) {
      await interaction.reply({ content: 'Изменять статус может только тимлид.', ephemeral: true });
      return;
    }

    await interaction.showModal(createCloseModal(interaction.values[0]));
  },
};

function isTeamLead(interaction) {
  return interaction.member?.roles.cache.has(teamLeadRoleId);
}

function createIdeaModal() {
  return new ModalBuilder()
    .setCustomId('ide:create')
    .setTitle('Предложение AFKFlow')
    .addComponents(...ideaFields.map(([id, label, placeholder, maxLength]) => new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setPlaceholder(placeholder)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(maxLength)
        .setRequired(id !== 'idea_extra'),
    )));
}

function createCloseModal(statusKey) {
  return new ModalBuilder()
    .setCustomId(`ide:close-result:${statusKey}`)
    .setTitle('Итоги рассмотрения')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('close_result')
        .setLabel('Итоги рассмотрения')
        .setPlaceholder('Напишите ответ автору предложения')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(true),
    ));
}

async function createTicket(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const rateLimitRemaining = getRateLimitRemaining(interaction.user.id, 'idea', 1);
  if (rateLimitRemaining > 0) {
    await interaction.editReply({ content: `Новый тикет можно создать через ${formatRemaining(rateLimitRemaining)}.` });
    return;
  }

  const category = await guild.channels.fetch(categoryId);
  const channelName = `idea-${slugifyUsername(interaction.user.username)}`.slice(0, 100);
  const existing = category.children.cache.find((channel) => channel.name === channelName && channel.type === 0);

  if (existing) {
    await interaction.editReply({ content: `У вас уже есть открытый тикет: ${existing}.` });
    return;
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: 0,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: teamLeadRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
    ],
  });

  const values = Object.fromEntries(ideaFields.map(([id]) => [id, interaction.fields.getTextInputValue(id) || 'Не указано.']));
  const ticketText = [
      '# Новое предложение',
      '',
      'Спасибо, что решили поделиться своей идеей с нами! Мы внимательно ознакомимся с вашим предложением и оценим возможность его реализации.',
      '',
      '**Предложение от пользователя:**',
      '',
      `> **Суть:** ${values.idea_summary}`,
      `> **Какую проблему решает:** ${values.idea_problem}`,
      `> **Как улучшит опыт:** ${values.idea_experience}`,
      `> **Дополнительные детали:** ${values.idea_extra}`,
      '',
      'Мы обязательно рассмотрим ваше предложение и предоставим ответ в этом тикете.',
      '',
      '**Спасибо за помощь в развитии проекта!**',
      '',
      `Автор: ${interaction.user.tag}`,
    ].join('\n');

  await channel.send({
    content: `<@${interaction.user.id}> <@&${teamLeadRoleId}>`,
    allowedMentions: { users: [interaction.user.id], roles: [teamLeadRoleId] },
  });

  const sent = await channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [ticketPanel(ticketText)],
  });

  saveIdea({ channelId: channel.id, authorId: interaction.user.id, messageId: sent.id, createdAt: new Date().toISOString() });
  markIdeaCreated(interaction.user.id, 'idea');
  await interaction.editReply({ content: `Ваш тикет создан: ${channel}.` });
}

function formatRemaining(milliseconds) {
  const totalMinutes = Math.ceil(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours} ч. ${minutes} мин.`;
  return `${minutes} мин.`;
}

async function submitCloseResult(interaction) {
  if (!isTeamLead(interaction)) {
    await interaction.reply({ content: 'Закрыть тикет может только тимлид.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = interaction.fields.getTextInputValue('close_result');
  const statusKey = interaction.customId.replace('ide:close-result:', '');
  const status = {
    rejected: 'Отклонено',
    reviewed: 'Рассмотрено',
    urgent: 'Требует немедленной реализации',
  }[statusKey];

  if (!status) {
    await interaction.reply({ content: 'Неизвестный статус предложения.', ephemeral: true });
    return;
  }

  await closeTicket(interaction, status, result);
}

async function closeTicket(interaction, status, result) {
  const { createTranscript, removeIdea } = require('../lib/ideas');
  const idea = getIdea(interaction.channel.id);
  if (!idea) {
    await interaction.editReply({ content: 'Данные тикета не найдены.' });
    return;
  }

  const transcript = await createTranscript(interaction.channel);
  const logChannel = await interaction.client.channels.fetch(logChannelId);
  await logChannel.send({
    content: `Тикет ${interaction.channel.name} закрыт тимлидом ${interaction.user}. Статус: **${status}**. Автор: <@${idea.authorId}>.\n\nИтоги: ${result}`,
    files: [transcript],
  });

  try {
    const author = await interaction.client.users.fetch(idea.authorId);
    await author.send({
      flags: MessageFlags.IsComponentsV2,
      components: [resultPanel(`**Статус:** ${status}\n\n${result}`)],
    });
  } catch (error) {
    console.warn(`Не удалось отправить итоги автору ${idea.authorId} в личные сообщения:`, error.message);
  }

  removeIdea(interaction.channel.id);
  await interaction.editReply({ content: `Тикет закрывается. Статус: ${status}.` });
  await interaction.channel.delete(`Idea ticket closed: ${status}`);
}

async function forceClose(interaction) {
  const { createTranscript, getIdea, removeIdea } = require('../lib/ideas');
  const idea = getIdea(interaction.channel.id);
  if (!idea || idea.authorId !== interaction.user.id) {
    await interaction.reply({ content: 'Принудительно закрыть тикет может только его автор.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const transcript = await createTranscript(interaction.channel);
  const logChannel = await interaction.client.channels.fetch(logChannelId);
  await logChannel.send({ content: `Тикет ${interaction.channel.name} принудительно закрыт автором ${interaction.user}.`, files: [transcript] });
  removeIdea(interaction.channel.id);
  await interaction.editReply({ content: 'Тикет закрывается.' });
  await interaction.channel.delete('Idea ticket force-closed by author');
}

function ideaPanel() {
  const text = new TextDisplayBuilder().setContent([
      '# Предложения и идеи',
      '',
      'У вас есть идея, как сделать наш проект ещё лучше? Будь то новый бот, улучшение уже существующего функционала или любое другое предложение — мы всегда готовы выслушать ваше мнение!',
      '',
      'Нажмите кнопку ниже, чтобы поделиться своей идеей или предложением. Мы обязательно рассмотрим каждую заявку и будем рады вашим интересным задумкам.',
      '',
      '**AFKFlow • Ваше мнение помогает нам развиваться**',
    ].join('\n'));

  const buttonRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
      .setCustomId('ide:open')
      .setLabel('Предложить')
      .setStyle(ButtonStyle.Secondary));

  return new ContainerBuilder()
    .addTextDisplayComponents(text)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(buttonRow);
}

function ticketControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ide:close').setLabel('Закрыть').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ide:force-close').setLabel('Принудительно закрыть').setStyle(ButtonStyle.Danger),
  );
}

function statusRow() {
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
    .setCustomId('ide:status')
    .setPlaceholder('Выберите статус закрытия')
    .addOptions(
      { label: 'Отклонено', value: 'rejected' },
      { label: 'Рассмотрено', value: 'reviewed' },
      { label: 'Требует немедленной реализации', value: 'urgent' },
    ));
}

function ticketPanel(text) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(ticketControls());
}

function resultPanel(result) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Итоги рассмотрения\n\n${result}`));
}