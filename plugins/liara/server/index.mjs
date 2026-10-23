#!/usr/bin/env node
// Minimal MCP server over stdio (JSON-RPC 2.0, one message per line). No dependencies.
// Besides answering requests it can ask the client to show a confirmation dialog
// (MCP elicitation) before anything changes the user's Liara account.
import readline from 'node:readline';
import { TOOLS, callTool, toolRisk } from '../lib/tools.mjs';

const SERVER = { name: 'liara', version: '0.8.1' };
const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05'];
const DIALOG_TIMEOUT_MS = 10 * 60_000;

const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const log = (...a) => process.stderr.write(`[liara-mcp] ${a.join(' ')}\n`);

let clientCaps = {};
let clientInfo = {};

// Requests we send to the client, waiting for its answer.
const outgoing = new Map();
let nextId = 1;
function requestClient(method, params, timeoutMs) {
  const id = `liara-${nextId++}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      outgoing.delete(id);
      reject(new Error(`${method} timed out`));
    }, timeoutMs);
    outgoing.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    send({ jsonrpc: '2.0', id, method, params });
  });
}

// A confirmation dialog in the client, when it supports form elicitation.
function elicitFn() {
  const e = clientCaps?.elicitation;
  if (!e) return null;
  const form = typeof e === 'object' && (Object.keys(e).length === 0 || e.form);
  if (!form) return null;
  return (params) => requestClient('elicitation/create', { ...(e.form ? { mode: 'form' } : {}), ...params }, DIALOG_TIMEOUT_MS);
}

async function handle(msg) {
  // An answer to one of our requests (a dialog result).
  if (msg.id !== undefined && !msg.method && outgoing.has(msg.id)) {
    const waiter = outgoing.get(msg.id);
    outgoing.delete(msg.id);
    if (msg.error) waiter.reject(new Error(msg.error.message || 'client error'));
    else waiter.resolve(msg.result);
    return;
  }
  const { id, method, params } = msg;
  const reply = (result) => id !== undefined && send({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => id !== undefined && send({ jsonrpc: '2.0', id, error: { code, message } });

  switch (method) {
    case 'initialize': {
      clientCaps = params?.capabilities || {};
      clientInfo = params?.clientInfo || {};
      log(`client ${clientInfo.name || '?'} ${clientInfo.version || ''}; confirmation dialogs: ${elicitFn() ? 'yes' : 'no (chat fallback)'}`);
      const asked = params?.protocolVersion;
      return reply({
        protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: 'Liara cloud tools: analyze a project, deploy it, connect Liara databases, storage, mail, DNS and AI, manage VPS, check prices, billing and service status, search the official docs, and write a deployment report. Start with whoami; if not logged in, call login (opens the browser). Anything that changes the account or costs money asks the user first (a dialog, or confirmationRequired to ask in chat); use approve_plan to ask once for a whole deploy.',
      });
    }
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({
        tools: TOOLS.map(({ name, description, inputSchema }) => {
          const risk = toolRisk(name);
          return {
            name,
            description,
            inputSchema,
            annotations: { readOnlyHint: risk === 'read', destructiveHint: ['delete_app', 'delete_vm', 'vm_action', 'api'].includes(name), openWorldHint: true },
          };
        }),
      });
    case 'tools/call': {
      const name = params?.name;
      try {
        const result = await callTool(name, params?.arguments || {}, { elicit: elicitFn() });
        const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        return reply({ content: [{ type: 'text', text }] });
      } catch (err) {
        log(`${name} failed: ${err.message}`);
        const detail = err.body && typeof err.body === 'object' ? `\n${JSON.stringify(err.body).slice(0, 1500)}` : '';
        return reply({ content: [{ type: 'text', text: `Error: ${err.message}${detail}` }], isError: true });
      }
    }
    default:
      if (method?.startsWith('notifications/')) return undefined;
      return fail(-32601, `Method not found: ${method}`);
  }
}

const pending = new Set();
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  const p = handle(msg).catch((err) => {
    log(`unhandled: ${err.stack || err}`);
    if (msg.id !== undefined && msg.method) send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: err.message } });
  });
  pending.add(p);
  p.finally(() => pending.delete(p));
});
// Finish in-flight calls before exiting when the client closes stdin.
rl.on('close', () => Promise.allSettled([...pending]).then(() => process.exit(0)));
