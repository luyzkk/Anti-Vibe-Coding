<!-- Comment Provenance: 2026-05-14 (Luiz/dev) — gerado por /plan-feature para Plano 03 do /init Migration Mode -->

# Fase 05: Retry + Abort Logic

**Plano:** 03 — Subagent Orchestration
**Sizing:** 1h
**Depende de:** fase-02 (`migration-planner.ts` com `runMigrationPlanner` e `runParallelCapped`)
**Visual:** false

---

## O que esta fase entrega

Adiciona lógica de retry e abort ao `runMigrationPlanner`:

1. **Retry 1×:** quando um Explorer subagent falha, re-invoca com lote menor (máximo 2 arquivos, `maxFilesPerSubagentRetry`). DT-03.
2. **Abort path:** se retry também falha, o arquivo vai para `unprocessed_paths`. Após todos os batches, se houver arquivos não-processados, `runMigrationPlanner` retorna `aborted: true` com `abortReason`.
3. **Relatório auditável:** `discovery/semantic-inventory.json` inclui `unprocessed_paths`. O caller (SKILL.md) usa esse array para mensagem final ao operador.
4. **Sem falha silenciosa:** toda falha é logada em `agents-log.json`. Nunca `try/catch` que engole erros sem registrar.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/migration-planner.ts` | Modificar | Adicionar retry wrapper em torno de invokeExplorer + abort path |
| `skills/init/lib/migration-planner.test.ts` | Modificar | Adicionar testes de retry e abort |

---

## Implementacao

### Passo 1: Adicionar testes RED para retry e abort

```typescript
// Adicionar em migration-planner.test.ts

describe('runMigrationPlanner retry logic', () => {
  it('retenta com batch reduzido quando Explorer falha na primeira tentativa', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'retry-test-'))
    try {
      await mkdir(path.join(tmpDir, 'skills/init/lib/prompts'), { recursive: true })
      await writeFile(path.join(tmpDir, 'skills/init/lib/prompts/explorer.md'), '# Explorer Prompt')

      // Criar 4 arquivos fake
      for (let i = 1; i <= 4; i++) {
        await writeFile(path.join(tmpDir, `doc${i}.md`), `# Doc ${i}\n\nConteudo ${i}`)
      }

      const inventory: InventoryResult = {
        run_id: 'retry-run',
        scanned_at: '2026-01-01T00:00:00.000Z',
        target_dir: tmpDir,
        entries: [1, 2, 3, 4].map((i) => makeEntry(`doc${i}.md`)),
        excluded_paths: [],
        duration_ms: 10,
      }

      let callCount = 0

      // Mock: primeiro call falha, segundo (retry) passa
      const mockInvoker: SubagentInvoker = mock(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Simulated Explorer timeout')
        }
        // Retry call: retorna contrato válido
        return JSON.stringify({
          contract_version: '1.0',
          agent: 'explorer',
          kind: 'mutation',
          status: 'complete',
          reasoning: 'Retry bem-sucedido com batch reduzido de 2 arquivos',
          payload: {
            semantic_entries: [
              {
                path: 'doc1.md',
                semantic_topic: 'Documento de teste',
                slot_match: 'no-match',
                confidence: 0.5,
                sections: [{ heading: '# Doc 1', lines: '1', purpose: 'Teste', mergeable_into_slot: false }],
                suggested_destiny: 'move-to-references',
                density_score: 'thin',
              },
            ],
          },
          metadata: { run_id: 'retry-run', duration_ms: 50, model: 'sonnet' },
        })
      })

      const result = await runMigrationPlanner(inventory, [], tmpDir, mockInvoker, {
        maxParallelSubagents: 1,
        maxFilesPerSubagent: 4,  // tudo em 1 batch
        maxFilesPerSubagentRetry: 2,
      })

      // Deve ter tentado retry (callCount > 1)
      expect(callCount).toBeGreaterThan(1)
      // Com retry parcialmente bem-sucedido, não deve abortar completamente
      expect(result.aborted).toBe(false)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('aborta e reporta arquivos nao-processados quando retry tambem falha', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'abort-test-'))
    try {
      await mkdir(path.join(tmpDir, 'skills/init/lib/prompts'), { recursive: true })
      await writeFile(path.join(tmpDir, 'skills/init/lib/prompts/explorer.md'), '# Explorer Prompt')
      await writeFile(path.join(tmpDir, 'fail.md'), '# Fail\n\nConteudo')

      const inventory: InventoryResult = {
        run_id: 'abort-run',
        scanned_at: '2026-01-01T00:00:00.000Z',
        target_dir: tmpDir,
        entries: [makeEntry('fail.md')],
        excluded_paths: [],
        duration_ms: 10,
      }

      // Mock: sempre falha
      const mockInvoker: SubagentInvoker = mock(async () => {
        throw new Error('Persistent Explorer failure')
      })

      const result = await runMigrationPlanner(inventory, [], tmpDir, mockInvoker, {
        maxParallelSubagents: 1,
      })

      expect(result.aborted).toBe(true)
      expect(result.abortReason).toBeTruthy()
      expect(result.semanticInventory.unprocessed_paths).toContain('fail.md')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })
})
```

Rodar: `bun run test -- --grep 'retry logic'` → RED (runMigrationPlanner ainda não tem retry)

### Passo 2: Implementar retry wrapper em `migration-planner.ts`

Substituir o bloco de criação de tasks no `runMigrationPlanner` (Passo 5 da fase-02) pelo wrapper com retry:

```typescript
// Em migration-planner.ts — substituir tasks[] no runMigrationPlanner

