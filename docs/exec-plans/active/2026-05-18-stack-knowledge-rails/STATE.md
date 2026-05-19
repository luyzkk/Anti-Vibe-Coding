# State: Stack Knowledge Layer — Rails (v6.3.3)

**Plan:** ./PLAN.md
**PRD:** ./PRD.md
**CONTEXT:** ./CONTEXT.md
**Phase:** in-progress
**Current Plan:** 03/3 (Planos 01-02 concluidos)
**Last Updated:** 2026-05-18 (Plano 02 concluido — Batch A+B parcial aprovado, transicao para Plano 03)

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Tracer Bullet — dedup + schema + multi-stack contract + piloto + E2E | 6 | 6/6 | done |
| 02 | Batch A T1 + Batch B parcial T2 + verifier + audit humano | 9 | 9/9 | done |
| 03 | Batch C + INDEX + RF11 + E2E completo + hardening leve | 10 | 0/10 | pending |

## Progress Global

Fases done: 15/25 (60%)

## Audit Humano CA-08 (D14, D19)

| Átomo | Tier | Plano/Fase | Status | Aprovação Luiz |
|---|---|---|---|---|
| active-record-fundamentals | T1 | 02/09 | approved | 2026-05-18 |
| action-view-and-hotwire | T2 | 02/09 | approved | 2026-05-18 |
| action-cable-and-realtime | T3 | 03/07 | pending | — |

## Audit Humano CA-08 (Plano 02 — aprovado por Luiz em 2026-05-18)

| Átomo | Tier | Aprovado por Luiz em | Notas |
|-------|------|---------------------|-------|
| active-record-fundamentals | T1 | 2026-05-18 | OK — 3/3 claims cross-check rastreadas (verifier auditou 5/5 contra rails-code-review/REVIEW_CHECKLIST.md + rails-expert/SKILL.md + rails-stack-conventions/SKILL.md) |
| action-view-and-hotwire | T2 | 2026-05-18 | OK — 3/3 claims cross-check rastreadas (verifier auditou 5/5 contra form_helpers.md + layouts_and_rendering.md + working_with_javascript_in_rails.md + compass wf-a0aa55c4) |

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
- 2026-05-19: fase-05 concluida (piloto rails-conventions-and-magic via subagente extrator). Atom criado em `docs/knowledge/rails/atoms/rails-conventions-and-magic.md` (108 linhas, 5 H2, 9 frontmatter fields, rails_versions=['>=7.1']). Anti-drift clause aplicada verbatim do compound 2026-05-16. Subagente reportou todas as claims rastreaveis aos 3 sources (SKILL.md + 2 compass artifacts). `validateAtomFrontmatter` retorna `{ valid: true, errors: [] }`. 6/6 schema tests continuam verdes. INDEX.md skeleton criado com nota de provisoriedade (INDEX final D9 fica em Plano 03 fase-06).
- 2026-05-19: fase-06 concluida (verifier refined + E2E tracer). Verifier subagente auditou 38 claims tecnicas, 38/38 rastreaveis (100% — meta D12 era >=80%). Report em `plano01/verifier-report-fase06.md`. E2E tracer test `tests/e2e/stack-knowledge-rails-tracer.test.ts` cobre CA-02 (perf), CA-09 (graceful degradation), CA-11 (regressao Node) + regression frontmatter — 4/4 passam. CA-02 medido: avg 6.97ms / max 10.39ms (5 amostras, 1 atomo) — folga ~20x do limite D24 (200ms). PLAN.md Validation Log atualizado com entry "Plano 01 — Tracer Bullet". **Plano 01 concluido (6/6 fases).** Arquitetura validada — Plano 02 pode escalar para 13 atomos restantes com seguranca.
- 2026-05-18: /execute-plan retomado para Plano 02. Status=in-progress. Estrategia: 3 batches paralelos (fases 01-03 / 04-05 / 06-08) + fase-09 sequencial (verifier batch + audit humano CA-08). Aprovado por Luiz.
- 2026-05-18: Batch 1 concluido (fases 01-03 paralelas via 3 subagentes). active-record-fundamentals 129 ln (5 H2, CA-08 flagged, cortes anti-drift: AR Encryption + Multiple DBs nao rastreaveis), active-record-migrations-safety 121 ln (5 H2, 7 patterns + 4 anti-patterns), action-controller-and-routing 134 ln (6 H2 com API-only secao D7). Todos: frontmatter 9 campos valido, harness:validate pass, 6/6 schema tests verde. GT comum: specs de fase listavam sources inexistentes (PATTERNS.md, PITFALLS.md, BACKENDS.md em pastas que so tem SKILL.md + references/); subagentes corrigiram via Glob antes de escrever frontmatter.
- 2026-05-18: Batch 2 concluido (fases 04-05 paralelas via 2 subagentes). security-csrf-and-brakeman 129 ln (6 H2 com API-only; wf-fd78fcce removido 0 matches, substituido por wf-8afc0f40 [90 matches segurança] + wf-a0aa55c4 [38 matches Brakeman CI]). rspec-and-minitest 198 ln — proximo do cap mas dentro do limite (5 H2, D21 framework-agnostic com 5 patterns + snippets duplos RSpec/Minitest cada, sem secoes separadas; wf-61b9b080 removido 0 matches TDD, wf-cb73df7d mantido 201 matches). Anti-drift agressivo virou padrao do batch.
- 2026-05-18: Batch 3 concluido (fases 06-08 paralelas via 3 subagentes). active-job-and-solid-queue 142 ln (5 H2, Rails 8+ contextualizado no corpo via Solid Queue patterns; rails_versions=['>=7.1']). action-view-and-hotwire 127 ln (5 H2, CA-08 flagged T2). caching-with-rails 120 ln (5 H2, Solid Cache pattern Rails 8+ no corpo, wf-9d10f3ac removido — 0 matches caching; wf-1d48ebbc adicionado). Path errors no spec capturados: rails-stack-conventions/BACKENDS.md inexistente → rails-background-jobs/BACKENDS.md. Anti-drift cortou claims plausiveis: Russian doll caching syntax, parallelize workers TDD. Todos: 9 fields valido, harness:validate pass, 6/6 schema tests verde. **8/9 fases done — pronto para fase-09 (verifier batch + audit humano CA-08).**
- 2026-05-18: fase-09 concluida (verifier refined batch + audit humano CA-08). **8/8 verifiers PASS** (5/5 cada — 40/40 claims rastreaveis = 100%, meta D12 era >=80%). Relatorios em `tmp/verifier-batch-rails-02/{slug}-report.md` (nao commitados — audit trail). Audit humano CA-08: Luiz aprovou os 2 atomos flagged (`active-record-fundamentals` T1 + `action-view-and-hotwire` T2) em 2026-05-18 — 3/3 claims cross-check rastreaveis em ambos. **Plano 02 concluido (9/9 fases).** Batch A T1 + Batch B parcial T2 aprovado. Desbloqueia Plano 03 fase-01..05 (Batch C) + fase-06 (INDEX). Verifier validou que anti-drift agressivo + protocolo refined replicam fidelidade do piloto (100% taxa, igual a fase-06 Plano 01).

