# Memoria: Plano 03 — MH-3 Instrucoes imperativas

**Feature:** populate-plan-andre-port
**Iniciado:** 2026-05-19
**Status:** em andamento

**Bloqueadores ja resolvidos:** Plano 01 (lista canonica completa, `EXCLUDED_FROM_POPULATION_V2`
reduzido, `tests/e2e/populate-plan-parity.test.ts` com 2 asserts MH-1 ativos). Plano 03 roda
em paralelo com Plano 02 e Plano 04 — arquivos disjuntos.

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-Plano03-fase01-helper-location:** `formatImperativeInstruction` definido no mesmo
  arquivo `populate-plan-generator.ts` (modulo origem). Nao virou util compartilhado.
  - Por que: zero outros callers no momento. Promover quando segundo caller aparecer.
  - Impacto: import em `imperative-instruction.test.ts` aponta para
    `../skills/init/lib/populate-plan-generator` (path relativo do teste).

- **DI-Plano03-fase02-batch-size:** 12 entries refatoradas em 4 lotes de 3 (rodando typecheck
  entre lotes).
  - Por que: catch typo cedo. Lote 1: ARCHITECTURE/FRONTEND/SECURITY. Lote 2: RELIABILITY/DESIGN/CODE_STYLE.
    Lote 3: QUALITY_SCORE/PLANS/STATE. Lote 4: core-beliefs/AGENTS/CLAUDE.
  - Impacto: zero typos detectados em CI — typecheck local apanhou todos.

- **DI-Plano03-fase03-export-llm-instructions:** `LLM_INSTRUCTIONS` recebe `export` em
  fase-03 (estava `const` privado).
  - Por que: parity test em `tests/e2e/populate-plan-parity.test.ts` precisa importar.
  - Impacto: novo simbolo publico — documentar em ARCHITECTURE.md se virar API estavel.
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **Gotcha-Plano03-{tag}:** {descricao breve do que assustou}
  - Como deveria ser feito: {recomendacao}
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- A preencher conforme execucao. Exemplos do que registrar aqui:
- Caminho final do helper `formatImperativeInstruction` (provavel
  `skills/init/lib/populate-plan-generator.ts`). Plano 05 fase-01 pode reusar para gerar
  golden snapshot consistente.
- Lista exata das 12 entries refatoradas (chaves do map `LLM_INSTRUCTIONS`). Plano 05 fase-01
  estende snapshot com cada uma.
- Decisao sobre `DEFAULT_INSTRUCTION.secoes` — qual lista canonica ficou (Goal / Inputs /
  Output era a sugestao inicial; se mudou, registrar).
- Numero final de asserts em `tests/e2e/populate-plan-parity.test.ts`:
  - Standalone (so Plano 01 + Plano 03): 4 (2 MH-1 + 2 CA-06).
  - Com Plano 02 merged: 6 (2 MH-1 + 2 CA-03 + 2 CA-06).
  - Plano 05 fase-01 estende.
- Path do alias TS usado para importar `LLM_INSTRUCTIONS` em `tests/e2e/...` (relativo vs
  alias `@/skills/...`). Plano 05 fase-01 espelha a mesma convencao.
-->

---

<!-- Atualizado automaticamente durante execucao -->
