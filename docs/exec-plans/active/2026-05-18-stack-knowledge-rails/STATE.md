# State: Stack Knowledge Layer — Rails (v6.3.3)

**Plan:** ./PLAN.md
**PRD:** ./PRD.md
**CONTEXT:** ./CONTEXT.md
**Phase:** in-progress
**Current Plan:** 01/3
**Last Updated:** 2026-05-19 (fase-04)

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Tracer Bullet — dedup + schema + multi-stack contract + piloto + E2E | 6 | 4/6 | in-progress |
| 02 | Batch A T1 + Batch B parcial T2 + verifier + audit humano | 9 | 0/9 | pending |
| 03 | Batch C + INDEX + RF11 + E2E completo + hardening leve | 10 | 0/10 | pending |

## Progress Global

Fases done: 4/25 (16%)

## Audit Humano CA-08 (D14, D19)

| Átomo | Tier | Plano/Fase | Status | Aprovação Luiz |
|---|---|---|---|---|
| active-record-fundamentals | T1 | 02/09 | pending | — |
| action-view-and-hotwire | T2 | 02/09 | pending | — |
| action-cable-and-realtime | T3 | 03/07 | pending | — |

## Dedup Decisions (Plano01 fase-01 — aprovado por Luiz em 2026-05-18)

Subagente entregou `plano01/dedup-report.md` com achado transversal: todos os 6 pares são byte-for-byte idênticos (`diff -r` exit 0). Único discriminador é `mtime` — originais sem sufixo foram tocados ~13h depois das cópias (bulk copy às 07:55:35).

| Par | Decisão | Aprovado por | Data |
|---|---|---|---|
| rails-code-review / rails-code-review copy | manter `rails-code-review` (sem sufixo), deletar `rails-code-review copy` | Luiz | 2026-05-18 |
| rails-migration-safety / rails-migration-safety copy | manter `rails-migration-safety` (sem sufixo), deletar `rails-migration-safety copy` | Luiz | 2026-05-18 |
| rails-security-review / rails-security-review v2 | manter `rails-security-review` (sem sufixo), deletar `rails-security-review v2` | Luiz | 2026-05-18 |
| rails-stack-conventions / rails-stack-conventions v2 | manter `rails-stack-conventions` (sem sufixo), deletar `rails-stack-conventions v2` | Luiz | 2026-05-18 |
| rails-tdd-slices / rails-tdd-slices copy | manter `rails-tdd-slices` (sem sufixo), deletar `rails-tdd-slices copy` | Luiz | 2026-05-18 |
| rails-upgrade / rails-upgrade copy | manter `rails-upgrade` (sem sufixo), deletar `rails-upgrade copy` | Luiz | 2026-05-18 |

**Deleção física:** Plano 03 fase-09 (hardening). Até lá, frontmatter `sources:` dos átomos extraídos aponta apenas para o lado canônico (sem sufixo).

## Log

