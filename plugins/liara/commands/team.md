---
description: List your Liara teams and choose whether to work in a team or your personal account
argument-hint: "[team-name | personal]"
---

Arguments: $ARGUMENTS

- With an argument: call the `liara` MCP tool `teams {use: "<argument>"}` (team ID, team name, or "personal"). Say in one line where Claude will now create and deploy things, and that team resources are billed to the team.
- Without one: call `teams`, show a short table (team, your role, can deploy?) with the personal account first and mark the current one, then ask with AskUserQuestion which one to use (personal account first and recommended, then each team where `canDeploy` is true) and call `teams {use}` with the answer.
- If a team can't be used (`canDeploy` false), say the user's role there.
- The next deploy saves the choice in the project's liara.json as "team-id", the same key the Liara CLI uses.
