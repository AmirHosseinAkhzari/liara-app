---
description: Write a static HTML report (Liara branding, Persian or English) of what the Liara plugin did in this session
argument-hint: "[fa|en]"
---

Arguments: $ARGUMENTS

Call the `liara` MCP tool `write_report` for the current project with `lang` from the argument (default: the language the user writes in) and the right `operation` (deployment, vps, troubleshooting, configuration or other). Pass only the narrative: what the user asked, what was accomplished (say honestly what failed or was skipped), issues with their evidence-based cause and fix, remaining manual steps, and docs links from `docs_search`. Then attach the file with SendUserFile (display "attach") and say where it is saved.
