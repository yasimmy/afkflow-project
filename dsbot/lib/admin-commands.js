const {
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const { addWarning, getWarnings, removeLatestWarning } = require('./moderation');
const { reserveAssembly } = require('./news');

const adminRoleId = process.env.ADMIN_ROLE_ID || '1545360252088623125';
const teamLeadRoleId = process.env.TEAMLEAD_ROLE_ID || '1545360250838712402';
const newsChannelId = '1545360330383687760';
const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000;

function hasRole(interaction, roleId) {
  return interaction.member?.roles?.cache?.has(roleId);
}

function canModerate(interaction, target) {
  return target.id !== interaction.user.id
    && target.id !== interaction.client.user.id
    && target.roles.highest.position < interaction.member.roles.highest.position
    && target.roles.highest.position < interaction.guild.members.me.roles.highest.position;
}

function parseDuration(value, allowPermanent = false) {
  if (allowPermanent && value === '0') return 0;
  const match = /^(\d+)(s|m|h|d|w)$/i.exec(value);
  if (!match) return null;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  const duration = Number(match[1]) * units[match[2].toLowerCase()];
  return Number.isSafeInteger(duration) ? duration : null;
}

function getTarget(interaction) {
  return interaction.options.getMember('user');
}

function reason(interaction) {
  return interaction.options.getString('reason').trim();
}

function adminData(name, description) {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description);
}

function teamLeadOnly(interaction) {
  return hasRole(interaction, teamLeadRoleId);
}

async function reject(interaction, message) {
  await interaction.reply({ content: message, ephemeral: true });
}

async function executeBan(interaction) {
  if (!hasRole(interaction, adminRoleId)) return reject(interaction, 'Команда доступна только роли администратора.');
  const target = getTarget(interaction);
  const duration = parseDuration(interaction.options.getString('time'), true);
  if (!duration && duration !== 0) return reject(interaction, 'Время укажите в формате `10m`, `2h`, `7d` или `0` для перманентного бана.');
  if (!canModerate(interaction, target)) return reject(interaction, 'Нельзя применить бан к этому пользователю из-за иерархии ролей.');
  await target.ban({ reason: reason(interaction), deleteMessageSeconds: 86400 });
  if (duration > 0) setTimeout(() => interaction.guild.bans.remove(target.id, 'Срок временного бана истёк').catch(() => {}), duration);
  await interaction.reply(`Пользователь ${target} забанен${duration === 0 ? ' навсегда' : ` на ${formatDuration(duration)}`}.`);
}

async function executeKick(interaction) {
  if (!hasRole(interaction, adminRoleId)) return reject(interaction, 'Команда доступна только роли администратора.');
  const target = getTarget(interaction);
  if (!canModerate(interaction, target)) return reject(interaction, 'Нельзя кикнуть этого пользователя из-за иерархии ролей.');
  await target.kick(reason(interaction));
  await interaction.reply(`Пользователь ${target.user.tag} исключён с сервера.`);
}

async function executeTimeout(interaction) {
  if (!hasRole(interaction, adminRoleId)) return reject(interaction, 'Команда доступна только роли администратора.');
  const target = getTarget(interaction);
  const duration = parseDuration(interaction.options.getString('duration'));
  if (!duration || duration > maxTimeoutMs) return reject(interaction, 'Длительность укажите от `1s` до `28d`.');
  if (!canModerate(interaction, target)) return reject(interaction, 'Нельзя выдать таймаут этому пользователю из-за иерархии ролей.');
  await target.timeout(duration, reason(interaction));
  await interaction.reply(`Пользователь ${target} получил таймаут на ${formatDuration(duration)}.`);
}

async function executeWarn(interaction) {
  if (!hasRole(interaction, adminRoleId)) return reject(interaction, 'Команда доступна только роли администратора.');
  const target = getTarget(interaction);
  if (!canModerate(interaction, target)) return reject(interaction, 'Нельзя выдать варн этому пользователю из-за иерархии ролей.');
  const warnings = addWarning(target.id, interaction.user.id, reason(interaction));
  if (warnings.length >= 3) await target.timeout(24 * 60 * 60 * 1000, 'Третий активный варн');
  await interaction.reply(`Пользователь ${target} получил варн (${warnings.length}/3).${warnings.length >= 3 ? ' Выдан таймаут на 24 часа.' : ''}`);
}

async function executeUnwarn(interaction) {
  if (!hasRole(interaction, adminRoleId)) return reject(interaction, 'Команда доступна только роли администратора.');
  const target = getTarget(interaction);
  const removed = removeLatestWarning(target.id);
  if (!removed) return reject(interaction, 'У пользователя нет активных варнов.');
  await interaction.reply(`Последний варн пользователя ${target} снят. Причина: ${reason(interaction)}`);
}

async function executeWarnings(interaction) {
  if (!hasRole(interaction, adminRoleId)) return reject(interaction, 'Команда доступна только роли администратора.');
  const target = getTarget(interaction);
  const warnings = getWarnings(target.id);
  const description = warnings.length
    ? warnings.map((entry, index) => `${index + 1}. ${entry.reason} <t:${Math.floor(entry.createdAt / 1000)}:R>`).join('\n')
    : 'Активных варнов нет.';
  await interaction.reply({
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder().setAccentColor(0xf1c40f).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# Варны: ${target.user.tag}\n${description}`),
    )],
  });
}

async function executeClear(interaction) {
  if (!hasRole(interaction, adminRoleId)) return reject(interaction, 'Команда доступна только роли администратора.');
  const amount = interaction.options.getInteger('amount');
  const messages = await interaction.channel.bulkDelete(amount, true);
  await interaction.reply({ content: `Удалено сообщений: ${messages.size}.`, ephemeral: true });
}

