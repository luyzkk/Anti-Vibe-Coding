# Memoria: Plano 02 — Camadas de Skill (Descoberta no Planejamento)

**Feature:** workflow-awareness
**Iniciado:** 2026-05-29
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Referenciar docs/WORKFLOWS.md por menção de caminho em vez de link markdown
  - Por que: G5 — link-check do harness faz fs.stat; doc só existe após Plano 01
  - Impacto: edição robusta à ordem de execução Plano 01/02
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** harness:validate falhou com broken-link em skills/.../SKILL.md
  - Causa: link markdown para ../../docs/WORKFLOWS.md (doc ainda não criado)
  - Fix: trocar por menção de caminho em backtick (G5)
  - Fase afetada: fase-NN
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** {gotcha}
  - Descoberto em: fase-NN
  - Impacto: {...}
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** {desvio}
  - Motivo: {...}
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Exemplo:
- As 7 superfícies de skill/doc referenciam docs/WORKFLOWS.md por menção de caminho (não link)
- Marcadores INV6 (strings "não executa"/"não lança") verificados por tests/e2e/workflow-prose-leak.test.ts
-->

---

<!-- Atualizado automaticamente durante execucao -->
