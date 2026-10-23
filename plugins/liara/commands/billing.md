---
description: Balance, estimated monthly spend and resources worth checking on the current Liara account or team
---

Use the liara-assistant skill: call `billing`, show the balance, the estimated monthly and daily total with how long the balance lasts, the resources with their prices, and anything worth checking. Say that invoices and real charges are in the Liara console (no API), with the link.

If `lowBalance` is true, ask with buttons (AskUserQuestion) how long the services should keep running: **10 days**, **30 days**, or **Other** (a number of days the user types). Show the matching quote from `topUp.quotes`, or call `billing {days}` for Other: the cost for that period and the credit to add in Toman and in Rial (the console's top-up field takes Rial), with the console link and `topUp.docs`. Change nothing and never pay.
