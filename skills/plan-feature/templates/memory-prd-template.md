# Memoria Consolidada: {Feature Name}

**PRD:** [PRD.md](./PRD.md)
**Arquivado em:** {YYYY-MM-DD}
**Duracao total:** {data-inicio} -> {data-fim}
**Planos consolidados:** {N planos}

---

## Decisoes de Implementacao (relevantes)

Decisoes tomadas durante execucao que afetaram mais de um plano ou que sao
generalizaveis. NAO decisoes triviais locais a uma unica fase.

- **DI-{plano}-{n}:** {descricao concisa}
  - Plano: {NN}
  - Impacto: {por que foi relevante}

<!-- Preenchido por agregacao das secoes "Decisoes de Implementacao" de cada planoNN/MEMORY.md,
     filtrando pelas que tem impacto cross-plano ou marcadas como relevantes -->

---

## Gotchas Generalizaveis

Armadilhas que NAO sao especificas da feature — se aplicam a qualquer feature similar.
Candidatas a virar licoes em CLAUDE.md via /lessons-learned.

- **GT-{plano}-{n}:** {descricao}
  - Descoberto em: Plano {NN}, fase-{MM}
  - Aplicabilidade: {quando voltar a aparecer}

<!-- Filtrado por heuristica: gotcha que menciona stack, framework, tooling em vez de
     detalhes especificos da feature -->

---

## Bugs Significativos

Bugs que consumiram retries, mudaram a arquitetura, ou revelaram assumption errada.
Nao incluir bugs triviais (typo, import esquecido).

- **BUG-{plano}-{n}:** {sintoma} -> {causa raiz} -> {fix}
  - Plano: {NN}
  - Fase: fase-{MM}

<!-- Filtrado: incluir se o bug gerou retries > 0, ou se envolveu mais de uma fase -->

---

## Desvios Significativos do Plano

O que mudou em relacao ao planejamento inicial e por que.

- **DEV-{plano}-{n}:** {descricao}
  - Motivo: {por que mudou}
  - Aprovado por: {dev / decisao tacita}

<!-- Todos os desvios dos planoNN/MEMORY.md, agregados -->

---

## Metricas Totais

| Metrica | Total | Por Plano |
|---------|-------|-----------|
| Planos planejados | {N} | — |
| Planos concluidos | {N} | {01:completed, 02:skipped, ...} |
| Fases total | {N} | — |
| Fases concluidas | {N} | — |
| Fases skipped | {N} | — |
| Bugs encontrados | {N} | {01:X, 02:Y} |
| Retries necessarios | {N} | — |
| Desvios | {N} | — |

---

## Candidatas a Licao (para /lessons-learned)

Lista que o dev pode revisar para decidir quais itens promover para `CLAUDE.md`
via `/anti-vibe-coding:lessons-learned add`.

- {item 1 — referencia ao DI/GT/BUG acima}
- {item 2}

<!-- Gerado por heuristica: tudo em "Gotchas Generalizaveis" + DIs com impacto cross-plano -->

---

<!-- Gerado ao arquivar via /anti-vibe-coding:verify-work em {YYYY-MM-DD} -->
