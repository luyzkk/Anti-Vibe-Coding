// 2026-05-14 (Luiz/dev): CA-29 compliance + compound:check compat

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseContract } from '../../lib/subagent-contract'
import type { MutationContract } from '../../lib/subagent-contract'
import type { SemanticInventory } from './migration-planner'
import type { ReconcilerResult } from './reconciler'
import type { SubagentInvoker } from './migration-planner'
import type { AuditLogWriter } from './audit-log'

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
  created: string // YYYY-MM-DD
}

/** Uma compound note pronta para escrita. */
export type CompoundNote = {
  filename: string
  content: string // inclui frontmatter YAML + corpo
}

export type CompoundNoteWritten = {
  absolutePath: string
  relativePath: string
  filename: string
  title: string
}

export type CompoundWriterOptions = {
  logger?: AuditLogWriter
  /** Se true, lança erro se compound note falhar CA-29. Default: true. */
  strict?: boolean
}

export type CompoundWriterResult = {
  written: CompoundNoteWritten[]
  skipped: Array<{ filename: string; reason: string }>
}

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

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch?.[1]) {
    return { valid: false, errors: ['Frontmatter YAML ausente (esperado: ---\\n...\\n---)'] }
  }

  const fmText = fmMatch[1]

  const titleMatch = fmText.match(/^title:\s*(.+)$/m)
  const categoryMatch = fmText.match(/^category:\s*(.+)$/m)
  const tagsMatch = fmText.match(/^tags:\s*\[([^\]]*)\]$/m)
  const createdMatch = fmText.match(/^created:\s*(\d{4}-\d{2}-\d{2})$/m)

  if (!titleMatch?.[1]) errors.push('Campo "title" ausente ou vazio no frontmatter')
  if (!categoryMatch?.[1]) {
    errors.push('Campo "category" ausente no frontmatter')
  } else if (!VALID_COMPOUND_CATEGORIES.has(categoryMatch[1].trim())) {
    errors.push(
      `"category" inválido: "${categoryMatch[1].trim()}". Válidos: ${[...VALID_COMPOUND_CATEGORIES].join(', ')}`,
    )
  }
  if (!tagsMatch) errors.push('Campo "tags" ausente ou malformado (esperado: tags: [tag1, tag2])')
  if (!createdMatch?.[1])
    errors.push('Campo "created" ausente ou formato inválido (esperado: YYYY-MM-DD)')

  const bodyStart = content.indexOf('---', 3) + 3
  const body = content.slice(bodyStart).trim()
  if (body.length < 100) {
    errors.push(`Corpo da nota muito curto: ${body.length} chars (mínimo 100)`)
  }

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
      category: (categoryMatch![1] as string).trim() as CompoundCategory,
      tags,
      created: createdMatch![1] as string,
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

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
  return /^\d{4}-\d{2}-\d{2}-[a-z0-9-]{1,50}\.md$/.test(filename)
}

// ---------------------------------------------------------------------------
// runCompoundWriter — função principal
// ---------------------------------------------------------------------------

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
    if (opts.logger) {
      await opts.logger.append({
        subagent_id: 'compound-writer',
        input_paths: [],
        output_struct: null,
        duration_ms: 0,
        retry_count: 0,
        error: errorMsg,
      })
    }
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

  if (opts.logger) {
    await opts.logger.append({
      subagent_id: 'compound-writer',
      input_paths: [],
      output_struct: { notes_count: payload.compound_notes.length },
      duration_ms: 0,
      retry_count: 0,
    })
  }

  const compoundDir = path.join(targetDir, 'docs/compound')
  await fs.mkdir(compoundDir, { recursive: true })

  const written: CompoundNoteWritten[] = []
  const skipped: CompoundWriterResult['skipped'] = []

  for (const note of payload.compound_notes) {
    if (!validateFilename(note.filename)) {
      const reason = `Filename inválido: "${note.filename}". Esperado: YYYY-MM-DD-slug.md`
      if (strict) throw new Error(reason)
      skipped.push({ filename: note.filename, reason })
      continue
    }

    const fmValidation = validateCA29Frontmatter(note.content)
    if (!fmValidation.valid) {
      const reason = `CA-29 inválido em "${note.filename}": ${fmValidation.errors.join('; ')}`
      if (strict) throw new Error(reason)
      skipped.push({ filename: note.filename, reason })
      continue
    }

    const absolutePath = path.join(compoundDir, note.filename)
    try {
      await fs.access(absolutePath)
      // Arquivo existe — pular (idempotência: não sobrescrever edições humanas)
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
