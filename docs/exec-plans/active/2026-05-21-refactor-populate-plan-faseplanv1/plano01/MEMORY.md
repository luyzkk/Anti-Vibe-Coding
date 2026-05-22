# Memoria: Plano 01 — Schema, Renderer e Data (FasePlanInput v1)

**Feature:** Refatorar populate-plan-generator → hierarquia + FasePlanInput v1
**Iniciado:** 2026-05-21
**Concluido:** 2026-05-21
**Status:** completed

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

### fase-01

- **DI-Plano01-fase01-golden-source**: golden `__golden__/fase-plan-sample.md` foi construido a partir do diff do `bun test` (test falhou indicando exatamente bytes esperados — invertido em vez de gerar via eval). TDD gate bloqueava criacao de `.ts/.mjs` extra. Funcionou; nao precisa repetir essa tecnica nas fases seguintes (fase-03 nao gera goldens TS).
- **DI-Plano01-fase01-detection-signals-no-double-escape**: strings `'process.env\\.'` no source TS sao o literal `process.env\.` (1 backslash + dot — regex valido). Renderer NAO processa, apenas embute. Golden mostra `process.env\.`. Subagente reportou confusao com bun eval vs bun test mas o resultado final esta correto — confirmado por leitura do source + golden.

### fase-02

- **DI-Plano01-fase02-test-file-append**: `populate-instructions-table.test.ts` JA EXISTIA com 19 testes do Plano 04 fase-02 (D18). Subagente adicionou novo `describe` ao final com os 6 testes novos (em vez de criar arquivo zerado). Total 25 testes verdes. Spec original assumia arquivo inexistente — corrigido.
- **DI-Plano01-fase02-import-swap-safe**: `populate-instructions-table.ts` linha 8 trocou import de `Wave, RiskEntry` de `./populate-plan-generator` para `Wave, RiskEntry, StackVariants` de `./render-fase-plan`. Shapes identicos — structural typing aceita. populate-plan-generator.ts AINDA exporta Wave/RiskEntry (duplicacao temporaria — Plano 02 fase-01 limpa).

### fase-03

- **DI-Plano01-fase03-security-real-sections**: `docs-security-md.md` usa as sectionsToWrite REAIS de fase-02 (`Auth Flow, Secret Management, Input Validation, Dependencies, Headers and CSP`) — NAO as do exemplo desatualizado do spec (`Auth Flow, Secrets, Data Classification, Threat Model`). Garante consistencia com drift test de fase-04.
- **DI-Plano01-fase03-md-sizes**: arquivos finais variam entre ~3.8 KB (claude-claude-md.md — menor por ter so 2 H2) e ~7+ KB. Acima do floor de 500 chars do teste 2.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.

<!-- preencher durante execucao -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.

### fase-01

- **GT-Plano01-fase01-no-lint-script**: `package.json` do projeto NAO tem script `lint` — apenas `typecheck` (`tsc --noEmit`). Specs das proximas fases mencionam `bun run lint` no criterio de aceite — ignorar essa checagem ou substituir por `bun run typecheck`.
- **GT-Plano01-fase01-bun-eval-vs-bun-test-escape**: `bun --eval` e `bun test` interpretam string-escape em arquivos `.ts` de formas diferentes. Para gerar goldens byte-estaveis, NUNCA usar bun eval inline — sempre escrever no source e capturar via test runner ou helper TS dedicado.

### fase-02

- **GT-Plano01-fase02-slug-preserves-underscore**: `docToSlug()` NAO substitui `_` por `-`. Algoritmo apenas: strip dot inicial -> replace `/` -> `-` -> replace `.md` -> `-md` -> lowercase. Portanto:
  - `docs/QUALITY_SCORE.md` -> `docs-quality_score-md` (NAO `docs-quality-score-md`)
  - `docs/MERGE_GATES.md` -> `docs-merge_gates-md`
  - `docs/CODE_STYLE.md` -> `docs-code_style-md`
  - `docs/PRODUCT_SENSE.md` -> `docs-product_sense-md`

### fase-04

- **GT-Plano01-fase04-drift-validates-cross-fases**: drift test eh meta-validador de fase-02 + fase-03. Roda 128 assertions (16 docs x 2 direcoes x ~4 keys medias). Mutacao manual de 1 key produz erro acionavel (nomeia doc, key, e lista subsecoes encontradas). Test eh case-sensitive — convencao explicita. **Em Plano 02**, se algum step mudar conteudo dos .md de guidance ou mustCover, este test pega imediatamente.

---

## Desvios do Plano

O que mudou em relacao ao planejado e por que.

### fase-02

- **DEV-Plano01-fase02-test-file-existed**: spec assumia criacao de `populate-instructions-table.test.ts` zerado, mas arquivo ja existia (19 testes do Plano 04 fase-02). Subagente adicionou novo `describe` com 6 testes ao final em vez de sobrescrever. Aceito — preserva trabalho anterior.
- **DEV-Plano01-fase02-slug-correction**: 4 slugs no spec da tabela (linhas 119-136) estavam errados (esperavam `-` em vez de `_`). Fase-02 usou os slugs CORRETOS conforme `docToSlug()` real, NAO conforme spec. Ver GT-Plano01-fase02-slug-preserves-underscore.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 1 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Testes adicionados | 17 (5 + 6 + 3 + 2 + 1 já-existente preservado) |
| Assertions totais (Plano 01) | 547 (em 4 arquivos de teste novos) |
| Arquivos criados | 22 (render-fase-plan.ts/.test.ts, 16 guidance .md + _template + _index, 3 .test.ts adicionais) |
| Arquivos modificados | 2 (populate-instructions-table.ts/.test.ts + _template.md durante fase-04) |

