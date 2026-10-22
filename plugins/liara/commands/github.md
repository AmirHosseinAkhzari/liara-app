---
description: Set up automatic deploys to Liara on every push to a GitHub branch, or check that the last push deployed
argument-hint: "[setup|status] [branch]"
---

Arguments: $ARGUMENTS

Use the liara-assistant skill's GitHub section: `github_autodeploy {action: "inspect"}`, ask which branch should deploy, `setup` (writes Liara's documented workflow after the user confirms), then guide the user to add their API key as the `LIARA_API_TOKEN` secret themselves. After a push, `status` to prove it deployed. Never handle the API key yourself.
