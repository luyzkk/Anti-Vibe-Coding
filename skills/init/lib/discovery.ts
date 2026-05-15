import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export type InventoryEntry = {
  path: string
  size_bytes: number
  size_lines: number
  mtime: string
  h1_h2_headings: string[]
  first_500_chars: string
}

export type InventoryResult = {
  run_id: string
  scanned_at: string
  target_dir: string
  entries: InventoryEntry[]
  excluded_paths: string[]
  duration_ms: number
}

export type DiscoveryOptions = {
  extraExcludeGlobs?: string[]
}

const WALK_SCOPES = [
  { base: 'docs', recursive: true },
  { base: '', recursive: false },
  { base: '.claude', recursive: true },
  { base: 'scripts', recursive: true },
  { base: '.github', recursive: true },
] as const

const SECRET_FILE_PATTERNS = [
  /\.env(\.|$)/,
  /\.pem$/,
  /\.key$/,
  /\.p12$/,
  /\.pfx$/,
  /\.crt$/,
  /\.cer$/,
]

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
  'out',
])

async function existsDir(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p)
    return s.isDirectory()
  } catch {
    return false
  }
}

function isSecretFile(relPath: string): boolean {
  const basename = path.posix.basename(relPath)
  return SECRET_FILE_PATTERNS.some((re) => re.test(basename))
}

function extractH1H2(content: string): string[] {
  const headings: string[] = []
  for (const line of content.split('\n')) {
    const m = line.match(/^#{1,2}\s+(.+)/)
    if (m?.[1]) headings.push(m[1].trim())
  }
  return headings
}

async function buildEntry(absPath: string, relPath: string): Promise<InventoryEntry> {
  const content = await fs.readFile(absPath, 'utf-8')
  const stat = await fs.stat(absPath)
  return {
    path: relPath.replace(/\\/g, '/'),
    size_bytes: Buffer.byteLength(content, 'utf-8'),
    size_lines: content.split('\n').length,
    mtime: stat.mtime.toISOString(),
    h1_h2_headings: extractH1H2(content),
    first_500_chars: content.slice(0, 500),
  }
}

async function walkScope(
  targetDir: string,
  base: string,
  recursive: boolean,
  excludedPaths: string[],
): Promise<InventoryEntry[]> {
  const absBase = base ? path.join(targetDir, base) : targetDir
  if (!(await existsDir(absBase))) return []

  const entries: InventoryEntry[] = []

  async function walk(dir: string): Promise<void> {
    let dirEntries: string[]
    try {
      dirEntries = await fs.readdir(dir)
    } catch {
      return
    }
    for (const name of dirEntries) {
      const abs = path.join(dir, name)
      const rel = path.relative(targetDir, abs).replace(/\\/g, '/')

      const topDir = rel.split('/')[0] ?? ''
      if (EXCLUDED_DIRS.has(topDir)) continue

      let stat: import('node:fs').Stats
      try {
        stat = await fs.stat(abs)
      } catch {
        continue
      }

      if (stat.isDirectory()) {
        if (recursive) await walk(abs)
        continue
      }

      if (!name.endsWith('.md')) continue
      if (isSecretFile(rel)) {
        excludedPaths.push(rel)
        continue
      }

      entries.push(await buildEntry(abs, rel))
    }
  }

  await walk(absBase)
  return entries
}

export async function runDiscovery(
  targetDir: string,
  opts: DiscoveryOptions = {},
): Promise<InventoryResult> {
  const start = Date.now()
  const run_id = randomUUID()
  const excludedPaths: string[] = []
  const allEntries: InventoryEntry[] = []

  for (const scope of WALK_SCOPES) {
    const entries = await walkScope(targetDir, scope.base, scope.recursive, excludedPaths)
    allEntries.push(...entries)
  }

  const seen = new Set<string>()
  const unique = allEntries.filter((e) => {
    if (seen.has(e.path)) return false
    seen.add(e.path)
    return true
  })

  const result: InventoryResult = {
    run_id,
    scanned_at: new Date().toISOString(),
    target_dir: targetDir,
    entries: unique,
    excluded_paths: excludedPaths,
    duration_ms: Date.now() - start,
  }

  const discoveryDir = path.join(targetDir, 'discovery')
  await fs.mkdir(discoveryDir, { recursive: true })
  await fs.writeFile(
    path.join(discoveryDir, 'inventory.json'),
    JSON.stringify(result, null, 2),
    'utf-8',
  )

  return result
}
