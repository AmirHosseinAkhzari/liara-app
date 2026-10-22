---
description: Run a service Liara has no managed product for (Neo4j, n8n, Meilisearch, Qdrant, Typesense or any Docker image) next to your app
argument-hint: "<service or image> [app]"
---

Arguments: $ARGUMENTS

Use the liara-deploy skill's "Services Liara doesn't manage" step: check `scan_project` dockerServices for the image tag, ports and data folders, show the plan with its monthly cost (`plans`, `estimate_cost`), then `deploy_service {name: "<app>-<service>", service | image, planID, bundlePlanID, connectTo: <app>}`. Mention Liara's ready-made app when one exists. Then `verify_app` on the main app.
