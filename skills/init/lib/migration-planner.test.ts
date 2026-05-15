import { describe, it, expect, mock } from 'bun:test'
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chunkEntries, runMigrationPlanner } from './migration-planner'
import type { SubagentInvoker } from './migration-planner'
import type { InventoryResult, InventoryEntry } from './discovery'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(p: string): InventoryEntry {
  return {
    path: p,
    size_bytes: 100,
    size_lines: 10,
    mtime: '2026-01-01T00:00:00.000Z',
    h1_h2_headings: ['# Test'],
    first_500_chars: 'test content',
  }
}

function makeInventory(paths: string[], tmpDir: string): InventoryResult {
  return {
    run_id: 'test-run-id',
    scanned_at: '2026-01-01T00:00:00.000Z',
    target_dir: tmpDir,
    entries: paths.map(makeEntry),
    excluded_paths: [],
    duration_ms: 10,
  }
}

function makeValidExplorerResponse(entryPath: string): string {
  return JSON.stringify({
    contract_version: '1.0',
    agent: 'explorer',
    kind: 'mutation',
    status: 'complete',
    reasoning: 'Analisei o arquivo e mapeei para slot canonico com confianca alta',
    payload: {
      semantic_entries: [
        {
          path: entryPath,
          semantic_topic: 'Visao geral do projeto',
          slot_match: 'docs/DESIGN.md',
          confidence: 0.8,
          sections: [
            {
              heading: '## Overview',
              lines: '3-4',
              purpose: 'Overview do projeto',
              mergeable_into_slot: true,
            },
          ],
          suggested_destiny: 'consolidate-into-canon',
          density_score: 'thin',
        },
      ],
    },
    metadata: { run_id: 'test-run-id', duration_ms: 100, model: 'sonnet' },
  })
}

// ---------------------------------------------------------------------------
// chunkEntries
// ---------------------------------------------------------------------------

