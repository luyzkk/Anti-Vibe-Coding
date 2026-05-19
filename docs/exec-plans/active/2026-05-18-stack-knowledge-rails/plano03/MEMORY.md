# Memoria: Plano 03 — Batch C + INDEX final + E2E completo + Hardening leve

**Feature:** Stack Knowledge Layer — Rails (v6.3.3)
**Iniciado:** (preenchido no kick-off do /execute-plan)
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo (a preencher durante /execute-plan):
- **DI-1:** Veredito final de fase-07 (verifier refined Batch C + audit humano action-cable-and-realtime)
  - O que: PASS/FAIL global do Batch C
  - Por que: gate de qualidade — bloqueia fase-08 se reprovado
  - Impacto: se FAIL, retrabalho da fase do átomo + re-verifier (mesma fase reroda)

- **DI-2:** Tier final de active-storage (RF13 — flag de revisão)
  - O que: T3 mantido OU T2 promovido
  - Por que: avaliação empírica do átomo escrito em fase-05 contra critério (apps modernas vs niche)
  - Impacto: frontmatter `tier:` atualizado no átomo + INDEX em fase-06 reflete decisão
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo (a preencher durante /execute-plan):
- **BUG-1:** Verifier de action-mailer-and-mailbox marca claim de ActionText como "nao encontrada"
  - Causa: ActionText absorvido sem fonte dedicada — extrator pegou conhecimento prévio
  - Fix: re-extrair com fonte explícita de rails-stack-conventions (seção rich text)
  - Fase afetada: fase-04
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo (a preencher durante /execute-plan):
- **GT-1:** Fixture tests/fixtures/rails-legacy-70 precisa de Gemfile.lock mock (não real)
  - Descoberto em: fase-08
  - Impacto: detector não exige Gemfile.lock, mas E2E test fica determinístico só com lock estável
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo (a preencher durante /execute-plan):
- **DEV-1:** Fase-09 ganhou 3o auditor (database-auditor) por sugestão do code-smell-detector
  - Motivo: code-smell encontrou pattern de migração ad-hoc no schema validator que database-auditor é mais adequado
  - Aprovado pelo dev em sessão
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 9 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Sizing planejado (h) | 12-14 |
| Sizing realizado (h) | (preenchido ao final) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Este é o último plano da feature v6.3.3 — não há "próximo plano".
Notas aqui viram input para:
1. /lessons-learned na fase de captura compound pós-merge
2. v6.3.4+ (Rails knowledge expansion) — backlog de conteúdo excedente que estourou cap 200
3. Próximas stacks (Python, Go) reaproveitando padrão de hardening leve (D15)

Candidatos a registrar ao final da execução:
- Lista de patterns recortados por estourar cap 200 (input v6.3.4+)
- Decisão final de tier de active-storage (DI-2) — pode virar compound se padrão for útil para outras stacks
- Falsos-positivos do verifier que exigiram refinement do protocolo — input para refinar lesson 2026-05-16-verifier-protocol-technical-sections-only.md
- Tempo real gasto em hardening leve (D15) vs Node hardening completo — métrica para próximas stacks decidirem intensidade
-->

---

<!-- Atualizado automaticamente durante execucao -->
