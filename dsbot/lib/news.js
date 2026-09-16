const fs = require('node:fs');
const path = require('node:path');
const {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
} = require('discord.js');

const dataPath = path.join(__dirname, '..', 'data');
const statePath = path.join(dataPath, 'news-state.json');
const logPath = path.join(dataPath, 'news.log');

function ensureStorage() {
  fs.mkdirSync(dataPath, { recursive: true });

  if (!fs.existsSync(statePath)) {
    fs.writeFileSync(statePath, JSON.stringify({ nextAssembly: '0.0.0', drafts: {} }, null, 2));
  }
}

function readState() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function writeState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function createNewsComponents(options, announcement) {
  const components = new ContainerBuilder()
    .setAccentColor(options.color || 0x5865f2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent([
      announcement,
      `# ${options.title}`,
      options.description,
      '',
      `**${options.footer || 'AFKFlow • Официальные обновления'}**`,
    ].filter(Boolean).join('\n')));

  if (options.image) {
    components.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(options.image)),
    );
  }

  return components;
}

function normalizeText(value) {
  return value.replace(/\\n/g, '\n');
}

function saveDraft(draft) {
  const state = readState();
  state.drafts[draft.id] = draft;
  writeState(state);
}

function getDraft(id) {
  return readState().drafts[id];
}

function markDraftPublished(id, assembly) {
  const state = readState();
  if (state.drafts[id]) state.drafts[id].publishedAssembly = assembly;
  writeState(state);
}

function reserveAssembly(authorId, topic) {
  const state = readState();
  const assembly = state.nextAssembly;
  const [major, minor, patch] = assembly.split('.').map(Number);
  state.nextAssembly = `${major}.${minor}.${patch + 1}`;
  writeState(state);

  const logLine = `[${new Date().toISOString()}] assembly v.${assembly} | author=${authorId} | topic=${JSON.stringify(topic)}\n`;
  fs.appendFileSync(logPath, logLine);
  return assembly;
}

module.exports = {
  createNewsComponents,
  getDraft,
  markDraftPublished,
  normalizeText,
  reserveAssembly,
  saveDraft,
};