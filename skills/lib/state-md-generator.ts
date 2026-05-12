// 2026-05-12 (Luiz/dev): gera docs/STATE.md com 3 seções — Resources, Recent Activity, Pending
// M13/CA-45: idempotente, usa path-resolver-v6 para detectar layout v6
import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { resolvePaths, type ResolvedPaths } from './path-resolver-v6'

type TodoCounts = {
  open: number
  done: number
  skipped: number
}

type ResourceCounts = {
  compoundNotes: number
  compoundArchived: number
  adrs: number
  activePlans: number
  completedPlans: number
  todo: TodoCounts
}

type RecentEntry = {
  relPath: string
  mtime: number
}

type PendingPlanEntry = {
  slug: string
}

type PendingTodoEntry = {
  index: number
  text: string
}

type StateMdData = {
  counts: ResourceCounts
  recent: RecentEntry[]
  pendingPlans: PendingPlanEntry[]
  pendingTodos: PendingTodoEntry[]
  generatedAt: string
}

/**
 * Generates (or regenerates) `docs/STATE.md` in the given v6 project root.
 * Idempotent — second call produces identical content except the timestamp comment.
 *
 * @example
 *   const statePath = await regenerateStateMd(process.cwd())
 *   // → "/path/to/project/docs/STATE.md"
 */
export async function regenerateStateMd(projectRoot: string): Promise<string> {
  const paths = await resolvePaths(projectRoot)
  if (paths.layout !== 'v6') {
    throw new Error(
      `regenerateStateMd requires a v6 layout project (docs/compound/ + docs/exec-plans/ must exist). Got layout: "${paths.layout}" for root: "${projectRoot}"`
    )
  }

  const [counts, recent, { pendingPlans, pendingTodos }] = await Promise.all([
    countResources(paths, projectRoot),
    listRecent(paths, projectRoot),
    listPending(paths, projectRoot),
  ])

  const generatedAt = new Date().toISOString()
  const content = renderStateMd({ counts, recent, pendingPlans, pendingTodos, generatedAt })

  // Ensure docs/ dir exists (it must if layout is v6, but be defensive)
  const docsDir = path.join(projectRoot, 'docs')
  await fs.mkdir(docsDir, { recursive: true })

  const statePath = path.join(docsDir, 'STATE.md')
  await fs.writeFile(statePath, content, 'utf-8')
  return statePath
}

async function countResources(paths: ResolvedPaths, projectRoot: string): Promise<ResourceCounts> {
  const [compoundNotes, compoundArchived, adrs, activePlans, completedPlans, todo] = await Promise.all([
    countMdFiles(paths.compoundDir, { excludeSubdirs: true }),
    countMdFilesInDir(path.join(paths.compoundDir, '_archived')),
    countAdrFiles(paths.designDocsDir),
    countMdFiles(paths.execPlansActiveDir),
    countMdFiles(paths.execPlansCompletedDir),
    countTodoItems(path.join(projectRoot, 'TODO.md')),
  ])

  return { compoundNotes, compoundArchived, adrs, activePlans, completedPlans, todo }
}

/**
 * Counts .md files in a directory, skipping README and index files.
 * opts.excludeSubdirs: skip subdirectories entirely (don't recurse)
 */
async function countMdFiles(dir: string, opts?: { excludeSubdirs?: boolean }): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  let count = 0
  for (const entry of entries) {
    if (entry.isDirectory()) continue
    if (!entry.name.endsWith('.md')) continue
    const lower = entry.name.toLowerCase()
    if (lower === 'readme.md' || lower === 'index.md') continue
    // If excludeSubdirs is set, we already skip dirs above; this flag only affects
    // whether we *enter* subdirs — since we skip all dirs, it's already satisfied.
    count++
  }

  // If not excludeSubdirs, recurse into subdirectories (except _archived)
  if (!opts?.excludeSubdirs) {
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      count += await countMdFiles(path.join(dir, entry.name))
    }
  }

  return count
}

/**
 * Counts .md files directly in dir (non-recursive), no README/index filter.
 * Used for _archived/ where all files are valid compound notes.
 */
async function countMdFilesInDir(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries.filter(e => e.isFile() && e.name.endsWith('.md')).length
}

/**
 * Counts .md files with ADR- prefix in design-docs dir.
 */
async function countAdrFiles(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries.filter(e => e.isFile() && e.name.startsWith('ADR-') && e.name.endsWith('.md')).length
}

/**
 * Counts TODO checkbox items by state: open [ ], done [x], skipped [-].
 */
async function countTodoItems(todoPath: string): Promise<TodoCounts> {
  const content = await fs.readFile(todoPath, 'utf-8').catch(() => '')
  const lines = content.split('\n')
  let open = 0
  let done = 0
  let skipped = 0
  for (const line of lines) {
    if (/- \[ \]/.test(line)) open++
    else if (/- \[x\]/i.test(line)) done++
    else if (/- \[-\]/.test(line)) skipped++
  }
  return { open, done, skipped }
}

/**
 * Returns top 5 recently modified .md files across all tracked dirs, by mtime desc.
 * Tie-break: path alphabetically desc.
 */
