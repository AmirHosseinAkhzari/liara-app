// Automatic deploys from GitHub, the way Liara documents it (https://docs.liara.ir/paas/cicd/github/):
// a GitHub Actions workflow runs `liara deploy` with the LIARA_API_TOKEN repository secret.
// The plugin writes the workflow and checks the setup with the user's own `gh` CLI. It never
// reads, sends or stores the Liara token for GitHub: the user adds their API key themselves.
// Every gh/git call uses argument arrays (no shell), so repository names can't inject commands.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { gitInfo } from './analyze.mjs';

const WORKFLOW = '.github/workflows/liara.yaml';
const SAFE_BRANCH = /^[A-Za-z0-9._\/-]{1,100}$/;
const SAFE_APP = /^[a-z0-9][a-z0-9-]{1,60}$/;
const SAFE_TEAM = /^[a-f0-9]{24}$/i;
const PLATFORMS = new Set(['node', 'next', 'react', 'vue', 'angular', 'static', 'laravel', 'php', 'wordpress', 'django', 'flask', 'python', 'go', 'dotnet', 'docker']);

function run(cmd, args, { cwd, timeoutMs = 20_000 } = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err?.code ?? 0, stdout: String(stdout || '').trim(), stderr: String(stderr || '').trim() });
    });
  });
}
const gh = (args, opts) => run(process.env.LIARA_GH_BIN || 'gh', args, opts);

export function workflowYaml({ app, branch, port, teamId, platform, nodeVersion = '22' }) {
  if (!SAFE_APP.test(app)) throw new Error('app: lowercase letters, digits and hyphens.');
  if (!SAFE_BRANCH.test(branch)) throw new Error('branch: letters, digits, ".", "_", "-" and "/" only.');
  if (teamId && !SAFE_TEAM.test(teamId)) throw new Error('team-id must be a Liara team ID.');
  if (platform && !PLATFORMS.has(platform)) throw new Error(`Unknown Liara platform "${platform}".`);
  if (port !== undefined && port !== null && !(Number.isInteger(Number(port)) && Number(port) > 0 && Number(port) < 65536)) throw new Error('port must be a number.');
  const flags = [
    `--app="${app}"`,
    '--api-token="$LIARA_TOKEN"',
    ...(platform ? [`--platform="${platform}"`] : []),
    ...(port ? [`--port=${Number(port)}`] : []),
    ...(teamId ? [`--team-id="${teamId}"`] : []),
    '--no-app-logs',
  ];
  return `# Deploys to Liara on every push to ${branch}.
# Follows https://docs.liara.ir/paas/cicd/github/ (written by the Liara plugin for Claude).
# Needs the repository secret LIARA_API_TOKEN: your API key from https://console.liara.ir/API
name: CD-Liara
on:
  push:
    branches:
      - ${branch}
# One deploy at a time per branch; a newer push waits instead of racing the running deploy.
concurrency:
  group: liara-deploy-\${{ github.ref }}
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "${nodeVersion}"
      - name: update-liara
        env:
          LIARA_TOKEN: \${{ secrets.LIARA_API_TOKEN }}
        run: |
          npm i -g @liara/cli@9
          # Builds in Germany (packages download without limits); if that fails, tries once in Iran.
          liara deploy ${flags.join(' ')} --build-location="germany" || liara deploy ${flags.join(' ')} --build-location="iran"
`;
}

export async function inspectGithub(root) {
  const g = gitInfo(root);
  const out = { git: g, gh: null, repo: null, secret: null, protectedBranch: null, workflow: null };
  if (!g) return { ...out, problem: 'This folder is not a Git repository.' };
  const existing = path.join(root, WORKFLOW);
  out.workflow = fs.existsSync(existing) ? WORKFLOW : g.liaraWorkflows[0] ? `.github/workflows/${g.liaraWorkflows[0]}` : null;
  if (!g.github) return { ...out, problem: 'The origin remote is not a GitHub repository.' };
  const version = await gh(['--version']);
  if (!version.ok) return { ...out, gh: { installed: false }, problem: 'The GitHub CLI (gh) is not installed; the workflow can still be written, but secrets and runs cannot be checked.' };
  const auth = await gh(['auth', 'status']);
  out.gh = { installed: true, loggedIn: auth.ok };
  if (!auth.ok) return { ...out, problem: 'gh is not logged in (run `gh auth login`).' };
  const slug = `${g.github.owner}/${g.github.repo}`;
  const repo = await gh(['api', `repos/${slug}`, '--jq', '{default_branch: .default_branch, private: .private, push: .permissions.push}']);
  out.repo = repo.ok ? { slug, ...JSON.parse(repo.stdout) } : { slug, error: repo.stderr.slice(0, 200) };
  const secrets = await gh(['secret', 'list', '--repo', slug, '--json', 'name']);
  out.secret = secrets.ok ? { LIARA_API_TOKEN: JSON.parse(secrets.stdout || '[]').some((s) => s.name === 'LIARA_API_TOKEN') } : { error: secrets.stderr.slice(0, 200) };
  return out;
}

