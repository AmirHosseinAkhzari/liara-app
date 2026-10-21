// Reads and classifies .env-style files.
import fs from 'node:fs';
import path from 'node:path';

export function parseEnvText(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*[=:]\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '');
    }
    out[m[1]] = value;
  }
  return out;
}

export function parseEnvFile(file) {
  try {
    return parseEnvText(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

// production: what the live app most likely uses.
// default: plain .env, used everywhere unless overridden.
// development / example: never treated as production.
export function classifyEnvFile(name) {
  const n = name.toLowerCase();
  if (/(example|sample|template|dist|defaults?)$/.test(n)) return 'example';
  if (/\.(production|prod)(\.local)?$/.test(n)) return 'production';
  if (/\.(development|dev|local|test|testing|staging|ci)(\.local)?$/.test(n)) return 'development';
  if (n === '.env' || n === '.env.liara') return 'default';
  return 'development';
}

export function findEnvFiles(root) {
  let names = [];
  try {
    names = fs.readdirSync(root).filter((n) => /^\.env(\..+)?$/i.test(n) || /^env\.(example|sample)$/i.test(n));
  } catch {
    return [];
  }
  return names
    .filter((n) => fs.statSync(path.join(root, n)).isFile())
    .map((n) => ({ file: n, kind: classifyEnvFile(n), vars: parseEnvFile(path.join(root, n)) }));
}

// Placeholder values in example files ("changeme", "your-key", "xxx", "<...>").
export function isPlaceholder(value) {
  if (value === undefined || value === null) return true;
  const v = String(value).trim();
  if (!v) return true;
  return /^(changeme|change_me|your[-_ ].*|xxx+|\*+|<.*>|\$\{.*\}|todo|null|none|example.*|sk-\.\.\.|\.\.\.)$/i.test(v);
}

export function maskValue(value) {
  if (value === undefined || value === null || value === '') return '(empty)';
  const v = String(value);
  // URLs: hide the password but keep host so the user can recognise it.
  try {
    const u = new URL(v);
    if (u.password) u.password = '****';
    if (u.username && u.password) return u.toString();
    if (u.protocol && u.host) return u.toString();
  } catch {
    // not a URL
  }
  if (v.length <= 4) return '****';
  return `${v.slice(0, 2)}…(${v.length} chars)`;
}
