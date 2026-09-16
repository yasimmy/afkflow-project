const { ContainerBuilder, MessageFlags, TextDisplayBuilder } = require('discord.js');

const emojiIds = {
  dot: '1545373693562327141',
  one: '1545373741293244456',
  two: '1545374090318315590',
  support: '1545373638033936434',
};
const teamLeadRoleId = process.env.TEAMLEAD_ROLE_ID || '1545360250838712402';

function getEmoji(message, id, fallback) {
  return message.guild?.emojis.cache.get(id)?.toString() || fallback;
}

module.exports = {
  name: 'wlc',

  async execute(message) {
    if (!message.member?.roles.cache.has(teamLeadRoleId)) return;

    const dot = getEmoji(message, emojiIds.dot, '•');
    const one = getEmoji(message, emojiIds.one, '1.');
    const two = getEmoji(message, emojiIds.two, '2.');
    const support = getEmoji(message, emojiIds.support, '❔');

    const text = new TextDisplayBuilder().setContent([
      '**AFKFlow • Официальное сообщество**',
      '# Добро пожаловать!',
      `${dot} **Рады приветствовать вас в сообществе AFKFlow!**`,
      'Здесь мы делимся новостями о наших ботах и проекте, помогаем друг другу, обмениваемся опытом и вместе развиваем сообщество.',
      '',
      '## С чего начать',
      `${one} <#1545360332883492894> Ознакомьтесь с правилами сообщества.`,
      `${two} <#1545360330383687760> Подпишитесь на обновления AFKFlow.`,
      '## Полезные ресурсы',
      `${dot} **[Официальный сайт AFKFlow](https://afkflow.xyz/)**`,
      `${dot} **[Каталог наших ботов](https://afkflow.xyz/bots)**`,
      `${dot} **[Сотрудничество и контакты](https://afkflow.xyz/contact)**`,
      '## Нужна помощь?',
      'Обратитесь в <#1545360345512550410> — мы обязательно постараемся помочь.',
      '',
      '**AFKFlow • Развиваем сообщество вместе**',
    ].join('\n'));

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [new ContainerBuilder().addTextDisplayComponents(text)],
    });
  },
};