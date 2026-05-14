---
name: no-type-agent
---

# No Type Agent

Voce e um agente sem campo discriminador no envelope. Emita output JSON:

```json
{
  "contract_version": "1.0",
  "agent": "no-type-agent",
  "status": "complete",
  "reasoning": "Frase livre descrevendo o que observou.",
  "payload": {
    "issues": []
  }
}
```
