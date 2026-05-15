<!-- Comment Provenance: 2026-05-14 (Luiz/dev) — gerado por /plan-feature para Plano 03 do /init Migration Mode -->

# Fase 04: Compound-Writer Subagent + CA-29 Compliance

**Plano:** 03 — Subagent Orchestration
**Sizing:** 1.5h
**Depende de:** fase-03 (`runReconciler` completo + `ReconcilerResult` disponível)
**Visual:** false

---

## O que esta fase entrega

Módulo `skills/init/lib/compound-writer.ts` que invoca o Compound-writer subagent com o
`SemanticInventory` + decisões do Reconciler, valida as compound notes resultantes contra
o contrato CA-29 (frontmatter `title`/`category`/`tags`/`created`), e escreve cada nota em
`docs/compound/YYYY-MM-DD-{slug}.md`.

As notas geradas são compatíveis com `bun run compound:check` do plugin Anti-Vibe.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/compound-writer.ts` | Criar | Orchestrator do Compound-writer subagent + CA-29 validator + writer |
| `skills/init/lib/compound-writer.test.ts` | Criar | Testes com mock do Compound-writer subagent |

---

## Implementacao

### Passo 1: Escrever teste stub RED

```typescript
// skills/init/lib/compound-writer.test.ts
import { describe, it, expect } from 'bun:test'
import { runCompoundWriter, validateCA29Frontmatter } from './compound-writer'

describe('runCompoundWriter', () => {
  it('module exists and exports runCompoundWriter', () => {
    expect(typeof runCompoundWriter).toBe('function')
  })
})

describe('validateCA29Frontmatter', () => {
  it('module exists and exports validateCA29Frontmatter', () => {
    expect(typeof validateCA29Frontmatter).toBe('function')
  })
})
```

Rodar: `bun run test -- --grep 'runCompoundWriter|validateCA29Frontmatter'` → RED

### Passo 2: Tipos

```typescript
// skills/init/lib/compound-writer.ts
// 2026-05-14 (Luiz/dev): CA-29 compliance + compound:check compat

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseContract } from '../../lib/subagent-contract'
import type { MutationContract } from '../../lib/subagent-contract'
import type { SemanticInventory } from './migration-planner'
import type { ReconcilerResult } from './reconciler'
import type { SubagentInvoker } from './migration-planner'
import type { AuditLogger } from './audit-log'

/** Categorias válidas para compound notes (CA-29). */
export type CompoundCategory =
  | 'architectural-decision'
  | 'anti-pattern'
  | 'preserved-pattern'
  | 'mapping-decision'

/** Frontmatter obrigatório por CA-29. */
export type CA29Frontmatter = {
  title: string
  category: CompoundCategory
  tags: string[]
  created: string  // YYYY-MM-DD
}

/** Uma compound note pronta para escrita. */
export type CompoundNote = {
  filename: string
  content: string  // inclui frontmatter YAML + corpo
}

export type CompoundNoteWritten = {
  absolutePath: string
  relativePath: string
  filename: string
  title: string
}

export type CompoundWriterOptions = {
  logger?: AuditLogger
  /** Se true, lança erro se compound note falhar CA-29. Default: true. */
  strict?: boolean
}

export type CompoundWriterResult = {
  written: CompoundNoteWritten[]
  skipped: Array<{ filename: string; reason: string }>
}
```

### Passo 3: Validador CA-29

O validador garante que compound notes emitidas pelo LLM têm o frontmatter correto antes de serem escritas em disco. Compatível com o que `bun run compound:check` valida.

```typescript
export type CA29ValidationResult = {
  valid: boolean
  errors: string[]
  parsed?: CA29Frontmatter
}

const VALID_COMPOUND_CATEGORIES: Set<string> = new Set([
  'architectural-decision',
  'anti-pattern',
  'preserved-pattern',
  'mapping-decision',
])

