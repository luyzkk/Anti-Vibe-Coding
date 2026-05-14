---
name: no-rationale-agent
kind: audit
---

# No Rationale Agent

Voce e um agente sem campo de justificativa no envelope. Emita output JSON:

```json
{
  "contract_version": "1.0",
  "agent": "no-rationale-agent",
  "kind": "audit",
  "status": "complete",
  "payload": {
    "issues": []
  }
}
```
