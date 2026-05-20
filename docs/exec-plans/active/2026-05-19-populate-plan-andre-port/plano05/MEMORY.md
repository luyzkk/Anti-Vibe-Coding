# Memoria: Plano 05 — Gate completo + Should Haves + compound + goldens

**Feature:** populate-plan-andre-port
**Iniciado:** 2026-05-19
**Status:** planejado (nao iniciado)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!--
Exemplo de entrada (preencher durante execucao):

- **DI-Plano05-fase01-golden-format:** Golden grava em forward-slash + LF (sem CRLF) para evitar diff espurio em Windows
  - Por que: Bun em Windows pode escrever snapshots com CRLF; helper de diff normaliza ambos os lados
  - Impacto: helper `assertMatchesGolden()` aplica `.replace(/\r\n/g, '\n')` antes do `.toBe()`

- **DI-Plano05-fase02-laravel-paths:** `LARAVEL_CANDIDATES` cobre 10 paths do scaffold padrao laravel/laravel sem incluir Modules/ nem app/Services/
  - Por que: G4 do README — paths de convencao de equipe nao sao scaffold padrao
  - Impacto: cobertura conservadora, projetos Laravel com convencoes diferentes caem em `exists: false` para alguns docs (aceitavel — renderer marca _nao encontrado_)
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!--
Exemplo de entrada:

- **BUG-Plano05-fase06-stdout-diff:** Golden stdout regenerado tinha 1 linha a mais que o antigo apos remocao do Step 07
  - Causa: spinner do step `90-final-validation` emitia "OK" extra quando knowledge stub existia (Plano 01 fase-02 pre-popula stub)
  - Fix: normalizar regex que filtra spinner lines no helper `normalizeStdout()`
  - Fase afetada: fase-06
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!--
Exemplo:

- **GT-Plano05-fase04-audit-helper:** `computeAuditCoverage` em test mock recebe Map vazio quando `stackPaths` e injetado sem entries — diferente de Map com keys mas values vazios
  - Descoberto em: fase-04
  - Impacto: helper trata `map.size === 0` como erro upstream; testes com fixture vazio precisam injetar pelo menos 1 entry "dummy"
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!--
Exemplo:

- **DEV-Plano05-fase05-pipeline-scope:** secao "Step 91" em PIPELINE.md ficou maior que o planejado (2 paragrafos vs 1)
  - Motivo: precisava explicar gate "nunca diminuir" mecanico para devs externos que leiam pipeline pela primeira vez
  - Aprovado durante execucao
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

Plano 05 e o ultimo do PRD `populate-plan-andre-port`. Nenhum plano subsequente dentro deste PRD.

Notas para iteracoes pos-merge (Follow-up Plans do PRD):

- **Compound capturado em `docs/compound/2026-05-19-never-diminish-andre.md`:** linkar este compound em qualquer PR futuro que mexa em `populate-plan-generator.ts`, `stack-aware-input-paths.ts` ou `LLM_INSTRUCTIONS` map. Gate "nunca diminuir" agora e tanto mecanico (parity test) quanto cultural (compound note).
- **`LARAVEL_CANDIDATES`/`PYTHON_CANDIDATES` em modo "neutro":** sem `EXTRA` para frameworks (Django, Flask, FastAPI, Statamic). Quando aparecer caso real, espelhar padrao `NEXTJS_SUPABASE_EXTRA` (merge via `mergeCandidates`). Registrar como CH em iteracao futura.
- **MEMORY.md raiz (do plugin) tem 1 entrada para limpar apos fase-06:** secao "Notas para Planos Seguintes — Golden snapshot precisa regeneracao (Plano 05 fase-04)" refere-se ao PRD antigo (knowledge-path-cutover). Substituida por esta execucao — remover da MEMORY.md raiz na fase-06 (passo de cleanup).
- **`pickStaticMap` refactor para hash map (Could Have):** apos fase-02, switch passa a ter 7 cases. Continua legivel. Refator para `Record<StackId | 'null', StackCandidates>` pode virar Could Have de iteracao futura quando aparecer 8o stack.

---

<!-- Atualizado automaticamente durante execucao -->
