<!-- Comment Provenance: 2026-05-14 (Luiz/dev) — gerado por /plan-feature para Plano 03 do /init Migration Mode -->

# Fase 02: Explorer Orchestrator — migration-planner.ts

**Plano:** 03 — Subagent Orchestration
**Sizing:** 2h
**Depende de:** fase-01 (prompts criados), Plano 02 fase-01 (`InventoryResult` de `discovery.ts`), v6.1.0 mergeado (`skills/lib/subagent-contract.ts` disponível)
**Visual:** false

---

## O que esta fase entrega

Módulo `skills/init/lib/migration-planner.ts` com função `runMigrationPlanner()` que orquestra
os Explorer subagents em paralelo (hard cap 6 simultâneos, DT-01). Gerencia batching sequencial
para repositórios com >6 grupos de arquivos, coleta os `SemanticInventoryEntry` de cada Explorer,
e escreve `discovery/semantic-inventory.json`.

O orchestrator nunca toca conteúdo de arquivo — apenas metadata de `InventoryResult`. O conteúdo
dos arquivos é passado diretamente para os subagentes via `Task` tool (CA-05 enforced).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/migration-planner.ts` | Criar | Orchestrator principal: tipos + `runMigrationPlanner()` |
| `skills/init/lib/migration-planner.test.ts` | Criar | Testes com mocks de subagent (TDD RED → GREEN) |

---

## Implementacao

### Passo 1: Escrever teste stub RED

```typescript
// skills/init/lib/migration-planner.test.ts
import { describe, it, expect, mock } from 'bun:test'
import { runMigrationPlanner } from './migration-planner'

describe('runMigrationPlanner', () => {
  it('module exists and exports runMigrationPlanner', () => {
    expect(typeof runMigrationPlanner).toBe('function')
  })
})
```

Rodar para confirmar RED: `bun run test -- --grep 'runMigrationPlanner'`

### Passo 2: Tipos e contratos do módulo

```typescript
// skills/init/lib/migration-planner.ts
// 2026-05-14 (Luiz/dev): cap 6 subagentes — alinhado com PRD §Decisoes Tecnicas #1

import type { InventoryResult, InventoryEntry } from './discovery'
import type { TemplateEntry } from './template-manifest'
import type { AuditLogger } from './audit-log'

// ---------------------------------------------------------------------------
// Tipos de output do Explorer subagent
// ---------------------------------------------------------------------------

/** Uma seção de um arquivo identificada pelo Explorer. */
export type SemanticSection = {
  heading: string
  /** Ex: "45-120" ou "45" se seção de uma linha. */
  lines: string
  purpose: string
  /** true se a seção pode ser mergeada diretamente no slot canônico. */
  mergeable_into_slot: boolean
}

/** Análise semântica de um arquivo produzida pelo Explorer subagent. CA-05: nunca contém conteúdo cru. */
export type SemanticInventoryEntry = {
  /** Caminho relativo POSIX — mesmo valor de InventoryEntry.path. */
  path: string
  /** Tópico semântico do arquivo em 1-2 frases. */
  semantic_topic: string
  /**
   * Path do slot canônico mais próximo (ex: "docs/DESIGN.md") ou "no-match".
   * Usa paths EXATOS do TEMPLATE_MANIFEST.
   */
  slot_match: string
  /** 0.0–1.0. Confiança do Explorer no slot_match. */
  confidence: number
  sections: SemanticSection[]
  suggested_destiny:
    | 'consolidate-into-canon'
    | 'split-across-canon'
    | 'move-to-references'
    | 'deprecate-after-merge'
  density_score: 'thin' | 'normal' | 'dense'
}

/** Output completo do Fase 1 — escrito em discovery/semantic-inventory.json. */
export type SemanticInventory = {
  run_id: string
  produced_at: string
  target_dir: string
  entries: SemanticInventoryEntry[]
  /** Paths que não foram processados (Explorer falhou após retry). */
  unprocessed_paths: string[]
  explorer_batches: number
  duration_ms: number
}

