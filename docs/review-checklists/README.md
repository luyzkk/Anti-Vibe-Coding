# Review Checklists

Per-domain checklists for code review. Use before merging any change.

## Available Checklists

| Checklist | When to Use |
|-----------|-------------|
| `security.md` | Any change touching auth, credentials, user data, or external APIs |
| `reliability.md` | Any change touching hooks, validators, migrations, or error paths |
| `agent-api.md` | Any change to API endpoints, DTOs, or HTTP handlers |
| `frontend-ui.md` | N/A — this project has no UI |
| `production-readiness.md` | Before any release or merge to main |

Run `/anti-vibe-coding:anti-vibe-review` to invoke relevant auditors automatically.
