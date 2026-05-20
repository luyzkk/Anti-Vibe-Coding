# Memoria: Plano 05 — Gate completo + Should Haves + compound + goldens

**Feature:** populate-plan-andre-port
**Iniciado:** 2026-05-19
**Status:** em execucao (fase-03 concluida)

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

- **DI-Plano05-fase02-laravel-paths:** `LARAVEL_CANDIDATES` cobre 10 docs canonicos do scaffold padrao laravel/laravel (composer create-project, versao 11.x). Sem `Modules/`, `app/Services/`, `app/Repositories/` (convencoes de equipe — G4 do README).
  - Por que: G4 do README — paths de convencao de equipe nao sao scaffold padrao.
  - Impacto: cobertura conservadora, projetos Laravel com convencoes diferentes caem em `exists: false` para alguns docs (aceitavel — renderer marca _nao encontrado_). `docs/PLANS.md`, `docs/QUALITY_SCORE.md`, `docs/STATE.md`, `docs/design-docs/core-beliefs.md` excluidos (docs de processo sem evidencia natural no framework).

- **DI-Plano05-fase02-python-neutral:** `PYTHON_CANDIDATES` cobre 8 docs canonicos com paths neutros (sem `manage.py`, sem `wsgi.py`, sem `app.py`). Referencia: `poetry new` e `cookiecutter pypackage`.
  - Por que: G5 do README plano 05 — nao assumir Django/Flask/FastAPI. Frameworks especificos viram `PYTHON_DJANGO_EXTRA`/`PYTHON_FASTAPI_EXTRA` em iteracao futura (mesmo padrao de `NEXTJS_SUPABASE_EXTRA`).
  - Impacto: projetos Python generico bem cobertos; projetos framework-especifico tem cobertura parcial ate que EXTRA seja adicionado.

- **DI-Plano05-fase02-pickstaticmap-7cases:** switch `pickStaticMap` passou de 5 cases para 7 cases (`nextjs`, `rails`, `node-ts`, `laravel`, `python`, `unknown`, `null/default`). Continua legivel.
  - Por que: G3 do plano — 7 cases nao justifica refator para hash map ainda. CLAUDE.md global preconiza hash map sobre switch, mas 7 e enxuto.
  - Impacto: refator para `Record<StackId | 'null', StackCandidates>` vira Could Have quando 8o stack aparecer (registrado em "Notas para Planos Seguintes").

- **DI-Plano05-fase03-lessons-seeds:** 6 licoes genericas pre-populadas em `## Lessons Captured` do `PLAN.md.tpl` com comentario HTML data-marcado `2026-05-19 (Luiz/dev): ... Sao seeds — remover ou substituir apos primeira customizacao real`. Subagente do `/execute-plan` deve revisar e substituir conforme contexto do projeto especifico.
  - Por que: SH-3 do PRD + `feedback_copy-then-improve` aplicado a si mesmo — projetos novos iniciam com licoes ja capturadas em vez de placeholder vazio.
  - Impacto: `PLAN.md` gerado por Step 91 agora inclui 6 bullets acionaveis. Golden snapshot regenerado para refletir a mudanca.

- **DI-Plano05-fase03-parity-tolerancia:** sub-assert SH-3 no `populate-plan-parity.test.ts` usa `>= 4 bullets`, nao `>= 6`. Tolerancia de 2 customizacoes ja realizadas em projetos no meio do ciclo de vida.
  - Por que: gate quer detectar quando o tpl foi readicionado vazio (regressao de template), nao quando o projeto customizou organicamente 1-2 bullets. Fixture greenfield sempre tera 6 na pratica — `>= 4` da margem para refator futuro do tpl.
  - Impacto: parity test agora tem 10 asserts (9 anteriores + 1 SH-3). Importa `it` de `bun:test` (adicionado ao import existente).

- **DI-Plano05-fase04-helper-isolado:** criamos `populate-plan-coverage.ts` como helper isolado em vez de inlinear a logica diretamente em `91-generate-populate-plan.ts`.
  - Por que: helper testavel sem precisar instanciar o Step 91 completo (mockar `AuditLogWriter` continua possivel, mas isolacao da logica de contagem e mais limpa). 6 unit tests cobrem todos os cenarios sem overhead de fixture.
  - Impacto: `computeAuditCoverage(stackPaths, plan)` exportado publicamente — pode ser reutilizado por outros callers em iteracoes futuras.