export type MigrationPlannerOptions = {
  /**
   * Número máximo de Explorer subagents rodando em paralelo.
   * Default: 6 (DT-01). Reduzir para 1 em testes.
   */
  maxParallelSubagents?: number
  /**
   * Número máximo de arquivos por subagent no run normal.
   * Default: 3. Retry usa maxFilesPerSubagentRetry.
   */
  maxFilesPerSubagent?: number
  /**
   * Número máximo de arquivos por subagent no retry (DT-03).
   * Default: 2.
   */
  maxFilesPerSubagentRetry?: number
  /** AuditLogger para registrar entradas em agents-log.json. */
  logger?: AuditLogger
}

export type MigrationPlannerResult = {
  semanticInventory: SemanticInventory
  /** Paths absolutos dos migration plans gerados (populado em fase-03). */
  planPaths: string[]
  /** true se houve abort por falha de subagents. */
  aborted: boolean
  abortReason?: string
}
```

### Passo 3: Constantes e helpers de batching

```typescript
// 2026-05-14 (Luiz/dev): DEFAULT_MAX_PARALLEL=6 — PRD DT-01
const DEFAULT_MAX_PARALLEL = 6
const DEFAULT_MAX_FILES_PER_SUBAGENT = 3
const DEFAULT_MAX_FILES_RETRY = 2

/**
 * Distribui entries em chunks de no máximo maxSize.
 * Distribuição uniforme: não faz chunks de 6+6+...+2,
 * mas distribui homogeneamente para reduzir variância de tempo.
 *
 * Ex: 20 entries, maxSize=6 → 4 chunks de 5 (não 3×6 + 1×2)
 */
