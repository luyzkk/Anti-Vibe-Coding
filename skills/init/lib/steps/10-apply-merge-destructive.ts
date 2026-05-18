// 2026-05-18 (Luiz/dev): Step 10 — transforma CLAUDE.md → mirror + gera docs/DESIGN.md.
// G1: backup ANTES de qualquer write. G8: --dry-run retorna antes de chamar createBackup.
// G9: --additive-merge early-return ANTES de ler CLAUDE.md.
// DI-1: skeleton usa ./akita-XXX.md (mesma pasta assets/snippets/).
// Path do skeleton: import.meta.dir sobe 2 niveis (steps -> lib -> init) -> assets/snippets/.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createBackup } from '../backup-anti-vibe'
import { resolveSnippetIncludes } from '../snippet-resolver'
import type { Step, StepContext, StepReport } from './types'
import { INIT_SUBAGENT_IDS } from '../init-subagent-ids'
import type { AuditLogWriter } from '../audit-log'
import { isDryRun } from '../dry-run-mode'

// Resolve skeleton path relativo ao arquivo compilado (import.meta.dir = lib/steps/)
const SNIPPETS_DIR = path.join(import.meta.dir, '..', '..', 'assets', 'snippets')
const SKELETON_PATH = path.join(SNIPPETS_DIR, 'design-md-skeleton.md')

const CLAUDE_MIRROR_TEMPLATE = `# CLAUDE.md

> Este arquivo eh um **espelho** de AGENTS.md. Para o conteudo canonico, consulte:
>
> - [AGENTS.md](./AGENTS.md)
> - [docs/DESIGN.md](./docs/DESIGN.md) — code style + conventions
>
> Foi transformado pelo \`/anti-vibe-coding:init\` (Step 10 apply-merge-destructive).
> O CLAUDE.md original foi salvo em \`.anti-vibe/backup/\` e pode ser restaurado via
> \`/anti-vibe-coding:init --rollback\`.

## Como usar

Leia AGENTS.md primeiro. Para code style detalhado, leia docs/DESIGN.md.
`

// Keywords para identificar blocos Akita no CLAUDE.md original
const AKITA_HEADING_REGEX = /code.?style|comments?|tests?|dependenc|logging|observability/i

type AkitaBlock = {
  readonly heading: string
  readonly body: string
}

function extractAkitaBlocks(content: string): ReadonlyArray<AkitaBlock> {
  const blocks: AkitaBlock[] = []
  const lines = content.split('\n')
  let currentHeading: string | null = null
  let currentBody: string[] = []

  for (const line of lines) {
    const h2Match = /^#{2,3}\s+(.+)$/.exec(line)
    if (h2Match !== null) {
      if (currentHeading !== null) {
        blocks.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
      }
      const headingText = h2Match[1] ?? ''
      if (AKITA_HEADING_REGEX.test(headingText)) {
        currentHeading = headingText
        currentBody = []
      } else {
        currentHeading = null
        currentBody = []
      }
    } else if (currentHeading !== null) {
      currentBody.push(line)
    }
  }

  if (currentHeading !== null) {
    blocks.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
  }

  return blocks
}

function buildDesignExtensions(blocks: ReadonlyArray<AkitaBlock>, timestamp: string): string {
  if (blocks.length === 0) return ''
  const parts = blocks.map((b) =>
    `### ${b.heading}\n\n<!-- extraido de CLAUDE.md em ${timestamp} -->\n\n${b.body}`,
  )
  return '\n\n' + parts.join('\n\n')
}

export const applyMergeDestructiveStep: Step = {
  id: '10-apply-merge-destructive',

  async run(ctx: StepContext): Promise<StepReport> {
    const startMs = performance.now()

    // G9: --additive-merge early-return ANTES de qualquer leitura
    if (ctx.flags['additive-merge'] === true) {
      return {
        mutated: false,
        summary: 'init-apply-merge: skipped — additive-merge mode, CLAUDE.md untouched',
      }
    }

    // Tentar ler CLAUDE.md. Ausencia = greenfield
    const claudePath = path.join(ctx.cwd, 'CLAUDE.md')
    let originalContent: string
    try {
      originalContent = await fs.readFile(claudePath, 'utf8')
    } catch {
      return {
        mutated: false,
        summary: 'init-apply-merge: no CLAUDE.md to transform (greenfield)',
      }
    }

    // G8: --dry-run retorna ANTES de chamar createBackup — zero IO
    if (ctx.flags['dry-run'] === true) {
      return {
        mutated: false,
        summary: 'init-apply-merge: dry-run — would transform CLAUDE.md and generate docs/DESIGN.md (noop)',
      }
    }

    // G1: Backup ANTES de qualquer write
    let backupResult: Awaited<ReturnType<typeof createBackup>>
    try {
      backupResult = await createBackup({
        cwd: ctx.cwd,
        files: [{ originalPath: 'CLAUDE.md', action: 'transform' }],
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        mutated: false,
        summary: `init-apply-merge: backup failed — ${message}. CLAUDE.md untouched.`,
      }
    }

    // Extrair blocos Akita do CLAUDE.md original
    const akitaBlocks = extractAkitaBlocks(originalContent)

    // Ler skeleton e resolver includes
    const skeletonContent = await fs.readFile(SKELETON_PATH, 'utf8')
    const resolvedDesign = await resolveSnippetIncludes(skeletonContent, SNIPPETS_DIR)

    // Apender blocos Akita na secao "Extensoes especificas do projeto"
    const timestamp = backupResult.manifest.timestamp
    const extensions = buildDesignExtensions(akitaBlocks, timestamp)
    const designContent = resolvedDesign + extensions

    // Criar docs/ se nao existir
    const docsDir = path.join(ctx.cwd, 'docs')
    await fs.mkdir(docsDir, { recursive: true })

    // Escrever DESIGN.md e CLAUDE.md mirror
    const designPath = path.join(docsDir, 'DESIGN.md')
    await fs.writeFile(designPath, designContent, 'utf8')
    await fs.writeFile(claudePath, CLAUDE_MIRROR_TEMPLATE, 'utf8')

    const writer = isDryRun(ctx) ? undefined : (ctx.flags['__auditLog'] as AuditLogWriter | undefined)
    await writer?.append({
      subagent_id: INIT_SUBAGENT_IDS.applyMerge,
      input_paths: [ctx.cwd],
      output_struct: {
        backupDir: backupResult.backupDir,
        transformedFiles: ['CLAUDE.md', 'docs/DESIGN.md'],
        extractedToDesign: akitaBlocks.length,
      },
      duration_ms: Math.round(performance.now() - startMs),
      retry_count: 0,
    })

    return {
      mutated: true,
      summary: `init-apply-merge: CLAUDE.md transformed → mirror; docs/DESIGN.md generated (backup: ${backupResult.backupDir})`,
    }
  },
}
