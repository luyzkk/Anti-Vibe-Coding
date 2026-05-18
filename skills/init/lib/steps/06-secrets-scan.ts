import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { Step, StepContext, StepReport } from './types'
import { scanSecrets, type SecretMatch } from '../secrets-scanner'
import { writeDiscoveryArtifact } from '../discovery-store'
import { INIT_SUBAGENT_IDS } from '../init-subagent-ids'
import type { AuditLogWriter } from '../audit-log'
import { isDryRun } from '../dry-run-mode'

export type SecretsScanFileEntry = {
  readonly relativePath: string
  readonly matches: readonly SecretMatch[]
}

export type SecretsScanResult = {
  readonly subagent_id: 'init-secrets-scan'
  readonly scannedCount: number
  readonly blockedFiles: readonly SecretsScanFileEntry[]
  readonly durationMs: number
}

const BLACKLIST_TOKENS = ['node_modules', 'dist', 'build', '.git', '.anti-vibe/backup']

function containsBlacklisted(relPath: string): boolean {
  return BLACKLIST_TOKENS.some((t) => relPath.includes(t))
}

function hasMarkdownExtension(name: string): boolean {
  return name.endsWith('.md') || name.endsWith('.mdx')
}

async function walkDir(
  dir: string,
  recursive: boolean,
  acc: string[],
  cwd: string,
): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    const rel = path.relative(cwd, full).split(path.sep).join('/')
    if (containsBlacklisted(rel)) continue
    if (entry.isDirectory()) {
      if (recursive) await walkDir(full, true, acc, cwd)
      continue
    }
    if (entry.isFile() && hasMarkdownExtension(entry.name)) {
      acc.push(full)
    }
  }
}

async function listCandidateFiles(cwd: string): Promise<readonly string[]> {
  const out: string[] = []
  await walkDir(cwd, false, out, cwd)
  await walkDir(path.join(cwd, 'docs'), true, out, cwd)
  await walkDir(path.join(cwd, '.claude'), true, out, cwd)
  return out
}

export const secretsScanStep: Step = {
  id: '06-secrets-scan',

  async run(ctx: StepContext): Promise<StepReport> {
    const startMs = performance.now()
    const files = await listCandidateFiles(ctx.cwd)
    const blocked: SecretsScanFileEntry[] = []

    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8')
      const matches = scanSecrets(content)
      if (matches.length > 0) {
        const rel = path.relative(ctx.cwd, filePath).split(path.sep).join('/')
        blocked.push({ relativePath: rel, matches })
      }
    }

    const result: SecretsScanResult = {
      subagent_id: 'init-secrets-scan',
      scannedCount: files.length,
      blockedFiles: blocked,
      durationMs: Math.round(performance.now() - startMs),
    }

    const noWrite = ctx.flags['dry-run'] === true
    await writeDiscoveryArtifact(ctx.cwd, 'secrets-scan-result', result, { noWrite })

    const writer = isDryRun(ctx) ? undefined : (ctx.flags['__auditLog'] as AuditLogWriter | undefined)
    await writer?.append({
      subagent_id: INIT_SUBAGENT_IDS.secretsScan,
      input_paths: [ctx.cwd],
      output_struct: {
        matchCount: blocked.length,
        blockedFiles: blocked.map((b) => b.relativePath),
      },
      duration_ms: result.durationMs,
      retry_count: 0,
    })

    return {
      mutated: false,
      summary: `secrets-scan [init-secrets-scan]: ${result.scannedCount} arquivos varridos, ${blocked.length} arquivos com match`,
    }
  },
}
