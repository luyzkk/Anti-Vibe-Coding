# Architecture — Anti-Vibe Coding Plugin

A Claude Code plugin that enforces XP discipline. Organized in 6 layers:

## Layers

| Folder | Role |
|---|---|
| `skills/` | 32 skills invoked via `/anti-vibe-coding:{name}`. Each skill is a SKILL.md + optional TS helpers. |
| `agents/` | 13 subagent auditors invoked via Agent tool (tdd-verifier, security-auditor, ...). Explorer + reconciler are init-internal (see `skills/init/lib/prompts/`). |
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

## Init Skill — Mode Detection

`/init` detects project state before acting. Four branches:

| Mode | Condition | Action |
|---|---|---|
| `already-initiated` | `.claude/.anti-vibe-manifest.json` exists | Delegate to `/update` |
| `v5-legacy` | `.planning/` or v5 artifacts present | Offer migrate / dry-run / skip |
| `migration` | `docs/` has ≥5 non-harness `.md` files (populated but no harness) | Migration pipeline |
| `greenfield` | None of the above | Full scaffold (Steps 1–6) |

### Migration Mode Pipeline (`skills/init/lib/`)

When mode is `migration`, the skill runs a multi-phase pipeline:

1. **Discovery** (`discovery.ts`) — scans `docs/`, root, `.claude/`, `scripts/`, `.github/` and writes `discovery/inventory.json`
2. **Explorer subagents** (`migration-planner.ts`) — up to 6 parallel subagents analyse batches of files semantically; output: `discovery/semantic-inventory.json`. Retry 1× with smaller batches on failure (DT-03)
3. **Reconciler subagents** (`reconciler.ts`) — per slot, invokes reconciler prompt to produce migration plans; output: `docs/exec-plans/active/*-migration.md`
4. **Plan writer** (`plan-writer.ts`) — renders plan files from reconciler decisions
5. **Compound writer** (`compound-writer.ts`) — validates CA-29 contract on compound notes
6. **Orchestrator writer** (`orchestrator-writer.ts`) — writes `_INIT_ORCHESTRATOR.md` with topological execution order (5 tiers)
7. **Manifest writer** (`manifest-writer.ts`) — writes `.claude/.anti-vibe-manifest.json` with `initMode: "migration"`, plan catalog, and SHA-256 checksums
8. **Idempotency** (`idempotency.ts`) — on re-run: regenerates discovery, skips human-edited files and active plans

`autoFlipIfComplete` flips `initMode: "migration" → "completed"` once all plans are moved to `completed/`.

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
    └── init/
        ├── SKILL.md       ← routing via detectInitMode (4 branches)
        ├── assets/        ← templates + snippets
        ├── __fixtures__/  ← 5 mock repos for migration mode tests
        └── lib/           ← migration mode pipeline helpers
            ├── migration-mode-detector.ts
            ├── discovery.ts
            ├── migration-planner.ts  ← Explorer subagents (parallel, cap 6)
            ├── reconciler.ts         ← Reconciler subagents (per slot)
            ├── plan-writer.ts
            ├── compound-writer.ts
            ├── orchestrator-writer.ts
            ├── manifest-writer.ts
            ├── idempotency.ts
            ├── audit-log.ts
            └── prompts/              ← explorer.md, reconciler.md, compound.md
```