async function branchProtected(slug, branch) {
  const r = await gh(['api', `repos/${slug}/branches/${branch}/protection`]);
  return r.ok;
}

export async function setupAutoDeploy(root, { app, branch, port, teamId, platform, overwrite = false }) {
  const info = await inspectGithub(root);
  if (!info.git) throw new Error(info.problem);
  const file = path.join(root, WORKFLOW);
  const otherLiara = info.git.liaraWorkflows.filter((f) => `.github/workflows/${f}` !== WORKFLOW);
  if (otherLiara.length && !overwrite) {
    return { written: false, existing: `.github/workflows/${otherLiara[0]}`, message: 'A workflow that runs `liara deploy` already exists; not adding a second one (it would deploy twice). Pass overwrite to replace it with liara.yaml.' };
  }
  const yaml = workflowYaml({ app, branch, port, teamId, platform });
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (before && before !== yaml && !overwrite) {
    return { written: false, existing: WORKFLOW, message: `${WORKFLOW} already exists with different content; pass overwrite to replace it.` };
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, yaml);
  for (const f of overwrite ? otherLiara : []) fs.rmSync(path.join(root, '.github/workflows', f));
  const slug = info.repo?.slug;
  const isProtected = slug ? await branchProtected(slug, branch) : null;
  const steps = [];
  if (!info.secret?.LIARA_API_TOKEN) {
    steps.push(`Add your Liara API key as the repository secret LIARA_API_TOKEN: copy it from https://console.liara.ir/API${slug ? `, then paste it at https://github.com/${slug}/settings/secrets/actions/new (name LIARA_API_TOKEN), or run \`gh secret set LIARA_API_TOKEN --repo ${slug}\` in your own terminal (it asks for the value without showing it)` : ''}. Never paste it into the chat.`);
  }
  steps.push(isProtected
    ? `Branch ${branch} is protected: commit ${WORKFLOW} on a new branch and open a pull request into ${branch}.`
    : `Commit ${WORKFLOW} and push it to ${branch}; the push itself triggers the first deploy.`);
  steps.push('Then run github_autodeploy {action: "status"} to confirm the push produced a Liara release.');
  return {
    written: true,
    file: WORKFLOW,
    replaced: before !== null,
    branch,
    repo: slug || null,
    secretPresent: info.secret?.LIARA_API_TOKEN ?? null,
    branchProtected: isProtected,
    nextSteps: steps,
    docs: 'https://docs.liara.ir/paas/cicd/github/',
  };
}

// Did the last push actually deploy? Match the workflow run's commit with a Liara release.
export async function autoDeployStatus(api, root, { app, branch }) {
  const info = await inspectGithub(root);
  const slug = info.repo?.slug;
  if (!slug) return { verified: false, problem: info.problem || 'No GitHub repository found.' };
  const args = ['run', 'list', '--repo', slug, '--workflow', path.basename(info.workflow || WORKFLOW), '--limit', '5', '--json', 'databaseId,status,conclusion,headSha,headBranch,createdAt,url,event'];
  if (branch) args.push('--branch', branch);
  const runs = await gh(args);
  const list = runs.ok ? JSON.parse(runs.stdout || '[]') : [];
  const rel = await api.get('paas', `/v1/projects/${encodeURIComponent(app)}/releases`, { query: { page: 1, count: 10 } }).catch(() => null);
  const releases = (rel?.releases || []).map((r) => ({ id: r._id, state: r.state, commit: r.gitInfo?.commit || null, branch: r.gitInfo?.branch || null, createdAt: r.createdAt }));
  const latest = list[0] || null;
  const match = latest ? releases.find((r) => r.commit && r.commit === latest.headSha) : null;
  return {
    repo: slug,
    secretPresent: info.secret?.LIARA_API_TOKEN ?? null,
    latestRun: latest ? { status: latest.status, conclusion: latest.conclusion, commit: latest.headSha?.slice(0, 7), branch: latest.headBranch, url: latest.url, createdAt: latest.createdAt } : null,
    matchingRelease: match ? { id: match.id, state: match.state } : null,
    verified: Boolean(match && /^(READY|SUCCEEDED|SUCCESS|DEPLOYED|RUNNING)$/i.test(match.state)),
    verdict: !latest ? 'No workflow run yet: push a commit to the branch.'
      : latest.status !== 'completed' ? `The workflow is ${latest.status}; check again shortly.`
        : latest.conclusion !== 'success' ? `The workflow ${latest.conclusion}. Open the run (url) and read the failed step${info.secret?.LIARA_API_TOKEN === false ? '; the LIARA_API_TOKEN secret is missing' : ''}.`
          : match ? `Push ${latest.headSha.slice(0, 7)} deployed as release ${match.id} (${match.state}).` : 'The workflow succeeded but no Liara release carries its commit yet; check the app\'s releases.',
    recentReleases: releases.slice(0, 5),
    ...(runs.ok ? {} : { ghError: runs.stderr.slice(0, 200) }),
  };
}
