# Plugin Upgrade Guide

## Installation and Updates

- **Initial install:** `/anti-vibe-coding:init` creates `.claude/.anti-vibe-manifest.json`
- **Updates:** Run `/anti-vibe-coding:init` again — it detects changes automatically
- **Tracking:** All files (CLAUDE.md, rules, agents, hooks) have SHA-256 checksums
- **Cache invalidation:** Automatic hook on project open + `/anti-vibe-coding:sync` command

## Update Strategies per File

| File | Strategy | Behavior |
|------|----------|----------|
| CLAUDE.md | **Merge** | Preserves modifications + adds new principles |
| senior-principles.md / core-beliefs.md | **Replace** | Replaces (official documentation) |
| rules/*.md | **Merge** | Preserves custom rules + adds new ones |
| hooks/*.cjs | **Replace** | Replaces (critical logic) |
| agents/*.md | **Replace** | Replaces (official prompts) |
| decisions.md | **Never** | Never touched (belongs to the project) |

## Commands

- `/anti-vibe-coding:init` — Install or update the plugin
- `/anti-vibe-coding:update` — Check update status
- `/anti-vibe-coding:sync` — Invalidate cache and show versions

**Cache invalidation:**
- Automatic hook detects updated plugin on project open
- Shows warning: "Plugin updated! Run /init"

**Automatic backup:** Everything goes to `.claude/backups/YYYY-MM-DD/` before modification.

## Stack Knowledge Layer (v6.3.2+)

`.claude/knowledge/` contains atoms copied by `/init`. When the plugin is updated and new atoms are
published, existing projects need to re-run `/init --refresh-knowledge` to receive the updates.

- **Strategy:** never overwrite automatically (preserves manual customizations)
- **Command:** run `/anti-vibe-coding:init` with flag `--refresh-knowledge`
- **What is re-copied:** 14 atoms + INDEX.md in `docs/knowledge/{stack}/`
- **What is preserved:** `.claude/stack.json` (`detected_at` does not change; `primary`/`secondary`
  only change if the project's stack changed)

## Telemetry files

`.claude/metrics/*.jsonl` files accumulate locally and are never sent anywhere. There is no
automatic rotation in v6.3.2. Recommended: remove files older than 6 months periodically.

See [docs/TELEMETRY.md](./TELEMETRY.md) for opt-out instructions (`ANTI_VIBE_TELEMETRY=off`).

## v5.x → v6.0.0 Migration

v6.0.0 introduces the harmonized docs structure:

| Before (v5.x) | After (v6.0.0) |
|---------------|----------------|
| `.planning/{date-slug}/` | `docs/exec-plans/active/{date-slug}/` |
| `lessons-learned.md` (inline) | `docs/compound/YYYY-MM-DD-slug.md` (one file per lesson) |
| `decisions.md` | `docs/design-docs/ADR-NNNN-*.md` |
| `senior-principles.md` | `docs/design-docs/core-beliefs.md` |

To migrate an existing v5 project, run `/anti-vibe-coding:init` — it detects legacy structure
and offers migration. The complete migration plan is documented at
`docs/exec-plans/completed/2026-05-11-v60-harness-compound-fusion.md`
(created in plano08-fase04).

Rollback: `git revert {migration-commit}` restores the previous structure.
Backup: `.planning.v5-backup/` is created before any mutation.
