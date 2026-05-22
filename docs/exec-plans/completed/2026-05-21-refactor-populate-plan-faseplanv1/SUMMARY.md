---
title: "Summary: Refatorar populate-plan-generator → hierarquia + FasePlanInput v1"
status: completed
completed: 2026-05-21
---

# Summary: Feature A — populate-harness hierarchy + FasePlanInput v1

**Completed:** 2026-05-21
**Duration:** 1 dia (PRD escrito + execucao + closure)
**Planos:** 2 (Plano 01 + Plano 02, ambos completed)
**Fases Total:** 9 (4 do Plano 01 + 5 do Plano 02, 9 done / 0 skipped / 0 blocked)
**Commits:** 6 (Plano 01: 29f1f74; Plano 02: 8475224, a692dcc, cd567d6, 662d3c2, 1f1c1c5; closure: ddbb1eb)
**ADR:** [ADR-0022](../../design-docs/ADR-0022-faseplan-schema-andre-parity.md)

---

## O que foi construido

### Plano 01 — Schema + Renderer + Data (foundation)

- `skills/init/lib/render-fase-plan.ts` — type `FasePlanInput v1` (12 campos + `schemaVersion: 1`) + `renderFasePlan` puro + utilitarios `extractH2Sections`, `Wave`, `RiskEntry`, `StackVariants`
- `skills/init/lib/populate-instructions-table.ts` extendido com 6 campos novos (`guidanceFile`, `detectionSignals`, `mustCover`, `linkTargets`, `stackVariants?`, `validationCommand`, `dependsOn`); 16 entradas migradas
- 18 `.md` em `skills/init/assets/populate-guidance/` (16 guidance + `_template.md` + `_index.md`)
- Drift test entre `mustCover` H2 names e prosa dos `.md` (2 testes, 128 assertions, simetrico)

### Plano 02 — Orchestrator + Hierarchy + Goldens (wiring)

- `generatePopulatePlans` emite 1 pasta `{date}-populate-harness/` com **PRD.md, CONTEXT.md, PLAN.md, STATE.md + 16 fase-NN-*.md** (era 16 PLAN.md soltos)
- 4 templates novos: `populate-harness-{prd,context,plan-overview,state}-template.ts`
- Adapter `DocInstruction → FasePlanInput` (Wave 1 stack-aware via `buildWavesForDoc`, Wave 2 derivada de `sectionsToWrite`)
- `renderAndrePlan` antigo removido; snippet obsoleto `populate-plan-template.md` deletado
- Step 7 `summary` multilinha + `ABORT_MESSAGE_NO_STACK` reescritos
- 3 goldens regenerados (`init-greenfield.tree.json`, `init-greenfield.stdout.txt`, `populate-plan-andre-parity.md`)
- TD-01 (Feature B) registrada em `tech-debt-tracker.md` com soft deadline 2026-06-20

---

## Decisoes de Implementacao (consolidadas)

### Schema e renderer

- **schemaVersion: 1** hardcoded — evolucao para v2 sera compat-aware
- **Final Report Contract eh hardcoded no renderer**, NAO eh campo do input (ADR-0022 decisao 6)
- **Renderer puro** (sem fs/io) — todo I/O fica no orquestrador
- **Lazy loading de prosa**: `guidance.md` referenciado pelo path, LLM le sob demanda em runtime (performance < 2s mantida)

### Adapter

- Wave 1 vem de `buildWavesForDoc(docPath, stackPrimary)` (stack-aware)
- Wave 2 deriva de `sectionsToWrite` mapeando para `"Write the H2 section: {s}"`
- `stackVariants` omitido quando undefined (`exactOptionalPropertyTypes`)

### Hierarquia

- Pasta `{date}-populate-harness/` (1 vez) em vez de `{date}-populate-{slug}/` (16 vezes)
- STATE.md gerado tambem (CA-01 do PRD) — caught durante final validation
- D10 NFR Idempotencia: `fs.writeFile` sempre sobrescreve

### Outras

- `docToSlug()` NAO substitui `_` por `-` — 4 docs preservam underscore (`docs-quality_score-md`, `docs-merge_gates-md`, `docs-code_style-md`, `docs-product_sense-md`)
- Step 07 source ja teve fix minimo `result.plans -> result.fasePlans` em fase-01 para typecheck passar
- summary multilinha em nova ordem: `init-07 / Folder / Legacy / Docs skipped` (Folder agora `lines[1]`)

---

## Bugs e Gotchas (generalizaveis)

### Patterns descobertos

