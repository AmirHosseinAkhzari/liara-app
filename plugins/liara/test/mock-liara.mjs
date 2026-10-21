// In-memory fake of the Liara endpoints the plugin uses. Paths are prefixed with the service name.
import http from 'node:http';
import zlib from 'node:zlib';

export function startMock() {
  const state = {
    projects: {}, databases: {}, buckets: {}, keys: [], zones: {}, records: {}, mails: [], workspaces: [], aiKeys: [], domains: [],
    uploads: [], releases: {}, requests: [],
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
    const send = (status, data) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(data === undefined ? '' : JSON.stringify(data));
    };
    if (req.headers.authorization !== 'Bearer test-token') return send(401, { error: 'Unauthorized.' });

    let mm;
    // ---- account
    if (service === 'account' && p === '/v1/me') {
      return send(200, {
        user: { fullname: 'Test User', email: 't@example.com', isVerified: true, storage: { secretKey: 'should-not-leak' } },
        plans: { projects: { 'small-g2': { available: true, CPU: 0.5, RAM: 512 }, old: { available: false } }, databases: { 'db-small': { available: true } }, objectStorage: { 'storage-20': {} }, mail: { 'mail-free': {} } },
        databaseVersions: { postgres: ['16', '17'] }, defaultDatabaseVersions: { postgres: '17' },
      });
    }
    // ---- paas
    if (service === 'paas') {
      if (m === 'GET' && p === '/v1/projects') return send(200, { projects: Object.values(state.projects) });
      if (m === 'POST' && p === '/v1/projects') {
        if (state.projects[body.name]) return send(409, { message: 'exists' });
        state.projects[body.name] = { _id: id('p'), project_id: body.name, type: body.platform, planID: body.planID, status: 'ACTIVE', envs: [], scale: 1 };
        return send(200, {});
      }
      if ((mm = p.match(/^\/v1\/projects\/([^/]+)$/)) && m === 'GET') {
        const pr = state.projects[mm[1]];
        return pr ? send(200, { project: pr }) : send(404, { message: 'App does not exists.' });
      }
      if (m === 'POST' && p === '/v1/projects/update-envs') {
        const pr = state.projects[body.project];
        if (!pr) return send(404, {});
        pr.envs = body.variables.map((v) => ({ key: v.key, value: v.value, encrypted: false, _id: id('e') }));
        return send(200, { message: 'ok' });
      }
      if ((mm = p.match(/^\/v2\/projects\/([^/]+)\/sources$/)) && m === 'POST') {
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
      if ((mm = p.match(/^\/v1\/projects\/([^/]+)\/logs$/))) return send(200, [{ type: 'stdout', datetime: '2026-10-21T10:00:00Z', message: 'listening on 3000' }]);
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
        state.databases[dbid] = { _id: dbid, id: dbid, hostname: body.hostname, type: body.type, planID: body.planID, version: body.version, status: 'RUNNING', publicNetwork: false, node: { host: 'db-node.liara.ir' }, port: 31000, internalPort: 5432, root_password: 'p@ss/word', username: 'root' };
        return send(200, { databaseID: dbid });
      }
      if (m === 'GET' && p === '/v1/databases') return send(200, { databases: Object.values(state.databases) });
      if ((mm = p.match(/^\/v1\/databases\/([^/]+)$/)) && m === 'GET') {
        const d = state.databases[mm[1]];
        return d ? send(200, { database: d }) : send(404, {});
      }
    }
    // ---- storage
    if (service === 'storage') {
      if ((mm = p.match(/^\/api\/v1\/buckets\/([^/]+)\/check-availability$/))) return state.buckets[mm[1]] ? send(409, {}) : send(200, { status: 'ok' });
      if ((mm = p.match(/^\/api\/v1\/buckets\/([^/]+)$/)) && m === 'GET') return state.buckets[mm[1]] ? send(200, { bucket: state.buckets[mm[1]] }) : send(404, {});
      if (m === 'POST' && p === '/api/v1/buckets') { state.buckets[body.name] = { id: id('b'), name: body.name, plan: body.plan, permission: body.permission }; return send(201, { status: 'ok' }); }
      if (m === 'POST' && p === '/api/v1/keys') {
        if (!body.buckets?.[0]?.id) return send(400, { message: 'bucket id required' });
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
