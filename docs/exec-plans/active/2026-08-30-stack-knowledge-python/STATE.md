# State: Stack Knowledge Python

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 01/4
**Last Updated:** 2026-08-30

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Infra + Validador + Piloto + Tracer Bullet | 6 | 1/6 | in-progress |
| 02 | Atoms T1 + verifier + rastreio ECC | 6 | 0/6 | pending |
| 03 | Atoms T2 (waves) + verifier | 10 | 0/10 | pending |
| 04 | Atoms T3 + INDEX final + audit humano + E2E full | 7 | 0/7 | pending |

## Progress Global

Fases done: 1/29 (3%)

## Audit Humano (Plano 04 fase-06)

Assinatura do dev exigida antes do closeout (RF5, CA-08). Pendente.

- [ ] `security-fastapi-owasp` — Aprovado por Luiz em ____-__-__
- [ ] `sqlalchemy-async-and-orm` — Aprovado por Luiz em ____-__-__
- [ ] `debugging-pdb-debugpy` — Aprovado por Luiz em ____-__-__

## Log

- 2026-08-30: Plano criado via /plan-feature; 11 decisões do CONTEXT (grill-me) + PRD aprovado na mesma sessão; estrutura de 4 planos aprovada pelo dev
- 2026-08-30: 4 planos detalhados via subagentes isolados (cada um herdando o README do anterior): plano01 (6 fases, ~8.5h), plano02 (6 fases, ~9h), plano03 (10 fases, ~14.5h), plano04 (7 fases, ~10.5h). Total 29 fases, ~42.5h nominal. Gotchas G1-G26 acumulados nos READMEs. `bun run harness:validate` verde pós-geração (374 md). Achado do plano04: G18 — INDEX final deve começar com H1 na linha 1 (`stack-aware-preface.ts:37` exige `startsWith('# ')`; INDEX do Rails tem comentário HTML antes do H1, defeito herdável que o Python evita). Pronto para /execute-plan.
- 2026-08-30: Execução iniciada — branch `feat/stack-knowledge-python-plano01`. Plano 01 fase-00 (pré-RED audit) **concluída**. Baseline verde nos 4 gates: `bun run test` 1787 pass / 0 fail (265 arquivos), `bun run typecheck` limpo, `harness:validate` passed (28 required, 374 md), `compound:check` passed (55 notas). Audit catalogou **1 único afetado** (`scripts/harness-validate.ts` `checkKnowledgePresence` — confirma G1/bundle) e ~25 não-afetados verificados individualmente. Premissa 1 do PRD confirmada por leitura (`python` já em `MATRIX_FOLDER_VALUES`, `probePython` ativo, AbortError em `copy-knowledge.ts:81`). Commits: `7490ea5` (docs do plano) + `b68ca5f` (audit-report, 1 arquivo). Desvio favorável DEV-1: GT-01 de typecheck não reproduz mais. Gotchas novos: GT-1 (destructive-guard bloqueia heredoc de documentação), GT-2 (`bun test` builtin ≠ `bun run test`), GT-3 (harness:validate não faz crawl de exec-plans).
