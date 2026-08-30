# Memoria: Plano 01 — Infra + Validador + Piloto + Tracer Bullet

**Feature:** Stack Knowledge Python
**Iniciado:** {YYYY-MM-DD}
**Status:** {em andamento / concluido}

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
| Fases planejadas | 6 |
| Fases concluidas | {N} |
| Fases com desvio | {N} |
| Bugs encontrados | {N} |
| Retries necessarios | {N} |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Preencher ao concluir. Minimo esperado ao fechar o Plano 01:
- Rastreabilidade final do piloto (X/5 claims) e ajustes feitos no prompt do extrator/verifier
  que os Planos 02-04 devem herdar
- Linha de contagem do piloto (corpo usou N/200 linhas) — calibra expectativa de compressao
- Confirmar se python_versions do piloto ficou ['>=3.11'] ou mudou
- Qualquer teste/golden ajustado na fase-00/04 que os proximos planos nao devem "re-corrigir"
-->

---

<!-- Atualizado automaticamente durante execucao -->
