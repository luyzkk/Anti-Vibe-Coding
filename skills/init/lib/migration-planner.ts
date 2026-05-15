// 2026-05-14 (Luiz/dev): cap 6 subagentes — alinhado com PRD §Decisoes Tecnicas #1

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseContract } from '../../lib/subagent-contract'
import type { MutationContract } from '../../lib/subagent-contract'
import type { InventoryResult, InventoryEntry } from './discovery'
import type { TemplateEntry } from './template-manifest'
import type { AuditLogWriter } from './audit-log'

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
  /** AuditLogWriter para registrar entradas em agents-log.json. */
  logger?: AuditLogWriter
}

export type MigrationPlannerResult = {
  semanticInventory: SemanticInventory
  /** Paths absolutos dos migration plans gerados (populado em fase-03). */
  planPaths: string[]
  /** true se houve abort por falha de subagents. */
  aborted: boolean
  abortReason?: string
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

// 2026-05-14 (Luiz/dev): DEFAULT_MAX_PARALLEL=6 — PRD DT-01
const DEFAULT_MAX_PARALLEL = 6
const DEFAULT_MAX_FILES_PER_SUBAGENT = 3
// DT-03: max 2 arquivos por subagent no retry
const DEFAULT_MAX_FILES_RETRY = 2

// ---------------------------------------------------------------------------
// Helpers de batching
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SubagentInvoker — abstração sobre Task tool
// ---------------------------------------------------------------------------

/** Shape do payload do Explorer (type guard para MutationContract.payload). */
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

/**
 * Abstração sobre o Task tool do Claude.
 * Em produção, o caller passa uma função que usa Task.
 * Em testes, é substituída por mock().
 */
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
  // Lê conteúdo dos arquivos — só aqui, nunca exposto ao caller (CA-05)
  const fileContents: Record<string, string> = {}
  for (const entry of entries) {
    const absPath = path.join(targetDir, entry.path)
    try {
      fileContents[entry.path] = await fs.readFile(absPath, 'utf-8')
    } catch {
      fileContents[entry.path] = `[ERRO: arquivo não pôde ser lido]`
    }
  }

  const inputJson = JSON.stringify(
    {
      run_id: runId,
      entries: entries.map(({ path: p, size_lines, h1_h2_headings, first_500_chars }) => ({
        path: p,
        size_lines,
        h1_h2_headings,
        first_500_chars,
      })),
    },
    null,
    2,
  )

  const rawOutput = await invoker(
    promptText + '\n\n## Input\n\n```json\n' + inputJson + '\n```',
    fileContents,
  )

  const result = parseContract(rawOutput)
  if (!result.valid || !result.contract) {
    throw new Error(
      `Explorer contract invalid: ${result.errors.map((e) => e.message).join('; ')}`,
    )
  }
  if (result.contract.kind !== 'mutation') {
    throw new Error(`Explorer expected kind:mutation, got ${result.contract.kind}`)
  }

  const payload = (result.contract as MutationContract).payload
  if (!isExplorerPayload(payload)) {
    throw new Error('Explorer payload missing semantic_entries array')
  }

  // CA-05: retorna apenas metadata semântica — fileContents não retorna ao caller
  return payload.semantic_entries
}

type ChunkResult = { entries: SemanticInventoryEntry[]; failed: InventoryEntry[] }

/**
 * DT-03: retry 1× com batches menores quando Explorer falha.
 * Primeira tentativa: full batch. Falha → retry com sub-batches de maxRetryFiles.
 * Se retry falhar: paths adicionados a failed (unprocessed).
 */
