# State: Adaptive Coaching (v6.3.0)

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 01/05
**Last Updated:** 2026-05-15 (Plano 01 fase-03 concluída)

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Fundação Adaptativa | 4 | 3/4 | in-progress |
| 02 | /init produz capabilities.json | 3 | 0/3 | pending |
| 03 | /parity-audit + tool-registry-inspector | 3 | 0/3 | pending |
| 04 | profile-aware-preface ×4-6 skills | 4 | 0/4 | pending |
| 05 | Polish & DX (Could Haves) | 3 | 0/3 | pending |

## Progress Global

Fases done: 3/17 (18%)

## Log

- 2026-05-14: Plano criado via /plan-feature
- 2026-05-14: Plano 01 detalhado (4 fases) via /plan-feature
- 2026-05-14: Plano 02 detalhado (3 fases) via /plan-feature
- 2026-05-15: Plano 03 detalhado (3 fases) via /plan-feature
- 2026-05-15: Plano 04 detalhado (4 fases) via /plan-feature
- 2026-05-15: Plano 05 detalhado (3 fases) via /plan-feature — Could Haves, defer-friendly v6.3.0/v6.3.1
- 2026-05-15: Plano 01 fase-01 (preface-context-helper) concluída — commit 441baee, TDD RED→GREEN, typecheck limpo. DEV-01: `bun run lint` substituído por `bun run typecheck` (script inexistente).
- 2026-05-15: Execução pausada pelo dev após fase-01. Próxima retomada: Plano 01 fase-02.
- 2026-05-15: Plano 01 fase-02 (json-schemas + discovery/) concluída — commit 8106c34, 4 arquivos (153 insertions), 4/4 checks pass, typecheck limpo. Sem TDD (setup config).
- 2026-05-15: Plano 01 fase-03 (ADR-0020 + framework canônico) concluída — commit b64007d, 3 arquivos (317 insertions), 6/6 checks pass, harness:validate OK. Sem TDD (fase documental). DI-04: index.md ganhou seção Canonical Docs e entrada faltante de ADR-0002. DEV-02: spec listava "Verbatim original" no template do index.md; substituído por "References" para refletir formato do ADR-0020 (ADR-0001 mantém Verbatim, ADR-0002/0020 usam References).
