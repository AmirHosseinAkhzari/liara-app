// In-memory fake of the Liara endpoints the plugin uses. Paths are prefixed with the service name.
import http from 'node:http';
import zlib from 'node:zlib';

export function startMock() {
  const state = {
    projects: {}, databases: {}, buckets: {}, keys: [], zones: {}, records: {}, mails: [], workspaces: [], aiKeys: [], domains: [],
    uploads: [], releases: {}, requests: [], calls: [],
    networks: [{ _id: 'net1', name: 'test-net' }], createdProjects: [], logs: {}, buildLogs: {}, vms: [], balance: 1_000_000, teamBalance: 50000,
    // Teams the test user belongs to: owner of one, view-only in the other.
    teams: [
      { _id: 'aaaaaaaaaaaaaaaaaaaaaaa2', name: 'تیم ۲', role: { name: 'مالک', permissions: [{ name: 'manage', type: 'project' }, { name: 'create', type: 'project' }, { name: 'create', type: 'database' }] } },
      { _id: 'bbbbbbbbbbbbbbbbbbbbbbb3', name: 'Viewers', role: { name: 'viewer', permissions: [{ name: 'view', type: 'project' }] } },
    ],
  };
  let n = 0;
  const id = (p) => `${p}${++n}`;

  const server = http.createServer((req, res) => handler(req, res).catch((err) => {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: `mock crashed: ${err.message}` }));
  }));
  async function handler(req, res) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    const url = new URL(req.url, 'http://x');
    const [, service, ...rest] = url.pathname.split('/');
    const p = `/${rest.join('/')}`;
    const m = req.method;
    let body = null;
    if ((req.headers['content-type'] || '').includes('json') && raw.length) body = JSON.parse(raw.toString());
    state.requests.push(`${m} ${service}${p}`);
    const teamID = url.searchParams.get('teamID') || null;
    state.calls.push({ call: `${m} ${service}${p}`, teamID });
    const mine = (pr) => pr && (pr.team || null) === teamID;
    const send = (status, data) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(data === undefined ? '' : JSON.stringify(data));
    };
    if (req.headers.authorization !== 'Bearer test-token') return send(401, { error: 'Unauthorized.' });

    let mm;
    // ---- account
    if (service === 'account' && p === '/v1/me') {
      const t = state.teams.find((x) => x._id === teamID);
      if (teamID && !t) return send(403, { message: 'not a member of this team' });
      return send(200, {
        ...(t ? { team: { _id: t._id, isTeam: true, teamName: t.name, teamMemberRole: t.role, balance: state.teamBalance, minCreditAmount: 10000 } } : {}),
        user: { fullname: 'Test User', email: 't@example.com', isVerified: true, storage: { secretKey: 'should-not-leak' } },
        plans: {
          projects: { 'small-g2': { available: true, CPU: { amount: 0.5 }, RAM: { amount: 0.5 }, volume: 5, displayPrice: 475000 }, 'medium-g2': { available: true, CPU: { amount: 1 }, RAM: { amount: 1 }, volume: 10, price: 1000 }, old: { available: false } },
          projectBundlePlans: { 'medium-g2': { free: { available: false, displayPrice: 0 }, basic: { available: true, displayPrice: 275000 }, pro: { available: true, displayPrice: 825000 } } },
          databases: { 'db-small': { available: true } }, objectStorage: { 'storage-20': {} }, mail: { 'mail-free': {} },
        },
        databaseVersions: { postgres: ['16', '17'] }, defaultDatabaseVersions: { postgres: '17' },
      });
    }
    if (service === 'account' && p === '/v1/me/free-credit') return send(200, { remainingFreeCredit: 0 });
    // ---- billing: like the live API, it ignores teamID and answers for the user
    if (service === 'billing' && p === '/v1/billing') return send(200, { user: { balance: state.balance, accountType: 'personal', contactInfo: { phone: 'SHOULD-NOT-LEAK' }, minCreditAmount: 50000, isManualMinCredit: false } });
    // ---- iaas
    if (service === 'iaas') {
      if (m === 'GET' && p === '/plans') return send(200, { plans: { 'standard-base-g2': { available: true, monthlyPrice: 900000, hourlyPrice: 1250, volume: 30, RAM: { amount: 2 }, CPU: { amount: 1 }, IPv4MonthlyPrice: [100000] }, old: { available: false, monthlyPrice: 1 } } });
      if (m === 'GET' && p === '/oss') return send(200, { ubuntu: ['24.04', '22.04'], debian: ['12.9'], 'one-click-apps': { docker: ['29.1.2'] } });
      if (m === 'GET' && p === '/vm') return send(200, { vms: state.vms.map(({ config, IPs, ...v }) => v) });
      if (m === 'POST' && p === '/vm') {
        const v = { _id: id('vm'), name: body.name, plan: body.plan, OS: body.OS, state: 'CREATED', power: 'POWERED_ON', createdAt: 'now', config: { ...body.config, rootPassword: 'ROOT-PW-NEVER-SHOW', hostname: body.name }, IPs: [{ address: '185.1.2.3', version: '4' }] };
        state.vms.push(v);
        return send(200, { taskID: id('task') });
      }
      if ((mm = p.match(/^\/vm\/([^/]+)$/)) && m === 'GET') { const v = state.vms.find((x) => x._id === mm[1]); return v ? send(200, v) : send(404, {}); }
      if ((mm = p.match(/^\/vm\/([^/]+)$/)) && m === 'DELETE') { state.vms = state.vms.filter((x) => x._id !== mm[1]); return send(200, {}); }
      if ((mm = p.match(/^\/vm\/power\/([^/]+)$/)) && m === 'PATCH') { const v = state.vms.find((x) => x._id === mm[1]); v.power = body.action === 'start' ? 'POWERED_ON' : 'POWERED_OFF'; v.lastAction = body.action; return send(200, {}); }
      if ((mm = p.match(/^\/vm\/resize\/([^/]+)$/)) && m === 'PATCH') { state.vms.find((x) => x._id === mm[1]).plan = body.plan; return send(200, {}); }
    }
    // ---- paas
    if (service === 'paas') {
      if ((mm = p.match(/^\/v1\/projects\/([^/]+)$/)) && m === 'DELETE') { if (!mine(state.projects[mm[1]])) return send(404, {}); delete state.projects[mm[1]]; return send(200, {}); }
      if (m === 'GET' && p === '/v2/teams') return send(200, { totalTeams: state.teams.length, teams: state.teams.map((t) => ({ _id: t._id, name: t.name, color: 'blue' })) });
      if (m === 'GET' && p === '/v1/projects') return send(200, { projects: Object.values(state.projects).filter(mine) });
      if (m === 'GET' && p === '/v1/networks') return send(200, { networks: state.networks });
      if (m === 'POST' && p === '/v1/networks') {
        if (!body.networkName) return send(400, { message: '"networkName" is required' });
        state.networks.push({ _id: id('net'), name: body.networkName });
        return send(201, {});
      }
      if (m === 'POST' && p === '/v1/projects') {
        if ((teamID ? state.teamBalance : state.balance) <= 0) return send(402, { message: 'Not enough balance.' });
        if (state.projects[body.name]) return send(409, { message: 'exists' });
        if (/g2$/.test(body.planID) && !body.network) return send(400, { message: 'g2_plan_unavailable' });
        state.createdProjects.push(body);
        state.projects[body.name] = { _id: id('p'), project_id: body.name, type: body.platform, planID: body.planID, status: 'ACTIVE', envs: [], scale: 1, team: teamID };
        return send(200, {});
      }
      if ((mm = p.match(/^\/v1\/projects\/([^/]+)$/)) && m === 'GET') {
        const pr = state.projects[mm[1]];
        return mine(pr) ? send(200, { project: pr }) : send(404, { message: 'App does not exists.' });
      }
      if (m === 'POST' && p === '/v1/projects/update-envs') {
        const pr = state.projects[body.project];
        if (!mine(pr)) return send(404, {});
        pr.envs = body.variables.map((v) => ({ key: v.key, value: v.value, encrypted: false, _id: id('e') }));
        return send(200, { message: 'ok' });
      }
      if ((mm = p.match(/^\/v2\/projects\/([^/]+)\/sources$/)) && m === 'POST') {
        if (!mine(state.projects[mm[1]])) return send(404, { message: 'App does not exists.' });
        // pull the gz part out of the multipart body and list the tar entries
        const boundary = (req.headers['content-type'] || '').split('boundary=')[1];
        const start = raw.indexOf(Buffer.from([0x1f, 0x8b]));
        const end = raw.indexOf(Buffer.from(`\r\n--${boundary}`), start);
        const tar = zlib.gunzipSync(raw.subarray(start, end));
        const names = [];
        for (let off = 0; off + 512 <= tar.length;) {
          const name = tar.subarray(off, off + 100).toString().replace(/\0.*$/s, '');
          if (!name) break;
          const size = parseInt(tar.subarray(off + 124, off + 136).toString().replace(/\0.*$/s, '').trim() || '0', 8);
          names.push(name);
          off += 512 + Math.ceil(size / 512) * 512;
        }
        state.uploads.push({ app: mm[1], names });
        return send(200, { sourceID: id('src') });
      }
      if ((mm = p.match(/^\/v2\/projects\/([^/]+)\/releases$/)) && m === 'POST') {
        const rid = id('rel');
        state.releases[mm[1]] = [{ _id: rid, state: 'READY', port: body.port, type: body.type, body, createdAt: 'now', finishedAt: 'now' }, ...(state.releases[mm[1]] || [])];
        return send(200, { releaseID: rid });
      }
      if ((mm = p.match(/^\/v1\/projects\/([^/]+)\/releases$/)) && m === 'GET') {
        const list = state.releases[mm[1]] || [];
        return send(200, { total: list.length, currentRelease: list[0]?._id, releases: list });
      }
      if ((mm = p.match(/^\/v1\/projects\/([^/]+)\/logs$/))) return send(200, (state.logs?.[mm[1]] || ['listening on 3000']).map((message) => ({ type: 'stdout', datetime: '2026-10-21T10:00:00Z', message })));
      if ((mm = p.match(/^\/v2\/releases\/([^/]+)\/build-logs$/))) return state.buildLogs?.[mm[1]] ? send(200, state.buildLogs[mm[1]].map((line) => ({ line: `${line}\n` }))) : send(404, {});
      if (m === 'POST' && p === '/v1/domains') {
        const d = { _id: id('d'), name: body.name, project: { project_id: body.project }, CNameRecord: `${body.project}.liara.run` };
        state.domains.push(d);
        return send(201, { domain: d });
      }
      if (m === 'GET' && p === '/v1/domains') return send(200, { domains: state.domains });
      if ((mm = p.match(/^\/v1\/domains\/([^/]+)\/check$/))) return send(200, { domain: state.domains.find((d) => d._id === mm[1]) });
      if (m === 'POST' && p === '/v1/domains/provision-ssl-certs') return send(400, { message: 'DNS not pointing yet' });
    }
    // ---- dbaas
    if (service === 'dbaas') {
      if (m === 'POST' && p === '/v1/databases') {
        const dbid = id('db');
        state.databases[dbid] = { _id: dbid, id: dbid, hostname: body.hostname, type: body.type, planID: body.planID, version: body.version, status: 'RUNNING', publicNetwork: false, node: { host: 'db-node.liara.ir' }, port: 31000, internalPort: 5432, root_password: 'p@ss/word', username: 'root', team: teamID, network: body.network, bundlePlanID: body.bundlePlanID };
        return send(200, { databaseID: dbid });
      }
      if (m === 'GET' && p === '/v1/databases') return send(200, { databases: Object.values(state.databases).filter(mine) });
      if ((mm = p.match(/^\/v1\/databases\/([^/]+)$/)) && m === 'GET') {
        const d = state.databases[mm[1]];
        return mine(d) ? send(200, { database: d }) : send(404, {});
      }
    }
    // ---- storage
    if (service === 'storage') {
      if ((mm = p.match(/^\/api\/v1\/buckets\/([^/]+)\/check-availability$/))) return state.buckets[mm[1]] ? send(409, {}) : send(200, { status: 'ok' });
      if ((mm = p.match(/^\/api\/v1\/buckets\/([^/]+)$/)) && m === 'GET') return state.buckets[mm[1]] ? send(200, { bucket: state.buckets[mm[1]] }) : send(404, {});
      if (m === 'POST' && p === '/api/v1/buckets') { state.buckets[body.name] = { id: id('b'), name: body.name, plan: body.plan, permission: body.permission }; return send(201, { status: 'ok' }); }
      if (m === 'POST' && p === '/api/v1/keys') {
        // Like the live API: bucket names as plain strings.
        if (typeof body.buckets?.[0] !== 'string') return send(400, { message: '"buckets[0]" must be a string' });
        if (!state.buckets[body.buckets[0]]) return send(404, { message: 'bucket not found' });
        if (state.failKeys) return send(403, { message: 'access key quota reached' });
        state.keys.push(body);
        return send(201, { status: 'ok', data: { accessKey: 'AKLIARA', secretKey: 'liara-secret-123' } });
      }
    }
    // ---- dns
    if (service === 'dns') {
      if ((mm = p.match(/^\/api\/v1\/zones\/([^/]+)$/)) && m === 'GET') return state.zones[mm[1]] ? send(200, { data: state.zones[mm[1]] }) : send(404, {});
      if (m === 'POST' && p === '/api/v1/zones') { state.zones[body.name] = { id: id('z'), name: body.name, status: 'PENDING', nameServers: ['ns1.liara.ir', 'ns2.liara.ir'], currentNameServers: ['a.ns.cloudflare.com'] }; state.records[body.name] = []; return send(201, { data: state.zones[body.name] }); }
      if ((mm = p.match(/^\/api\/v1\/zones\/([^/]+)\/dns-records$/))) {
        if (m === 'GET') return send(200, { data: state.records[mm[1]] || [] });
        state.records[mm[1]].push({ id: id('r'), ...body });
        return send(201, { data: body });
      }
    }
    // ---- mail
    if (service === 'mail') {
      if (m === 'GET' && p === '/api/v1/mails') return send(200, { data: { mailServers: state.mails } });
      if ((mm = p.match(/^\/api\/v1\/mails\/([^/]+)\/check-availability$/))) return send(200, { status: 'ok' });
      if (m === 'POST' && p === '/api/v1/mails') { state.mails.push({ id: id('m'), domain: body.domain, mode: body.mode, status: 'ACTIVE' }); return send(201, { status: 'ok' }); }
      if ((mm = p.match(/^\/api\/v1\/mails\/([^/]+)$/)) && m === 'GET') {
        const ms = state.mails.find((x) => x.id === mm[1]);
        return send(200, { data: { mailServer: { ...ms, smtp_server: 'smtp.c1.liara.email', smtp_port: 587, dns_setup: { mx_record: { mx_record_value: 'mx1.liara.email' }, spf: { spf_record: 'v=spf1 include:_spf.liara.email ~all' }, dkim: { dkim_record_name: `liara._domainkey.${ms.domain}`, dkim_record: 'v=DKIM1; k=rsa; p=AAA' }, return_path: { return_path_domain: `bounce.${ms.domain}`, return_path_value: 'rp.liara.email' } } } } });
      }
      if ((mm = p.match(/^\/api\/v1\/mails\/([^/]+)\/smtp-credentials$/))) return send(201, { status: 'ok', data: { username: 'smtp-user', passowrd: 'smtp-pass-xyz' } });
      if ((mm = p.match(/^\/api\/v1\/mails\/([^/]+)\/accounts$/))) return send(201, { status: 'ok' });
    }
    // ---- ai
    if (service === 'ai') {
      if (m === 'GET' && p === '/v1/workspaces') return send(200, { workspaces: state.workspaces });
      if (m === 'GET' && p === '/v2/models') {
        // Like the live API: 20 per page, only "page" allowed.
        const extra = [...url.searchParams.keys()].filter((k) => k !== 'page' && k !== 'teamID');
        if (extra.length) return send(400, { message: `"${extra[0]}" is not allowed` });
        const all = Array.from({ length: 23 }, (_, i) => ({ id: i ? `vendor/model-${i}` : 'openai/gpt-x', name: `M${i}`, architecture: { modality: 'text->text' }, context_length: 128000, pricing: { prompt: '0.000002', completion: '0.00001' } }));
        const page = Number(url.searchParams.get('page') || 1);
        return send(200, { models: all.slice((page - 1) * 20, page * 20), page, limit: 20, total: all.length });
      }
      if (m === 'POST' && p === '/v1/workspaces') { const w = { _id: id('ws'), name: body.name, plan: body.plan, state: 'ACTIVE' }; state.workspaces.push(w); return send(200, { workspace: w }); }
      if (m === 'POST' && p === '/v1/keys') { state.aiKeys.push(body); return send(201, { name: body.name, key: 'liara-ai-key-abcdef', _id: id('k') }); }
    }
    return send(404, { message: `mock: no route for ${m} ${service}${p}` });
  }

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ url: `http://127.0.0.1:${server.address().port}`, state, close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) });
    });
  });
}