- **Drift test entre schema e prosa**: 128 assertions cobrem 16 docs × 2 direcoes × ~4 keys medias. Mutacao manual produz erro acionavel (nomeia doc, key, e lista subsecoes encontradas). Pattern reusable para qualquer schema+prosa.
- **TDD gate write-order**: hook do projeto bloqueia source antes do test. Workflow: 1) escrever `.test.ts`, 2) confirmar RED por module not found, 3) escrever source.
- **Bun eval vs bun test escape**: NUNCA usar `bun --eval` inline para gerar goldens — interpreta string-escape diferente do `bun test`. Usar test runner ou helper TS dedicado.

### Especifico do projeto

- `bun run lint` NAO existe — usar apenas `bun run typecheck`
- `DetectedStack` shape real: `{ primary, secondary, signalSource, anchorFiles }` (NAO `{ primary, confidence, signals }` como specs antigas usavam)
- 6 falhas em `tests/harness-validate-v6-path-whitelist.test.ts` sao pre-existentes (anteriores ao Plano 01); NAO sao regressao
- 4 testes em `init-cutover-greenfield.test.ts` ficam em `test.skip` por DR-2 (sandbox sem stack typescript)

---

## Desvios do Plano

| Desvio | Motivo | Aceito |
|--------|--------|--------|
| fase-01: Step 07 source tocado | typecheck quebrava sem fix `result.plans -> result.fasePlans` | sim |
| fase-01: 9 testes extras (templates) | TDD gate obriga teste por source | sim — testes legitimos |
| fase-02: 2 testes pre-existentes ajustados | wording antigo nao podia coexistir com novo | sim |
| fase-03: 3 acceptance tests ajustados | esperavam arquitetura antiga de 16 pastas | sim |
| fase-03: tree.json nao tocado | ja estava com hierarquia nova de Plano 05 fase-06 | sim |
| fase-03: commit NAO atomico com fase-01/02 | fase-01/02 ja commitadas separadamente | sim — comunicado ao subagente |
| fase-04: formato hibrido tabela+H2 | arquivo ja existia com tabela; `copy-then-improve` | sim |
| fase-04: sem subagente | edicao trivial de markdown sem TDD | sim — Step 4c da skill |
| fase-05: 5 arquivos source novos | CA-01 gap fix via populate-harness-state-template | sim — gap real no PRD |

---

## Metricas Consolidadas

| Metrica | Valor |
|---------|-------|
| Planos | 2 |
| Fases total | 9 |
| Fases completed | 9 |
| Fases skipped | 0 |
| Fases blocked | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits gerados | 6 |
| Testes adicionados | ~30 (5 + 6 + 3 + 2 [P01] + 5 + 5 + 3 + 3 + 3 [P02 fase-01] + 3 [P02 fase-02 escopo] + 6 generator [com CA-01] + 5 state-template) |
| Assertions totais (libs da feature) | 674 (em 10 arquivos de teste) |
| Arquivos criados | 25 (`render-fase-plan.ts/.test.ts`, 16 guidance + _template + _index, `populate-harness-{prd,context,plan-overview,state}-template.ts/.test.ts`) |
| Arquivos deletados | 1 (`assets/snippets/populate-plan-template.md`) |
| CA-01..CA-10 atendidos | 10/10 |

---

## Lessons Captured

Candidatos a compound note (ainda nao capturados — sugerir `/anti-vibe-coding:lessons-learned`):

- **Drift test entre data e prosa** — pattern reusable para qualquer schema+prosa em outros lugares do plugin
- **Schema deterministico + guidance interpretativa em `.md`** — quando aplicar vs nao (esperar Feature B confirmar antes de capturar como pattern universal)
- **TDD gate write-order convention** — explicito como sequencia mandatoria
- **Hierarquia PRD+CONTEXT+PLAN+STATE+fases como contrato vs flat** — sinais de qual escolher

---

## Handoff para Feature B (TD-01)

Veja [tech-debt-tracker.md](../../tech-debt-tracker.md#td-01-migrar-plan-feature-e-quick-plan-para-faseplaninput-v1).

**Pre-requisitos validados:**

- `renderFasePlan` em `skills/init/lib/render-fase-plan.ts` — sera movido para `skills/lib/render-fase-plan.ts` (cross-skill) em Feature B
- Drift test pode rodar versao similar para `/plan-feature` templates
- Goldens de `/plan-feature` provavelmente regeneram tambem — atomicidade no commit
- Soft deadline: 2026-06-20 (30 dias do merge)

---

## Sugestoes pos-feature

- `/anti-vibe-coding:lessons-learned` para destilar pattern do drift test
- `/anti-vibe-coding:verify-work` para auditoria multi-agente (security + react + code-smell)
- `/anti-vibe-coding:iterate` quando tiver primeira fase real consumindo o output em projeto cliente
