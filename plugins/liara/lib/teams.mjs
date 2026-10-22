// Liara teams: list the teams the user belongs to and choose where to work.
// Like the Liara CLI, a team is the `teamID` query param on every API call, and a
// project remembers its team in liara.json as "team-id" (the key `liara deploy` reads).
import fs from 'node:fs';
import path from 'node:path';

// Choice made with the teams tool in this session: undefined = not chosen,
// null = personal account, otherwise { id, name }.
let chosen;

export const getChosenTeam = () => chosen;
export function setChosenTeam(team) {
  chosen = team;
}

export function liaraJsonTeam(root) {
  try {
    const conf = JSON.parse(fs.readFileSync(path.join(root, 'liara.json'), 'utf8'));
    return typeof conf['team-id'] === 'string' && conf['team-id'] ? conf['team-id'] : null;
  } catch {
    return null;
  }
}

// "تیم ۲", "تیم 2" and " TEAM  2 " all compare equal.
const norm = (s) => String(s || '')
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

export const PERSONAL = /^(personal|me|self|شخصی)$/i;

// Teams of the logged-in user: GET /v2/teams (what `liara init` uses), plus the
// user's role in each from /v1/me?teamID=… so we know where they may deploy.
export async function listTeams(api, { withRoles = true } = {}) {
  const personal = api.withTeam(null);
  const data = await personal.get('paas', '/v2/teams');
  const teams = (data?.teams || []).map((t) => ({ id: t._id, name: t.name }));
  if (!withRoles) return teams;
  return Promise.all(teams.map(async (t) => {
    const me = await personal.get('account', '/v1/me', { query: { teamID: t.id } }).catch(() => null);
    const role = me?.team?.teamMemberRole;
    if (!role) return { ...t, role: null, canDeploy: null, canCreateApps: null };
    const perms = role.permissions || [];
    const has = (name, type) => perms.some((p) => p.name === name && p.type === type);
    return {
      ...t,
      role: role.name || null,
      canDeploy: has('manage', 'project'),
      canCreateApps: has('create', 'project'),
      canCreate: [...new Set(perms.filter((p) => p.name === 'create').map((p) => p.type))],
    };
  }));
}

// Team ID, name or "personal" → team ID (null = personal account).
export async function resolveTeam(api, value) {
  const v = String(value ?? '').trim();
  if (!v || PERSONAL.test(v)) return { id: null, name: null };
  const teams = await listTeams(api, { withRoles: false });
  const hit = teams.find((t) => t.id === v) || teams.find((t) => norm(t.name) === norm(v));
  if (hit) return hit;
  if (/^[a-f0-9]{24}$/i.test(v)) return { id: v, name: null };
  const names = teams.map((t) => `"${t.name}" (${t.id})`).join(', ');
  throw new Error(`No Liara team "${v}". ${names ? `Your teams: ${names}.` : 'This account is not in any team.'} Use "personal" for the personal account.`);
}

// Which account a tool call acts in. Order: the call's own `team` argument, the choice
// made with the teams tool, the project's liara.json "team-id", LIARA_TEAM_ID, personal.
// teamID: string = that team, null = personal, undefined = leave it to LIARA_TEAM_ID.
export async function teamContext(api, args, cwd) {
  if (args.team !== undefined && args.team !== null && args.team !== '') {
    const t = await resolveTeam(api, args.team);
    return { teamID: t.id, name: t.name, source: 'team argument' };
  }
  if (chosen !== undefined) return { teamID: chosen?.id ?? null, name: chosen?.name ?? null, source: 'chosen with the teams tool' };
  const fromJson = liaraJsonTeam(path.resolve(cwd, args.path || '.'));
  if (fromJson) return { teamID: fromJson, name: null, source: 'liara.json "team-id"' };
  return { teamID: undefined, name: null, source: null };
}

// Plain description of where calls go, for tool results.
export function describeContext(ctx, api, teams = []) {
  const id = api.auth.teamID || null;
  if (!id) return { type: 'personal', source: ctx?.source || 'default' };
  const name = ctx?.name || teams.find((t) => t.id === id)?.name || null;
  return { type: 'team', id, name, source: ctx?.source || 'LIARA_TEAM_ID' };
}
