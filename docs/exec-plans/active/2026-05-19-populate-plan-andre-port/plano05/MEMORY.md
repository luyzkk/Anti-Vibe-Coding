# Memoria: Plano 05 — Gate completo + Should Haves + compound + goldens

**Feature:** populate-plan-andre-port
**Iniciado:** 2026-05-19
**Status:** em execucao (fase-01 concluida)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Plano05-fase01-golden-format:** Golden captura marcadores estruturais via `actual.includes(goldenLine)` por linha, nao igualdade literal. Cada linha nao-vazia do golden (excluindo blocos HTML `<!-- ... -->` completos) deve estar presente no actual.
  - Por que: G-golden-includes-not-equals da spec — permite mudancas de conteudo sem quebrar gate; quebra apenas se estrutura desaparecer.
  - Impacto: golden e contrato de estrutura, nao de conteudo. Instrucoes LLM podem ser expandidas sem regen obrigatoria.

- **DI-Plano05-fase01-update-flag:** env var `UPDATE_GOLDENS=1` (mesma convencao de `init-cutover-greenfield.test.ts`) regrava golden via `fs.writeFile`. Sem a flag, diff quebra build com mensagem apontando marcadores ausentes + link ao PRD.
  - Por que: consistencia de convencao no repo.
  - Impacto: regen = `UPDATE_GOLDENS=1 bun test tests/e2e/populate-plan-parity.test.ts`.

- **DI-Plano05-fase01-comment-filter:** helper `assertMatchesGolden` usa `golden.replace(/<!--[\s\S]*?-->/g, '')` para remover blocos HTML completos antes de extrair linhas a checar. Filtro simples `!startsWith('<!--')` nao e suficiente — linhas intermediarias do bloco nao comecam com `<!--`.
  - Por que: golden tem cabecalho descritivo com regras de regen (multi-linha HTML comment) que nao devem virar assertions.
  - Impacto: cabecalho do golden e documentacao para humanos; nao afeta o gate mecanico.

- **DI-Plano05-fase01-regressao-validada-manualmente:** regressao simulada via `fakeExcluded` com `docs/PRODUCT_SENSE.md` confirmou que o teste de `EXCLUDED_FROM_POPULATION_V2` quebra com mensagem contendo `MH-1`-equivalente e link ao PRD. Nao foi necessario editar/reverter o arquivo de producao — validacao foi via bun eval.
  - Por que: evitar risco de esquecer de reverter mudanca em codigo de producao.

<!--
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
| Fases concluidas | 1 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

### Apos fase-01 (golden snapshot — CA-08)

- **Golden gerado em `tests/e2e/__golden__/populate-plan-andre-parity.md`:** captura marcadores estruturais do plano populate (headers PLAN.md + linhas da tabela de 31 fases + sub-secoes de fase). Assert usa `includes` por linha — nao igualdade literal.
- **9 testes passando em `tests/e2e/populate-plan-parity.test.ts`:** 8 pre-existentes (Planos 01-04) + 1 novo CA-08. Todos usam `throw new Error(...)` com link ao PRD.
- **`tests/e2e/__golden__/README.md` criado:** explica convencao de regen e diferenca entre goldens de tree/stdout vs golden de estrutura markdown.
- **Proxima fase (fase-02):** audit log contrato — ver `fase-02-audit-log-contract.md`.

---

Plano 05 e o ultimo do PRD `populate-plan-andre-port`. Nenhum plano subsequente dentro deste PRD.

Notas para iteracoes pos-merge (Follow-up Plans do PRD):

- **Compound capturado em `docs/compound/2026-05-19-never-diminish-andre.md`:** linkar este compound em qualquer PR futuro que mexa em `populate-plan-generator.ts`, `stack-aware-input-paths.ts` ou `LLM_INSTRUCTIONS` map. Gate "nunca diminuir" agora e tanto mecanico (parity test) quanto cultural (compound note).
- **`LARAVEL_CANDIDATES`/`PYTHON_CANDIDATES` em modo "neutro":** sem `EXTRA` para frameworks (Django, Flask, FastAPI, Statamic). Quando aparecer caso real, espelhar padrao `NEXTJS_SUPABASE_EXTRA` (merge via `mergeCandidates`). Registrar como CH em iteracao futura.
- **MEMORY.md raiz (do plugin) tem 1 entrada para limpar apos fase-06:** secao "Notas para Planos Seguintes — Golden snapshot precisa regeneracao (Plano 05 fase-04)" refere-se ao PRD antigo (knowledge-path-cutover). Substituida por esta execucao — remover da MEMORY.md raiz na fase-06 (passo de cleanup).
- **`pickStaticMap` refactor para hash map (Could Have):** apos fase-02, switch passa a ter 7 cases. Continua legivel. Refator para `Record<StackId | 'null', StackCandidates>` pode virar Could Have de iteracao futura quando aparecer 8o stack.

---

<!-- Atualizado automaticamente durante execucao -->