async function listRecent(paths: ResolvedPaths, projectRoot: string): Promise<RecentEntry[]> {
  const dirsToScan: Array<{ dir: string; recursive: boolean }> = [
    { dir: paths.compoundDir, recursive: true },
    { dir: paths.execPlansActiveDir, recursive: false },
    { dir: paths.execPlansCompletedDir, recursive: false },
  ]

  const allEntries: RecentEntry[] = []

  for (const { dir, recursive } of dirsToScan) {
    const found = await collectMdFiles(dir, recursive)
    for (const filePath of found) {
      const stat = await fs.stat(filePath).catch(() => null)
      if (stat === null) continue
      allEntries.push({
        relPath: path.relative(projectRoot, filePath).replace(/\\/g, '/'),
        mtime: stat.mtimeMs,
      })
    }
  }

  return allEntries
    .sort((a, b) => {
      if (b.mtime !== a.mtime) return b.mtime - a.mtime
      // tie-break: path alphabetically desc
      return b.relPath < a.relPath ? -1 : b.relPath > a.relPath ? 1 : 0
    })
    .slice(0, 5)
}

async function collectMdFiles(dir: string, recursive: boolean): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    } else if (entry.isDirectory() && recursive) {
      const nested = await collectMdFiles(fullPath, recursive)
      files.push(...nested)
    }
  }
  return files
}

type PendingResult = {
  pendingPlans: PendingPlanEntry[]
  pendingTodos: PendingTodoEntry[]
}

/**
 * Finds active plans tagged pending-capture and open TODO items.
 */
async function listPending(paths: ResolvedPaths, projectRoot: string): Promise<PendingResult> {
  const [pendingPlans, pendingTodos] = await Promise.all([
    findPendingCapturePlans(paths.execPlansActiveDir),
    findOpenTodos(path.join(projectRoot, 'TODO.md')),
  ])
  return { pendingPlans, pendingTodos }
}

async function findPendingCapturePlans(activeDir: string): Promise<PendingPlanEntry[]> {
  const entries = await fs.readdir(activeDir, { withFileTypes: true }).catch(() => [])
  const pending: PendingPlanEntry[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const fullPath = path.join(activeDir, entry.name)
    const raw = await fs.readFile(fullPath, 'utf-8').catch(() => '')
    let parsed: matter.GrayMatterFile<string>
    try {
      parsed = matter(raw)
    } catch {
      console.warn(`[state-md-generator] malformed frontmatter in ${fullPath} — skipping`)
      continue
    }
    const tags: unknown = parsed.data['tags']
    const tagArray = Array.isArray(tags) ? tags : []
    const hasPendingCapture = tagArray.some((t: unknown) => t === 'pending-capture')
    if (hasPendingCapture) {
      const slug = entry.name.replace(/\.md$/, '')
      pending.push({ slug })
    }
  }

  return pending
}

async function findOpenTodos(todoPath: string): Promise<PendingTodoEntry[]> {
  const content = await fs.readFile(todoPath, 'utf-8').catch(() => '')
  const lines = content.split('\n')
  const todos: PendingTodoEntry[] = []
  let idx = 0
  for (const line of lines) {
    if (/- \[ \]/.test(line)) {
      const text = line.replace(/^.*- \[ \]\s*/, '').trim()
      todos.push({ index: idx, text })
      idx++
    }
  }
  return todos
}

function renderStateMd(data: StateMdData): string {
  const { counts, recent, pendingPlans, pendingTodos, generatedAt } = data

  const lines: string[] = []

  lines.push(`<!-- AUTO-GENERATED by lib/state-md-generator.ts — edicoes manuais sao sobrescritas -->`)
  lines.push(`<!-- Last regenerated: ${generatedAt} -->`)
  lines.push('')
  lines.push('# Project State')
  lines.push('')
  lines.push('## Resources')
  lines.push('')
  lines.push(`- **Compound notes:** ${counts.compoundNotes} (in \`docs/compound/\`)`)
  if (counts.compoundArchived > 0) {
    lines.push(`- **Compound archived:** ${counts.compoundArchived} (in \`docs/compound/_archived/\`)`)
  }
  lines.push(`- **ADRs:** ${counts.adrs} (in \`docs/design-docs/\`)`)
  lines.push(`- **Active plans:** ${counts.activePlans} (in \`docs/exec-plans/active/\`)`)
  lines.push(`- **Completed plans:** ${counts.completedPlans} (in \`docs/exec-plans/completed/\`)`)
  lines.push(`- **TODO items:** ${counts.todo.open} open / ${counts.todo.done} done / ${counts.todo.skipped} skipped`)
  lines.push('')
  lines.push('## Recent Activity')
  lines.push('')
  if (recent.length === 0) {
    lines.push('_No recent activity._')
  } else {
    for (const entry of recent) {
      lines.push(`- \`${entry.relPath}\``)
    }
  }
  lines.push('')
  lines.push('## Pending')
  lines.push('')
  if (pendingPlans.length === 0 && pendingTodos.length === 0) {
    lines.push('_Nothing pending._')
  } else {
    for (const plan of pendingPlans) {
      lines.push(`- Plan \`${plan.slug}\` — pending compound capture (tag \`pending-capture\`)`)
    }
    for (const todo of pendingTodos) {
      lines.push(`- TODO item ${todo.index}: ${todo.text}`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

// CLI entrypoint (Bun-specific)
if (import.meta.path === Bun.main) {
  const root = process.argv[2] ?? process.cwd()
  regenerateStateMd(root)
    .then((p) => console.log(`STATE.md regenerated at ${p}`))
    .catch((e: Error) => { console.error(e.message); process.exit(1) })
}
