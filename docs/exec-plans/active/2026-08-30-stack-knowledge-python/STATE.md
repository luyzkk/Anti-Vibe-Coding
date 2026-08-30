# State: Stack Knowledge Python

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 04/4
**Last Updated:** 2026-08-30

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Infra + Validador + Piloto + Tracer Bullet | 6 | 6/6 | completed |
| 02 | Atoms T1 + verifier + rastreio ECC | 6 | 6/6 | completed |
| 03 | Atoms T2 (waves) + verifier | 10 | 10/10 | completed |
| 04 | Atoms T3 + INDEX final + audit humano + E2E full | 7 | 0/7 | pending |

## Progress Global

Fases done: 22/29 (76%)

## Audit Humano (Plano 04 fase-06)

Assinatura do dev exigida antes do closeout (RF5, CA-08). Pendente.

- [ ] `security-fastapi-owasp` — Aprovado por Luiz em ____-__-__
- [ ] `sqlalchemy-async-and-orm` — Aprovado por Luiz em ____-__-__
- [ ] `debugging-pdb-debugpy` — Aprovado por Luiz em ____-__-__

## Log

- 2026-08-30: Plano criado via /plan-feature; 11 decisões do CONTEXT (grill-me) + PRD aprovado na mesma sessão; estrutura de 4 planos aprovada pelo dev
- 2026-08-30: 4 planos detalhados via subagentes isolados (cada um herdando o README do anterior): plano01 (6 fases, ~8.5h), plano02 (6 fases, ~9h), plano03 (10 fases, ~14.5h), plano04 (7 fases, ~10.5h). Total 29 fases, ~42.5h nominal. Gotchas G1-G26 acumulados nos READMEs. `bun run harness:validate` verde pós-geração (374 md). Achado do plano04: G18 — INDEX final deve começar com H1 na linha 1 (`stack-aware-preface.ts:37` exige `startsWith('# ')`; INDEX do Rails tem comentário HTML antes do H1, defeito herdável que o Python evita). Pronto para /execute-plan.
- 2026-08-30: Execução iniciada — branch `feat/stack-knowledge-python-plano01`. Plano 01 fase-00 (pré-RED audit) **concluída**. Baseline verde nos 4 gates: `bun run test` 1787 pass / 0 fail (265 arquivos), `bun run typecheck` limpo, `harness:validate` passed (28 required, 374 md), `compound:check` passed (55 notas). Audit catalogou **1 único afetado** (`scripts/harness-validate.ts` `checkKnowledgePresence` — confirma G1/bundle) e ~25 não-afetados verificados individualmente. Premissa 1 do PRD confirmada por leitura (`python` já em `MATRIX_FOLDER_VALUES`, `probePython` ativo, AbortError em `copy-knowledge.ts:81`). Commits: `7490ea5` (docs do plano) + `b68ca5f` (audit-report, 1 arquivo). Desvio favorável DEV-1: GT-01 de typecheck não reproduz mais. Gotchas novos: GT-1 (destructive-guard bloqueia heredoc de documentação), GT-2 (`bun test` builtin ≠ `bun run test`), GT-3 (harness:validate não faz crawl de exec-plans).
- 2026-08-30: Plano 01 fases 01+02+03 concluidas e commitadas juntas em `00f4d07` (commit bundle obrigatorio — G1). **fase-01:** `knowledge/python/INDEX.md` skeleton PT-BR (51 linhas, cap 100) com preambulo D2 FastAPI-native; nasce a 4a matrix. **fase-02:** validador aceita `python_versions` (TDD — RED com 3 assertion failures reais, GREEN com helper parametrizado); mensagens de `rails_versions` preservadas byte a byte. **fase-03:** atomo piloto `async-and-concurrency` destilado do compass 63884763 (506 -> 182 linhas de corpo, cap 200) com anti-drift verbatim; **verifier refined 5/5 (100%)** na v1, zero ciclos de rework. Gates verdes: `bun run test` 1794 pass / 0 fail, typecheck limpo, `harness:validate` 376 md (era 374 — G1 fechado), `compound:check` 55 notas. Desvio DI-3: snippet da fase-02 no plano hardcodeava o exemplo da mensagem de erro e teria mudado a mensagem do Rails — **doc da fase-02 corrigido em disco**. Backlog do cap (5 regras da fonte) registrado no TODO.md.
- 2026-08-30: **Plano 01 CONCLUIDO (6/6).** fase-04 — fixtures `python-fastapi-fixture` (pyproject, `requires-python = ">=3.12"`) e `python-requirements-fixture` (requirements-only) + tracer e2e 4/4 verde em `678089e`: **Premissa 1 PROVADA** — `/init` em projeto Python resolve sem AbortError, `primary='python'`, INDEX + piloto copiados, com ZERO mudanca em copyKnowledge/detect-stack/preface/telemetria. fase-05 — `extractPythonVersionWarning` (TDD, RED com 3 assertion failures) com parse conservador R7 (`^3.10` nao avisa por nao ser PEP 440) + branch python no orquestrador + `GEMFILE_MAX_BYTES` -> `MANIFEST_MAX_BYTES`; RF10 confirmado por teste (telemetria `knowledge_copied` ja sai com `stack='python'` e `atom_count` correto sem mudanca de codigo) em `6486811`. Suite final: **1809 pass / 0 fail** (baseline era 1787), typecheck limpo, harness 376 md, compound 55 notas. **Go para o Plano 02.**
- 2026-08-30: **Plano 02 CONCLUIDO (6/6).** 5 atomos T1 destilados em 2 waves paralelas (fases 01-03 e 04-05), todos com clausula anti-drift verbatim. **Verifier batch: 4 atomos 5/5 e 1 atomo 4/5 — 5 de 5 PASS, G12 nao disparou, zero ciclos v2.** Uma falha real de conteudo (security: CVE-2024-53981 pareada com fix de regex, quando a fonte a atribui a logging por byte em loop — modo de falha "ID como fachada de rastreio") + 4 warns de amplificacao de tom, todos corrigidos cirurgicamente. **Rastreio ECC (RF12) BEM-SUCEDIDO:** ECC = Everything Claude Code, repo `affaan-m/ECC`, licenca **MIT** — entrada verbatim adicionada ao THIRD-PARTY-NOTICES.md; risco D5 resolvido, nao so aceito. Achado extra: upstream em ingles, copias locais sao traducoes ES (dupla derivacao, permitida por MIT). Gates: 1809 pass / 0 fail, typecheck limpo, harness 381 md, compound 55. Backlog do cap dos 5 atomos + 2 atomos no teto + defeito do link checker vs generics PEP 695 registrados no TODO.md.
- 2026-08-30: **Plano 03 CONCLUIDO (10/10).** 9 atomos T2 em 3 waves paralelas. **Verifier batch: 9/9 em 5/5 — zero falhas de conteudo, G12 nao disparou, zero ciclos v2** (45 claims amostradas, 45 rastreadas). A matrix python vai a **15 atomos**. A clausula de preservacao de hedge, introduzida neste plano a partir do achado do Plano 02, derrubou a incidencia de warn de tom de 80% dos atomos (4/5) para 22% (2/9); os 2 warns foram corrigidos e 1 terceiro foi aceito com justificativa (ADD COLUMN espelha a Justificativa categorica da fonte, e a distincao volatil/nao-volatil esta intacta). **Correcao de plano:** o rotulo "Percival vs Bayer" da fase-03 estava errado — a fonte atribui o lado "sessao direta" ao tutorial do FastAPI; Bayer so aparece em contexto de Alembic. Corrigido em 3 docs. **Lacuna fechada:** a subarea "constraints vs validacao na aplicacao" nao estava em nenhum dos dois atomos que dividem a fonte; alocada em migrations. **Divergencia cross-atomo registrada, nao harmonizada** (formula de pool: piloto tem "x replicas", PERF-DB-02 so "workers" — compativeis, nao contraditorias). Gates: 1809 pass / 0 fail, typecheck limpo, harness 390 md, compound 55. 4 itens novos no TODO, incl. o sub-escopo da fase-08 e os SEIS atomos no teto do cap.
