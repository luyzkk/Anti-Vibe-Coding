# TODO

- [ ] {2026-05-12} {file:IMPLEMENTACAO-VERSIONAMENTO.md} consolidate IMPLEMENTACAO-VERSIONAMENTO.md + MUDANCAS-RECENTES.md + INSTRUCOES-SINCRONIZACAO.md + COMO-ATUALIZAR.md into docs/UPGRADE.md and docs/HISTORY.md (08-A5)
- [ ] {2026-05-12} {feature:plugin} verify hooks/state-md-hook.cjs is firing correctly on docs/ edits (G15)
- [ ] {2026-05-12} {feature:plugin} v6.1 — implement hooks/pre-tool-use-destructive-guard.cjs (D29 item 7, deferred from plano08-fase01 audit)
- [ ] {2026-05-12} {feature:plugin} create hooks/agents-md-sync.cjs so CLAUDE.md re-syncs on AGENTS.md edits (Tier 3 copy was installed — Tier 1 symlink fails on Windows without dev mode)
- [ ] {2026-05-12} {file:lessons-learned.md.original} migrate BUG-02 (lesson about code blocks in prompts) from `.planning.v5-backup/lessons-learned.md.original` to `docs/compound/` — not covered in fase-05 spec (only 5/6 lessons migrated)
- [ ] {2026-05-12} {feature:validator} extend harness-validate.ts to detect missing H1 inside skill body (post-frontmatter+comments) without false positives on intentional partial files
- [ ] {2026-05-12} {file:.github/workflows/harness.yml} pin actions/checkout and oven-sh/setup-bun to commit SHAs (supply-chain hardening; verify v4 latest SHA from github.com/actions/checkout/releases and v1 SHA from github.com/oven-sh/setup-bun/releases; consider Dependabot pinning:digest) — verify-work plano08 ALTO findings 2,3
- [ ] {2026-05-12} {file:scripts/harness-validate.ts} add path-traversal boundary check at link checker L235 (`if (!abs.startsWith(root + path.sep) && abs !== root) return`) + sync .tpl — verify-work plano08 ALTO finding 1
- [ ] {2026-05-12} {file:scripts/harness-validate.ts} add last-synced-hash guardrail comment + unit test for looksCompleteInline (prevents drift vs orphan-plan-detector.ts canonical) — verify-work plano08 ALTO finding 5
- [ ] {2026-05-12} {file:scripts/compound-check.ts} replace parseYamlInline with js-yaml (already in deps) to close bypass surface — verify-work plano08 MEDIO
- [ ] {2026-05-12} {file:AGENTS.md} reformulate L29 from direct agent instruction to "ask the human to run /lessons-learned" — prompt-injection surface — verify-work plano08 MEDIO
- [ ] {2026-05-12} {file:scripts/generate-manifest.js} teach generator to emit `skills` top-level index automatically (scan SKILL.md frontmatter for name/version/description) so regeneration does not require manual patch — surfaced by Plano 09 fase-03 regression (tests/todo-pick.test.ts:61-82)
