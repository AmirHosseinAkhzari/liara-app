// Resolves the Liara API token and team ID.
// Order: environment → project .env files → Liara CLI login (~/.liara-auth.json).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEnvFile } from './envfiles.mjs';

function fromProjectEnv(cwd) {
  for (const name of ['.env.liara', '.env.local', '.env']) {
    const file = path.join(cwd, name);
    if (!fs.existsSync(file)) continue;
    const vars = parseEnvFile(file);
    if (vars.LIARA_API_TOKEN || vars.LIARA_TOKEN) {
      return {
        token: vars.LIARA_API_TOKEN || vars.LIARA_TOKEN,
        teamID: vars.LIARA_TEAM_ID || undefined,
        source: name,
      };
    }
  }
  return null;
}

function fromLiaraCli() {
  const file = path.join(os.homedir(), '.liara-auth.json');
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Newer CLI versions keep several accounts; pick the current one.
    if (data.accounts && typeof data.accounts === 'object') {
      const current = Object.values(data.accounts).find((a) => a && a.current);
      if (current?.api_token) return { token: current.api_token, source: '~/.liara-auth.json' };
    }
    if (data.api_token) return { token: data.api_token, source: '~/.liara-auth.json' };
  } catch {
    // ignore broken file
  }
  return null;
}

export function resolveAuth(cwd = process.cwd()) {
  const envToken = process.env.LIARA_API_TOKEN || process.env.LIARA_TOKEN;
  if (envToken) {
    return { token: envToken, teamID: process.env.LIARA_TEAM_ID || undefined, source: 'environment' };
  }
  const project = fromProjectEnv(cwd);
  if (project) return { ...project, teamID: project.teamID || process.env.LIARA_TEAM_ID || undefined };
  const cli = fromLiaraCli();
  if (cli) return { ...cli, teamID: process.env.LIARA_TEAM_ID || undefined };
  return { token: null, teamID: process.env.LIARA_TEAM_ID || undefined, source: null };
}

export const S3_ENDPOINT = process.env.LIARA_S3_ENDPOINT || 'https://storage.c2.liara.space';
