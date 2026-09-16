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
const {
  createTranscript,
  getIdea,
  getRateLimitRemaining,
  markIdeaCreated,
  removeIdea,
  saveIdea,
  slugifyUsername,
} = require('../lib/ideas');

const teamLeadRoleId = process.env.TEAMLEAD_ROLE_ID || '1545360250838712402';
const categoryId = '1545360282694590567';
const logChannelId = '1545360395902910474';

const supportFields = [
  ['support_problem', 'Опишите проблему', 'Что произошло? Опишите подробно', 1000],
  ['support_product', 'Какой продукт затронут', 'Название бота, приложения или сервиса', 500],
  ['support_details', 'Дополнительная информация', 'Ссылки, ошибки и другие детали', 1000],
];

module.exports = {
  name: 'supp',

  async execute(message) {
    if (!message.member?.roles.cache.has(teamLeadRoleId)) return;

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [supportPanel()],
    });
  },

  async handleButton(interaction) {
    if (interaction.customId === 'supp:open') {
      await interaction.showModal(createSupportModal());
      return;
    }

    if (interaction.customId === 'supp:force-close') {
      await forceClose(interaction);
      return;
    }

    if (interaction.customId === 'supp:close') {
      if (!isTeamLead(interaction)) {
        await interaction.reply({ content: 'Закрыть тикет может только тимлид.', ephemeral: true });
        return;
      }

      await interaction.reply({
        content: 'Сначала выберите статус обращения:',
        components: [statusRow()],
        ephemeral: true,
      });
    }
  },

  async handleModal(interaction) {
    if (interaction.customId === 'supp:create') {
      await createTicket(interaction);
      return;
    }

    if (interaction.customId.startsWith('supp:close-result:')) {
      await submitCloseResult(interaction);
    }
  },

  async handleSelect(interaction) {
    if (interaction.customId !== 'supp:status') return;
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

function createSupportModal() {
  return new ModalBuilder()
    .setCustomId('supp:create')
    .setTitle('Обращение в поддержку')
    .addComponents(...supportFields.map(([id, label, placeholder, maxLength]) => new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setPlaceholder(placeholder)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(maxLength)
        .setRequired(id !== 'support_details'),
    )));
}

function createCloseModal(statusKey) {
  return new ModalBuilder()
    .setCustomId(`supp:close-result:${statusKey}`)
    .setTitle('Итоги обращения')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('close_result')
        .setLabel('Итоги рассмотрения')
        .setPlaceholder('Напишите ответ пользователю')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(2000)
        .setRequired(true),
    ));
}

async function createTicket(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const remaining = getRateLimitRemaining(interaction.user.id, 'support', 3);
  if (remaining > 0) {
    await interaction.editReply({ content: `Лимит поддержки исчерпан. Новое обращение можно создать через ${formatRemaining(remaining)}.` });
    return;
  }

  const guild = interaction.guild;
  const category = await guild.channels.fetch(categoryId);
  const channelName = `help-${slugifyUsername(interaction.user.username)}`.slice(0, 100);
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

  const values = Object.fromEntries(supportFields.map(([id]) => [id, interaction.fields.getTextInputValue(id) || 'Не указано.']));
  const text = [
    '# Обращение в поддержку',
    '',
    'Спасибо за обращение в службу поддержки AFKFlow. Мы внимательно ознакомимся с описанием проблемы и постараемся помочь.',
    '',
    '**Информация от пользователя:**',
    '',
    `> **Проблема:** ${values.support_problem}`,
    `> **Продукт:** ${values.support_product}`,
    `> **Дополнительные детали:** ${values.support_details}`,
    '',
    'Специалист рассмотрит обращение и предоставит ответ в этом тикете.',
    '',
    `Автор: ${interaction.user.tag}`,
  ].join('\n');

  await channel.send({
    content: `<@${interaction.user.id}> <@&${teamLeadRoleId}>`,
    allowedMentions: { users: [interaction.user.id], roles: [teamLeadRoleId] },
  });

  const sent = await channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [ticketPanel(text)],
  });

  saveIdea({ channelId: channel.id, authorId: interaction.user.id, messageId: sent.id, createdAt: new Date().toISOString(), type: 'support' });
  markIdeaCreated(interaction.user.id, 'support');
  await interaction.editReply({ content: `Ваше обращение создано: ${channel}.` });
}

async function submitCloseResult(interaction) {
  if (!isTeamLead(interaction)) {
    await interaction.reply({ content: 'Закрыть тикет может только тимлид.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = interaction.fields.getTextInputValue('close_result');
  const statusKey = interaction.customId.replace('supp:close-result:', '');
  const status = { rejected: 'Отклонено', reviewed: 'Рассмотрено', urgent: 'Требует немедленной реализации' }[statusKey];

  if (!status) {
    await interaction.editReply({ content: 'Неизвестный статус обращения.' });
    return;
  }

  await closeTicket(interaction, status, result);
}

async function closeTicket(interaction, status, result) {
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
  await interaction.editReply({ content: `Обращение закрывается. Статус: ${status}.` });
  await interaction.channel.delete(`Support ticket closed: ${status}`);
}

async function forceClose(interaction) {
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
  await interaction.editReply({ content: 'Обращение закрывается.' });
  await interaction.channel.delete('Support ticket force-closed by author');
}

function supportPanel() {
  const text = new TextDisplayBuilder().setContent([
    '# Нужна помощь?',
    '',
    'Если у вас возникли вопросы, трудности или проблемы при использовании наших продуктов, вы можете обратиться в службу поддержки, создав соответствующий запрос.',
    '',
    'Перед обращением в поддержку рекомендуем ознакомиться с разделом [FAQ](https://www.afkflow.xyz/#faq), где собраны ответы на наиболее часто задаваемые вопросы.',
    '',
    'Если ваш вопрос связан с конкретным ботом, рекомендуем также ознакомиться с информацией и документацией, размещённой на его странице.',
    '',
    '**Пожалуйста, предоставляйте максимально подробное описание проблемы — это позволит нам быстрее разобраться в ситуации и предоставить вам необходимую помощь.**',
  ].join('\n'));

  return new ContainerBuilder()
    .addTextDisplayComponents(text)
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('supp:open').setLabel('Обратиться в поддержку').setStyle(ButtonStyle.Secondary),
    ));
}

function ticketPanel(text) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('supp:close').setLabel('Закрыть').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('supp:force-close').setLabel('Принудительно закрыть').setStyle(ButtonStyle.Danger),
    ));
}

function statusRow() {
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
    .setCustomId('supp:status')
    .setPlaceholder('Выберите статус обращения')
    .addOptions(
      { label: 'Отклонено', value: 'rejected' },
      { label: 'Рассмотрено', value: 'reviewed' },
      { label: 'Требует немедленной реализации', value: 'urgent' },
    ));
}

function resultPanel(result) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Итоги обращения\n\n${result}`));
}

function formatRemaining(milliseconds) {
  const totalMinutes = Math.ceil(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} ч. ${minutes} мин.` : `${minutes} мин.`;
}
