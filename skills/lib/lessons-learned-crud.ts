// 2026-05-12 (Luiz/dev): CRUD de compound notes — update + archive (CA-41, CA-42, D31)
// Fase-05 do Plano 05. Usa compoundDir derivado diretamente de projectRoot (DI-05-01).
// resolveCompoundFile e privado — slug aceita 'foo', '2026-05-12-foo', '2026-05-12-foo.md'
// GT-05-01: gray-matter parseia datas YAML (2026-05-12) como Date objects — normalizar antes de reescrever
import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'

export type UpdateOptions = {
  body?: string      // novo body markdown (substitui)
  title?: string     // novo title (frontmatter)
  category?: string
  tags?: string[]
}

/**
 * Resolve o path absoluto de uma compound note pelo slug.
 * Tenta match exato antes de procurar por sufixo pos-prefixo de data.
 *
 * @example
 * resolveCompoundFile('/project/docs/compound', 'foo')
 * // => '/project/docs/compound/2026-05-12-foo.md'
 */
function resolveCompoundFile(compoundDir: string, slug: string): string | null {
  if (!fs.existsSync(compoundDir)) return null
  const cleanSlug = slug.endsWith('.md') ? slug : slug + '.md'

  // Tentativa 1: match exato
  const direct = path.join(compoundDir, cleanSlug)
  if (fs.existsSync(direct)) return direct

  // Tentativa 2: sufixo apos data prefix
  const candidates = fs.readdirSync(compoundDir).filter(
    (f) => f.endsWith('.md') && f !== 'README.md' && (
      f === cleanSlug ||
      f.endsWith(`-${cleanSlug}`) ||
      f.replace(/^\d{4}-\d{2}-\d{2}-/, '') === cleanSlug
    )
  )

  if (candidates.length === 1) {
    const c = candidates[0]
    if (c !== undefined) return path.join(compoundDir, c)
  }
  if (candidates.length > 1) {
    throw new Error(`lessons-learned: slug "${slug}" ambiguo — bate em ${candidates.join(', ')}`)
  }
  return null
}

/**
 * Retorna a data atual no formato YYYY-MM-DD.
 */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Normaliza campos de data no frontmatter: converte Date objects para strings YYYY-MM-DD.
 * GT-05-01: gray-matter parseia `created: 2026-05-12` como Date — sem normalizacao,
 * matter.stringify reescreveria como ISO timestamp completo (2026-05-12T00:00:00.000Z).
 */
function normalizeDateFields(fm: Record<string, unknown>): Record<string, unknown> {
  const dateFields = ['created', 'updated', 'archived_at']
  const result: Record<string, unknown> = { ...fm }
  for (const field of dateFields) {
    const val = result[field]
    if (val instanceof Date) {
      result[field] = val.toISOString().slice(0, 10)
    }
  }
  return result
}

/**
 * Atualiza compound note. Preserva `created`, adiciona `updated: YYYY-MM-DD`.
 *
 * @param slug aceita: 'foo', '2026-05-12-foo', '2026-05-12-foo.md'
 * @returns path absoluto do arquivo atualizado
 *
 * @example
 * update('/projeto', 'foo', { body: 'novo conteudo', tags: ['producao'] })
 */
export function update(projectRoot: string, slug: string, opts: UpdateOptions): string {
  // 2026-05-12 (Luiz/dev): resolvePaths e async mas precisamos do compoundDir de forma sincrona.
  // Como o layout v6 requer docs/compound/ + docs/exec-plans/, derivamos o path diretamente.
  // DI-05-01: evitar await em funcao sincrona — compoundDir e determinista para layout v6.
  const compoundDir = path.join(projectRoot, 'docs', 'compound')

  const filePath = resolveCompoundFile(compoundDir, slug)
  if (filePath === null) {
    throw new Error(`lessons-learned: nao encontrei compound note para slug "${slug}"`)
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = matter(raw)

  // Preserva `created`, merge outros campos, adiciona `updated`
  // GT-05-01: normalizeDateFields converte Date objects de volta para strings YYYY-MM-DD
  const fmNew: Record<string, unknown> = normalizeDateFields({ ...parsed.data })

  if (opts.title !== undefined) fmNew['title'] = opts.title
  if (opts.category !== undefined) fmNew['category'] = opts.category
  if (opts.tags !== undefined) fmNew['tags'] = opts.tags

  // `created` nunca e sobrescrito — garantia CA-41
  fmNew['updated'] = todayISO()

  const newBody = opts.body !== undefined ? opts.body : parsed.content

  const rewritten = matter.stringify(newBody, fmNew)
  fs.writeFileSync(filePath, rewritten, 'utf-8')

  return filePath
}

/**
 * Soft delete: move compound note para docs/compound/_archived/.
 * Adiciona `archived_at: YYYY-MM-DD` ao frontmatter antes de mover.
 * Operacao atomica via fs.renameSync.
 *
 * @param slug aceita: 'foo', '2026-05-12-foo', '2026-05-12-foo.md'
 * @returns { from: string; to: string } paths antes e apos o move
 *
 * @example
 * archive('/projeto', 'foo')
 * // => { from: '/projeto/docs/compound/2026-05-12-foo.md', to: '/projeto/docs/compound/_archived/2026-05-12-foo.md' }
 */
export function archive(projectRoot: string, slug: string): { from: string; to: string } {
  const compoundDir = path.join(projectRoot, 'docs', 'compound')

  const filePath = resolveCompoundFile(compoundDir, slug)
  if (filePath === null) {
    throw new Error(`lessons-learned: nao encontrei compound note para slug "${slug}"`)
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = matter(raw)

  // Adiciona archived_at ao frontmatter
  // GT-05-01: normalizeDateFields converte Date objects de volta para strings YYYY-MM-DD
  const fmNew: Record<string, unknown> = normalizeDateFields({
    ...parsed.data,
    archived_at: todayISO(),
  })

  const rewritten = matter.stringify(parsed.content, fmNew)
  fs.writeFileSync(filePath, rewritten, 'utf-8')

  // Cria _archived/ se necessario
  const archivedDir = path.join(compoundDir, '_archived')
  if (!fs.existsSync(archivedDir)) {
    fs.mkdirSync(archivedDir, { recursive: true })
  }

  const fileName = path.basename(filePath)
  const targetPath = path.join(archivedDir, fileName)

  // Move atomico — fs.renameSync falha se destino ja existe (politica G6)
  fs.renameSync(filePath, targetPath)

  return { from: filePath, to: targetPath }
}
