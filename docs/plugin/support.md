# Privacy, support and limits

## Privacy

Full policy: [plugins/liara/PRIVACY.md](../../plugins/liara/PRIVACY.md).

In short: the plugin runs on the user's computer and has no server of its own. It contacts Liara, the user's own `gh` CLI (only for GitHub auto-deploy), package mirrors (a plain availability check, no project data) and the deployed app (health checks). It keeps the login file and an audit log locally. To remove local data, log out or delete `~/.liara-auth.json` and `~/.liara-claude/`.

## Support

- Issues: https://github.com/AmirHosseinAkhzari/liara-app/issues
- Plugin docs: [plugins/liara/README.md](../../plugins/liara/README.md)
- License: MIT

## Requirements

- Node.js 20 or newer
- For data copies: the matching dump tools (`pg_dump`/`psql`, `mysqldump`/`mysql`, `mongodump`/`mongorestore`, …) or Docker; `rclone` or Docker for buckets
- For GitHub features: the `gh` CLI, logged in

## Limits of Liara's API

The plugin says when it cannot do something instead of guessing:

| Need | What happens |
|---|---|
| Invoices, payment history | Not in the API. `billing` estimates from plan prices and links the console. |
| Paying or adding credit | Never done by the plugin. |
| Taxes and discounts | Not in the API; estimates exclude them. |
| Build logs | Uses an endpoint the Liara CLI uses but the spec doesn't publish; best effort. |
| Copying Redis, RabbitMQ, SQL Server data | Manual steps are returned instead. |
| DNS import | No "list all records" API; only common record names are copied. |
| Whether stopped apps or VPS are still charged | Not stated by the API; shown as "worth checking". |
