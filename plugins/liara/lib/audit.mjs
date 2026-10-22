// What the plugin did, for the user: an in-memory journal of this session (used by the
// HTML report) and an append-only audit file of every action that changed the account
// (~/.liara-claude/audit.jsonl, readable only by the user). Never stores secret values.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const HOME = process.env.LIARA_CLAUDE_HOME || path.join(os.homedir(), '.liara-claude');
export const AUDIT_FILE = path.join(HOME, 'audit.jsonl');

const journal = [];
export const sessionJournal = () => journal.slice();
export const clearJournal = () => journal.splice(0);

// Only these result fields are kept: they describe the outcome, never credentials.
const KEEP = ['success', 'state', 'status', 'created', 'cancelled', 'confirmationRequired', 'app', 'url', 'releaseID', 'platform', 'port', 'plan', 'bundle', 'steps', 'hint', 'category', 'verdict', 'error', 'path', 'monthlyToman', 'totalMonthlyToman', 'healthy', 'checks', 'missingEnvKeys', 'changed', 'skipped', 'vm', 'taskID', 'notVerified', 'explanation', 'suggestedFix', 'written', 'file', 'verified', 'deleted', 'type', 'name'];

function pick(result) {
  if (!result || typeof result !== 'object') return typeof result === 'string' ? { text: result.slice(0, 300) } : {};
  const out = {};
  for (const k of KEEP) {
    if (result[k] === undefined) continue;
    let v = result[k];
    if (k === 'changed' && v && typeof v === 'object') v = Object.keys(v); // names only
    if (k === 'steps' && Array.isArray(v)) v = v.slice(0, 30);
    if (k === 'checks' && Array.isArray(v)) v = v.map((c) => ({ name: c.name, ok: c.ok, detail: c.detail }));
    out[k] = v;
  }
  if (result.account) out.account = result.account.type === 'team' ? `team ${result.account.name || result.account.id}` : 'personal';
  if (result.database) out.database = { hostname: result.database.hostname, type: result.database.type };
  if (result.bucket?.name) out.bucket = result.bucket.name;
  if (result.envVars) out.envVarNames = Object.keys(result.envVars);
  return out;
}

export function record({ tool, risk, account, target, consent, dialog, outcome, result, error, started, plan, bundle, kind }) {
  const entry = {
    time: new Date().toISOString(),
    tool,
    risk,
    account,
    target: target || null,
    consent: consent || null,
    ...(dialog ? { dialog } : {}), // the dialog's raw answer and how fast it came
    ...(plan ? { plan, bundle: bundle || undefined, kind: kind || undefined } : {}),
    outcome,
    ms: started ? Date.now() - started : undefined,
    ...(error ? { error: String(error).slice(0, 500) } : {}),
    result: pick(result),
  };
  journal.push(entry);
  if (journal.length > 500) journal.shift();
  // Test runs must use LIARA_CLAUDE_HOME, never the real audit log.
  const realHome = !process.env.LIARA_CLAUDE_HOME;
  if (risk !== 'read' && risk !== 'session' && !(process.env.NODE_TEST_CONTEXT && realHome)) {
    try {
      fs.mkdirSync(HOME, { recursive: true, mode: 0o700 });
      fs.appendFileSync(AUDIT_FILE, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
    } catch {
      // auditing must never break the action itself
    }
  }
  return entry;
}