async function invokeExplorerWithRetry(
  entries: InventoryEntry[],
  targetDir: string,
  promptText: string,
  invoker: SubagentInvoker,
  runId: string,
  maxRetryFiles: number,
  logger?: AuditLogWriter,
): Promise<ChunkResult> {
  const start = Date.now()

  try {
    const result = await invokeExplorer(entries, targetDir, promptText, invoker, runId)
    if (logger) {
      await logger.append({
        subagent_id: 'explorer',
        input_paths: entries.map((e) => e.path),
        output_struct: { count: result.length },
        duration_ms: Date.now() - start,
        retry_count: 0,
      })
    }
    return { entries: result, failed: [] }
  } catch (firstErr) {
    if (logger) {
      await logger.append({
        subagent_id: 'explorer',
        input_paths: entries.map((e) => e.path),
        output_struct: null,
        duration_ms: Date.now() - start,
        retry_count: 0,
        error: String(firstErr),
      })
    }

    // DT-03: retry com sub-batches menores
    const retryChunks = chunkEntries(entries, maxRetryFiles)
    const retrySuccesses: SemanticInventoryEntry[] = []
    const retryFailed: InventoryEntry[] = []

    for (const retryChunk of retryChunks) {
      const retryStart = Date.now()
      try {
        const retryResult = await invokeExplorer(retryChunk, targetDir, promptText, invoker, runId)
        retrySuccesses.push(...retryResult)
        if (logger) {
          await logger.append({
            subagent_id: 'explorer',
            input_paths: retryChunk.map((e) => e.path),
            output_struct: { count: retryResult.length },
            duration_ms: Date.now() - retryStart,
            retry_count: 1,
          })
        }
      } catch (retryErr) {
        retryFailed.push(...retryChunk)
        if (logger) {
          await logger.append({
            subagent_id: 'explorer',
            input_paths: retryChunk.map((e) => e.path),
            output_struct: null,
            duration_ms: Date.now() - retryStart,
            retry_count: 1,
            error: String(retryErr),
          })
        }
      }
    }

    return { entries: retrySuccesses, failed: retryFailed }
  }
}

// ---------------------------------------------------------------------------
// runMigrationPlanner — função principal
// ---------------------------------------------------------------------------

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
 * @param _templateManifest TEMPLATE_MANIFEST com campo category (Plano 01) — reservado para fase-03
 * @param targetDir Raiz do projeto (absoluto)
 * @param invoker Abstração sobre Task tool (substituível em testes)
 * @param opts Opções de configuração
 */
export async function runMigrationPlanner(
  inventoryResult: InventoryResult,
  _templateManifest: TemplateEntry[],
  targetDir: string,
  invoker: SubagentInvoker,
  opts: MigrationPlannerOptions = {},
): Promise<MigrationPlannerResult> {
  const start = Date.now()
  const maxParallel = opts.maxParallelSubagents ?? DEFAULT_MAX_PARALLEL
  const maxFiles = opts.maxFilesPerSubagent ?? DEFAULT_MAX_FILES_PER_SUBAGENT
  const runId = inventoryResult.run_id

  // Carregar prompt do Explorer — relativo ao arquivo .ts (G1: usar import.meta.dir)
  const promptPath = path.join(import.meta.dir, 'prompts', 'explorer.md')
  const explorerPrompt = await fs.readFile(promptPath, 'utf-8')

  // Chunking: distribuição uniforme em grupos de maxFiles
  const chunks = chunkEntries(inventoryResult.entries, maxFiles)

  const allEntries: SemanticInventoryEntry[] = []
  const unprocessedPaths: string[] = []

  const maxRetryFiles = opts.maxFilesPerSubagentRetry ?? DEFAULT_MAX_FILES_RETRY

  const tasks: Array<() => Promise<ChunkResult>> = chunks.map((chunk) => () =>
    invokeExplorerWithRetry(chunk, targetDir, explorerPrompt, invoker, runId, maxRetryFiles, opts.logger)
  )

  // Rodar com cap de paralelos
  const results = await runParallelCapped(tasks, maxParallel)

  for (const result of results) {
    allEntries.push(...result.entries)
    unprocessedPaths.push(...result.failed.map((e) => e.path))
  }

  const aborted = unprocessedPaths.length > 0
  const abortReason = aborted
    ? `${unprocessedPaths.length} arquivo(s) não-processados após retry (DT-03). ` +
      `Arquivos: ${unprocessedPaths.join(', ')}. ` +
      `Investigar agents-log.json para detalhes. Re-rodar /init para nova tentativa.`
    : undefined

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
    ...(abortReason !== undefined ? { abortReason } : {}),
  }
}
