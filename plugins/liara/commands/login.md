---
description: Log in to Liara in the browser (like `liara login`) — sign in on console.liara.ir and come back here
argument-hint: "[account-to-switch-to]"
---

Arguments: $ARGUMENTS

- If an account name is given and it is already saved (`accounts` tool), switch to it with `accounts {use: <name>}`, then run `whoami` and stop.
- Otherwise call the `liara` MCP tool `login`. Tell the user in one line: "Opening the Liara login page in your browser — sign in there and come back."
  - If it returns `waiting: true`, call `login` again (it keeps waiting on the same sign-in). If the browser didn't open, show `loginUrl` as a link.
  - When `loggedIn` is true, say which account is now active (email) and that the Liara CLI uses the same login.
- Never ask the user to paste a token into the chat.
