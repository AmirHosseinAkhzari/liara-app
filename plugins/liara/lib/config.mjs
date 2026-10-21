// Finds Liara API tokens. Order: environment → project .env files → browser login
// (~/.liara-auth.json, shared with the Liara CLI). The API client falls through to the
// next one when a token is rejected, so a fresh login wins over a stale .env token.
import fs from 'node:fs';
import path from 'node:path';
import { parseEnvFile } from './envfiles.mjs';
import { AUTH_FILE } from './login.mjs';

function fromProjectEnv(cwd) {
  const out = [];
  for (const name of ['.env.liara', '.env.local', '.env']) {
    const file = path.join(cwd, name);
    if (!fs.existsSync(file)) continue;
    const vars = parseEnvFile(file);
    const token = vars.LIARA_API_TOKEN || vars.LIARA_TOKEN;
    if (token) out.push({ token, teamID: vars.LIARA_TEAM_ID || undefined, source: name });
  }
  return out;
}

function fromLogin() {
  if (!fs.existsSync(AUTH_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    if (data.accounts && typeof data.accounts === 'object') {
      const entries = Object.entries(data.accounts).filter(([, a]) => a?.api_token);
      entries.sort(([, a], [, b]) => Number(Boolean(b.current)) - Number(Boolean(a.current)));
      return entries.map(([name, a]) => ({ token: a.api_token, source: `browser login (${name})`, account: name }));
    }
    if (data.api_token) return [{ token: data.api_token, source: 'browser login' }];
  } catch {
    // ignore broken file
  }
  return [];
}

export function authCandidates(cwd = process.cwd()) {
  const team = process.env.LIARA_TEAM_ID || undefined;
  const list = [];
  const envToken = process.env.LIARA_API_TOKEN || process.env.LIARA_TOKEN;
  if (envToken) list.push({ token: envToken, source: 'LIARA_API_TOKEN environment variable' });
  list.push(...fromProjectEnv(cwd));
  // Only the current browser-login account; other saved accounts are not tried silently.
  const login = fromLogin();
  if (login.length) list.push(login[0]);
  const seen = new Set();
  return list
    .filter((c) => !seen.has(c.token) && seen.add(c.token))
    .map((c) => ({ ...c, teamID: c.teamID || team }));
}

export function resolveAuth(cwd = process.cwd()) {
  return authCandidates(cwd)[0] || { token: null, teamID: process.env.LIARA_TEAM_ID || undefined, source: null };
}

export const S3_ENDPOINT = process.env.LIARA_S3_ENDPOINT || 'https://storage.c2.liara.space';
