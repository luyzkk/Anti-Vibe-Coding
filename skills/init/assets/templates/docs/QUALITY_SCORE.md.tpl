# Quality Score

Update this document whenever the team materially improves or accepts quality tradeoffs.

This is a living self-assessment of the project, not a merge gate. For binary merge requirements see `docs/MERGE_GATES.md`.

| Area | Score | Notes | Next Action |
| --- | --- | --- | --- |
| Architecture | C | Replace with repo-specific assessment. | Document actual package boundaries. |
| Testing | C | Replace with repo-specific assessment. | Define minimum automated coverage expectations. |
| Security | C | Replace with repo-specific assessment. | Record auth, secret, and dependency posture. |
| Reliability | C | Replace with repo-specific assessment. | Define failure modes and alert ownership. |
| Frontend | C | Replace with repo-specific assessment. | Document design-system source of truth. |
| Docs | B | Starter docs exist but are still generic. | Tailor them during project setup. |

## How to use this dashboard

- Letter grades (A/B/C/D/F) with optional `+` or `-` modifiers.
- `Notes` records the honest current state, including accepted tradeoffs.
- `Next Action` records one concrete step to raise the score, owned by the team.
- Bump scores up only when evidence supports it (tests added, audit passed, etc.).
- Drop scores down when reality regresses — this dashboard is honest, not aspirational.
