const fs = require('fs');
const path = require('path');
const config = require('../config');

/** Tiny JSON-file persistence layer for runtime data (users, templates). */

function readJson(file, fallback) {
  const p = path.join(config.dataDir, file);
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error(`[store] Failed to read ${file}:`, err.message);
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const p = path.join(config.dataDir, file);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

const readUsers = () => readJson('users.json', {});
const updateUsers = (users) => writeJson('users.json', users);

const readTemplates = () => readJson('nginx-templates.json', []);
const updateTemplates = (templates) => writeJson('nginx-templates.json', templates);

module.exports = { readUsers, updateUsers, readTemplates, updateTemplates };