## Verifier refined report (Plano 01 fase-06 — 2026-05-19)

- **Total de claims auditadas:** 38 (secoes Padroes senior + Anti-padroes + Criterios de decisao)
- **Rastreaveis:** 38 (100%)
- **Nao-rastreaveis:** 0
- **Taxa de fidelidade:** 100% (meta D12: >=80%)
- **Decisao:** APROVADO — fase-06 avancou para E2E com piloto validado.
- **Citacoes verificadas:** Xavier Noria (wf-3e82e3be linha ~171), Manrubia (wf-3e82e3be linha ~418), Bryan Helmkamp (wf-0deebe76 linha ~221), DHH sobre DI (wf-0deebe76 linha ~279 / R035).
- **Report completo:** `plano01/verifier-report-fase06.md`.

## Detector Rails — regression coverage (Plano 01 fase-04)

Confirmado em 2026-05-19: regex `/^\s*gem\s+["']rails["']/m` em `skills/init/lib/detect-stack.ts:98` esta presente desde Plano 02 fase-06 do projeto (commit anterior a v6.3.3). RF3 do PRD vira REGRESSION TEST conforme PLAN.md `Assumptions` linha 35.

Cobertura adicionada nesta fase (todos passam direto, sem alterar detector):
- CA-03 fallback Sinatra (Gemfile sem gem rails -> primary=null) — ja coberto na fase-03
- CA-06 Gemfile vazio (sem crash, anchorFiles contem Gemfile)
- CA-04 piloto: Rails legado 7.0 classifica como rails (warning fica em Plano03 fase-08/09 RF11)
- Robustez D10: indentacao em group block + single quote
- Zero falso-positivo: substring `gem 'rails-erb'` nao matcha (closing quote enforced pela regex)

Nenhuma mudanca em `detect-stack.ts` foi necessaria.

## Piloto extraido (Plano 01 fase-05 — 2026-05-19)

- **Atomo:** `docs/knowledge/rails/atoms/rails-conventions-and-magic.md`
- **Linhas:** 108 (cap ≤200 confirmado)
- **H2:** 5 cabecalhos (Quando consultar / Padroes senior / Anti-padroes / Criterios de decisao / Referencias externas)
- **Frontmatter:** 9 campos validos (`validateAtomFrontmatter` retorna `{ valid: true, errors: [] }`)
- **rails_versions:** `['>=7.1']` (cobre 7.1+ e 8.x — coerente com D1 do CONTEXT)
- **Fonte canonica skill package:** `claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md`
- **Compass artifacts consumidos:**
  - `claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md` (Idiomatismo Senior em Rails)
  - `claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md` (Arquitetura e Organizacao Senior em Rails)
- **Anti-drift clause aplicada no prompt:** confirmado verbatim do compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md (REGRA DE FIDELIDADE + Liberdade explicita)
- **Citacoes rastreaveis:** Xavier Noria (Zeitwerk), Manrubia (37signals concerns), DHH (DI not virtue), Bryan Helmkamp (concerns em uma classe) — todas com fonte literal.
- **INDEX skeleton:** `docs/knowledge/rails/INDEX.md` criado com nota de provisoriedade (INDEX final D9 fica em Plano 03 fase-06).
- **Proximo passo:** verifier refined + E2E tracer em fase-06.
