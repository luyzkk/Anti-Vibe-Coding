# Plano 02: Orchestrator, Hierarchy, Goldens (wiring)

**Feature:** Refatorar populate-plan-generator → hierarquia + FasePlanInput v1 ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~5-7h
**Depende de:** Plano 01 (precisa do tipo `FasePlanInput`, renderer `renderFasePlan`, `POPULATE_INSTRUCTIONS_BY_DOC` estendida, e 16 `.md` de guidance)
**Desbloqueia:** Feature B (PRD separado — `/plan-feature` migra para `FasePlanInput v1`)

---

## O que este plano entrega

Substitui o output do init de **16 `PLAN.md` soltos** por **1 pasta hierarquica** (`{date}-populate-harness/{PRD.md, CONTEXT.md, PLAN.md, fase-NN-{slug}.md}`), regenera os goldens de e2e, atualiza Step 7 (summary + abort) e registra Feature B em `docs/exec-plans/tech-debt-tracker.md`. Ao final, o init produz output alinhado com a convencao do plugin e o contrato esta validado end-to-end.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Tipo `FasePlanInput` em `render-fase-plan.ts` | Plano 01 fase-01 | pendente |
| Funcao `renderFasePlan(input): string` | Plano 01 fase-01 | pendente |
| `POPULATE_INSTRUCTIONS_BY_DOC` com 6 campos novos preenchidos | Plano 01 fase-02 | pendente |
| 16 `.md` de guidance em `assets/populate-guidance/` | Plano 01 fase-03 | pendente |
| Drift test verde | Plano 01 fase-04 | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Pasta hierarquica `{date}-populate-harness/` validada | `/execute-plan` em projetos cliente |
| Entrada em `tech-debt-tracker.md` para Feature B | PRD-B (futuro) |
| Goldens novos | Pipeline CI permanente |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | [fase-01-tracer-bullet-hierarchy.md](./fase-01-tracer-bullet-hierarchy.md) | `generatePopulatePlans` emite hierarquia | 2h | Plano 01 completo |
| 02 | [fase-02-update-step-07.md](./fase-02-update-step-07.md) | Step 7 summary + abort message atualizados | 30min | fase-01 |
| 03 | [fase-03-regenerate-goldens.md](./fase-03-regenerate-goldens.md) | Goldens e2e regenerados | 1h | fase-01, fase-02 |
| 04 | [fase-04-tech-debt-tracker.md](./fase-04-tech-debt-tracker.md) | Feature B registrada com soft deadline 30d | 30min | — (paralela) |
| 05 | [fase-05-final-validation.md](./fase-05-final-validation.md) | harness:validate + suite completa | 1-2h | fase-03 |

---

## Grafo de Fases

```
fase-01 (orquestrador emite hierarquia)      ← Tracer Bullet do Plano 02
    |
    v
fase-02 (Step 7 summary + abort)
    |
    v
fase-03 (regenera goldens)        fase-04 (tech-debt-tracker) ← paralela
    |                                       |
    +------------ + ------------------------+
                  |
                  v
            fase-05 (final validation)
```

**Paralelismo possivel:** fase-04 pode rodar paralelo a fase-01/02/03 (toca arquivo independente — `docs/exec-plans/tech-debt-tracker.md`). Recomendado: fase-04 logo no inicio para nao virar TODO esquecido.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: teste que falha (assertion, nao compilation)
2. GREEN: codigo minimo
3. REFACTOR: limpar com testes verdes
4. VERIFY: bun test && bun run lint && bun run harness:validate
```

**Tracer Bullet deste plano:** fase-01 — pelo qual o orquestrador passa a emitir hierarquia em vez de 16 PLAN.md. Teste de integracao com temp dir valida estrutura.

---

## Gotchas Conhecidos

- **G1:** `ABORT_MESSAGE_NO_STACK` em `07-generate-populate-plans.ts` contem texto literal `"16 populate plans"` — fase-02 atualiza para refletir nova realidade (1 pasta, 16 fases).
- **G2:** Goldens em `tests/e2e/__golden__/` sao SOURCE OF TRUTH para 2 testes em `init-cutover-greenfield.test.ts`. Regen no MESMO commit do refactor de fase-01 — CI nao pode quebrar entre commits.
- **G3:** Nome da pasta de output muda de `{date}-populate-{slug}` (16 vezes) para `{date}-populate-harness/` (1 vez). `populate-plan-andre-parity.md` (golden) tambem regenera.
- **G4:** `D10 NFR Idempotencia` (sempre sobrescreve) ja eh respeitado pelo `fs.writeFile` — manter o comportamento.
- **G5:** Em projetos cliente que ja rodaram init antes, restos de pastas `{date}-populate-{slug}/` antigas FICAM intocados (renderer so emite novos). NAO limpar — eh historia do projeto cliente.
- **G6:** Final Report Contract no plano gerado eh hardcoded no renderer. Plano 02 NAO precisa testar bytes do contrato; teste de fase-01 do Plano 01 ja cobriu.
- **G7:** `tech-debt-tracker.md` pode nao existir em `docs/exec-plans/`. fase-04 cria se ausente.

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->
