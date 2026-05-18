import { promises as fs } from 'node:fs'
import path from 'node:path'

export type DiscoveredDoc = {
  readonly absolutePath: string
  readonly relativePath: string
  readonly bytes: number
  readonly extension: '.md' | '.mdx'
}

const BLACKLIST_TOKENS: ReadonlyArray<string> = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.anti-vibe/backup',
]

const WHITELIST_EXTENSIONS: ReadonlySet<'.md' | '.mdx'> = new Set(['.md', '.mdx'])

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

function containsBlacklisted(relPosix: string): boolean {
  return BLACKLIST_TOKENS.some((t) => relPosix.includes(t))
}

async function walkRoot(
  cwd: string,
  root: string,
  recursive: boolean,
  acc: DiscoveredDoc[],
): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }

  for (const entry of entries) {
    const full = path.join(root, entry.name)
    const relPosix = toPosix(path.relative(cwd, full))
    if (containsBlacklisted(relPosix)) continue

    if (entry.isDirectory()) {
      if (recursive) await walkRoot(cwd, full, true, acc)
      continue
    }

    if (!entry.isFile()) continue
    const ext = path.extname(entry.name)
    if (ext !== '.md' && ext !== '.mdx') continue
    if (!WHITELIST_EXTENSIONS.has(ext as '.md' | '.mdx')) continue

    // D6 do PRD — README.md da raiz do projeto-alvo eh intocavel.
    if (relPosix === 'README.md') continue

    const stat = await fs.stat(full)
    acc.push({
      absolutePath: full,
      relativePath: relPosix,
      bytes: stat.size,
      extension: ext as '.md' | '.mdx',
    })
  }
}

async function walkRootShallow(cwd: string, acc: DiscoveredDoc[]): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(cwd, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name)
    if (ext !== '.md' && ext !== '.mdx') continue
    if (entry.name === 'README.md') continue
    const full = path.join(cwd, entry.name)
    const relPosix = toPosix(path.relative(cwd, full))
    if (containsBlacklisted(relPosix)) continue
    const stat = await fs.stat(full)
    acc.push({
      absolutePath: full,
      relativePath: relPosix,
      bytes: stat.size,
      extension: ext as '.md' | '.mdx',
    })
  }
}

export async function discoverExistingDocs(
  cwd: string,
): Promise<readonly DiscoveredDoc[]> {
  const out: DiscoveredDoc[] = []

  await walkRootShallow(cwd, out)
  await walkRoot(cwd, path.join(cwd, 'docs'), true, out)
  await walkRoot(cwd, path.join(cwd, '.claude'), true, out)

  out.sort((a, b) => (a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0))
  return out
}
