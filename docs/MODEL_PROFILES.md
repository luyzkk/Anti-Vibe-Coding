# Model Profiles

The plugin supports model profiles that optimize cost vs. quality per agent.

## Available Profiles

| Profile | Description | Recommended Use |
|---------|-------------|-----------------|
| `quality` | Opus for critical auditors, Sonnet for the rest | Critical features, releases, security audits |
| `balanced` | Sonnet for critical auditors, Haiku for the rest | Daily development (default) |
| `budget` | Sonnet only for security and execution, Haiku for the rest | Non-critical work, prototypes |

## Agent Model by Profile

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| security-auditor | opus | sonnet | sonnet |
| solid-auditor | opus | sonnet | haiku |
| api-auditor | opus | sonnet | haiku |
| database-analyzer | sonnet | sonnet | haiku |
| plan-executor | opus | sonnet | sonnet |
| plan-verifier | sonnet | haiku | haiku |
| design-explorer | sonnet | sonnet | haiku |
| react-auditor | sonnet | haiku | haiku |
| code-smell-detector | sonnet | haiku | haiku |
| tdd-verifier | sonnet | sonnet | haiku |
| infrastructure-auditor | sonnet | sonnet | haiku |
| lesson-evaluator | haiku | haiku | haiku |
| documentation-writer | sonnet | haiku | haiku |

## How to Configure

Edit `config/model-profiles.json`:
- Switch active profile: change `"default"` field to `"quality"`, `"balanced"`, or `"budget"`
- Customize per agent: edit a specific agent's model inside the desired profile

## How It Works

1. Skills read `config/model-profiles.json` when invoking agents
2. They resolve the agent model based on the active profile
3. Model is passed via the `model` parameter of the Agent tool
4. If config does not exist, falls back to the model in the agent's frontmatter (backward compat)

Technical details in `skills/lib/model-profile-utils.md`.