/**
 * Extrai e valida o frontmatter YAML de uma compound note.
 * CA-29: exige title, category (enum), tags (array), created (YYYY-MM-DD).
 *
 * @param content Conteúdo completo da nota (incluindo frontmatter)
 */
export function validateCA29Frontmatter(content: string): CA29ValidationResult {
  const errors: string[] = []

  // Extrair frontmatter: conteúdo entre os dois primeiros "---"
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch?.[1]) {
    return { valid: false, errors: ['Frontmatter YAML ausente (esperado: ---\\n...\\n---)'] }
  }

  const fmText = fmMatch[1]

  // Parse manual simples: suficiente para os 4 campos obrigatórios
  const titleMatch = fmText.match(/^title:\s*(.+)$/m)
  const categoryMatch = fmText.match(/^category:\s*(.+)$/m)
  const tagsMatch = fmText.match(/^tags:\s*\[([^\]]*)\]$/m)
  const createdMatch = fmText.match(/^created:\s*(\d{4}-\d{2}-\d{2})$/m)

  if (!titleMatch?.[1]) errors.push('Campo "title" ausente ou vazio no frontmatter')
  if (!categoryMatch?.[1]) {
    errors.push('Campo "category" ausente no frontmatter')
  } else if (!VALID_COMPOUND_CATEGORIES.has(categoryMatch[1].trim())) {
    errors.push(`"category" inválido: "${categoryMatch[1].trim()}". Válidos: ${[...VALID_COMPOUND_CATEGORIES].join(', ')}`)
  }
  if (!tagsMatch) errors.push('Campo "tags" ausente ou malformado (esperado: tags: [tag1, tag2])')
  if (!createdMatch?.[1]) errors.push('Campo "created" ausente ou formato inválido (esperado: YYYY-MM-DD)')

  // Validar corpo mínimo (100 chars após frontmatter)
  const bodyStart = content.indexOf('---', 3) + 3
  const body = content.slice(bodyStart).trim()
  if (body.length < 100) {
    errors.push(`Corpo da nota muito curto: ${body.length} chars (mínimo 100)`)
  }

  // Validar title length
  const title = titleMatch?.[1]?.trim() ?? ''
  if (title.length > 80) {
    errors.push(`"title" muito longo: ${title.length} chars (máximo 80)`)
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const tags = (tagsMatch?.[1] ?? '').split(',').map((t) => t.trim()).filter(Boolean)

  return {
    valid: true,
    errors: [],
    parsed: {
      title,
      category: (categoryMatch![1].trim()) as CompoundCategory,
      tags,
      created: createdMatch![1],
    },
  }
}
```

### Passo 4: Payload type guard e invoker

```typescript
type CompoundWriterPayload = {
  compound_notes: CompoundNote[]
}

function isCompoundPayload(v: unknown): v is CompoundWriterPayload {
  return (
    typeof v === 'object' &&
    v !== null &&
    'compound_notes' in v &&
    Array.isArray((v as Record<string, unknown>)['compound_notes'])
  )
}

function validateFilename(filename: string): boolean {
  // YYYY-MM-DD-slug.md onde slug é kebab-case, máximo 60 chars
  return /^\d{4}-\d{2}-\d{2}-[a-z0-9-]{1,50}\.md$/.test(filename)
}
```

### Passo 5: Função principal `runCompoundWriter`

```typescript
/**
 * Fase 3 do pipeline de migration mode: invoca Compound-writer subagent
 * e escreve compound notes em docs/compound/.
 *
 * CA-29: cada nota passa por validateCA29Frontmatter antes de ser escrita.
 * `bun run compound:check` compat: frontmatter title/category/tags/created.
 *
 * @param semanticInventory Output da Fase 1 (Explorer)
 * @param reconcilerResult Output da Fase 2 (Reconciler)
 * @param targetDir Raiz do projeto
 * @param invoker Abstração sobre Task tool
 * @param opts Opções
 */
