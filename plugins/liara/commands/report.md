---
description: Write an HTML report of what the Liara plugin did in this session (a deployment gets the Persian page with cards and charts)
argument-hint: "[fa|en]"
---

Arguments: $ARGUMENTS

Call the `liara` MCP tool `write_report` for the current project with the right `operation` (deployment, vps, troubleshooting, configuration or other) and `lang` from the argument (default: the language the user writes in). A deployment always gets the Persian deployment page: cards and charts only (plans bought, cost per service, balance and days left with a top-up button when low, service map), whatever `lang` says. For other operations pass only the narrative: what the user asked, what was accomplished (say honestly what failed or was skipped), issues with their evidence-based cause and fix, remaining manual steps, and docs links from `docs_search`. Then attach the file with SendUserFile (display "attach") and say where it is saved.
