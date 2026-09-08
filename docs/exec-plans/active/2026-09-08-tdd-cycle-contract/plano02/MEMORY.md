# Memoria: Plano 02 — O ciclo roda no execute-plan

**Feature:** Contrato Unico do Ciclo TDD por Fase
**Iniciado:** 2026-09-08
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
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Custo por fase no dogfood (fase-04 — PRD Premissa 4)

Preencher na fase-04, uma linha por fase executada no fixture.

| Rodada | Fase do fixture | Rodadas de teste | Spawns (RED / GREEN / verifier) | Tempo aprox. | Observacao |
|--------|-----------------|------------------|----------------------------------|--------------|------------|
| r1 (Assistido) | fase-01 sum | | | | |
| r1 (Assistido) | fase-02 canRead [RISCO] | | | | |
| r2 (negativo) | fase-01 sum (defesa inofensiva) | | | | esperado: blocked |
| r3 (direto) | fase-01 sum | | | | |
| r3 (direto) | fase-02 canRead [RISCO] | | | | |

Decisao que este quadro alimenta: se o spawn do `plan-verifier` custar >30% da fase (PRD Premissa 4),
RF-05 passa a ser condicionado ao nivel (Assistido/Guiado) em vez de sempre — registrar como DI aqui.

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Ultimo plano da feature: o consumidor destas notas e o SUMMARY.md (Step 7a do execute-plan)
     e o /lessons-learned no fechamento. Registrar aqui: formato final da linha do STATE log,
     nome do check do verifier, o que o dogfood provou e o que ficou aberto para o PRD de
     honestidade de config (.tdd-phase.json, tdd-gate.json). -->

---

<!-- Atualizado automaticamente durante execucao -->
