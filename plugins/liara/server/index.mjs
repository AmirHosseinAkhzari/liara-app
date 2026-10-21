#!/usr/bin/env node
// Minimal MCP server over stdio (JSON-RPC 2.0, one message per line). No dependencies.
import readline from 'node:readline';
import { TOOLS, callTool } from '../lib/tools.mjs';

const SERVER = { name: 'liara', version: '0.2.0' };
const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05'];

const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const log = (...a) => process.stderr.write(`[liara-mcp] ${a.join(' ')}\n`);

async function handle(msg) {
  const { id, method, params } = msg;
  const reply = (result) => id !== undefined && send({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => id !== undefined && send({ jsonrpc: '2.0', id, error: { code, message } });

  switch (method) {
    case 'initialize': {
      const asked = params?.protocolVersion;
      return reply({
        protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: 'Liara cloud tools: scan a project, deploy it, and connect Liara databases, object storage, mail, DNS and AI. Start with whoami; if not logged in, call login (opens the browser). Then scan_project.',
      });
    }
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call': {
      const name = params?.name;
      try {
        const result = await callTool(name, params?.arguments || {});
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
    if (msg.id !== undefined) send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: err.message } });
  });
  pending.add(p);
  p.finally(() => pending.delete(p));
});
// Finish in-flight calls before exiting when the client closes stdin.
rl.on('close', () => Promise.allSettled([...pending]).then(() => process.exit(0)));
