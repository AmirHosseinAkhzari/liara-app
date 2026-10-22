// Loaded before every test file (see package.json): keep tests away from the real
// ~/.liara-auth.json and from any Liara token in the shell.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-test-home-'));
process.env.LIARA_AUTH_FILE ||= path.join(dir, 'auth.json');
delete process.env.LIARA_API_TOKEN;
delete process.env.LIARA_TOKEN;
delete process.env.LIARA_TEAM_ID;
