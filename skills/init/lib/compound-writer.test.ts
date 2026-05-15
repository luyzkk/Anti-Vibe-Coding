// 2026-05-14 (Luiz/dev): Plano 03 fase-04 — TDD RED stub antes da implementacao

import { describe, it, expect } from 'bun:test'
import path from 'node:path'
import { runCompoundWriter, validateCA29Frontmatter } from './compound-writer'
import type { SemanticInventory, SubagentInvoker } from './migration-planner'
import type { ReconcilerResult } from './reconciler'

describe('validateCA29Frontmatter', () => {
  it('valida frontmatter correto', () => {
    const content = `---
title: Titulo valido de teste
category: anti-pattern
tags: [migration, docs, test]
created: 2026-05-14
---

Corpo da nota com mais de 100 caracteres para passar a validação mínima de comprimento obrigatório do body.`
    const result = validateCA29Frontmatter(content)
    expect(result.valid).toBe(true)
    expect(result.parsed?.title).toBe('Titulo valido de teste')
    expect(result.parsed?.category).toBe('anti-pattern')
    expect(result.parsed?.tags).toContain('migration')
  })

  it('retorna invalid quando frontmatter ausente', () => {
    const result = validateCA29Frontmatter('# Titulo sem frontmatter\n\nConteúdo aqui')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Frontmatter YAML ausente')
  })

  it('retorna invalid para category invalida', () => {
    const content = `---
title: Teste
category: invalid-category
tags: [test]
created: 2026-05-14
---

Corpo suficientemente longo para passar a validacao minima de comprimento do body.`
    const result = validateCA29Frontmatter(content)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('category'))).toBe(true)
  })

  it('retorna invalid quando body muito curto', () => {
    const content = `---
title: Teste
category: anti-pattern
tags: [test]
created: 2026-05-14
---

Curto.`
    const result = validateCA29Frontmatter(content)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Corpo'))).toBe(true)
  })
})

describe('runCompoundWriter', () => {
  it('module exists and exports runCompoundWriter', () => {
    expect(typeof runCompoundWriter).toBe('function')
  })

  it('escreve compound note valida em docs/compound/', async () => {
    const { mkdtemp, writeFile, mkdir, rm, readdir } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'compound-test-'))
    try {
      const mockInvoker: SubagentInvoker = async () =>
        JSON.stringify({
          contract_version: '1.0',
          agent: 'compound-writer',
          kind: 'mutation',
          status: 'complete',
          reasoning:
            'Identifiquei 1 padrao de anti-pattern em docs densos que merece captura duravel',
          payload: {
            compound_notes: [
              {
                filename: '2026-05-14-docs-densos-anti-pattern.md',
                content: `---
title: Docs densos sao anti-pattern
category: anti-pattern
tags: [docs, density, migration]
created: 2026-05-14
---

# Docs densos sao anti-pattern

Um arquivo com mais de 500 linhas de documentacao forca o agente a ler conteudo irrelevante em cada consulta. Dividir por responsabilidade e sempre superior. Esta licao foi aprendida durante a migracao do arquivo ARCHITECTURE.md de 847 linhas.`,
              },
            ],
          },
          metadata: { run_id: 'test-run', duration_ms: 100, model: 'sonnet' },
        })

      const mockInventory: SemanticInventory = {
        run_id: 'test-run',
        produced_at: '2026-05-14T00:00:00Z',
        target_dir: tmpDir,
        entries: [],
        unprocessed_paths: [],
        explorer_batches: 1,
        duration_ms: 100,
      }

      const mockReconcilerResult: ReconcilerResult = {
        planPaths: [],
        failedSlots: [],
        slotDecisions: [],
      }

      const result = await runCompoundWriter(mockInventory, mockReconcilerResult, tmpDir, mockInvoker)

      expect(result.written.length).toBe(1)
      expect(result.written[0]!.filename).toBe('2026-05-14-docs-densos-anti-pattern.md')

      const compoundFiles = await readdir(path.join(tmpDir, 'docs/compound'))
      expect(compoundFiles).toContain('2026-05-14-docs-densos-anti-pattern.md')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })
})
