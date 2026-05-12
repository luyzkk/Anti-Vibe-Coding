# Agents List — Plugin Subagents

13 subagent auditors available for skills to invoke via the Agent tool.
All agents are read-only unless noted. Default profile is `balanced` unless overridden.

## Subagent Auditors

| Agent | Purpose | Default Profile |
|-------|---------|----------------|
| tdd-verifier | Verifies TDD compliance (read-only) | balanced |
| documentation-writer | Creates/updates docs | balanced |
| lesson-evaluator | Evaluates lesson quality | balanced |
| security-auditor | Security audit (cryptography, secrets, ReDoS) | balanced |
| database-analyzer | Query analysis (N+1, indexes, cache) | balanced |
| api-auditor | Endpoint audit (idempotency, DTOs, REST) | balanced |
| solid-auditor | Verifies SOLID principles and design patterns | balanced |
| code-smell-detector | Detects 9 code smells with suggestions | balanced |
| react-auditor | React component audit (useEffect, memoization) | balanced |
| infrastructure-auditor | Infra audit (DNS, deploy, Docker, health checks) | balanced |
| plan-executor | [v5] Executes individual tasks with mandatory TDD | balanced |
| plan-verifier | [v5] Verifies task output (read-only, JSON output) | balanced |
| design-explorer | [v5] Architectural proposal with specific constraint | balanced |

## Model Assignment

Each agent's actual model depends on the active profile. See `docs/MODEL_PROFILES.md` for the
full matrix (quality/balanced/budget × agent). To override a single agent, edit `config/model-profiles.json`.

## Agent Files

All agent prompts live in `agents/{name}.md`. Each file has a YAML frontmatter with
`name`, `description`, `model` (fallback), and `tools`.
