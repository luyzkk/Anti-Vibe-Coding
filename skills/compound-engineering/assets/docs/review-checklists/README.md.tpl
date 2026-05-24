# Review Checklists

Domain-specific checklists used during code review and pre-release verification.

## Available Checklists

| Checklist | When to use |
|-----------|-------------|
| `security.md` | Any change touching auth, input handling, secrets, or dependencies |
| `reliability.md` | Any change to error handling, retries, or SLO-critical paths |
| `agent-api.md` | Any change to agent-facing APIs or AGENTS.md instructions |
| `frontend-ui.md` | Any UI change; accessibility and performance checks |
| `production-readiness.md` | Pre-release gate for all production deployments |

## Usage

Work through the relevant checklist before marking a PR ready for review. Check off items as you verify them. Leave unchecked items with a comment explaining why they do not apply.