export function chunkEntries<T>(entries: T[], maxSize: number): T[][] {
  if (entries.length === 0) return []
  const numChunks = Math.ceil(entries.length / maxSize)
  const chunkSize = Math.ceil(entries.length / numChunks)
  const chunks: T[][] = []
  for (let i = 0; i < entries.length; i += chunkSize) {
    chunks.push(entries.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Roda batches em paralelo com cap de maxParallel simultâneos.
 * Batches além do cap rodam em rounds sequenciais.
 */
async function runParallelCapped<T>(
  tasks: Array<() => Promise<T>>,
  maxParallel: number,
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < tasks.length; i += maxParallel) {
    const batch = tasks.slice(i, i + maxParallel)
    const batchResults = await Promise.all(batch.map((fn) => fn()))
    results.push(...batchResults)
  }
  return results
}
```

### Passo 4: Invocar subagente Explorer (abstração sobre Task tool)

Esta função é o ponto de integração com o `Task` tool do Claude. Em testes, é substituída por mock.

```typescript
import { parseContract } from '../../lib/subagent-contract'
import type { MutationContract } from '../../lib/subagent-contract'
import { promises as fs } from 'node:fs'
import path from 'node:path'

/** Shape do payload do Explorer (cast de MutationContract.payload). */
type ExplorerPayload = {
  semantic_entries: SemanticInventoryEntry[]
}

function isExplorerPayload(v: unknown): v is ExplorerPayload {
  return (
    typeof v === 'object' &&
    v !== null &&
    'semantic_entries' in v &&
    Array.isArray((v as Record<string, unknown>)['semantic_entries'])
  )
}

export type SubagentInvoker = (prompt: string, fileContents: Record<string, string>) => Promise<string>

/**
 * Invoca um Explorer subagent para um batch de InventoryEntry.
 * Retorna SemanticInventoryEntry[] ou lança erro se contrato inválido.
 *
 * CA-05: fileContents é passado para o subagente mas nunca retorna ao caller.
 * O caller só recebe SemanticInventoryEntry[] — metadata semântica, não conteúdo.
 */
async function invokeExplorer(
  entries: InventoryEntry[],
  targetDir: string,
  promptText: string,
  invoker: SubagentInvoker,
  runId: string,
): Promise<SemanticInventoryEntry[]> {
  // Lê conteúdo dos arquivos — só aqui, nunca exposto ao caller
  const fileContents: Record<string, string> = {}
  for (const entry of entries) {
    const absPath = path.join(targetDir, entry.path)
    try {
      fileContents[entry.path] = await fs.readFile(absPath, 'utf-8')
    } catch {
      fileContents[entry.path] = `[ERRO: arquivo não pôde ser lido]`
    }
  }

  const inputJson = JSON.stringify({ run_id: runId, entries: entries.map(({ path: p, size_lines, h1_h2_headings, first_500_chars }) => ({ path: p, size_lines, h1_h2_headings, first_500_chars })) }, null, 2)
  const rawOutput = await invoker(promptText + '\n\n## Input\n\n```json\n' + inputJson + '\n```', fileContents)

  const result = parseContract(rawOutput)
  if (!result.valid || !result.contract) {
    throw new Error(`Explorer contract invalid: ${result.errors.map((e) => e.message).join('; ')}`)
  }
  if (result.contract.kind !== 'mutation') {
    throw new Error(`Explorer expected kind:mutation, got ${result.contract.kind}`)
  }

  const payload = (result.contract as MutationContract).payload
  if (!isExplorerPayload(payload)) {
    throw new Error('Explorer payload missing semantic_entries array')
  }

  return payload.semantic_entries
}
```

### Passo 5: Função principal `runMigrationPlanner`

```typescript
import { randomUUID } from 'node:crypto'

/**
 * Fase 1 do pipeline de migration mode: orquestra Explorer subagents em paralelo.
 * Produz discovery/semantic-inventory.json.
 *
 * Hard cap: maxParallelSubagents subagentes simultâneos (default 6, DT-01).
 * Retry: 1× com maxFilesPerSubagentRetry (default 2) em caso de falha (DT-03).
 *
 * CA-05: função nunca expõe conteúdo de arquivo para o caller — só SemanticInventoryEntry[].
 *
 * @param inventoryResult Saída de runDiscovery() (Plano 02)
 * @param templateManifest TEMPLATE_MANIFEST com campo category (Plano 01)
 * @param targetDir Raiz do projeto (absoluto)
 * @param invoker Abstração sobre Task tool (substituível em testes)
 * @param opts Opções de configuração
 */
export async function runMigrationPlanner(
  inventoryResult: InventoryResult,
  templateManifest: TemplateEntry[],
  targetDir: string,
  invoker: SubagentInvoker,
  opts: MigrationPlannerOptions = {},
): Promise<MigrationPlannerResult> {
  const start = Date.now()
  const maxParallel = opts.maxParallelSubagents ?? DEFAULT_MAX_PARALLEL
  const maxFiles = opts.maxFilesPerSubagent ?? DEFAULT_MAX_FILES_PER_SUBAGENT
  const runId = inventoryResult.run_id

  // Carregar prompt do Explorer
  const promptPath = path.join(import.meta.dir, 'prompts/explorer.md')
  const explorerPrompt = await fs.readFile(promptPath, 'utf-8')

  // Chunking: distribuição uniforme em grupos de maxFiles
  const chunks = chunkEntries(inventoryResult.entries, maxFiles)

  // Criar tasks para cada chunk
  const allEntries: SemanticInventoryEntry[] = []
  const unprocessedPaths: string[] = []

  // Tasks retornam resultado ou undefined se falha após retry
  type ChunkResult = { entries: SemanticInventoryEntry[] } | { failed: InventoryEntry[] }

  const tasks: Array<() => Promise<ChunkResult>> = chunks.map((chunk) => async () => {
    try {
      const result = await invokeExplorer(chunk, targetDir, explorerPrompt, invoker, runId)
      opts.logger?.append({
        agent: 'explorer',
        run_id: runId,
        status: 'complete',
        input_paths: chunk.map((e) => e.path),
        output_count: result.length,
        timestamp: new Date().toISOString(),
      })
      return { entries: result }
    } catch (firstErr) {
      // DT-03: retry 1× — será tratado em fase-05
      // Aqui, fase-02 lança o erro — fase-05 adiciona o retry wrapper
      opts.logger?.append({
        agent: 'explorer',
        run_id: runId,
        status: 'needs_retry',
        input_paths: chunk.map((e) => e.path),
        error: String(firstErr),
        timestamp: new Date().toISOString(),
      })
      throw firstErr
    }
  })

  // Rodar com cap de paralelos
  const results = await runParallelCapped(tasks, maxParallel)

  let aborted = false
  let abortReason: string | undefined
  for (const result of results) {
    if ('entries' in result) {
      allEntries.push(...result.entries)
    } else {
      unprocessedPaths.push(...result.failed.map((e) => e.path))
    }
  }

  if (unprocessedPaths.length > 0) {
    aborted = true
    abortReason = `${unprocessedPaths.length} arquivo(s) não-processados após retry: ${unprocessedPaths.join(', ')}`
  }

  const semanticInventory: SemanticInventory = {
    run_id: runId,
    produced_at: new Date().toISOString(),
    target_dir: targetDir,
    entries: allEntries,
    unprocessed_paths: unprocessedPaths,
    explorer_batches: chunks.length,
    duration_ms: Date.now() - start,
  }

  // Escrever semantic-inventory.json
  const discoveryDir = path.join(targetDir, 'discovery')
  await fs.mkdir(discoveryDir, { recursive: true })
  await fs.writeFile(
    path.join(discoveryDir, 'semantic-inventory.json'),
    JSON.stringify(semanticInventory, null, 2),
    'utf-8',
  )

  return {
    semanticInventory,
    planPaths: [], // populado em fase-03 (Reconciler)
    aborted,
    abortReason,
  }
}
```

### Passo 6: Expandir testes com cenários de batching

```typescript
// Adicionar em migration-planner.test.ts

import { describe, it, expect, mock } from 'bun:test'
import { chunkEntries, runMigrationPlanner } from './migration-planner'
import type { InventoryResult } from './discovery'
import type { SubagentInvoker } from './migration-planner'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Helper para criar InventoryEntry fake
function makeEntry(p: string): import('./discovery').InventoryEntry {
  return {
    path: p,
    size_bytes: 100,
    size_lines: 10,
    mtime: '2026-01-01T00:00:00.000Z',
    h1_h2_headings: ['# Test'],
    first_500_chars: 'test content',
  }
}

describe('chunkEntries', () => {
  it('retorna array vazio para input vazio', () => {
    expect(chunkEntries([], 6)).toEqual([])
  })

  it('distribui 20 entries em chunks de no maximo 6', () => {
    const entries = Array.from({ length: 20 }, (_, i) => i)
    const chunks = chunkEntries(entries, 6)
    expect(chunks.length).toBe(4) // ceil(20/6)=4, cada chunk ~5
    expect(chunks.every((c) => c.length <= 6)).toBe(true)
    expect(chunks.flat().length).toBe(20)
  })

  it('retorna chunk unico para entries <= maxSize', () => {
    const entries = [1, 2, 3]
    expect(chunkEntries(entries, 6)).toEqual([[1, 2, 3]])
  })
})

describe('runMigrationPlanner', () => {
  it('module exists and exports runMigrationPlanner', () => {
    expect(typeof runMigrationPlanner).toBe('function')
  })

  it('escreve semantic-inventory.json em targetDir/discovery/', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'planner-test-'))
    try {
      // Setup: criar arquivo de prompt mockado
      await mkdir(path.join(tmpDir, 'skills/init/lib/prompts'), { recursive: true })
      await writeFile(path.join(tmpDir, 'skills/init/lib/prompts/explorer.md'), '# Explorer Prompt')

      // Criar arquivo fake no targetDir
      await writeFile(path.join(tmpDir, 'README.md'), '# Test\n\n## Overview\nContent here')

      const inventory: InventoryResult = {
        run_id: 'test-run-id',
        scanned_at: '2026-01-01T00:00:00.000Z',
        target_dir: tmpDir,
        entries: [makeEntry('README.md')],
        excluded_paths: [],
        duration_ms: 10,
      }

      // Mock válido de SubagentInvoker retornando contrato Explorer válido
      const mockInvoker: SubagentInvoker = mock(async () =>
        JSON.stringify({
          contract_version: '1.0',
          agent: 'explorer',
          kind: 'mutation',
          status: 'complete',
          reasoning: 'Analisei README.md e mapeei para docs/DESIGN.md com confianca 0.8',
          payload: {
            semantic_entries: [
              {
                path: 'README.md',
                semantic_topic: 'Visao geral do projeto',
                slot_match: 'docs/DESIGN.md',
                confidence: 0.8,
                sections: [{ heading: '## Overview', lines: '3-4', purpose: 'Overview', mergeable_into_slot: true }],
                suggested_destiny: 'consolidate-into-canon',
                density_score: 'thin',
              },
            ],
          },
          metadata: { run_id: 'test-run-id', duration_ms: 100, model: 'sonnet' },
        })
      )

      const result = await runMigrationPlanner(inventory, [], tmpDir, mockInvoker, {
        maxParallelSubagents: 1,
      })

      expect(result.aborted).toBe(false)
      expect(result.semanticInventory.entries.length).toBe(1)
      expect(result.semanticInventory.entries[0]!.path).toBe('README.md')

      // Verificar que semantic-inventory.json foi escrito
      const { readFile } = await import('node:fs/promises')
      const written = JSON.parse(await readFile(path.join(tmpDir, 'discovery/semantic-inventory.json'), 'utf-8'))
      expect(written.run_id).toBe('test-run-id')
      expect(written.entries.length).toBe(1)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })
})
```

---

## Gotchas

**G1 — `import.meta.dir` para caminho do prompt:** O path do prompt é relativo ao arquivo `.ts`, não ao CWD. Usar `import.meta.dir` (Bun) para garantir que `prompts/explorer.md` é encontrado independente de onde `runMigrationPlanner` é chamado.

**G2 — `SubagentInvoker` é a abstração para Task tool:** Em produção, o caller (SKILL.md) passa uma função que usa o `Task` tool do Claude. Em testes, é substituída por `mock()`. Nunca importar `Task` diretamente em `migration-planner.ts` — isso quebraria a testabilidade.

**G3 — `runParallelCapped` e rejeição:** `Promise.all` no batch inner rejeita se qualquer task rejeita. O retry wrapper (fase-05) envolve cada task individualmente antes de passar para `runParallelCapped`. Na fase-02, a task lança o erro e o orchestrator o captura no nível do batch.

**G4 — `chunkEntries` não faz chunks de tamanho exato:** A distribuição uniforme garante que nenhum chunk seja pequeno demais (ex: 1 arquivo) em repos com múltiplos de 6 arquivos. Isso é proposital para reduzir variância de tempo entre batches.

---

## Verificacao

### TDD (RED → GREEN)
- [ ] RED: `migration-planner.ts` não existe → `bun run test -- --grep 'runMigrationPlanner'` falha com ModuleNotFoundError
- [ ] GREEN: módulo criado, test de existência passa
- [ ] RED: test de `chunkEntries([], 6)` falha antes de criar função
- [ ] GREEN: função implementada, test passa
- [ ] RED: test de `runMigrationPlanner` com mock falha antes de criar função
- [ ] GREEN: implementação completa, todos os testes passam

### Checklist
- [ ] `skills/init/lib/migration-planner.ts` criado e exporta `runMigrationPlanner`, `chunkEntries`, `SemanticInventoryEntry`, `SemanticInventory`, `MigrationPlannerOptions`, `MigrationPlannerResult`, `SubagentInvoker`
- [ ] `chunkEntries(entries, maxSize)` distribui uniformemente sem chunks maiores que maxSize
- [ ] `runParallelCapped` respeita cap de paralelos (não dispara todos simultâneos)
- [ ] `invokeExplorer` nunca retorna conteúdo de arquivo para caller (CA-05)
- [ ] `parseContract()` validado antes de extrair payload — nunca cast cego
- [ ] `discovery/semantic-inventory.json` escrito com campos: `run_id`, `produced_at`, `target_dir`, `entries`, `unprocessed_paths`, `explorer_batches`, `duration_ms`
- [ ] `bun run tsc --noEmit` passa
- [ ] `bun run test` passa
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por máquina:**
- `bun run test -- --grep 'chunkEntries'` retorna ≥3 testes PASS
- `bun run test -- --grep 'runMigrationPlanner'` retorna ≥2 testes PASS
- `discovery/semantic-inventory.json` gerado com shape correto para inventory de 1 arquivo
- `bun run tsc --noEmit` exit code 0

<!-- Gerado por /plan-feature em 2026-05-14 -->
