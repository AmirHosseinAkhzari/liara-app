# Privacy policy — Liara plugin for Claude

Last updated: 2026-10-23

This is a community plugin by AmirHossein Akhzari. It is not made or endorsed by Liara. It runs on your own computer and has no server of its own: the author receives none of your data.

## What it sends, and where

The plugin only contacts these services, and only to do what you ask:

| Where | What is sent | When |
|---|---|---|
| Liara (`*.liara.ir`, `liara.online`, `*.liara.space`) | Your Liara login token, and the requests needed for the task: app and service settings, env vars you approve, and your project's source when you deploy (never `.env` files) | Every Liara action, such as deploy, prices, billing, VPS, docs or status |
| GitHub, through your own `gh` CLI | Workflow files and repository settings for auto-deploy | Only when you set up GitHub auto-deploy |
| Package mirrors (for example `mirror-npm.runflare.com`, `mirror.kargadan.ir`, `package-mirror.liara.ir`) | A plain request to see whether the mirror answers. No project data | When choosing mirrors for an Iran build |
| Your deployed app and its domains | Ordinary HTTPS requests | When verifying a deploy |

Your conversation with Claude is handled by Anthropic under Anthropic's own terms. Everything you send to Liara is handled under [Liara's terms and privacy policy](https://liara.ir/).

## What it keeps on your computer

- `~/.liara-auth.json`: your Liara login (file mode 600), shared with the Liara CLI.
- `~/.liara-claude/`: an audit log of actions that changed your account, and deployment reports.
- Reports and the live progress page are local files or served on `127.0.0.1` behind a secret link.

Secret values are masked in chat, dialogs, logs, the audit file and reports. The plugin has no analytics and no tracking.

## Deleting your data

Ask Claude to log out of Liara, or delete `~/.liara-auth.json` and `~/.liara-claude/`. To delete data held by Liara, use the Liara console.

## Contact

Open an issue at https://github.com/AmirHosseinAkhzari/liara-app/issues.
