require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  Collection,
  ActivityType,
  GatewayIntentBits,
  REST,
  Routes,
} = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const prefix = process.env.PREFIX || '.';
const configuredGuildId = process.env.GUILD_ID;
const statusText = (process.env.STATUS_TEXT || 'Лучшие боты на AfkFlow.xyz').replace(/\\n/g, '\n');

if (!token) {
  console.error('Не найден DISCORD_TOKEN. Создайте файл .env на основе .env.example.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
client.slashCommands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));

  if (!command.name || typeof command.execute !== 'function') {
    console.warn(`Команда ${file} пропущена: нужны name и execute.`);
    continue;
  }

  client.commands.set(command.name, command);
}

const slashCommandsPath = path.join(__dirname, 'slash-commands');
const slashCommandFiles = fs.readdirSync(slashCommandsPath).filter((file) => file.endsWith('.js'));

for (const file of slashCommandFiles) {
  const command = require(path.join(slashCommandsPath, file));

  if (!command.data || typeof command.execute !== 'function') {
    console.warn(`Slash-команда ${file} пропущена: нужны data и execute.`);
    continue;
  }

  client.slashCommands.set(command.data.name, command);
}

async function registerSlashCommands(targetGuildId) {
  const rest = new REST({ version: '10' }).setToken(token);
  const commandData = [...client.slashCommands.values()].map((command) => command.data.toJSON());
  const registeredCommands = await rest.put(
    Routes.applicationGuildCommands(client.user.id, targetGuildId),
    { body: commandData },
  );

  console.log(`Slash-команд зарегистрировано: ${registeredCommands.length}.`);
}

client.once('clientReady', async (readyClient) => {
  readyClient.user.setPresence({
    status: 'online',
    activities: [
      {
        name: statusText,
        type: ActivityType.Streaming,
        url: 'https://www.twitch.tv/afkflow',
      },
    ],
  });

  console.log(`Бот ${readyClient.user.tag} запущен. Команд загружено: ${client.commands.size}.`);

  try {
    const targetGuildId = configuredGuildId || readyClient.guilds.cache.first()?.id;
    if (!targetGuildId) throw new Error('Бот не состоит ни в одном сервере.');
    await registerSlashCommands(targetGuildId);
  } catch (error) {
    console.error('Не удалось зарегистрировать slash-команды или их права:', error);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  const command = client.commands.get(commandName);

  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Ошибка при выполнении команды ${commandName}:`, error);

    if (!message.replied && !message.deferred) {
      await message.reply('Произошла ошибка при выполнении команды. Попробуйте ещё раз позже.');
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      const commandName = interaction.customId.startsWith('supp:')
        ? 'supp'
        : interaction.customId.startsWith('beta:') ? 'beta' : 'ide';
      if (interaction.customId.startsWith('ide:') || interaction.customId.startsWith('supp:') || interaction.customId.startsWith('beta:')) {
        const command = client.commands.get(commandName) || client.slashCommands.get(commandName);
        if (command?.handleButton) await command.handleButton(interaction);
      } else {
        const command = client.slashCommands.get('gnewstest');
        if (command?.handleButton) await command.handleButton(interaction);
      }
      return;
    }

    if (interaction.isModalSubmit() && (interaction.customId.startsWith('ide:') || interaction.customId.startsWith('supp:') || interaction.customId.startsWith('beta:'))) {
      const commandName = interaction.customId.startsWith('supp:')
        ? 'supp'
        : interaction.customId.startsWith('beta:') ? 'beta' : 'ide';
      const command = client.commands.get(commandName) || client.slashCommands.get(commandName);
      if (command?.handleModal) await command.handleModal(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && (interaction.customId.startsWith('ide:') || interaction.customId.startsWith('supp:'))) {
      const commandName = interaction.customId.startsWith('supp:') ? 'supp' : 'ide';
      const command = client.commands.get(commandName);
      if (command?.handleSelect) await command.handleSelect(interaction);
    }
  } catch (error) {
    console.error('Ошибка при обработке Discord interaction:', error);

    try {
      const reply = { content: 'Не удалось обработать действие. Проверьте логи бота.', ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.followUp(reply);
      else if (interaction.isRepliable()) await interaction.reply(reply);
    } catch (replyError) {
      console.error('Не удалось отправить сообщение об ошибке interaction:', replyError.message);
    }
  }
});

client.login(token);