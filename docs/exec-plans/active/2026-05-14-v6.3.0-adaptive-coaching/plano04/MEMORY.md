# Memoria: Plano 04 — profile-aware-preface ×4-6 skills

**Feature:** Adaptive Coaching v6.3.0
**Iniciado:** 2026-05-15
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** Bloco preface em SKILL.md passa `process.cwd()` como argumento de `readPrefaceContext(projectRoot)` nas 4 skills.
  - Por que: `readPrefaceContext` exige `projectRoot` posicional; spec da fase não especifica o valor mas pattern de `/architecture` usa `process.cwd()` implicitamente via `readArchitectureProfile()` sem argumento.
  - Impacto: harness check é string-presence apenas (G4 do plano), então a chamada literal nunca executa neste contexto — escolha é cosmética/documental. Se v6.5 tornar SKILL.md executável, revisar.

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

- **DEV-1 (fase-01):** Implementação GREEN de `/api-design` lookup table foi corrigida após primeira tentativa de RED→GREEN. Teste do RED esperava `"route handler"` (lowercase, singular) na preface de `nextjs-app-router`, mas implementação inicial usou `"Route handlers"` (capitalizado, plural). Decisão: ajustar implementação para casar com o teste (G4 do plano — teste é anchor imutável após RED).
  - Motivo: TDD — teste é a spec, implementação serve o teste.
  - Impacto: nenhum (anchor preservado, RED→GREEN completou conforme contrato).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 1 |
| Fases com desvio | 1 |
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
