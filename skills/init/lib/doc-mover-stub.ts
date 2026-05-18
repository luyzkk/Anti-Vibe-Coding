// 2026-05-18 (Luiz/dev): contrato publico consumido por Step 11 (fase-05) e Plano 05 fase-04 (rollback inverso) — PRD D12

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Glob } from 'bun'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MoveResult = {
  readonly moved: boolean
  readonly stubWritten: boolean
  readonly linksRewritten: number
  readonly externalLinks: ReadonlyArray<{
    readonly file: string
    readonly line: number
    readonly url: string
  }>
  readonly errors: ReadonlyArray<{
    readonly stage: 'rename' | 'stub' | 'rewrite'
    readonly message: string
  }>
}

export type MoveDocInput = {
  readonly source: string     // path relativo ao repoRoot
  readonly target: string     // path relativo ao repoRoot
  readonly repoRoot: string   // cwd do dispatcher
  readonly dryRun?: boolean
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type RewriteInput = {
  readonly repoRoot: string
  readonly oldPath: string
  readonly newPath: string
}

type RewriteResult = {
  readonly filesModified: number
  readonly externalLinks: MoveResult['externalLinks']
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLOB_IGNORE_PREFIXES: ReadonlyArray<string> = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.anti-vibe',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

function escapeRegexChars(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isIgnored(filePosix: string): boolean {
  return GLOB_IGNORE_PREFIXES.some((prefix) => filePosix.startsWith(prefix + '/') || filePosix === prefix)
}

function buildStubContent(source: string, target: string): string {
  const sourceDir = path.posix.dirname(source.split(path.sep).join('/'))
  const targetPosix = target.split(path.sep).join('/')
  const relTarget = path.posix.relative(sourceDir, targetPosix)
  return `# Moved\n\nThis document moved to [${target}](${relTarget}).\n`
}

// ---------------------------------------------------------------------------
// rewriteInternalLinks
// ---------------------------------------------------------------------------

export async function rewriteInternalLinks(input: RewriteInput): Promise<RewriteResult> {
  const { repoRoot, oldPath, newPath } = input

  const oldPosix = toPosix(oldPath)
  const newPosix = toPosix(newPath)
  const oldFilename = path.posix.basename(oldPosix)

  const escapedOld = escapeRegexChars(oldFilename)
  // Match ](<anything>oldFilename) — not preceded by http/https (those are external)
  const internalLinkRe = new RegExp(`\\]\\((?!https?://)[^)]*${escapedOld}\\)`, 'g')
  const externalLinkRe = /\]\((https?:\/\/[^)]+)\)/g

  const newFilename = path.posix.basename(newPosix)

  const glob = new Glob('**/*.md')
  const externalLinks: Array<MoveResult['externalLinks'][number]> = []
  let filesModified = 0

  for await (const relFile of glob.scan({ cwd: repoRoot, dot: false })) {
    const relPosix = toPosix(relFile)
    if (isIgnored(relPosix)) continue

    const absFile = path.join(repoRoot, relFile)
    let content: string
    try {
      content = await fs.readFile(absFile, 'utf8')
    } catch {
      continue
    }

    // Collect external links
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      let m: RegExpExecArray | null
      externalLinkRe.lastIndex = 0
      while ((m = externalLinkRe.exec(line)) !== null) {
        externalLinks.push({ file: relPosix, line: i + 1, url: m[1] ?? '' })
      }
    }

    // Rewrite internal links
    const updated = content.replace(internalLinkRe, (match) =>
      match.replace(oldFilename, newFilename),
    )

    if (updated !== content) {
      await fs.writeFile(absFile, updated, 'utf8')
      filesModified++
    }
  }

  return { filesModified, externalLinks }
}

// ---------------------------------------------------------------------------
// moveDocWithStub
// ---------------------------------------------------------------------------

export async function moveDocWithStub(input: MoveDocInput): Promise<MoveResult> {
  const { source, target, repoRoot, dryRun } = input

  const sourceAbs = path.join(repoRoot, source)
  const targetAbs = path.join(repoRoot, target)

  // Pre-flight: source must exist
  try {
    await fs.access(sourceAbs)
  } catch {
    return {
      moved: false,
      stubWritten: false,
      linksRewritten: 0,
      externalLinks: [],
      errors: [{ stage: 'rename', message: `source not found: ${source}` }],
    }
  }

  // Pre-flight: target must NOT exist
  try {
    await fs.access(targetAbs)
    // If we reach here, target exists — error
    return {
      moved: false,
      stubWritten: false,
      linksRewritten: 0,
      externalLinks: [],
      errors: [{ stage: 'rename', message: `target already exists: ${target}` }],
    }
  } catch {
    // Expected: target does not exist — continue
  }

  // dryRun: return early without mutating
  if (dryRun === true) {
    return {
      moved: false,
      stubWritten: false,
      linksRewritten: 0,
      externalLinks: [],
      errors: [],
    }
  }

  // Step (a): rename source → target
  try {
    await fs.rename(sourceAbs, targetAbs)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      moved: false,
      stubWritten: false,
      linksRewritten: 0,
      externalLinks: [],
      errors: [{ stage: 'rename', message: msg }],
    }
  }

  const errors: Array<MoveResult['errors'][number]> = []

  // Step (b): write stub at old path
  let stubWritten = false
  try {
    const stubContent = buildStubContent(source, target)
    await fs.writeFile(sourceAbs, stubContent, 'utf8')
    stubWritten = true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push({ stage: 'stub', message: msg })
  }

  // Step (c): rewrite internal links
  let linksRewritten = 0
  let externalLinks: MoveResult['externalLinks'] = []
  try {
    const rewriteResult = await rewriteInternalLinks({
      repoRoot,
      oldPath: source,
      newPath: target,
    })
    linksRewritten = rewriteResult.filesModified
    externalLinks = rewriteResult.externalLinks
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push({ stage: 'rewrite', message: msg })
  }

  return {
    moved: true,
    stubWritten,
    linksRewritten,
    externalLinks,
    errors,
  }
}
