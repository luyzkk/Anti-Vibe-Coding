---
title: "Refatorar populate-plan-generator → hierarquia + FasePlanInput v1"
mode: full
status: active
created: 2026-05-21
---

# Exec Plan: Refatorar populate-plan-generator → hierarquia + FasePlanInput v1

**PRD:** [PRD.md](./PRD.md)
**ADR:** [ADR-0022](../../design-docs/ADR-0022-faseplan-schema-andre-parity.md)
**Total:** 2 planos, ~9 fases, ~12-15h
**Tracer Bullet:** plano01/fase-01 — definir `FasePlanInput v1` + `renderFasePlan` que emite as 10 H2 do Andre + 5 extensoes AVC com 1 input sample. Prova o contrato antes de migrar os 16 docs.

---

## Goal

Substituir a emissao atual de 16 `PLAN.md` soltos por **1 hierarquia** (`{date}-populate-harness/` com PRD+CONTEXT+PLAN+16 fase-XX-*.md), adotando o schema `FasePlanInput v1` (10 H2 base Andre + 6 extensoes AVC) com guidance interpretativa em `.md` per-doc.

## Scope

**In:**
- `skills/init/lib/populate-plan-generator.ts` (orquestrador + renderer)
- `skills/init/lib/populate-instructions-table.ts` (data dos 16 docs)
- `skills/init/lib/steps/07-generate-populate-plans.ts` (summary + abort)
- `skills/init/assets/populate-guidance/*.md` (NOVOS — 16 arquivos)
- `tests/e2e/__golden__/init-greenfield.*` (regenerar)
- `tests/e2e/__golden__/populate-plan-andre-parity.md` (regenerar)
- `docs/exec-plans/tech-debt-tracker.md` (commit B)

**Out:**
- `skills/plan-feature/*` (= Feature B, PRD separado)
- `skills/quick-plan/*` (Feature B)
- Migrar exec-plans legados em projetos cliente (renderer so emite novos)
- Adicionar stacks alem de Rails / Next+React / Node+TS

## Assumptions

- `ctx.stack` ja vem populado pelo Step 2 (`02-detect-legacy-and-stack.ts`) — DR-2 cobre o caso null
- `LegacyManifestSchema` continua valido (sem mudancas)
- Final Report Contract eh hardcoded no renderer (NAO eh campo do input — ADR-0022 decisao 6)
- Renderer NAO le `.md` em runtime; emite apenas a referencia (lazy loading, validado na PRD)
- Path layout do init nao muda (`docs/exec-plans/active/{date}-{slug}/...`)

## Risks

- Goldens divergem em CI ate o commit que os regenera (mitigacao: regen vai no MESMO commit do refactor)
- Drift entre prosa (`guidance.md`) e schema (`mustCover` H2 names) — mitigacao: teste validador em plano01/fase-04
- Mudanca de output do init quebra fixtures e2e ja verdes — mitigacao: ler stdout golden ANTES de aprovar refactor
- Performance pode ultrapassar 2s se renderer fizer I/O extra — mitigacao: renderer puro (sem fs), pipeline faz I/O em paralelo se necessario
- Janela de divergencia entre init (schema novo) e /plan-feature (schema antigo) ate Feature B — mitigacao: `tech-debt-tracker.md` + soft deadline 30d
- Schema v1 com `schemaVersion: 1` torna evolucao compat-aware — mas mudar campo Must Have quebra renderer atual; aceito
- Step 7 abort message contem texto literal `"16 populate plans"` em `ABORT_MESSAGE_NO_STACK` — mitigar atualizando junto

## Execution Steps

### Plano 01 — Schema, Renderer, Data (foundation)
**Sizing:** ~6-8h, 4 fases
**Path:** [plano01/README.md](./plano01/README.md)

Constroi o **contrato**: tipo `FasePlanInput v1`, renderer puro `renderFasePlan` que emite as 10 H2 + extensoes, migracao dos 16 docs em `populate-instructions-table.ts`, e criacao dos 16 `.md` de guidance per-doc.

