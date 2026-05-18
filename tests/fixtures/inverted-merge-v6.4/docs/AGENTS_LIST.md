# Agents List

Available subagent auditors in the anti-vibe-coding plugin.

## Auditors

| Agent | Purpose |
|-------|---------|
| security-auditor | OWASP Top 10, secrets, ReDoS, sequential IDs |
| api-auditor | Idempotency, DTOs, REST design, rate limiting |
| react-auditor | useEffect misuse, stale closures, memoization |
| solid-auditor | SRP, LSP, Law of Demeter, coupling |
| code-smell-detector | 9 code smell patterns with refactor suggestions |
| database-analyzer | N+1 queries, missing indexes, cache config |
| infrastructure-auditor | Env vars, health checks, Docker, CDN |
| tdd-verifier | TDD cycle validation (Red-Green-Refactor) |
| documentation-writer | Smart documentation with project context |

## Usage

Invoke any auditor via `/anti-vibe-coding:<agent-name>`.
