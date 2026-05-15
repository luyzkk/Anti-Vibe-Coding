# Memoria: Plano 03 — Multi-PRD, ciclo de vida e consolidacao

**Feature:** Refatoracao da Estrutura de Pastas por PRD
**Iniciado:** 2026-04-20
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

### DI-1 (fase-01) — execute-plan nao explicita "pasta sem STATE.md = planned"

A spec pedia que ambas as skills explicitem o comportamento. No `execute-plan`, esse caso
nao foi explicitado no Step 1a porque o Step 2 ja cria STATE.md se nao existir — sem inconsistencia.
`plan-feature` explicita o comportamento (pasta sem STATE.md → `planned`).

**Por que:** evitar redundancia — execute-plan trata a ausencia de STATE.md no Step seguinte.
**Impacto:** comportamento final identico; apenas a documentacao difere levemente entre as duas skills.

### DI-2 (fase-02) — write-prd/SKILL.md bundled no commit de fase-01

Mudancas da fase-02 (`write-prd/SKILL.md`) foram incluidas no mesmo commit `036315a` que a
fase-01 (plan-feature). Dois agentes paralelos fizeram `git add` simultaneamente; o commit
do segundo agente capturou os dois arquivos staged.

**Por que:** paralelismo de git add sem lock (D3 — sem lock global). Comportamento aceitavel.
**Impacto:** commits menos atomicos por fase; implementacao correta. Plano 04: mesma situacao
pode ocorrer se fases paralelas modificarem arquivos do mesmo diretorio simultaneamente.

### DI-3 (fase-02) — bloco G-PLAN-1 ja havia sido removido antes da fase

O bloco de codigo morto (tratamento de `PRD-*.md` solto no write-prd) nao estava presente
quando o agente da fase-02 executou — foi removido em fase anterior sem registro explicito.

**Por que:** provavelmente removido durante Plano 01 ou Plano 02 como parte de limpeza implicita.
**Impacto:** objetivo alcancado (codigo morto ja nao existe); nao eh necessaria nenhuma acao.

---

## Bugs Descobertos

Nenhum bug encontrado durante a Wave 1 (fases 01-03).

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

### GT-1 (fase-02) — Agentes paralelos com git add simultâneo geram commits agrupados

Quando dois agentes em paralelo executam `git add` no mesmo repositorio, o commit do segundo
agente pode incluir mudancas staged pelo primeiro (se o stage area ainda nao foi limpa pelo
primeiro commit). Resultado: um commit acumula mudancas de duas fases distintas.

**Por que importa:** rastreabilidade por commit fica comprometida; auditoria de historico git
pode nao separar contribuicoes de fases diferentes.
**Prevencao:** se atomicidade de commits por fase for critica, usar `git stash` ou verificar
`git diff --staged` antes de commitar para confirmar que so os arquivos da fase atual estao staged.

---

## Desvios do Plano

### DEV-1 — fase-02 bundled com fase-01 em commit unico (036315a)

Esperado: commit separado por fase.
Ocorreu: `write-prd/SKILL.md` (fase-02) incluido no commit de `plan-feature/SKILL.md` (fase-01).
Motivo: ver DI-2 acima.
Impacto: baixo — implementacao correta; apenas historico git menos granular.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 1 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### CRITICOS para Plano 04 (extras — Could Have)

- **GT-1 (herdado Plano 01):** `anti-vibe-coding/` e repo git independente. Commits com CWD ali dentro.
- **DI-2 (Plano 03):** git add paralelo pode bundlar arquivos de fases distintas em 1 commit. Verificar `git diff --staged` antes de cada commit para garantir atomicidade por fase.
- **G-PLAN-13 (CRITICO):** `prd-template.md` NAO tem frontmatter YAML hoje — comeca com `# PRD: {Feature Name}`. Plano 04 fase-01 precisa ADICIONAR bloco `---\nrequires: []\n---` no topo e parser tolerante a ausencia em PRDs legacy.
- **Estado final apos Plano 03:** verify-work oferece arquivamento real + gera MEMORY consolidado; write-prd trata colisao mesmo-dia; execute-plan/plan-feature listam PRDs por discovery interativo; CLAUDE.md do plugin reflete tudo isso.
- **Plano 04 nao depende de Plano 03** (so de Plano 01) — pode rodar independentemente. Nenhuma interacao entre as fases deste plano e o Plano 04.

---

<!-- Atualizado automaticamente durante execucao -->
