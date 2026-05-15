# Memoria: Plano 04 — profile-aware-preface ×4-6 skills

**Feature:** Adaptive Coaching v6.3.0
**Iniciado:** 2026-05-15
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** /decision-registry recebeu preface com escopo "headline + 1 patterns" (não rationale completo)
  - Por que: skill é meta-orquestradora, preface longo polui o prompt de invocação
  - Impacto: PREFACE_BY_PROFILE menor; default = string vazia para preservar CA-02
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Harness check regex casa com `<!-- profile-aware-preface:start -->` em comentário JSDoc
  - Causa: regra de string presence não distingue entre marker real e exemplo em doc
  - Fix: limitar check a arquivos `skills/*/SKILL.md` (não a .ts ou .md de docs)
  - Fase afetada: fase-03
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** /lessons-learned skipou preface — meta-skill não consulta código do projeto
  - Descoberto em: fase-02
  - Impacto: total final = 5 skills com preface (4 Must + 1 Should: /decision-registry)
  - Lesson registrada em fase-04 compound note
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-02 entregou 1 skill em vez de 2 (RF-SH-05 permite "candidates, choice open")
  - Motivo: /lessons-learned não tem dependência de profile arquitetural — preface seria ruído
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

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Não há próximo plano após este — Plano 04 fecha o release v6.3.0.
     Notas aqui servem para v6.3.1 (patch) ou v6.4/v6.5 (próxima minor).
     Exemplo:
     - Pattern de preface estabilizado em 6 skills; v6.5 só adiciona campo `language` no PrefaceContext
       e amplia lookup tables — sem refactor das skills migradas (CA-09).
     - Compound note `2026-05-15-profile-aware-preface-migration.md` documenta tradeoffs
       (replicação mecânica vs. adaptação per-skill) para autores futuros.
-->

---

<!-- Atualizado automaticamente durante execucao -->