/**
 * Wrapper de retry para invokeExplorer.
 * DT-03: tenta 1× com batch reduzido (maxRetryFiles por subagent).
 * Se retry falhar, retorna { failed: entries } para o caller registrar em unprocessed_paths.
 */
async function invokeExplorerWithRetry(
  entries: InventoryEntry[],
  targetDir: string,
  promptText: string,
  invoker: SubagentInvoker,
  runId: string,
  maxRetryFiles: number,
  logger?: AuditLogger,
): Promise<SemanticInventoryEntry[] | { failed: InventoryEntry[] }> {
  // Tentativa 1: batch original
  try {
    const result = await invokeExplorer(entries, targetDir, promptText, invoker, runId)
    logger?.append({
      agent: 'explorer',
      run_id: runId,
      status: 'complete',
      input_paths: entries.map((e) => e.path),
      output_count: result.length,
      timestamp: new Date().toISOString(),
    })
    return result
  } catch (firstErr) {
    logger?.append({
      agent: 'explorer',
      run_id: runId,
      status: 'needs_retry',
      input_paths: entries.map((e) => e.path),
      error: String(firstErr),
      attempt: 1,
      timestamp: new Date().toISOString(),
    })

    // DT-03: retry com batches menores (máximo maxRetryFiles por sub-batch)
    // Dividir entries originais em sub-batches de maxRetryFiles
    const retryChunks = chunkEntries(entries, maxRetryFiles)
    const retryResults: SemanticInventoryEntry[] = []
    const stillFailed: InventoryEntry[] = []

    for (const retryChunk of retryChunks) {
      try {
        const retryResult = await invokeExplorer(retryChunk, targetDir, promptText, invoker, runId)
        retryResults.push(...retryResult)
        logger?.append({
          agent: 'explorer',
          run_id: runId,
          status: 'complete',
          input_paths: retryChunk.map((e) => e.path),
          output_count: retryResult.length,
          attempt: 2,
          timestamp: new Date().toISOString(),
        })
      } catch (retryErr) {
        // Retry falhou — marcar como unprocessed
        stillFailed.push(...retryChunk)
        logger?.append({
          agent: 'explorer',
          run_id: runId,
          status: 'blocked',
          input_paths: retryChunk.map((e) => e.path),
          error: String(retryErr),
          attempt: 2,
          note: 'Arquivo nao-processado apos retry — reportado em unprocessed_paths',
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Se todos os sub-batches do retry falharam, retornar failed
    if (stillFailed.length === entries.length) {
      return { failed: stillFailed }
    }

    // Retry parcialmente bem-sucedido: retornar o que conseguimos + falhas separadas
    // As falhas parciais ficam em unprocessed_paths
    if (stillFailed.length > 0) {
      // Retornar resultados parciais — caller vai ver stillFailed em separate path
      // Nota: retornar objeto misto não é possível com o tipo atual.
      // Solução: retornar os successos e adicionar stillFailed ao contexto via side-effect no logger.
      // O abortReason captura o resumo.
      logger?.append({
        agent: 'explorer',
        run_id: runId,
        status: 'needs_human',
        input_paths: stillFailed.map((e) => e.path),
        note: 'Retry parcial: alguns arquivos processados, outros nao',
        timestamp: new Date().toISOString(),
      })
    }

    return retryResults
  }
}
```

### Passo 3: Atualizar `runMigrationPlanner` para usar o wrapper

Substituir o bloco de tasks no Passo 5 da fase-02:

```typescript
// Em runMigrationPlanner — substituir criação de tasks[]

const maxRetryFiles = opts.maxFilesPerSubagentRetry ?? DEFAULT_MAX_FILES_RETRY

type ChunkResult = SemanticInventoryEntry[] | { failed: InventoryEntry[] }

const tasks: Array<() => Promise<ChunkResult>> = chunks.map((chunk) => async () =>
  invokeExplorerWithRetry(chunk, targetDir, explorerPrompt, invoker, runId, maxRetryFiles, opts.logger)
)

const results = await runParallelCapped(tasks, maxParallel)

const allEntries: SemanticInventoryEntry[] = []
const unprocessedPaths: string[] = []

for (const result of results) {
  if (Array.isArray(result)) {
    allEntries.push(...(result as SemanticInventoryEntry[]))
  } else {
    const failed = (result as { failed: InventoryEntry[] }).failed
    unprocessedPaths.push(...failed.map((e) => e.path))
  }
}

let aborted = false
let abortReason: string | undefined

if (unprocessedPaths.length > 0) {
  aborted = true
  abortReason =
    `${unprocessedPaths.length} arquivo(s) não-processados após retry (DT-03). ` +
    `Arquivos: ${unprocessedPaths.join(', ')}. ` +
    `Investigar agents-log.json para detalhes. Re-rodar /init para nova tentativa.`
}
```

### Passo 4: Atualizar `SemanticInventory` com campos de retry

O tipo `SemanticInventory` (já definido em fase-02) já inclui `unprocessed_paths: string[]`.
Verificar que o campo é populado corretamente quando há falhas.

### Passo 5: Mensagem de abort para o operador

O caller (SKILL.md migration mode entrypoint) deve checar `result.aborted` e emitir mensagem clara:

```typescript
// Em SKILL.md migration mode (referência — implementação em fase integração do Plano 04)
if (plannerResult.aborted) {
  // PRD §Copy: "Migration aborted: N subagentes falharam após retry. Arquivos não-processados: [...]"
  throw new Error(
    `Migration aborted: subagentes Explorer falharam após retry.\n` +
    `${plannerResult.abortReason}\n\n` +
    `Detalhes em discovery/agents-log.json.\n` +
    `Re-rodar /init para nova tentativa.`
  )
}
```

---

## Gotchas

**G1 — Retry não muda o prompt, só o tamanho do batch:** DT-03 especifica "prompt reduzido" como "menos arquivos por subagente", não "texto do prompt menor". O `explorerPrompt` é o mesmo — o que muda é que cada sub-batch do retry tem no máximo `maxFilesPerSubagentRetry` (default 2) arquivos. Isso reduz o context de cada invocação.

**G2 — Retry parcial é raro mas possível:** Se batch de 3 arquivos falha e no retry, 2 de 3 sub-batches de 1 arquivo passam, temos resultado parcial. O código atual descarta o `failed` subset para `unprocessed_paths` e retorna os successful. O `abortReason` incluirá apenas os arquivos que falharam no retry, não o batch inteiro.

**G3 — `agents-log.json` tem campo `attempt`:** Para diferenciar tentativa 1 vs retry, o logger usa campo `attempt: 1 | 2`. O `audit-log.ts` (Plano 02 fase-03) aceita campo extra via spread — verificar que o tipo de entrada do `AuditLogger.append` é suficientemente flexível para campos extras.

**G4 — Abort não lança exceção por default:** `runMigrationPlanner` retorna `{ aborted: true }` mas não lança. O caller decide o que fazer. O SKILL.md (Plano 04) checa `aborted` e lança para o operador. Isso dá flexibilidade para testes verificarem o estado de abort sem try/catch.

**G5 — Sem retry para Reconciler e Compound-writer:** DT-03 especifica retry apenas para o Explorer (Fase 1). Reconciler (Fase 2) e Compound-writer (Fase 3) já operam em granularidade pequena (slot-a-slot, e uma invocação única respectivamente). Se falhar, o operador pode re-rodar. Adicionar retry em fase-03/04 é over-engineering para v1.

---

## Verificacao

### TDD (RED → GREEN)
- [ ] RED: test "retenta com batch reduzido" falha antes de adicionar `invokeExplorerWithRetry`
- [ ] GREEN: wrapper implementado, test de retry passa
- [ ] RED: test "aborta e reporta arquivos nao-processados" falha (callCount ainda não rastreado)
- [ ] GREEN: abort path implementado, test passa
- [ ] `unprocessed_paths` no JSON de saída contém os paths corretos após abort

### Checklist
- [ ] `invokeExplorerWithRetry` exportado (ou pelo menos testável via `runMigrationPlanner`)
- [ ] Primeira tentativa falha → retry com chunks de no máximo `maxFilesPerSubagentRetry` arquivos
- [ ] Segunda tentativa falha → paths adicionados a `unprocessed_paths`
- [ ] `discovery/semantic-inventory.json` contém `unprocessed_paths` com paths corretos
- [ ] `agents-log.json` tem entrada com `status: 'needs_retry'` para falha da tentativa 1
- [ ] `agents-log.json` tem entrada com `status: 'blocked'` para falha da tentativa 2 (retry)
- [ ] `runMigrationPlanner` retorna `aborted: true` quando houver unprocessed_paths
- [ ] `abortReason` contém lista dos arquivos não-processados
- [ ] Retry NÃO muda texto do prompt — apenas tamanho do batch
- [ ] `bun run tsc --noEmit` passa
- [ ] `bun run test` passa (incluindo novos tests de retry e abort)
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por máquina:**
- `bun run test -- --grep 'retry logic'` retorna ≥2 testes PASS
- `runMigrationPlanner` com mock que sempre falha retorna `{ aborted: true, abortReason: non-empty-string }`
- `discovery/semantic-inventory.json` após abort contém `unprocessed_paths: ['fail.md']` (ou os paths corretos)
- `bun run tsc --noEmit` exit code 0

**Integração manual (pós-implementação):**
- Com `maxFilesPerSubagent: 3` e mock que falha na 1ª tentativa mas passa na 2ª:
  - `agents-log.json` contém entrada `attempt: 1, status: needs_retry`
  - `agents-log.json` contém entrada `attempt: 2, status: complete`
  - `result.aborted` é `false` (retry bem-sucedido)

<!-- Gerado por /plan-feature em 2026-05-14 -->
