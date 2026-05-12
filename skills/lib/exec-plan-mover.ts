// 2026-05-12 (Luiz/dev): move plano de active/ para completed/ com atualizacao de frontmatter
// Local 05-G1: read -> writeFile newPath -> unlink oldPath em sequencia (nao Promise.all).
// Trade-off: nao-atomico. Se crash entre writeFile e unlink, fica copia em active/ e completed/.
// Idempotente: segunda tentativa detecta arquivo nao existe em active/ (ENOENT).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { resolvePaths } from './path-resolver-v6'

export async function moveToCompleted(
  projectRoot: string,
  activePlanPath: string,
): Promise<{ newPath: string }> {
  const paths = await resolvePaths(projectRoot)
  await fs.mkdir(paths.execPlansCompletedDir, { recursive: true })

  const fileName = path.basename(activePlanPath)
  const newPath = path.join(paths.execPlansCompletedDir, fileName)

  // Will throw ENOENT if activePlanPath was already moved (idempotent guard)
  const raw = await fs.readFile(activePlanPath, 'utf-8')

  const today = new Date().toISOString().slice(0, 10)

  // 2026-05-12 (Luiz/dev): update status: active -> completed
  let updated = raw.replace(/^(status:\s*)active\s*$/m, `$1completed`)

  // 2026-05-12 (Luiz/dev): add completedAt if not already present (idempotent)
  updated = updated.replace(/^(---\n[\s\S]*?)(---\n)/m, (full, fm, closing) => {
    if (fm.includes('completedAt:')) return full
    return `${fm}completedAt: ${today}\n${closing}`
  })

  // G2 (cross-platform): sequential awaits — handles closed before unlink
  await fs.writeFile(newPath, updated, 'utf-8')
  await fs.unlink(activePlanPath)

  return { newPath }
}

export async function listActivePlans(projectRoot: string): Promise<string[]> {
  const paths = await resolvePaths(projectRoot)
  try {
    const entries = await fs.readdir(paths.execPlansActiveDir)
    return entries
      .filter((e) => e.endsWith('.md') && e !== 'README.md')
      .map((e) => path.join(paths.execPlansActiveDir, e))
  } catch {
    // active/ directory does not exist — return empty (new project, no plans yet)
    return []
  }
}
