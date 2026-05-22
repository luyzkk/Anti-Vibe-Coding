# Memoria: Plano 02 — Orchestrator, Hierarchy, Goldens (wiring)

**Feature:** Refatorar populate-plan-generator → hierarquia + FasePlanInput v1
**Iniciado:** 2026-05-21
**Status:** em andamento

---

## Decisoes de Implementacao

<!-- preencher durante execucao -->

---

## Bugs Descobertos

<!-- preencher durante execucao -->

---

## Gotchas

<!-- preencher durante execucao -->

---

## Desvios do Plano

<!-- preencher durante execucao -->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Feature B (PRD separado) PRECISA saber:

- `FasePlanInput` definido em `skills/init/lib/render-fase-plan.ts` — mover para `skills/lib/render-fase-plan.ts` durante Feature B (cross-skill)
- `renderFasePlan(input): string` aceita o schema completo — pode ser reusado por `/plan-feature` e `/quick-plan`
- Final Report Contract eh hardcoded — Feature B mantém a convencao
- Goldens de e2e foram regenerados em Plano 02 fase-03 — formato esperado documentado
- `tech-debt-tracker.md` lista trigger e soft deadline 30d — verificar antes de comecar Feature B

---

<!-- Atualizado automaticamente durante execucao -->
