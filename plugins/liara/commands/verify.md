---
description: Check that a deployed Liara app really works, and diagnose it if not
argument-hint: "[app]"
---

Arguments: $ARGUMENTS

Call `verify_app {app, path: "."}` (app from the argument or liara.json). Report each check (passed / failed) and what could not be verified. If anything failed, call `diagnose {app, path: "."}`, explain the cause with its evidence, and propose the smallest fix; apply it only with the user's OK, then redeploy and verify again.
