# Quality Score

Update this document whenever the team materially improves or accepts quality tradeoffs.

This is a living self-assessment of the plugin, not a merge gate. For binary merge requirements see `docs/MERGE_GATES.md`.

| Area | Score | Notes | Next Action |
| --- | --- | --- | --- |
| Architecture | B | Clear split between skills/hooks/scripts/lib. Plugin-root flatten (2026-05-13) collapsed the matrix-wrapper indirection. AGENTS.md is single source of truth; CLAUDE.md mirrored via PostToolUse hook (D16). | Keep `ARCHITECTURE.md` current as new skills land; document any new top-level surface within the same PR. |
| Testing | B | 690+ tests across 97 files, validators have perf benches, fixtures pinned to LF (BUG-04). Tracer-bullet e2e covers /init happy path. | Add e2e coverage for /sync drift-detection edge cases; isolate state-md tests in tmpdir (see `TODO.md`). |
| Security | B- | Path-traversal boundary in harness-validate link checker; `.claude/settings.json` gitignored; secrets never logged. No SAST yet. | Add a `bun run secrets:scan` script and wire it into harness-validate as advisory. |
| Reliability | B | All scaffold operations are idempotent (`wx` flag, hash manifest). Symlink fallback degrades gracefully through 3 tiers (POSIX → NTFS hardlink → copy+hook). | Document failure modes for each fallback tier in `docs/RELIABILITY.md`. |
| Frontend | n/a | Plugin has no UI surface. | — |
| Docs | B | 14+ structured docs auto-scaffolded. `MEMORY.md` index stays under 200 lines (truncation guard). Compound notes have frontmatter validation. | Generate per-skill SKILL.md changelog summary when version bumps. |
| Compound Engineering | B+ | BUG-01..04 captured with Problem/Solution/Prevention. Lessons live in `docs/compound/` with frontmatter and pass `compound:check`. | Trigger `/anti-vibe-coding:lessons-learned` for each migration phase, not only post-incident. |
