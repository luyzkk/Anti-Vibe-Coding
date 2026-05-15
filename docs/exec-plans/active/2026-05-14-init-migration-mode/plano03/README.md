# Plano 03: Subagent Orchestration — Fases 1-3

**Feature:** /init Migration Mode ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~8h
**Depende de:** Plano 01 (TemplateEntry.category + migration-mode-detector.ts), Plano 02 (discovery.ts / InventoryResult / audit-log.ts), v6.1.0 externo (subagent-contract.ts)
**Desbloqueia:** Plano 04 (manifest + harness-validate consome semantic-inventory.json + migration plans), Plano 05 (fixtures precisam do pipeline completo para testar e2e)

> **BLOQUEIO EXTERNO:** v6.1.0 (subagent-contract-v1) deve estar mergeado antes de integrar.
> Os planos podem ser escritos e revisados agora — apenas a execução das fases 02-05 está bloqueada.
> `skills/lib/subagent-contract.ts` e `agents/_contract/v1.schema.json` já existem neste repo (merged em 2026-05-14).

---

## O que este plano entrega

Implementa os 3 subagentes LLM do pipeline de migration mode — Explorer (leitura semântica paralela),
Reconciler (reconciliação slot-a-slot) e Compound-writer (notas de conhecimento durável) — com
orquestração TypeScript: hard cap de 6 paralelos, batching sequencial para repos grandes, retry 1×
com prompt reduzido, e abort com relatório auditável de arquivos não-processados.

O agente principal **nunca toca conteúdo cru** de arquivo (CA-05 enforced pela arquitetura):
só o struct `SemanticInventoryEntry` que o Explorer devolve. Cada subagente emite o contrato v1
(`skills/lib/subagent-contract.ts`), garantindo interoperabilidade com o pipeline anti-vibe.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| Dependência | O que usa |
|-------------|-----------|
| Plano 01 — fase-01 (`TemplateEntry.category`) | Reconciler itera pelos 26 slots distinguindo `canon-andre` de `anti-vibe-extension` para emitir warning vs error |
| Plano 01 — fase-02 (`migration-mode-detector.ts`) | `runMigrationPlanner` só é chamado quando modo migration está confirmado |
| Plano 02 — fase-01 (`discovery.ts` / `InventoryResult`) | `migration-planner.ts` recebe `InventoryResult` como input do Explorer |
| Plano 02 — fase-03 (`audit-log.ts` / `AuditLogger`) | Cada subagent call registra entrada + saída em `discovery/agents-log.json` |
| v6.1.0 externo (`subagent-contract.ts`) | `parseContract()` e `parseAndDispatch()` usados pelo orchestrator para validar output dos 3 subagentes |

### Produz para (outros planos que dependem deste)

| Plano | O que usa deste plano |
|-------|----------------------|
| Plano 04 | `discovery/semantic-inventory.json` como input do manifest writer; `docs/exec-plans/active/` populado com migration plans para catalog |
| Plano 05 | `migration-planner.ts` como código de referência para testes de idempotência; prompts versionados para fixture de checksum |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-prompts-separados.md` | `skills/init/lib/prompts/{explorer,reconciler,compound}.md` com schema JSON estrito | ~1.5h | Nenhuma (pode ser escrita mesmo antes de Plano 01/02) |
| 02 | `fase-02-explorer-orchestrator.md` | `skills/init/lib/migration-planner.ts` — Explorer cap 6 + batching sequencial + SemanticInventoryEntry | ~2h | fase-01 + Plano 02 fase-01 + v6.1.0 mergeado |
| 03 | `fase-03-reconciler-plan-writer.md` | Reconciler slot-by-slot + plan writer 10-seções + `plan-validator.ts` | ~2h | fase-02 + Plano 01 fase-01 |
| 04 | `fase-04-compound-writer.md` | Compound-writer subagent + CA-29 compliance + `compound:check` compat | ~1.5h | fase-03 |
| 05 | `fase-05-retry-abort-logic.md` | Retry 1× com batch reduzido + abort path + relatório de unprocessed files | ~1h | fase-02 |

---

## Grafo de Fases

```
fase-01 (prompts .md — schema estrito)
    │
    ▼
fase-02 (migration-planner.ts — Explorer orchestrator)
    │                          │
    ▼                          ▼