- 2026-05-18: PLAN.md e STATE.md criados via /anti-vibe-coding:plan-feature (3 planos, 23 fases, ~34-40h).
- 2026-05-18: plano01/ detalhado (5 fases ~8-10h) via subagente isolado.
- 2026-05-18: plano02/ detalhado (9 fases ~14-16h) via subagente isolado.
- 2026-05-18: plano03/ detalhado (9 fases, sizing somado 14h dentro do range 12-14h) via subagente isolado. Todos os 23 atomos do plano agora possuem fases criadas — pronto para /execute-plan.
- 2026-05-18: /grill-me pos-planejamento (risk resolution). 4 decisoes adicionadas ao CONTEXT.md (D22 multi-stack contract, D23 reordenacao RF11 antes do E2E, D24 perf assertion 200ms, D25 hard cap 200 linhas + backlog). Plano01 ganha +1 fase (refactor detectStack); Plano03 renumera para 10 fases. Ajuste estrutural pendente antes de /execute-plan.
- 2026-05-18: Ajuste estrutural concluido (Opcao B — edits cirurgicos). Plano01: 5→6 fases (~9.5-11.5h) com nova fase-03 (refactor multi-stack D22); fase-04 regression detector sobre novo contrato; fase-06 E2E aplica D24 perf 200ms. Plano03: 9→10 fases (~12.5-14.5h) com nova fase-08 (RF11 standalone per D23); fase-09 E2E mantem CA-04 GREEN imediato + D24 perf 200ms; fase-10 hardening cobre D25 hard cap. PLAN.md tabela Decisoes Aplicadas atualizada com D22/D23/D24/D25. Total: 23→25 fases (~36-42h). Pronto para /execute-plan.
- 2026-05-18: /execute-plan iniciado. Plano 01 status=in-progress. Spawn plan-executor para fase-01 (dedup audit, content-only).
- 2026-05-18: fase-01 concluida. Subagente entregou dedup-report.md com 6 pares auditados. Achado transversal: conteudo 100% identico (diff -r exit 0 para todos); mtime e o unico discriminador. Recomendacao uniforme aprovada por Luiz: manter sem sufixo, deletar copy/v2 (delecao fisica em Plano 03 fase-09).
- 2026-05-18: fase-02 concluida (TDD RED+GREEN). Cenario A confirmado (no helper existente — atoms-rf11-audit usa validacao inline). Criado skills/init/lib/atoms-frontmatter-validator.ts (~86 linhas, regex puro, sem libs). Criado atoms-frontmatter-schema.test.ts (6 testes) + 2 fixtures Rails dummy + stub atoms-frontmatter-validator.test.ts (TDD gate). 6/6 schema tests + 1/1 rf11 regression verde. Typecheck limpo no arquivo novo (4 erros pre-existentes em outros arquivos seguem).
- 2026-05-18: fase-03 concluida (refactor detectStack -> contrato D22 multi-stack). DetectedStack agora exporta `{ primary, secondary, signalSource, anchorFiles }`. Probes rodam todas (nao mais break-on-first) para popular `secondary`. StackId mantem 'unknown' (constraint inter-arquivo de detect-multi-stack.ts), mas `DetectedStack.primary` e tipado `Exclude<StackId, 'unknown'> | null` — invariante D22 enforced por tipos. 10 call sites atualizados (customize-architecture, state-md-init, steps/03+04, stack-id-map, e2e tracer). 12/12 detect-stack tests passam (8 adaptados + 4 novos CA-02/CA-07/CA-03/CA-21). bun test global exit=0 (zero regressoes). Precedence Rails vs Node-TS via fixture minima (sem typescript no devDeps) — Opcao C.
- 2026-05-19: fase-04 concluida (regression coverage detector Rails sobre D22). 4 test cases novos adicionados a detect-stack.test.ts: CA-06 Gemfile vazio (no crash + anchorFiles contem Gemfile), Rails legado 7.0 (classifica como rails, warning fica em RF11), robustez D10 (gem rails indentado em group block), zero falso-positivo (gem 'rails-erb' NAO matcha). **Nenhuma mudanca em detect-stack.ts** — regex `/^\s*gem\s+["']rails["']/m` ja estava correto. G1 do plano confirmado: RF3 foi regression coverage, nao nova implementacao. 16/16 detect-stack tests passam.

## Detector Rails — regression coverage (Plano 01 fase-04)

Confirmado em 2026-05-19: regex `/^\s*gem\s+["']rails["']/m` em `skills/init/lib/detect-stack.ts:98` esta presente desde Plano 02 fase-06 do projeto (commit anterior a v6.3.3). RF3 do PRD vira REGRESSION TEST conforme PLAN.md `Assumptions` linha 35.

Cobertura adicionada nesta fase (todos passam direto, sem alterar detector):
- CA-03 fallback Sinatra (Gemfile sem gem rails -> primary=null) — ja coberto na fase-03
- CA-06 Gemfile vazio (sem crash, anchorFiles contem Gemfile)
- CA-04 piloto: Rails legado 7.0 classifica como rails (warning fica em Plano03 fase-08/09 RF11)
- Robustez D10: indentacao em group block + single quote
- Zero falso-positivo: substring `gem 'rails-erb'` nao matcha (closing quote enforced pela regex)

Nenhuma mudanca em `detect-stack.ts` foi necessaria.
