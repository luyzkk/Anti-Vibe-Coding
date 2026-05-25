# Memoria: Plano 02 — Atoms Feature-driven Next (em EN) + verifier batch

**Feature:** Next.js + React Stack Knowledge
**Iniciado:** 2026-05-24
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Para `data-fetching-and-cache.md`, usar `fetch()` cache options como entrada e `unstable_cache` como secao avancada
  - Por que: deep-research 3d54ffa8 organiza assim; alinhamento melhora rastreabilidade
  - Impacto: ordem das sections muda em relacao ao SKILL.md V2 (nao bloqueia verifier)
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Extrator da fase-03 entregou atom com 240 linhas
  - Causa: secao "When to consult" inflada com 12 bullets
  - Fix: re-rodar instruindo cortar When to consult para <=5 bullets; conteudo extra vira backlog em TODO.md
  - Fase afetada: fase-03
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** Verifier marca claim de fase-05 PPR como "nao encontrada" porque source usa "Partial Prerendering" e atom usa "PPR"
  - Descoberto em: fase-07
  - Impacto: futuras destilacoes devem preservar terminologia da fonte ao introduzir acronimos (citar nome completo + acronimo na primeira ocorrencia)
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-05 frontmatter ficou `next_versions: ['>=15']` mas a secao PPR foi movida para um atom separado por extrair >40 linhas
  - Motivo: hard cap 200 linhas batido; PPR sozinho cabe num atom T3 dedicado
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 7 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Atoms entregues | 0 / 6 |
| Verifier rework rounds (fase-07) | 0 |
| Atoms acima do hard cap 200 linhas (pre-rework) | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Exemplo:
- `react-server-components.md` flagged R3-B para audit humano Luiz em Plano 03 fase-07
- Verifier report do batch em `verifier-report-plano02.md` (referenciar em Plano 03 fase-07 audit)
- `rendering-strategies.md` frontmatter usa `next_versions: ['>=15']` — confirmar schema validator aceita (Plano 01 fase-04 ja validou para Rails)
- INDEX.md do Plano 03 fase-06 deve mapear os 6 atoms desta wave em "## By Cross-Stack Skill":
    - react-server-components -> /react-patterns
    - server-actions-and-mutations -> /api-design
    - middleware-and-edge -> /security
    - data-fetching-and-cache -> /api-design + /system-design
    - rendering-strategies -> /react-patterns + /system-design
    - pages-router-migration-tips -> nenhuma skill cross-stack direta (T3 migration)
-->

---

<!-- Atualizado automaticamente durante execucao -->
