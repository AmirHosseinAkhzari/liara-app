// Liara cloud VPS (IaaS API, https://iaas-api.liara.ir), the same calls the Liara CLI makes:
// GET /plans, GET /oss, GET /vm, GET /vm/{id}, POST /vm, PATCH /vm/power/{id} {action},
// PATCH /vm/resize/{id} {plan}, DELETE /vm/{id}. Root passwords are never returned.
import { vpsCatalog } from './pricing.mjs';
import { LiaraError } from './api.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const POWER_ACTIONS = { start: 'start', shutdown: 'shutdown', stop: 'stop', reboot: 'reboot' };
const NAME_RE = /^[a-z][a-z0-9-]{2,30}[a-z0-9]$/;

// Drop anything secret-looking (config.rootPassword and friends).
export function safeVm(vm) {
  if (!vm || typeof vm !== 'object') return vm;
  const out = {};
  for (const [k, v] of Object.entries(vm)) {
    if (/pass|secret|token|private/i.test(k)) continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? safeVm(v) : v;
  }
  return out;
}

function summary(vm) {
  return {
    id: vm._id, name: vm.name, plan: vm.plan, os: vm.OS, state: vm.state, power: vm.power, createdAt: vm.createdAt,
    ...(vm.IPs ? { ips: vm.IPs.map((ip) => `${ip.address} (IPv${ip.version})`) } : {}),
    ...(vm.config ? { sshPort: vm.config.sshPort, sshKeys: vm.config.SSHKeys?.length || 0, hostname: vm.config.hostname } : {}),
  };
}

export async function listVms(api) {
  const r = await api.get('iaas', '/vm');
  return (r.vms || []).map((v) => summary(safeVm(v)));
}

export async function findVm(api, idOrName) {
  const list = (await api.get('iaas', '/vm')).vms || [];
  const hit = list.find((v) => v._id === idOrName || v.name === idOrName);
  if (!hit) throw new LiaraError(`VPS "${idOrName}" not found. VPSes: ${list.map((v) => v.name).join(', ') || 'none'}.`, { status: 404 });
  return hit;
}

export async function vmDetails(api, idOrName) {
  const v = await findVm(api, idOrName);
  const d = await api.get('iaas', `/vm/${v._id}`).catch(() => v);
  return summary(safeVm(d.vm || d));
}

// Checks name, OS and plan against the live lists before anything is created.
export async function validateVm(api, { name, os, plan }) {
  if (!NAME_RE.test(name || '')) throw new Error('VPS name: 4-32 lowercase letters, digits and hyphens, starting with a letter.');
  const cat = await vpsCatalog(api);
  const p = cat.plans[plan];
  if (!p || p.available === false) {
    const ok = Object.entries(cat.plans).filter(([, x]) => x.available !== false).map(([id]) => id);
    throw new Error(`VPS plan "${plan}" is not available. Available: ${ok.join(', ')}.`);
  }
  const osOptions = Object.entries(cat.oss || {}).filter(([k, v]) => k !== 'one-click-apps' && Array.isArray(v)).flatMap(([k, v]) => v.map((ver) => `${k}-${ver}`));
  if (!osOptions.includes(os)) throw new Error(`OS "${os}" is not offered. Choose one of: ${osOptions.join(', ')}.`);
  return { plan: p, osOptions };
}

export async function createVm(api, { name, os, plan, sshKeys = [], sshPort, wait = 180 }) {
  await validateVm(api, { name, os, plan });
  const existing = ((await api.get('iaas', '/vm')).vms || []).find((v) => v.name === name && v.state !== 'DELETED');
  if (existing) return { created: false, vm: summary(safeVm(existing)), note: 'A VPS with this name already exists; nothing new was created.' };
  for (const k of sshKeys) if (!/^(ssh-(rsa|ed25519)|ecdsa-sha2-nistp\d+) [A-Za-z0-9+/=]+/.test(k)) throw new Error('sshKeys must be public keys (ssh-ed25519 / ssh-rsa / ecdsa-…), never private keys.');
  const body = { name, OS: os, plan };
  if (sshKeys.length || sshPort) body.config = { ...(sshKeys.length ? { SSHKeys: sshKeys } : {}), ...(sshPort ? { sshPort: String(sshPort) } : {}) };
  const res = await api.post('iaas', '/vm', body);
  const steps = [`requested VPS ${name} (${plan}, ${os})${res?.taskID ? `, task ${res.taskID}` : ''}`];
  // Wait for the real state; never report it as ready before the API does.
  const deadline = Date.now() + wait * 1000;
  let vm = null;
  while (Date.now() < deadline) {
    vm = ((await api.get('iaas', '/vm')).vms || []).find((v) => v.name === name);
    if (vm && (vm.state === 'CREATED' || vm.power === 'POWERED_ON')) break;
    await sleep(6000);
  }
  const details = vm ? await vmDetails(api, vm._id).catch(() => summary(safeVm(vm))) : null;
  return {
    created: true,
    ready: Boolean(vm && (vm.state === 'CREATED' || vm.power === 'POWERED_ON')),
    taskID: res?.taskID,
    vm: details,
    steps,
    nextSteps: [
      sshKeys.length ? `Connect: ssh ${details?.sshPort && details.sshPort !== '22' ? `-p ${details.sshPort} ` : ''}root@${details?.ips?.[0]?.split(' ')[0] || '<IP>'}` : 'No SSH key was added: get the root password from the Liara console (it is not shown here), or create the VPS with sshKeys.',
      'Update the system packages and enable a firewall before running services.',
      'Guides: https://docs.liara.ir/iaas/about/',
    ],
  };
}

export async function vmPower(api, { vm: idOrName, action }) {
  if (!POWER_ACTIONS[action]) throw new Error(`action must be one of ${Object.keys(POWER_ACTIONS).join(', ')}`);
  const v = await findVm(api, idOrName);
  await api.patch('iaas', `/vm/power/${v._id}`, { action });
  return { vm: v.name, action, requested: true, note: 'Liara applies power changes in the background; check vps_list for the power state.' };
}

export async function vmResize(api, { vm: idOrName, plan }) {
  const v = await findVm(api, idOrName);
  const cat = await vpsCatalog(api);
  if (!cat.plans[plan] || cat.plans[plan].available === false) throw new Error(`VPS plan "${plan}" is not available.`);
  await api.patch('iaas', `/vm/resize/${v._id}`, { plan });
  return { vm: v.name, from: v.plan, to: plan, requested: true };
}

export async function vmDelete(api, { vm: idOrName }) {
  const v = await findVm(api, idOrName);
  await api.del('iaas', `/vm/${v._id}`);
  return { vm: v.name, deleted: true, note: 'Deletion is in progress; the disk and its data are gone for good.' };
}
