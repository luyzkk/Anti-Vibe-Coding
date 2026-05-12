# Architecture — Anti-Vibe Coding Plugin

A Claude Code plugin that enforces XP discipline. Organized in 6 layers:

## Layers

| Folder | Role |
|---|---|
| `skills/` | 32 skills invoked via `/anti-vibe-coding:{name}`. Each skill is a SKILL.md + optional TS helpers. |
| `agents/` | 13 subagent auditors invoked via Agent tool (tdd-verifier, security-auditor, ...). |
| `hooks/` | 7 hooks (CJS) registered in `hooks.json` for UserPromptSubmit, PostToolUse, SessionStart events. |
| `scripts/` | TS validators (`harness-validate.ts`, `compound-check.ts`), telemetry, sync utilities. |
| `rules/` | Markdown rules auto-loaded by Claude Code editor based on file pattern matching. |
| `config/` | `model-profiles.json` selects model per agent. |

## Key Files

- `AGENTS.md` — agent-facing index, ≤40 lines, in English
- `plugin-manifest.json` — file manifest with SHA-256 checksums and update strategies
- `package.json` — bun scripts: `test`, `typecheck`, `harness:validate`, `compound:check`
- `hooks/hooks.json` — hook registry

## Data Flow

1. User invokes `/anti-vibe-coding:{skill}` → skill instructions injected
2. Skill may invoke subagents from `agents/`
3. Hooks fire on events (Edit/Write/Bash) and inject suggestions or block destructive actions
4. State persisted in target project's `docs/exec-plans/`, `docs/compound/`, `docs/design-docs/`

## Directory Tree (abbreviated)

```
anti-vibe-coding/
├── AGENTS.md              ← agent-facing index (≤40 lines)
├── ARCHITECTURE.md        ← this file
├── CHANGELOG.md
├── plugin-manifest.json
├── package.json
├── agents/                ← 13 subagent auditor prompts
├── config/
│   └── model-profiles.json
├── docs/                  ← institutional docs (see docs/PLANS.md)
│   ├── exec-plans/
│   │   ├── active/        ← plans in progress
│   │   └── completed/     ← archived plans
│   ├── compound/          ← one lesson per file (frontmatter required)
│   ├── design-docs/       ← core-beliefs.md + ADR-*.md
│   └── review-checklists/ ← per-domain checklists
├── hooks/                 ← 7 CJS hooks + hooks.json
├── rules/                 ← markdown rules auto-loaded by editor
├── scripts/               ← harness-validate.ts, compound-check.ts
└── skills/                ← 32 skills, each with SKILL.md
```
