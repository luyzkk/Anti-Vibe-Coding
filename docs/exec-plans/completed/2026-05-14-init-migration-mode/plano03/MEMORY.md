# Memoria: Plano 03 — Subagent Orchestration

**Feature:** /init Migration Mode
**Iniciado:** —
**Status:** em andamento

---

## Decisoes de Implementacao

**DI-01 (fase-02):** Spec usava `AuditLogger` (não existe em audit-log.ts). Corrigido para `AuditLogWriter` com shape correto de `AppendInput`: `{ subagent_id, input_paths, output_struct, duration_ms, retry_count, error? }`. Planos seguintes devem usar `AuditLogWriter`, nunca `AuditLogger`.

**DI-02 (fase-02):** `invokeExplorer` lê conteúdo dos arquivos internamente e passa para o invoker via `fileContents`. O mock de teste deve derivar os `entries` das chaves de `fileContents` (não de path fixo) porque o invoker recebe o conteúdo real do disco. CA-05 enforced: `fileContents` nunca escapa da função para o caller.

**DI-03 (fase-03):** `TemplateEntry` não tem campo `path` — usa `dst` (destino no projeto) e `src` (template source). A spec de fase-03 referenciava `slot.path` e `slot.description` incorretamente. O `reconciler.ts` usa `slot.dst` como `current_slot` e `slot.src` como `slot_description`. Planos seguintes devem usar `slot.dst` ao referenciar o path do slot canônico.

**DI-04 (fase-04):** `AuditLogWriter.append()` recebe `AppendInput` com campos `subagent_id`, `input_paths`, `output_struct`, `duration_ms`, `retry_count`, `error?`. O `compound-writer.ts` usa `output_struct: { notes_count }` para o log de sucesso e `output_struct: null` para o log de erro. Não usar `opts.logger.append()` sem await (é async).

## Bugs Descobertos

<!-- Registrar bugs encontrados durante implementacao com causa raiz -->

## Gotchas

<!-- Registrar gotchas nao previstos no plano -->

## Desvios do Plano

**DEV-01 (fase-02):** Spec importava `AuditLogger` que não existe — substituído por `AuditLogWriter`. Shape de `append()` também adaptado para `AppendInput` correto. Sem impacto funcional — comportamento equivalente.

**DEV-02 (fase-03):** Spec de reconciler usava `slot.path` e `slot.description`, mas `TemplateEntry` expõe `slot.dst` e `slot.src`. Corrigido no `reconciler.ts`. TDD gate do hook exigiu criar `plan-writer.test.ts` como stub adicional (não estava no plano original).

**DI-05 (fase-05):** `invokeExplorerWithRetry` usa `ChunkResult = { entries: SemanticInventoryEntry[]; failed: InventoryEntry[] }` (shape unificado). O tipo anterior `{ entries: ... } | { failed: ... }` foi descartado — o novo shape permite retorno parcial (alguns entries OK + outros failed) sem union type complexo. Planos seguintes que precisem de retry em outros subagentes devem usar este mesmo shape.

**DI-06 (fase-05):** Retry split usa `chunkEntries(entries, maxRetryFiles)` — mesma função de chunking uniforme do batching principal. Não usar slice fixo no retry. Default `DEFAULT_MAX_FILES_RETRY = 2`.

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 2 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

## Desvios do Plano

**DEV-03 (fase-05):** Spec propunha `type ChunkResult = SemanticInventoryEntry[] | { failed: InventoryEntry[] }`. Implementado como `{ entries: SemanticInventoryEntry[]; failed: InventoryEntry[] }` (shape unificado) — permite retorno parcial sem union type complexo. Sem impacto funcional para o orchestrator.

## Notas para Planos Seguintes

**Para Plano 04 (Manifest + Harness Validate):**
- `runReconciler` retorna `ReconcilerResult` com `planPaths: string[]` e `slotDecisions[]`. O `plan-writer.ts` escreve em `docs/exec-plans/active/` com filename `{date}-{index}-{slug}-migration.md`.
- `runMigrationPlanner` retorna `MigrationPlannerResult` com campo `planPaths: string[]` — lista de paths absolutos dos migration plans gerados. Plano 04 usa para popular `migrationPlans[]` no manifest.
- `SemanticInventoryEntry` é escrita em `discovery/semantic-inventory.json`. Plano 04 pode ler para catalog.
- `discovery/agents-log.json` (via `AuditLogger` do Plano 02) contém uma entrada por subagent call com `agent`, `run_id`, `status`, `duration_ms`. Harness-validate pode usar como evidência de execução.
- O campo `slot_match` em `SemanticInventoryEntry` usa os paths EXATOS do `TEMPLATE_MANIFEST` (ex: `docs/DESIGN.md`, não slugs). Plano 04 pode cruzar diretamente.

**Para Plano 05 (Polish + Fixtures):**
- Prompts em `skills/init/lib/prompts/*.md` têm checksum no manifest (fase-01 deste plano). Plano 05 fase-01 (idempotência) deve incluir esses checksums na lógica de skip.
- Fixtures de teste (Plano 05 fase-02) precisam de `InventoryResult` mock válido — seguir shape exato de `InventoryResult` de `skills/init/lib/discovery.ts` (Plano 02).
- `migration-planner.ts` exporta `MigrationPlannerOptions` com campo `maxParallelSubagents?: number` (default 6). Fixtures podem usar `maxParallelSubagents: 1` para testes determinísticos.

<!-- Atualizado automaticamente durante execucao -->