async function executeSlowmode(interaction) {
  if (!teamLeadOnly(interaction)) return reject(interaction, 'Команда доступна только тимлиду.');
  const seconds = interaction.options.getInteger('seconds');
  await interaction.channel.setRateLimitPerUser(seconds, 'Настройка медленного режима тимлидом');
  await interaction.reply(`Медленный режим установлен: ${seconds} сек.`);
}

async function executeLock(interaction) {
  if (!hasRole(interaction, adminRoleId)) return reject(interaction, 'Команда доступна только роли администратора.');
  await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason: reason(interaction) });
  await interaction.reply(`Канал закрыт для сообщений. Причина: ${reason(interaction)}`);
}

async function executeUnlock(interaction) {
  if (!hasRole(interaction, adminRoleId)) return reject(interaction, 'Команда доступна только роли администратора.');
  await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }, { reason: 'Канал снова открыт администрацией' });
  await interaction.reply('Канал снова открыт для сообщений.');
}

async function executeMaintenance(interaction) {
  if (!teamLeadOnly(interaction)) return reject(interaction, 'Команда доступна только тимлиду.');
  const state = interaction.options.getString('state');
  const isOn = state === 'on';
  const channel = await interaction.client.channels.fetch(newsChannelId);
  const assembly = reserveAssembly(interaction.user.id, `maintenance-${state}`);
  const text = new TextDisplayBuilder().setContent([
    `@everyone, assembly v.${assembly}`,
    `# ${isOn ? 'Технические работы' : 'Технические работы завершены'}`,
    isOn
      ? 'На сервере начались технические работы. Возможны временные перебои в работе сервисов.'
      : 'Технические работы завершены. Сервер снова работает в штатном режиме.',
    '',
    '**AFKFlow • Состояние сервера**',
  ].join('\n'));
  await channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder().setAccentColor(isOn ? 0xe67e22 : 0x2ecc71).addTextDisplayComponents(text)],
    allowedMentions: { parse: ['everyone'] },
  });
  await interaction.reply({ content: `Режим технических работ: ${isOn ? 'включён' : 'выключен'}.`, ephemeral: true });
}

async function executeRestart(interaction) {
  if (!teamLeadOnly(interaction)) return reject(interaction, 'Команда доступна только тимлиду.');
  await interaction.reply('Перезапуск бота запущен.');
  setTimeout(() => process.exit(0), 1000);
}

function formatDuration(duration) {
  const units = [[604800000, 'нед.'], [86400000, 'дн.'], [3600000, 'ч.'], [60000, 'мин.'], [1000, 'сек.']];
  const unit = units.find(([milliseconds]) => duration >= milliseconds) || units.at(-1);
  return `${Math.round(duration / unit[0])} ${unit[1]}`;
}

const commandDefinitions = {
  ban: { data: adminData('ban', 'Заблокировать пользователя').addUserOption((o) => o.setName('user').setDescription('Пользователь').setRequired(true)).addStringOption((o) => o.setName('reason').setDescription('Причина').setRequired(true)).addStringOption((o) => o.setName('time').setDescription('10m, 2h, 7d или 0').setRequired(true)), execute: executeBan },
  kick: { data: adminData('kick', 'Исключить пользователя').addUserOption((o) => o.setName('user').setDescription('Пользователь').setRequired(true)).addStringOption((o) => o.setName('reason').setDescription('Причина').setRequired(true)), execute: executeKick },
  timeout: { data: adminData('timeout', 'Выдать таймаут').addUserOption((o) => o.setName('user').setDescription('Пользователь').setRequired(true)).addStringOption((o) => o.setName('duration').setDescription('10m, 2h или 1d').setRequired(true)).addStringOption((o) => o.setName('reason').setDescription('Причина').setRequired(true)), execute: executeTimeout },
  warn: { data: adminData('warn', 'Выдать предупреждение на неделю').addUserOption((o) => o.setName('user').setDescription('Пользователь').setRequired(true)).addStringOption((o) => o.setName('reason').setDescription('Причина').setRequired(true)), execute: executeWarn },
  unwarn: { data: adminData('unwarn', 'Снять последний варн').addUserOption((o) => o.setName('user').setDescription('Пользователь').setRequired(true)).addStringOption((o) => o.setName('reason').setDescription('Причина снятия').setRequired(true)), execute: executeUnwarn },
  warnings: { data: adminData('warnings', 'Показать активные варны').addUserOption((o) => o.setName('user').setDescription('Пользователь').setRequired(true)), execute: executeWarnings },
  clear: { data: adminData('clear', 'Удалить сообщения').addIntegerOption((o) => o.setName('amount').setDescription('От 1 до 100').setMinValue(1).setMaxValue(100).setRequired(true)), execute: executeClear },
  slowmode: { data: new SlashCommandBuilder().setName('slowmode').setDescription('Настроить медленный режим').addIntegerOption((o) => o.setName('seconds').setDescription('Секунды от 0 до 21600').setMinValue(0).setMaxValue(21600).setRequired(true)), execute: executeSlowmode },
  lock: { data: adminData('lock', 'Закрыть канал для сообщений').addStringOption((o) => o.setName('reason').setDescription('Причина').setRequired(true)), execute: executeLock },
  unlock: { data: adminData('unlock', 'Открыть канал для сообщений'), execute: executeUnlock },
  maintenance: { data: new SlashCommandBuilder().setName('maintenance').setDescription('Управление техническими работами').addStringOption((o) => o.setName('state').setDescription('Состояние').setRequired(true).addChoices({ name: 'Включить', value: 'on' }, { name: 'Выключить', value: 'off' })), execute: executeMaintenance },
  restartbot: { data: new SlashCommandBuilder().setName('restartbot').setDescription('Перезапустить бота'), execute: executeRestart },
};

module.exports = { commandDefinitions };
