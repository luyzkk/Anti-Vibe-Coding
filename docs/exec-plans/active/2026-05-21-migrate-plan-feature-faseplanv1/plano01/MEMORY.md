# Memoria: Plano 01 — Renderer Cross-Skill + Builder

**Feature:** migrate-plan-feature-faseplanv1 (Feature B)
**Iniciado:** (a preencher)
**Status:** em andamento

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
- **GT-1:** import.meta.dir em bun nao e o mesmo que __dirname em Node
  - Descoberto em: fase-01
  - Impacto: path do golden file precisa de ajuste quando arquivo muda de diretorio
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-01 planejava 1 importador, encontrou 2
  - Motivo: populate-harness-plan-overview.ts tambem importava render-fase-plan diretamente
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 02) PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Preencher ao concluir:
- Path exato do renderer cross-skill apos move
- Quais importadores foram atualizados
- Status do golden em skills/lib/__golden__/
- Status do builder em skills/plan-feature/lib/fase-builder.ts
- Campos opcionais com comportamento confirmado (mustCover vazio, detectionSignals vazio)
-->

---

<!-- Atualizado automaticamente durante execucao -->