---

## Notas para Planos Seguintes

O subagente do Plano 02 PRECISA saber:

### API publica entregue por Plano 01

- **`skills/init/lib/render-fase-plan.ts`** exporta:
  - `type FasePlanInput` (12 campos + `schemaVersion: 1`)
  - `type Wave`, `type RiskEntry`, `type StackVariants` (compartilhaveis)
  - `renderFasePlan(input: FasePlanInput): string` — funcao pura, sem fs/io
  - `extractH2Sections(markdown): string[]` — utilitario para testes
- **`skills/init/lib/populate-instructions-table.ts`** exporta:
  - `type DocInstruction` extendido com 6 campos novos (apos os antigos): `guidanceFile`, `detectionSignals`, `mustCover`, `linkTargets`, `stackVariants?`, `validationCommand`, `dependsOn`
  - `POPULATE_INSTRUCTIONS_BY_DOC: ReadonlyMap<string, DocInstruction>` com 16 entradas
  - `docToSlug(dst: string): string` — algoritmo canonico (NAO substitui `_`)
- **`skills/init/assets/populate-guidance/`** contem 18 .md (16 guidance + `_template.md` + `_index.md`)

### Contrato que Plano 02 deve respeitar

- **NAO modifique** `render-fase-plan.ts`, `populate-instructions-table.ts`, ou os 18 .md de guidance — sao API estavel para Plano 02 fase-01 (adapter `DocInstruction → FasePlanInput`).
- **Final Report Contract** eh hardcoded no renderer — NAO passar como input. ADR-0022 decisao 6.
- **Adapter `DocInstruction → FasePlanInput`** que Plano 02 fase-01 deve escrever:
  - `docPath` ← chave do Map
  - `schemaVersion: 1` ← literal
  - `goal/assumptions/risks/reviewChecklist/compoundOpportunity/exitCriteria` ← copia 1:1
  - `scope: { in: scopeIn, out: scopeOut }` ← renomeacao
  - `waves` ← construir 2 waves a partir de `sectionsToWrite` (Wave 1 Discovery + Wave 2 Write sections)
  - `guidanceFile/detectionSignals/mustCover/linkTargets/validationCommand/dependsOn` ← copia 1:1
  - `stackVariants` ← copia 1:1 quando presente; omitir quando undefined

### Slugs CORRETOS para os 16 docs (referencia rapida)

Use `docToSlug(doc)` em runtime — NAO hardcode. Mas para inspecao manual:

```
AGENTS.md                         -> agents-md
ARCHITECTURE.md                   -> architecture-md
README.md                         -> readme-md
docs/QUALITY_SCORE.md             -> docs-quality_score-md       (underscore preservado)
docs/PLANS.md                     -> docs-plans-md
docs/DESIGN.md                    -> docs-design-md
docs/FRONTEND.md                  -> docs-frontend-md
docs/PRODUCT_SENSE.md             -> docs-product_sense-md       (underscore)
docs/RELIABILITY.md               -> docs-reliability-md
docs/SECURITY.md                  -> docs-security-md
docs/design-docs/core-beliefs.md  -> docs-design-docs-core-beliefs-md
docs/generated/db-schema.md       -> docs-generated-db-schema-md
docs/MERGE_GATES.md               -> docs-merge_gates-md         (underscore)
docs/CODE_STYLE.md                -> docs-code_style-md          (underscore)
docs/STATE.md                     -> docs-state-md
.claude/CLAUDE.md                 -> claude-claude-md
```

### Estado do renderer antigo

- `skills/init/lib/populate-plan-generator.ts` AINDA exporta `Wave`, `RiskEntry`, `AndrePlanInput`, e a logica antiga de gerar 16 PLAN.md. **Esta intocada nesta entrega** — Plano 02 fase-01 vai substituir.
- `populate-instructions-table.ts` linha 8 agora importa `Wave, RiskEntry, StackVariants` de `./render-fase-plan` (e nao mais de `./populate-plan-generator`). Plano 02 fase-01 pode deletar os tipos duplicados de `populate-plan-generator.ts` sem quebrar callers.

### Verificacao baseline (Plano 02 deve manter verde)

- `bun test skills/init/lib/render-fase-plan.test.ts` → 5 passed
- `bun test skills/init/lib/populate-instructions-table.test.ts` → 25 passed (19 pre-existentes + 6 novos)
- `bun test skills/init/lib/populate-guidance-files.test.ts` → 3 passed
- `bun test skills/init/lib/populate-guidance-drift.test.ts` → 2 passed
- `bun run typecheck` → exit 0

### Sem script `lint`

- `bun run lint` NAO existe no projeto. Use APENAS `bun run typecheck`. Specs de Plano 02 que mencionem lint sao escopo NAO-EXECUTAVEL — substituir por typecheck.

---

<!-- Atualizado automaticamente durante execucao -->