fase-03 (Reconciler +     fase-05 (retry/abort logic)
         plan-validator)       │
    │                          └─── integra em fase-02
    ▼
fase-04 (Compound-writer)
```

fase-05 retroalimenta fase-02 (adiciona retry/abort ao `runMigrationPlanner`).
fase-03 e fase-05 são independentes entre si após fase-02.

---

## TDD Strategy

Ciclo RED → GREEN por fase:

- **fase-01:** sem módulo TS novo — revisão manual dos prompts + teste de schema JSON inline
- **fase-02:** escreve `migration-planner.test.ts` com mock do subagent invoke antes de criar o módulo → RED → implementa → GREEN
- **fase-03:** escreve `reconciler.test.ts` + `plan-validator.test.ts` antes de criar os módulos → RED → GREEN
- **fase-04:** escreve `compound-writer.test.ts` verificando frontmatter CA-29 antes de criar módulo → RED → GREEN
- **fase-05:** expande `migration-planner.test.ts` com casos de retry e abort → RED por assertions ausentes → adiciona retry/abort logic → GREEN

Estratégia global: mocks de `Task` tool para subagents (retornam contratos fake válidos) garantem que os testes não disparam LLM real. `parseContract()` do `subagent-contract.ts` já testado externamente.

---

## Gotchas Conhecidos

**G1 — CA-05 é arquitetural, não apenas convencional:** `runMigrationPlanner` deve ser estruturado para que o handler do Explorer receba apenas `InventoryEntry[]` e devolva apenas `SemanticInventoryEntry[]`. Nunca passar o conteúdo do arquivo para fora do subagent. Revisão de code: se qualquer função no orchestrator receber `string` de conteúdo de arquivo, é regressão de CA-05.

**G2 — ProposalContract e VerificationContract têm shapes distintos:** Explorer emite `kind: "proposal"` com `payload.proposal` estruturado (title, summary, constraints, tradeoffs, recommendation, alternatives). Mas para o migration mode, o Explorer precisa de um payload customizado com `semantic_analysis`. Solução: usar `MutationContract` (`payload: Record<string, unknown>`) para Explorer e Compound-writer em v1 — payload stub aceita qualquer shape. Reconciler emite `VerificationContract` com `payload.checks[]`. Plano 04 pode refinar os tipos.

**G3 — Batching: >18 arquivos não é "3 batches de 6":** O cap é 6 **paralelos simultâneos**. Um repo com 20 arquivos roda: batch 1 (6 paralelos) → aguarda todos → batch 2 (6 paralelos) → aguarda → batch 3 (8 restantes, mas cap 6 simultâneos → 6 + 2). A lógica de chunking deve usar `Math.ceil(entries.length / MAX_PER_SUBAGENT)` para distribuição uniforme, não fatiar fixo em 6.

**G4 — `new-plan.mjs` shape: 10 seções exatas:** O plan-validator.ts deve checar por slug: `## Goal`, `## Scope`, `## Assumptions`, `## Risks`, `## Execution Steps`, `## Review Checklist`, `## Validation Log`, `## Compound Opportunity`, `## Lessons Captured`, `## Exit Criteria`. Qualquer variação de capitalização ou nomenclatura é FAIL (CA-08 é estrito).

**G5 — Compound notes não são migration plans:** CA-29 usa frontmatter YAML (`---`), não seções H2. O plan-writer usa H2 sections. Não misturar os dois formatos. `compound-writer.ts` escreve em `docs/compound/`, `plan-writer.ts` escreve em `docs/exec-plans/active/`.

**G6 — Retry com prompt reduzido significa menos arquivos, não prompt menor:** DT-03 especifica "prompt reduzido" como "menos arquivos por subagente" (máximo 2 por subagent no retry). O texto do prompt em si não muda — só a quantidade de arquivos passada. Isso garante que a falha por context overflow seja resolvida, não mascarada.

**G7 — `discovery/semantic-inventory.json` é append ou overwrite?:** Overwrite. Full re-run (DT-02) regera tudo. Não existe merge incremental de semantic inventory em v1. Plano 05 cuida da idempotência preservando apenas `docs/exec-plans/active/` plans.

<!-- Gerado por /plan-feature em 2026-05-14 -->