export async function runCompoundWriter(
  semanticInventory: SemanticInventory,
  reconcilerResult: ReconcilerResult,
  targetDir: string,
  invoker: SubagentInvoker,
  opts: CompoundWriterOptions = {},
): Promise<CompoundWriterResult> {
  const runId = semanticInventory.run_id
  const strict = opts.strict ?? true

  // Carregar prompt do Compound-writer
  const promptPath = path.join(import.meta.dir, 'prompts/compound.md')
  const compoundPrompt = await fs.readFile(promptPath, 'utf-8')

  const inputJson = JSON.stringify(
    {
      run_id: runId,
      semantic_inventory: semanticInventory.entries,
      reconciler_decisions: reconcilerResult.slotDecisions,
      target_dir: targetDir,
    },
    null,
    2,
  )

  const rawOutput = await invoker(
    compoundPrompt + '\n\n## Input\n\n```json\n' + inputJson + '\n```',
    {},
  )

  const contractResult = parseContract(rawOutput)
  if (!contractResult.valid || !contractResult.contract) {
    const errorMsg = `Compound-writer contract invalid: ${contractResult.errors.map((e) => e.message).join('; ')}`
    opts.logger?.append({
      agent: 'compound-writer',
      run_id: runId,
      status: 'needs_retry',
      error: errorMsg,
      timestamp: new Date().toISOString(),
    })
    throw new Error(errorMsg)
  }

  if (contractResult.contract.kind !== 'mutation') {
    throw new Error(`Compound-writer expected kind:mutation, got ${contractResult.contract.kind}`)
  }

  const contract = contractResult.contract as MutationContract
  const payload = contract.payload

  if (!isCompoundPayload(payload)) {
    throw new Error('Compound-writer payload missing compound_notes array')
  }

  opts.logger?.append({
    agent: 'compound-writer',
    run_id: runId,
    status: contract.status,
    notes_count: payload.compound_notes.length,
    timestamp: new Date().toISOString(),
  })

  // Escrever compound notes em docs/compound/
  const compoundDir = path.join(targetDir, 'docs/compound')
  await fs.mkdir(compoundDir, { recursive: true })

  const written: CompoundNoteWritten[] = []
  const skipped: CompoundWriterResult['skipped'] = []

  for (const note of payload.compound_notes) {
    // Validar filename
    if (!validateFilename(note.filename)) {
      const reason = `Filename inválido: "${note.filename}". Esperado: YYYY-MM-DD-slug.md`
      if (strict) throw new Error(reason)
      skipped.push({ filename: note.filename, reason })
      continue
    }

    // CA-29: validar frontmatter antes de escrever
    const fmValidation = validateCA29Frontmatter(note.content)
    if (!fmValidation.valid) {
      const reason = `CA-29 inválido em "${note.filename}": ${fmValidation.errors.join('; ')}`
      if (strict) throw new Error(reason)
      skipped.push({ filename: note.filename, reason })
      continue
    }

    // Verificar se arquivo já existe (idempotência — não sobrescrever edições humanas)
    const absolutePath = path.join(compoundDir, note.filename)
    try {
      await fs.access(absolutePath)
      // Arquivo existe — pular (Plano 05 fase-01 cuida da idempotência completa)
      skipped.push({ filename: note.filename, reason: 'arquivo já existe (preservado)' })
      continue
    } catch {
      // Não existe — pode escrever
    }

    await fs.writeFile(absolutePath, note.content, 'utf-8')
    written.push({
      absolutePath,
      relativePath: `docs/compound/${note.filename}`,
      filename: note.filename,
      title: fmValidation.parsed!.title,
    })
  }

  return { written, skipped }
}
```

### Passo 6: Expandir testes

```typescript
// Expandir compound-writer.test.ts

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
      // Setup: criar prompt mockado
      await mkdir(path.join(tmpDir, 'skills/init/lib/prompts'), { recursive: true })
      await writeFile(path.join(tmpDir, 'skills/init/lib/prompts/compound.md'), '# Compound Prompt')

      const mockInvoker: SubagentInvoker = async () =>
        JSON.stringify({
          contract_version: '1.0',
          agent: 'compound-writer',
          kind: 'mutation',
          status: 'complete',
          reasoning: 'Identifiquei 1 padrao de anti-pattern em docs densos que merece captura duravel',
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

      // Verificar que arquivo foi criado
      const compoundFiles = await readdir(path.join(tmpDir, 'docs/compound'))
      expect(compoundFiles).toContain('2026-05-14-docs-densos-anti-pattern.md')
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  })
})
```

---

## Gotchas

**G1 — `compound:check` valida campos específicos:** O script `bun run compound:check` existente no plugin verifica frontmatter CA-29. O `validateCA29Frontmatter` desta fase deve ser compatível com o que o script valida. Antes de fazer merge, executar `bun run compound:check` em um arquivo de teste para confirmar alinhamento.

**G2 — Tags podem ser array JSON ou YAML flow:** O Reconciler pode emitir tags como `[migration, docs]` (YAML flow) dentro do JSON string. O parser simples com regex `\[([^\]]*)\]` cobre o caso mais comum. Para tags com espaços internos ou quotes, o split por `,` seguido de trim é suficiente.

**G3 — Idempotência preserva arquivos existentes:** `runCompoundWriter` não sobrescreve compound notes que já existem (verificação com `fs.access`). Isso é consistente com o princípio DT-06 (respeitar edições humanas). A idempotência completa é responsabilidade do Plano 05.

**G4 — Compound notes NÃO são migration plans:** Paths diferentes, formatos diferentes. Compound notes vivem em `docs/compound/` com frontmatter YAML. Migration plans vivem em `docs/exec-plans/active/` com frontmatter yaml diferente + 10 seções H2. Não misturar os writers.

**G5 — `0 compound_notes` é válido:** Se o Compound-writer não identificar nenhum padrão digno de captura, retorna `compound_notes: []`. `runCompoundWriter` retorna `{ written: [], skipped: [] }` sem erro. Isso é comportamento correto — não forçar notas artificiais.

---

## Verificacao

### TDD (RED → GREEN)
- [ ] RED: `compound-writer.ts` não existe → tests falham com ModuleNotFoundError
- [ ] GREEN: módulo criado, tests de existência passam
- [ ] RED: `validateCA29Frontmatter` retorna valid:true para frontmatter sem body → adicionar regra de comprimento mínimo → RED
- [ ] GREEN: regra de comprimento implementada, test passa
- [ ] RED: test de category inválida falha antes de implementar validação de enum
- [ ] GREEN: validação de enum implementada, test passa
- [ ] GREEN: test de escrita de compound note em tmpDir passa

### Checklist
- [ ] `compound-writer.ts` exporta `runCompoundWriter`, `validateCA29Frontmatter`, `CA29Frontmatter`, `CompoundNote`, `CompoundWriterResult`
- [ ] `validateCA29Frontmatter` valida todos os 4 campos CA-29 (`title`, `category`, `tags`, `created`)
- [ ] `validateCA29Frontmatter` valida body mínimo 100 chars
- [ ] `validateCA29Frontmatter` valida title máximo 80 chars
- [ ] `validateCA29Frontmatter` valida category contra enum de 4 valores
- [ ] `runCompoundWriter` não sobrescreve arquivos existentes
- [ ] `runCompoundWriter` lança erro em strict mode para CA-29 inválido
- [ ] Compound notes escritas passam em `bun run compound:check` manualmente
- [ ] `bun run tsc --noEmit` passa
- [ ] `bun run test` passa
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por máquina:**
- `bun run test -- --grep 'validateCA29Frontmatter'` retorna ≥4 testes PASS
- `bun run test -- --grep 'runCompoundWriter'` retorna ≥2 testes PASS
- Compound note escrita pelo test tem frontmatter válido confirmado por `bun run compound:check` manual
- `bun run tsc --noEmit` exit code 0

<!-- Gerado por /plan-feature em 2026-05-14 -->
