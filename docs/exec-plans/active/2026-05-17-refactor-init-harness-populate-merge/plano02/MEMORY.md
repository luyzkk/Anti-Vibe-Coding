# Memoria: Plano 02 — Tracer Bullet — Populate Plan Generator

**Feature:** refactor-init-harness-populate-merge
**Iniciado:** 2026-05-18
**Status:** pendente

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 1 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Lista Canonica de 25 Arquivos .md Populaveis (fase-01 — contrato para fase-02)

Extraida de `skills/init/lib/template-manifest.ts` (31 entradas totais).
Excluidos: 2 scripts (.ts), 1 README.md (intocavel D6/MH-08), 1 .github template (infra), 2 filosoficos (D14).
Total: 25 arquivos de doc populaveis.

| # | dst (relativo ao cwd) |
|---|------------------------|
| 1 | `docs/DESIGN.md` |
| 2 | `docs/FRONTEND.md` |
| 3 | `docs/PLANS.md` |
| 4 | `docs/QUALITY_SCORE.md` |
| 5 | `docs/MERGE_GATES.md` |
| 6 | `docs/RELIABILITY.md` |
| 7 | `docs/SECURITY.md` |
| 8 | `docs/design-docs/index.md` |
| 9 | `docs/design-docs/core-beliefs.md` |
| 10 | `docs/exec-plans/active/README.md` |
| 11 | `docs/exec-plans/completed/README.md` |
| 12 | `docs/exec-plans/tech-debt-tracker.md` |
| 13 | `docs/compound/README.md` |
| 14 | `docs/review-checklists/README.md` |
| 15 | `docs/review-checklists/security.md` |
| 16 | `docs/review-checklists/reliability.md` |
| 17 | `docs/review-checklists/agent-api.md` |
| 18 | `docs/review-checklists/frontend-ui.md` |
| 19 | `docs/review-checklists/production-readiness.md` |
| 20 | `docs/smoke-flows/README.md` |
| 21 | `docs/product-specs/index.md` |
| 22 | `docs/references/README.md` |
| 23 | `docs/generated/db-schema.md` |
| 24 | `docs/STATE.md` |
| 25 | `TODO.md` |

**Regra de filtro para o gerador (fase-02):**
- Incluir entradas com `dst` terminando em `.md`
- Excluir blocklist: `['docs/COMPOUND_ENGINEERING.md', 'docs/PRODUCT_SENSE.md', 'README.md', '.github/pull_request_template.md']`
- Resultado: 31 - 2 scripts - 1 README.md - 1 .github - 2 filosoficos = **25**

**Snippet template criado:** `skills/init/assets/snippets/populate-plan-template.md`
- 5 placeholders: `{{PROJECT_NAME}}`, `{{DATE}}`, `{{SHARED_GLOSSARY_BLOCK}}`, `{{TASKS_BLOCK}}`, `{{VALIDATE_TASK}}`
- 2 wave markers: `<!-- wave: 1 -->` (paralelo), `<!-- wave: 2 -->` (barreira)
- 50 linhas (dentro do criterio 30-70)

---

<!-- Atualizado automaticamente durante execucao -->