describe('chunkEntries', () => {
  it('retorna array vazio para input vazio', () => {
    expect(chunkEntries([], 6)).toEqual([])
  })

  it('distribui 20 entries em chunks de no maximo 6', () => {
    const entries = Array.from({ length: 20 }, (_, i) => i)
    const chunks = chunkEntries(entries, 6)
    expect(chunks.length).toBe(4) // ceil(20/6)=4, distribuicao uniforme ~5 por chunk
    expect(chunks.every((c) => c.length <= 6)).toBe(true)
    expect(chunks.flat()).toHaveLength(20)
  })

  it('retorna chunk unico para entries menores que maxSize', () => {
    const entries = [1, 2, 3]
    expect(chunkEntries(entries, 6)).toEqual([[1, 2, 3]])
  })

  it('distribui homogeneamente — nenhum chunk e menor que metade dos outros', () => {
    // 7 entries, maxSize=6: deve ser 2 chunks de 4+3, nao 1×6 + 1×1
    const entries = Array.from({ length: 7 }, (_, i) => i)
    const chunks = chunkEntries(entries, 6)
    const sizes = chunks.map((c) => c.length)
    const maxSize = Math.max(...sizes)
    const minSize = Math.min(...sizes)
    expect(maxSize - minSize).toBeLessThanOrEqual(1) // distribuicao uniforme
    expect(chunks.flat()).toHaveLength(7)
  })

  it('preserva todos os elementos sem duplicatas', () => {
    const entries = Array.from({ length: 15 }, (_, i) => i * 2)
    const chunks = chunkEntries(entries, 4)
    const flat = chunks.flat()
    expect(flat).toHaveLength(15)
    expect(new Set(flat).size).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// runMigrationPlanner
// ---------------------------------------------------------------------------

describe('runMigrationPlanner', () => {
  it('module exists and exports runMigrationPlanner', () => {
    expect(typeof runMigrationPlanner).toBe('function')
  })

  it('escreve semantic-inventory.json em targetDir/discovery/', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'planner-test-'))
    try {
      // Criar arquivo fake no targetDir
      await writeFile(path.join(tmpDir, 'README.md'), '# Test\n\n## Overview\nContent here')

      const inventory = makeInventory(['README.md'], tmpDir)

      const mockInvoker: SubagentInvoker = mock(async () => makeValidExplorerResponse('README.md'))

      const result = await runMigrationPlanner(inventory, [], tmpDir, mockInvoker, {
        maxParallelSubagents: 1,
      })

      expect(result.aborted).toBe(false)
      expect(result.semanticInventory.entries).toHaveLength(1)
      expect(result.semanticInventory.entries[0]?.path).toBe('README.md')

      // Verificar que semantic-inventory.json foi escrito
      const written = JSON.parse(
        await readFile(path.join(tmpDir, 'discovery', 'semantic-inventory.json'), 'utf-8'),
      ) as Record<string, unknown>
      expect(written['run_id']).toBe('test-run-id')
      expect(Array.isArray(written['entries'])).toBe(true)
      expect((written['entries'] as unknown[]).length).toBe(1)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('semantic-inventory.json contem todos os campos obrigatorios', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'planner-fields-'))
    try {
      await writeFile(path.join(tmpDir, 'DESIGN.md'), '# Design\n\n## Section\nContent')

      const inventory = makeInventory(['DESIGN.md'], tmpDir)
      const mockInvoker: SubagentInvoker = mock(async () => makeValidExplorerResponse('DESIGN.md'))

      const result = await runMigrationPlanner(inventory, [], tmpDir, mockInvoker, {
        maxParallelSubagents: 1,
      })

      const inv = result.semanticInventory
      expect(typeof inv.run_id).toBe('string')
      expect(typeof inv.produced_at).toBe('string')
      expect(typeof inv.target_dir).toBe('string')
      expect(Array.isArray(inv.entries)).toBe(true)
      expect(Array.isArray(inv.unprocessed_paths)).toBe(true)
      expect(typeof inv.explorer_batches).toBe('number')
      expect(typeof inv.duration_ms).toBe('number')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('marca aborted=true quando invoker falha', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'planner-fail-'))
    try {
      await writeFile(path.join(tmpDir, 'BROKEN.md'), '# Broken')

      const inventory = makeInventory(['BROKEN.md'], tmpDir)
      const failingInvoker: SubagentInvoker = mock(async () => {
        throw new Error('subagent timeout')
      })

      const result = await runMigrationPlanner(inventory, [], tmpDir, failingInvoker, {
        maxParallelSubagents: 1,
      })

      expect(result.aborted).toBe(true)
      expect(result.semanticInventory.unprocessed_paths).toContain('BROKEN.md')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('processa multiplos arquivos em paralelo com cap', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'planner-parallel-'))
    try {
      const files = ['A.md', 'B.md', 'C.md', 'D.md', 'E.md']
      await Promise.all(files.map((f) => writeFile(path.join(tmpDir, f), `# ${f}\nContent`)))

      const inventory = makeInventory(files, tmpDir)

      let invokeCount = 0
      const mockInvoker: SubagentInvoker = mock(async (_prompt, fileContents) => {
        invokeCount++
        // Gera entradas para cada arquivo no batch
        const entries = Object.keys(fileContents).map((p) => ({
          path: p,
          semantic_topic: `Topico de ${p}`,
          slot_match: 'docs/DESIGN.md',
          confidence: 0.7,
          sections: [{ heading: '# ' + p, lines: '1', purpose: 'Header', mergeable_into_slot: true }],
          suggested_destiny: 'consolidate-into-canon' as const,
          density_score: 'thin' as const,
        }))
        return JSON.stringify({
          contract_version: '1.0',
          agent: 'explorer',
          kind: 'mutation',
          status: 'complete',
          reasoning: 'Analisei os arquivos do batch e mapeei para slots canonicos',
          payload: { semantic_entries: entries },
          metadata: { run_id: 'test-run-id', duration_ms: 50, model: 'sonnet' },
        })
      })

      // maxFilesPerSubagent=2 → ceil(5/2)=3 chunks, cada chunk chama invoker 1x
      const result = await runMigrationPlanner(inventory, [], tmpDir, mockInvoker, {
        maxParallelSubagents: 6,
        maxFilesPerSubagent: 2,
      })

      expect(result.aborted).toBe(false)
      expect(result.semanticInventory.entries).toHaveLength(5)
      expect(invokeCount).toBe(3) // 3 chunks = 3 invocacoes
      expect(result.semanticInventory.explorer_batches).toBe(3)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// runMigrationPlanner retry logic
// ---------------------------------------------------------------------------

describe('runMigrationPlanner retry logic', () => {
  it('retenta com batch reduzido quando Explorer falha na primeira tentativa', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'retry-test-'))
    try {
      for (let i = 1; i <= 4; i++) {
        await writeFile(path.join(tmpDir, `doc${i}.md`), `# Doc ${i}\nConteudo ${i}`)
      }

      const inventory = makeInventory(['doc1.md', 'doc2.md', 'doc3.md', 'doc4.md'], tmpDir)

      let callCount = 0
      const mockInvoker: SubagentInvoker = mock(async (_prompt, fileContents) => {
        callCount++
        if (callCount === 1) throw new Error('Simulated Explorer timeout')
        const entries = Object.keys(fileContents).map((p) => ({
          path: p,
          semantic_topic: 'Documento de teste',
          slot_match: 'no-match',
          confidence: 0.5,
          sections: [{ heading: '# Doc', lines: '1', purpose: 'Teste', mergeable_into_slot: false }],
          suggested_destiny: 'move-to-references' as const,
          density_score: 'thin' as const,
        }))
        return JSON.stringify({
          contract_version: '1.0',
          agent: 'explorer',
          kind: 'mutation',
          status: 'complete',
          reasoning: 'Retry bem-sucedido com batch reduzido',
          payload: { semantic_entries: entries },
          metadata: { run_id: 'test-run-id', duration_ms: 50, model: 'sonnet' },
        })
      })

      const result = await runMigrationPlanner(inventory, [], tmpDir, mockInvoker, {
        maxParallelSubagents: 1,
        maxFilesPerSubagent: 4,
        maxFilesPerSubagentRetry: 2,
      })

      expect(callCount).toBeGreaterThan(1)
      expect(result.aborted).toBe(false)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('aborta e reporta arquivos nao-processados quando retry tambem falha', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'abort-test-'))
    try {
      await writeFile(path.join(tmpDir, 'fail.md'), '# Fail\nConteudo')

      const inventory = makeInventory(['fail.md'], tmpDir)

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