- fase-01-tracer-bullet-schema-renderer (~2h): `FasePlanInput v1` type + `renderFasePlan` + snapshot test com 1 input
- fase-02-extend-doc-instruction (~2h): estende `DocInstruction` com 6 campos novos, migra 16 entradas
- fase-03-guidance-md-files (~2-3h): cria 16 `.md` per-doc em `assets/populate-guidance/` (prosa estilo Andre + AVC ext)
- fase-04-drift-test (~30min): teste que valida `mustCover` H2 names == H2 names mencionadas em cada `.md`

### Plano 02 — Orquestrador, Hierarquia, Goldens (wiring)
**Sizing:** ~5-7h, 5 fases
**Path:** [plano02/README.md](./plano02/README.md)
**Depende de:** Plano 01

Substitui o output de 16 `PLAN.md` por 1 pasta hierarquica. Regenera goldens, atualiza Step 7, registra Feature B em tech-debt-tracker.

- fase-01-tracer-bullet-hierarchy (~2h): `generatePopulatePlans` emite `{date}-populate-harness/{PRD.md, CONTEXT.md, PLAN.md, fase-NN-*.md}`
- fase-02-update-step-07 (~30min): summary multilinha aponta para nova pasta, abort message atualizada
- fase-03-regenerate-goldens (~1h): regen `init-greenfield.tree.json`, `.stdout.txt`, `populate-plan-andre-parity.md`
- fase-04-tech-debt-tracker (~30min): commit entry para Feature B com soft deadline
- fase-05-final-validation (~1-2h): `bun run harness:validate`, `bun run compound:check`, lint, typecheck, suite completa

### Grafo de Dependencias

```
Plano 01 (Schema + Renderer + Data)
    ↓
Plano 02 (Orchestrator + Hierarchy + Goldens)
    ↓
[Feature B: /plan-feature unifica para FasePlanInput v1] ← PRD separado
```

## Review Checklist

- [ ] `FasePlanInput v1` com `schemaVersion: 1` exportado por `skills/init/lib/render-fase-plan.ts`
- [ ] 10 secoes H2 do Andre na ORDEM EXATA, sem renomear (CA-01 do PRD)
- [ ] Final Report Contract hardcoded no renderer (NAO eh campo do input)
- [ ] 16 docs em `POPULATE_INSTRUCTIONS_BY_DOC` com campos `guidanceFile`, `detectionSignals`, `mustCover`, `linkTargets`, `validationCommand`, `dependsOn` populados
- [ ] 16 arquivos `.md` em `skills/init/assets/populate-guidance/` (1 por doc canonico)
- [ ] Init emite `{date}-populate-harness/` (1 pasta, NAO 16)
- [ ] PRD.md + CONTEXT.md + PLAN.md + 16 fase-XX-*.md dentro da pasta
- [ ] Goldens regenerados no MESMO commit do refactor
- [ ] Drift test pega divergencia entre `mustCover` H2 names e prosa `.md`
- [ ] Step 7 summary multilinha aponta para nova pasta
- [ ] `docs/exec-plans/tech-debt-tracker.md` lista Feature B com trigger + soft deadline 30d
- [ ] `bun test`, `bun run lint`, `bun run typecheck` passam
- [ ] `bun run harness:validate` passa
- [ ] Performance < 2s mantida (lazy loading: renderer NAO le `.md` em runtime)

## Validation Log

<!-- preencher durante execucao: comando + resultado -->

## Compound Opportunity

<!-- preencher ao /iterate -->

Candidatos a compound note (registrar se aprender no caminho):
- Padrao "schema deterministico + guidance interpretativa em `.md`" — quando aplicar vs nao
- Drift test entre data e prosa — como detectar com baixo custo de manutencao
- Lazy loading de prosa em renderer puro — quando vale a pena
- Hierarquia PRD+CONTEXT+PLAN+fase como contrato vs "1 plano flat" — sinais de qual escolher

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

## Exit Criteria

- [ ] CA-01 a CA-10 do PRD validados (frase a frase)
- [ ] `tests/e2e/init-cutover-greenfield.test.ts` verde com goldens novos
- [ ] Step 7 abort/summary atualizados
- [ ] Feature B registrada em `docs/exec-plans/tech-debt-tracker.md`
- [ ] PR merged em `main` sem rollback
- [ ] ADR-0022 referenciada no commit de merge
