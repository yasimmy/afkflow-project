const fs = require('node:fs');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');

const dataPath = path.join(__dirname, '..', 'data');
const ideasPath = path.join(dataPath, 'ideas.json');
const rateLimitsPath = path.join(dataPath, 'idea-rate-limits.json');

function readIdeas() {
  fs.mkdirSync(dataPath, { recursive: true });
  if (!fs.existsSync(ideasPath)) fs.writeFileSync(ideasPath, '{}');
  return JSON.parse(fs.readFileSync(ideasPath, 'utf8'));
}

function readRateLimits() {
  fs.mkdirSync(dataPath, { recursive: true });
  if (!fs.existsSync(rateLimitsPath)) fs.writeFileSync(rateLimitsPath, '{}');
  return JSON.parse(fs.readFileSync(rateLimitsPath, 'utf8'));
}

function getRateLimitRemaining(userId, type = 'idea', maxTickets = 1) {
  const limits = readRateLimits();
  const timestamps = Array.isArray(limits[type]?.[userId]) ? limits[type][userId] : [];
  const legacyTimestamp = type === 'idea' && typeof limits[userId] === 'string' ? [limits[userId]] : [];
  const recentTimestamps = [...timestamps, ...legacyTimestamp]
    .map((timestamp) => new Date(timestamp).getTime())
    .filter((timestamp) => Number.isFinite(timestamp) && Date.now() - timestamp < 24 * 60 * 60 * 1000)
    .sort((first, second) => second - first);

  if (recentTimestamps.length < maxTickets) return 0;
  return Math.max(0, 24 * 60 * 60 * 1000 - (Date.now() - recentTimestamps[maxTickets - 1]));
}

function markIdeaCreated(userId, type = 'idea') {
  const rateLimits = readRateLimits();
  if (!rateLimits[type] || typeof rateLimits[type] !== 'object' || Array.isArray(rateLimits[type])) rateLimits[type] = {};
  if (!Array.isArray(rateLimits[type][userId])) rateLimits[type][userId] = [];
  rateLimits[type][userId] = [new Date().toISOString(), ...rateLimits[type][userId]].slice(0, 10);
  fs.writeFileSync(rateLimitsPath, JSON.stringify(rateLimits, null, 2));
}

function writeIdeas(ideas) {
  fs.writeFileSync(ideasPath, JSON.stringify(ideas, null, 2));
}

function saveIdea(idea) {
  const ideas = readIdeas();
  ideas[idea.channelId] = idea;
  writeIdeas(ideas);
}

function getIdea(channelId) {
  return readIdeas()[channelId];
}

function removeIdea(channelId) {
  const ideas = readIdeas();
  delete ideas[channelId];
  writeIdeas(ideas);
}

function slugifyUsername(username) {
  const slug = username
    .toLowerCase()
    .replace(/\./g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 85);

  return slug || 'user';
}

async function createTranscript(channel) {
  const messages = [];
  let before;

  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    messages.push(...batch.values());
    if (batch.size < 100) break;
    before = batch.last().id;
  }

  const lines = messages
    .sort((first, second) => first.createdTimestamp - second.createdTimestamp)
    .map((message) => {
      const timestamp = new Date(message.createdTimestamp).toISOString();
      const author = `${message.author.tag} (${message.author.id})`;
      const content = message.content || '[embed/component message]';
      return `[${timestamp}] ${author}: ${content}`;
    });

  return new AttachmentBuilder(Buffer.from(lines.join('\n') || 'Тикет не содержит сообщений.', 'utf8'), {
    name: `transcript-${channel.name}.txt`,
  });
}

module.exports = {
  createTranscript,
  getRateLimitRemaining,
  getIdea,
  markIdeaCreated,
  removeIdea,
  saveIdea,
  slugifyUsername,
};