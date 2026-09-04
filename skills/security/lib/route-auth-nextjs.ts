// 2026-09-04 (Luiz/dev): adaptador Next.js do contrato rota x cobertura — Plano 01 fase-03.
// Enumeracao fiel do App Router; a leitura do matcher continua o regex ingenuo da fase-02 (a
// fase-04 troca por AST). Regras oficiais: knowledge/nextjs/atoms/app-router-and-layouts.md.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { CoverageMap, CoverageRule, HttpMethod, Route, RouteAdapter } from './route-auth-matrix.types'
import { isHttpMethod } from './route-auth-matrix.types'

const ROUTE_FILES = new Set(['route.ts', 'route.tsx'])
const PAGE_FILES = new Set(['page.ts', 'page.tsx'])
const MIDDLEWARE_FILE = 'middleware.ts'

function toPosix(p: string): string {
  return p.split(sep).join('/')
}

/** Route group `(marketing)` ou parallel slot `@modal`: nao aparecem no path publico. */
function isNonPathSegment(segment: string): boolean {
  return /^\(.*\)$/.test(segment) || segment.startsWith('@')
}

/** Parallel route (`@slot`) ou intercepting (`(.)x`, `(..)x`, `(...)x`): o ARQUIVO sai da enumeracao. */
function isExcludedSegment(segment: string): boolean {
  return segment.startsWith('@') || /^\(\.{1,3}\)/.test(segment)
}

/** `app/(marketing)/pricing` -> `/pricing`; `app` (raiz) -> `/`. */
export function toPublicPath(relDirPosix: string): string {
  const kept = relDirPosix.split('/').filter((segment) => segment.length > 0 && !isNonPathSegment(segment))
  return '/' + kept.join('/')
}

// 2026-09-04 (Luiz/dev): peca ingenua desta fase (G6). Cobre `export function GET`,
// `export async function POST` e `export const PUT =`. NAO cobre `export { GET }` nem
// `export default` — silencio vira nota, nunca rota fantasma. A fase-04 avalia se o AST alcanca.
const EXPORT_VERB_RE =
  /^export\s+(?:async\s+)?(?:function|const|let)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/gm

function lineOf(source: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i += 1) if (source[i] === '\n') line += 1
  return line
}

export function extractExportedMethods(source: string): Array<{ method: HttpMethod; line: number }> {
  const found: Array<{ method: HttpMethod; line: number }> = []
  EXPORT_VERB_RE.lastIndex = 0
  for (const match of source.matchAll(EXPORT_VERB_RE)) {
    const verb = match[1]
    if (match.index === undefined || !isHttpMethod(verb)) continue
    found.push({ method: verb, line: lineOf(source, match.index) })
  }
  return found
}

/** Raiz do App Router: `app/` vence `src/app/` quando ambos existem (G14). */
function resolveAppRoot(targetDir: string): { root: string; rel: string; notes: string[] } | null {
  const notes: string[] = []
  const hasApp = existsSync(join(targetDir, 'app'))
  const hasSrcApp = existsSync(join(targetDir, 'src', 'app'))
  if (hasApp && hasSrcApp) notes.push('app/ e src/app/ coexistem — enumerando app/ e ignorando src/app/')
  if (hasApp) return { root: join(targetDir, 'app'), rel: 'app', notes }
  if (hasSrcApp) return { root: join(targetDir, 'src', 'app'), rel: 'src/app', notes }
  return null
}

export function enumerateNextjsRoutes(targetDir: string): { routes: Route[]; notes: string[] } {
  const resolved = resolveAppRoot(targetDir)
  if (resolved === null) return { routes: [], notes: ['nenhum diretorio app/ ou src/app/ encontrado'] }

  const { root, notes } = resolved
  const routes: Route[] = []

  const walk = (dir: string, segments: string[]): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        if (isExcludedSegment(name)) {
          notes.push(`${toPosix(relative(targetDir, full))}: parallel/intercepting route fora do escopo desta versao`)
          continue
        }
        walk(full, [...segments, name])
        continue
      }

      const isRouteFile = ROUTE_FILES.has(name)
      const isPageFile = PAGE_FILES.has(name)
      if (!isRouteFile && !isPageFile) continue

      const file = toPosix(relative(targetDir, full))
      const path = toPublicPath(segments.join('/'))
      const source = readFileSync(full, 'utf8')

      if (isPageFile) {
        const marker = source.match(/^export\s+default/m)
        routes.push({ method: 'GET', path, file, line: marker?.index === undefined ? 1 : lineOf(source, marker.index), stack: 'nextjs' })
        continue
      }

      const methods = extractExportedMethods(source)
      if (methods.length === 0) {
        notes.push(`${file}: nenhum verbo HTTP exportado reconhecido (re-export ou default nao sao lidos nesta versao)`)
        continue
      }
      for (const { method, line } of methods) routes.push({ method, path, file, line, stack: 'nextjs' })
    }
  }

  walk(root, [])

  // Saida deterministica: facilita golden no Plano 04 e diff no Plano 03.
  routes.sort((a, b) => (a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path)))
  return { routes, notes }
}

/** Leitura do matcher — ainda o regex da fase-02, sem mudanca de comportamento. */
export function readNextjsCoverage(targetDir: string): CoverageMap {
  const absolute = join(targetDir, MIDDLEWARE_FILE)
  if (!existsSync(absolute)) {
    return { stack: 'nextjs', rules: [], sources: [], notes: [`${MIDDLEWARE_FILE} nao encontrado na raiz do projeto`] }
  }

  const text = readFileSync(absolute, 'utf8')
  const literal = text.match(/matcher:\s*\[([^\]]*)\]/)?.[1]

  if (literal === undefined) {
    // Cobertura ILEGIVEL, nao ausente: `opaque` leva o motor a `indeterminada`, jamais a `coberta` (CA-06).
    return {
      stack: 'nextjs',
      rules: [{ kind: 'opaque', reason: 'config.matcher nao e um array literal', file: MIDDLEWARE_FILE, line: 1 }],
      sources: [MIDDLEWARE_FILE],
      notes: [],
    }
  }

  const rules: CoverageRule[] = []
  for (const entry of literal.matchAll(/['"`]([^'"`]+)['"`]/g)) {
    const pattern = entry[1]
    if (pattern !== undefined) rules.push({ kind: 'path-pattern', pattern, file: MIDDLEWARE_FILE, line: 1 })
  }

  return { stack: 'nextjs', rules, sources: [MIDDLEWARE_FILE], notes: [] }
}

export const nextjsAdapter: RouteAdapter = {
  stack: 'nextjs',
  enumerate(targetDir: string): Route[] {
    return enumerateNextjsRoutes(targetDir).routes
  },
  readCoverage(targetDir: string): CoverageMap {
    return readNextjsCoverage(targetDir)
  },
}
