const fs = require('node:fs');
const path = require('node:path');

const warningsPath = path.join(__dirname, '..', 'data', 'warnings.json');
const warningLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function readWarnings() {
  ensureStorage();
  const warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
  const cutoff = Date.now() - warningLifetimeMs;
  let changed = false;

  for (const [userId, entries] of Object.entries(warnings)) {
    const activeEntries = entries.filter((entry) => entry.createdAt > cutoff);
    if (activeEntries.length !== entries.length) changed = true;
    if (activeEntries.length) warnings[userId] = activeEntries;
    else delete warnings[userId];
  }

  if (changed) writeWarnings(warnings);
  return warnings;
}

function addWarning(userId, moderatorId, reason) {
  const warnings = readWarnings();
  const entry = { moderatorId, reason, createdAt: Date.now() };
  warnings[userId] = [...(warnings[userId] || []), entry];
  writeWarnings(warnings);
  return warnings[userId];
}

function removeLatestWarning(userId) {
  const warnings = readWarnings();
  if (!warnings[userId]?.length) return null;
  const removed = warnings[userId].pop();
  if (warnings[userId].length) writeWarnings(warnings);
  else {
    delete warnings[userId];
    writeWarnings(warnings);
  }
  return removed;
}

function getWarnings(userId) {
  return readWarnings()[userId] || [];
}

function ensureStorage() {
  fs.mkdirSync(path.dirname(warningsPath), { recursive: true });
  if (!fs.existsSync(warningsPath)) fs.writeFileSync(warningsPath, '{}');
}

function writeWarnings(warnings) {
  fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
}

module.exports = { addWarning, getWarnings, removeLatestWarning, warningLifetimeMs };
