---
description: Create or manage a Liara cloud VPS (plans, OS, SSH keys, power, resize, delete)
argument-hint: "[create|list|start|shutdown|reboot|resize|delete] [name]"
---

Arguments: $ARGUMENTS

Use the liara-assistant skill's VPS section. For create: understand the workload, show suitable plans with monthly prices (`plans {product: "vps"}`), ask for the OS and an SSH public key, then `create_vm` (the user confirms the cost in the dialog). For other actions use `vps_list` and `vm_action`. Never show root passwords.
