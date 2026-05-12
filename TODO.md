# TODO

- [ ] {2026-05-12} {file:IMPLEMENTACAO-VERSIONAMENTO.md} consolidate IMPLEMENTACAO-VERSIONAMENTO.md + MUDANCAS-RECENTES.md + INSTRUCOES-SINCRONIZACAO.md + COMO-ATUALIZAR.md into docs/UPGRADE.md and docs/HISTORY.md (08-A5)
- [ ] {2026-05-12} {feature:plugin} verify hooks/state-md-hook.cjs is firing correctly on docs/ edits (G15)
- [ ] {2026-05-12} {feature:plugin} v6.1 — implement hooks/pre-tool-use-destructive-guard.cjs (D29 item 7, deferred from plano08-fase01 audit)
- [ ] {2026-05-12} {feature:plugin} create hooks/agents-md-sync.cjs so CLAUDE.md re-syncs on AGENTS.md edits (Tier 3 copy was installed — Tier 1 symlink fails on Windows without dev mode)
- [ ] {2026-05-12} {file:lessons-learned.md.original} migrate BUG-02 (lesson about code blocks in prompts) from `.planning.v5-backup/lessons-learned.md.original` to `docs/compound/` — not covered in fase-05 spec (only 5/6 lessons migrated)
- [ ] {2026-05-12} {feature:validator} extend harness-validate.ts to detect missing H1 inside skill body (post-frontmatter+comments) without false positives on intentional partial files
