// Consent for anything that changes the Liara account or costs money.
//
// 1. A plan approved with approve_plan covers the operations it lists (one dialog for a
//    whole deploy); a call outside the plan, or with a different plan/bundle, asks again.
// 2. Otherwise the MCP server shows a confirmation dialog (MCP elicitation) when the
//    client supports it: Accept continues, Decline changes nothing.
//    Some clients say they support dialogs but never show them: the Claude desktop app
//    answers every one with Decline by itself, within a second. So a Decline faster than
//    a person could read the dialog, or a Cancel (closed without a choice), counts as
//    "not shown" and the user is asked in chat (3). After a too-fast answer, this server
//    stops trying dialogs.
// 3. Without a dialog, the tool returns confirmationRequired with a one-time token bound
//    to these exact arguments; Claude asks in chat and calls again with confirmToken.
// Deletes always need the resource name typed (in the dialog, or as confirmName in chat).
import crypto from 'node:crypto';

export const RISK_LABEL = {
  read: 'Read only',
  session: 'Changes only this session',
  change: 'Changes your Liara account',
  billable: 'Creates a resource that costs money',
  destructive: 'Deletes or stops something',
};

const TTL = 2 * 60 * 60_000;
// An answer other than Accept that arrives faster than this came from the client, not a person.
const minHumanMs = () => {
  const n = Number(process.env.LIARA_DIALOG_MIN_MS ?? 1500);
  return Number.isFinite(n) ? n : 1500;
};
const dialogsAllowed = () => process.env.LIARA_DIALOGS !== 'off';
let dialogsShown = dialogsAllowed(); // false once the client answered a dialog without showing it
export const dialogsWork = () => dialogsShown;
const approvals = new Map(); // opKey → { planId, title, expires }
const tokens = new Map(); // token → { hash, expires }

export function opKey({ tool, target, plan, bundle }) {
  return [tool, target || '', plan || '', bundle || ''].join('|');
}

function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
function argsHash(tool, args) {
  const { confirmToken, confirmName, ...rest } = args || {};
  return crypto.createHash('sha256').update(`${tool}\n${stable(rest)}`).digest('hex');
}

export function approvePlan(planId, title, ops) {
  for (const op of ops) approvals.set(opKey(op), { planId, title, expires: Date.now() + TTL });
}
export function planApprovalFor(op) {
  const a = approvals.get(opKey(op));
  return a && a.expires > Date.now() ? a : null;
}
export function resetConsent() {
  approvals.clear();
  tokens.clear();
  dialogsShown = dialogsAllowed();
}

function issueToken(tool, args) {
  const token = crypto.randomBytes(9).toString('base64url');
  tokens.set(token, { hash: argsHash(tool, args), expires: Date.now() + 30 * 60_000 });
  return token;
}
function takeToken(tool, args) {
  const t = args?.confirmToken && tokens.get(args.confirmToken);
  if (!t || t.expires < Date.now() || t.hash !== argsHash(tool, args)) return false;
  tokens.delete(args.confirmToken);
  return true;
}

// Plain text for the dialog. c = consent description from the tool. c.short (a whole plan in
// one line: how many services, what they cost a day) replaces the long form; the full list
// stays in c.details for "Review details".
export function consentText(c) {
  if (c.short) {
    const lines = [c.short];
    if (c.warning) lines.push(c.warning);
    if (c.typedConfirm) lines.push(`To confirm, type: ${c.typedConfirm}`);
    return lines.join('\n');
  }
  const lines = [c.title, ''];
  const row = (label, value) => value && lines.push(`${label}: ${value}`);
  row('Account', c.account);
  row('Resource', c.resource);
  row('What happens', c.effect);
  row('Why', c.why);
  row('Cost', c.cost);
  row('Balance', c.balance);
  row('Warning', c.warning);
  row('Data used', c.data);
  row('Permission needed', c.permission);
  row('Afterwards', c.after);
  row('Risk', RISK_LABEL[c.risk]);
  if (c.details?.length) {
    lines.push('', 'Details:');
    for (const d of c.details) lines.push(`• ${d}`);
  }
  if (c.typedConfirm) lines.push('', `To confirm, type: ${c.typedConfirm}`);
  return lines.join('\n');
}

// Returns { ok: true, via } to go ahead, or { ok: false, result } to return instead.
export async function requireConsent(ctx, tool, args, c) {
  if (!c || c.risk === 'read' || c.risk === 'session') return { ok: true, via: 'not needed' };
  const op = { tool, target: c.target, plan: c.plan, bundle: c.bundle };

  if (c.risk !== 'destructive') {
    const a = planApprovalFor(op);
    if (a) return { ok: true, via: `approved plan "${a.title}" (${a.planId})` };
  }
  if (args?.confirmToken && takeToken(tool, args)) {
    if (c.typedConfirm && String(args.confirmName || '').trim() !== c.typedConfirm) {
      return { ok: false, result: { cancelled: true, message: `confirmName must be exactly "${c.typedConfirm}", typed by the user. Nothing was changed.` } };
    }
    return { ok: true, via: 'confirmed in chat' };
  }

  let notShown = null;
  if (ctx?.elicit && dialogsShown) {
    const requestedSchema = c.typedConfirm
      ? { type: 'object', properties: { confirm: { type: 'string', title: `Type ${c.typedConfirm} to confirm` } }, required: ['confirm'] }
      : { type: 'object', properties: {} };
    let res = null;
    const asked = Date.now();
    try {
      res = await ctx.elicit({ message: consentText(c), requestedSchema });
    } catch (err) {
      ctx.elicitError = err.message; // fall back to chat below
    }
    const ms = Date.now() - asked;
    if (res) {
      ctx.dialog = { action: res.action, ms };
      if (res.action === 'accept') {
        if (!c.typedConfirm || String(res.content?.confirm || '').trim() === c.typedConfirm) return { ok: true, via: 'approved in dialog' };
        return { ok: false, result: { cancelled: true, message: `The typed name did not match "${c.typedConfirm}". Nothing was changed.` } };
      }
      const tooFast = ms < minHumanMs();
      if (res.action === 'decline' && !tooFast) {
        return { ok: false, result: { cancelled: true, message: 'The user did not approve this. Nothing was changed.' } };
      }
      // Cancel, or a Decline no person could have given this fast: ask in chat instead.
      if (tooFast) {
        dialogsShown = false;
        process.stderr.write(`[liara-mcp] the client answered a confirmation dialog with "${res.action}" in ${ms} ms, without showing it; asking in chat from now on\n`);
      }
      ctx.dialog.shown = !tooFast;
      notShown = tooFast
        ? 'This app could not show the Liara confirmation dialog (it answered by itself, without showing it to the user), so nothing was approved or declined yet.'
        : 'The confirmation dialog was closed without a choice, so nothing was approved or declined yet.';
    }
  }

  return {
    ok: false,
    result: {
      confirmationRequired: true,
      nothingChangedYet: true,
      ...(notShown ? { dialogNotAnswered: notShown } : {}),
      confirmToken: issueToken(tool, args),
      consent: { ...c, riskLabel: RISK_LABEL[c.risk] },
      message: consentText(c),
      howToConfirm: `Show this to the user and ask with AskUserQuestion (options: "Allow and continue", "Cancel", "Review details"). Only if they allow, call ${tool} again with the same arguments plus confirmToken${c.typedConfirm ? ` and confirmName (the user must type "${c.typedConfirm}" themselves)` : ''}. The token works once, for these exact arguments, for 30 minutes.`,
    },
  };
}