- **DI-Plano05-fase04-empty-map-treated:** Map vazio em `computeAuditCoverage` retorna `{ docsCoveredByStack: 0, docsWithoutCodeEvidence: 0 }` em vez de throw.
  - Por que: decisao defensiva — em runtime, `stackAwareInputPaths()` nunca produz Map vazio (sempre tem >= 1 key do `GENERIC_CANDIDATES`). Se Map vazio aparecer, e bug upstream — retornar 0/0 e sinalizar via audit log sem crash.
  - Impacto: helper trata `map.size === 0` como erro upstream silencioso. Comentario JSDoc explica contrato. G7 do README do Plano 05.

- **DI-Plano05-fase04-MIN_EXPECTED_PHASES-const:** constante `MIN_EXPECTED_PHASES = 12` exportada do helper (nao inline no Step 91).
  - Por que: single source of truth — se PRD futuro mudar minimo de 12 para outro valor, muda em 1 lugar. Step 91 ja tem assertion defensiva `< 10` (linha 46) — gate antigo mais permissivo. `MIN_EXPECTED_PHASES = 12` e o gate de observabilidade mais estrito (SH-4).
  - Impacto: 2 testes em `91-generate-populate-plan.test.ts` asseguram que `phasesCreatedVsExpected.minExpected` seja sempre 12 (CA-01).

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
| Fases concluidas | 4 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

### Apos fase-04 (audit log com metricas de cobertura — SH-4)

- **`populate-plan-coverage.ts` criado em `skills/init/lib/`:** exporta `computeAuditCoverage(stackPaths, plan)` + `MIN_EXPECTED_PHASES = 12`. 6 unit tests verdes (5 isolados + 1 integration com fixture nextjs-supabase).
- **Step 91 agora emite 3 campos novos no `output_struct`:** `docsCoveredByStack`, `docsWithoutCodeEvidence`, `phasesCreatedVsExpected`. Campos anteriores (`planFolder`, `phaseCount`, `filesWritten`, `warnings`, `stackPrimary`, `discoveryEntries`) inalterados.
- **7 testes passando em `91-generate-populate-plan.test.ts`:** 5 pre-existentes + 2 novos SH-4. `makeMockAuditWriter` captura appends via `ctx.flags['__auditLog']`.
- **Proxima fase (fase-05):** ver plano 05 — E2E skipados + cleanup de MEMORY.md raiz.

---

### Apos fase-03 (Lessons Captured pre-populadas — SH-3)

- **`## Lessons Captured` em `skills/init/assets/templates/exec-plan/PLAN.md.tpl` tem 6 seeds pre-populados:** Anti-pattern, copy-then-improve, Padrao compound, Trade-off tokens, Honestidade > marketing, Audit antes de scaling. Comentario HTML data-marcado (`2026-05-19 (Luiz/dev)`) sinaliza que sao seeds.
- **10 testes passando em `tests/e2e/populate-plan-parity.test.ts`:** 9 pre-existentes + 1 novo SH-3. Import `it` adicionado ao import de `bun:test`. Typecheck limpo (3 GT-01 baseline inalterados).
- **Golden snapshot `tests/e2e/__golden__/populate-plan-andre-parity.md` regenerado:** agora reflete as 6 licoes na secao Lessons Captured (linhas 155-160 do golden).
- **Proxima fase (fase-04):** ver plano 05 — E2E skipados + cleanup de MEMORY.md raiz.

---

### Apos fase-02 (LARAVEL + PYTHON candidates — SH-2)

- **`LARAVEL_CANDIDATES` e `PYTHON_CANDIDATES` adicionados em `skills/init/lib/stack-aware-input-paths.ts`:** 10 docs cobertos no Laravel, 8 no Python. Ambos tem cobertura >= 8 keys (ARCHITECTURE, SECURITY, RELIABILITY, CODE_STYLE, AGENTS, CLAUDE, README, PRODUCT_SENSE).
- **`pickStaticMap()` agora tem 7 cases:** `laravel` e `python` saem do `GENERIC_CANDIDATES` e usam seus mapas dedicados. Comentario datado `2026-05-19 (Luiz/dev)` no JSDoc do switch.
- **15 testes passando em `skills/init/lib/stack-aware-input-paths.test.ts`:** 10 pre-existentes + 5 novos (2 Laravel + 2 Python + 1 anti-regression). Nenhum CA-02 para Laravel/Python (escopo original e Next.js+Supabase only).
- **Proxima fase (fase-03):** conforme roadmap do plano 05 — ver `fase-03-*.md`.

---

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
