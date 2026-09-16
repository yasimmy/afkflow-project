const { ContainerBuilder, MessageFlags, TextDisplayBuilder } = require('discord.js');

const teamLeadRoleId = process.env.TEAMLEAD_ROLE_ID || '1545360250838712402';
const dotEmojiId = '1545373693562327141';
const numberEmojiIds = {
  one: '1545373741293244456',
  two: '1545374090318315590',
  three: '1545373857303625810',
};

module.exports = {
  name: 'creators',

  async execute(message) {
    if (!message.member?.roles.cache.has(teamLeadRoleId)) return;

    const dot = message.guild?.emojis.cache.get(dotEmojiId)?.toString() || '•';
    const one = message.guild?.emojis.cache.get(numberEmojiIds.one)?.toString() || '1.';
    const two = message.guild?.emojis.cache.get(numberEmojiIds.two)?.toString() || '2.';
    const three = message.guild?.emojis.cache.get(numberEmojiIds.three)?.toString() || '3.';

    const text = new TextDisplayBuilder().setContent([
      '**AFKFlow • Сотрудничество**',
      '# Сотрудничество с авторами',
      `${dot} **Открыты к новым партнёрствам**`,
      'Если вы создаёте контент на YouTube, TikTok или другой популярной платформе, мы будем рады обсудить сотрудничество, обзор наших продуктов и взаимовыгодные условия.',
      '',
      '## Кого мы приглашаем',
      `${one} Авторов с активной и заинтересованной аудиторией`,
      `${two} Креаторов, которым близка тематика приложений и сервисов`,
      `${three} Партнёров, готовых качественно представить AFKFlow`,
      '## Возможные форматы',
      `${one} Обзор продукта или сервиса`,
      `${two} Интеграция в видео или публикацию`,
      `${three} Совместные промоматериалы и специальные проекты`,
      '## Как связаться',
      'Оставьте заявку через раздел **«Контакты для сотрудничества»** на официальном сайте:',
      `${dot} **[afkflow.xyz/contact](https://afkflow.xyz/contact)**`,
      '',
      '**AFKFlow • Будем рады вашему предложению**',
    ].join('\n'));

    await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [new ContainerBuilder().addTextDisplayComponents(text)],
    });
  },
};