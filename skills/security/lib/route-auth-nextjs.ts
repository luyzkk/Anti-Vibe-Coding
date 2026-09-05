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

// ---------------------------------------------------------------------------
// Subset path-to-regexp v6 (o dialeto que o Next aceita no matcher) — DI-fase04-parser.
// Parser proprio de proposito: @typescript-eslint/parser nao resolve do cache do plugin
// (GT-fase04-1) e arrastar o TypeScript inteiro para runtime seria desproporcional.
// ---------------------------------------------------------------------------

const QUOTES = new Set(["'", '"', '`'])

/** Le do indice de um delimitador ate o par correspondente, pulando strings. `null` se desbalanceado. */
function readBalanced(source: string, start: number, open: string, close: string): { body: string; end: number } | null {
  let depth = 0
  let quote: string | null = null
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === undefined) break
    if (quote !== null) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (QUOTES.has(ch)) { quote = ch; continue }
    if (ch === '\\') { i += 1; continue }
    if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return { body: source.slice(start + 1, i), end: i + 1 }
    }
  }
  return null
}

/**
 * Converte uma entrada de `config.matcher` em RegExp ancorada, no subset path-to-regexp v6 que o
 * Next aceita. Devolve `null` quando a entrada sai do subset — quem chama trata como `opaque`,
 * e o motor entao diz `indeterminada`. Jamais `coberta` por semelhanca textual (PRD CA-06).
 */
export function matcherToRegExp(entry: string): RegExp | null {
  if (!entry.startsWith('/')) return null
  let out = '^'
  let i = 0

  while (i < entry.length) {
    if (entry[i] !== '/') return null
    i += 1
    if (i >= entry.length) break

    const ch = entry[i]
    if (ch === ':') {
      const named = /^:([A-Za-z_][A-Za-z0-9_]*)/.exec(entry.slice(i))
      if (named === null) return null
      i += named[0].length
      const modifier = entry[i]
      if (modifier === '(') {
        const group = readBalanced(entry, i, '(', ')')
        if (group === null) return null
        out += '/(' + group.body + ')'
        i = group.end
      } else if (modifier === '*') { out += '(?:/[^/]+)*'; i += 1 }
      else if (modifier === '+') { out += '(?:/[^/]+)+'; i += 1 }
      else if (modifier === '?') { out += '(?:/[^/]+)?'; i += 1 }
      else { out += '/([^/]+)' }
      continue
    }

    if (ch === '(') {
      const group = readBalanced(entry, i, '(', ')')
      if (group === null) return null
      out += '/(?:' + group.body + ')'
      i = group.end
      continue
    }

    let end = i
    while (end < entry.length && entry[end] !== '/') end += 1
    const literal = entry.slice(i, end)
    // Token do path-to-regexp que este subset nao cobre: melhor `null` que match errado.
    if (/[{}*+?]/.test(literal)) return null
    out += '/' + literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    i = end
  }

  // Barra final opcional: o Next casa `/` contra `/:path*`, e `/admin/` contra `/admin`.
  try {
    return new RegExp(out + '/?$')
  } catch {
    return null
  }
}

/**
 * Instancias concretas que a rota pode assumir. Segmento dinamico nao tem valor unico, entao a
 * cobertura so e afirmada quando TODAS as sondas casam — o resto e `partial`.
 */
export function probesFor(routePath: string): string[] {
  const segments = routePath.split('/').filter((s) => s.length > 0)
  let variants: string[][] = [[]]

  for (const segment of segments) {
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) {
      variants = variants.flatMap((v) => [v, [...v, '__dyn__'], [...v, '__dyn__', '__dyn__']])
    } else if (/^\[\.\.\..+\]$/.test(segment)) {
      variants = variants.flatMap((v) => [[...v, '__dyn__'], [...v, '__dyn__', '__dyn__']])
    } else if (/^\[.+\]$/.test(segment)) {
      variants = variants.map((v) => [...v, '__dyn__'])
    } else {
      variants = variants.map((v) => [...v, segment])
    }
  }

  return variants.map((v) => '/' + v.join('/'))
}

export type MatchOutcome = 'matches' | 'no-match' | 'partial'

/**
 * `matches` so quando TODA sonda casa. Padrao fora do subset vira `partial` — o adaptador nao
 * afirma match sobre o que nao consegue demonstrar; a decisao final e do motor (fase-05).
 */
export function matchRouteAgainstPattern(routePath: string, pattern: string): MatchOutcome {
  const regex = matcherToRegExp(pattern)
  if (regex === null) return 'partial'

  const probes = probesFor(routePath)
  if (probes.length === 0) return 'partial'

  const hits = probes.filter((probe) => regex.test(probe)).length
  if (hits === probes.length) return 'matches'
  if (hits === 0) return 'no-match'
  return 'partial'
}

/**
 * Extrai as regras de cobertura do texto de um `middleware.ts`. Funcao pura de proposito
 * (DI-fase04-fixtures-inline): parser testavel sem I/O.
 */
export function parseMatcherConfig(source: string, file: string): CoverageRule[] {
  const configMatch = /export\s+const\s+config\s*=/.exec(source)
  if (configMatch === null || configMatch.index === undefined) {
    // G13: sem `config`, o middleware roda em TODA rota. O proxy do PRD e cobertura total.
    const middlewareDecl = /export\s+(?:async\s+)?function\s+middleware\b/.exec(source)
    const line = middlewareDecl?.index === undefined ? 1 : lineOf(source, middlewareDecl.index)
    return [{ kind: 'path-pattern', pattern: '/:path*', file, line }]
  }

  const objectStart = source.indexOf('{', configMatch.index)
  const object = objectStart === -1 ? null : readBalanced(source, objectStart, '{', '}')
  if (object === null) {
    return [{ kind: 'opaque', reason: 'config nao e um objeto literal', file, line: lineOf(source, configMatch.index) }]
  }

  const matcherKey = /(^|[,{\s])matcher\s*:/.exec(object.body)
  if (matcherKey === null || matcherKey.index === undefined) {
    const line = lineOf(source, configMatch.index)
    return [{ kind: 'path-pattern', pattern: '/:path*', file, line }]
  }

  const valueStart = matcherKey.index + matcherKey[0].length
  const bodyOffset = objectStart + 1
  const rest = object.body.slice(valueStart)
  const trimmed = rest.replace(/^\s*/, '')
  const valueOffset = bodyOffset + valueStart + (rest.length - trimmed.length)
  const line = lineOf(source, valueOffset)
  const head = trimmed[0]

  if (head !== undefined && QUOTES.has(head)) {
    const closing = trimmed.indexOf(head, 1)
    if (closing === -1) return [{ kind: 'opaque', reason: 'string do matcher nao fecha', file, line }]
    return [{ kind: 'path-pattern', pattern: trimmed.slice(1, closing), file, line }]
  }

  if (head !== '[') {
    // Identificador, chamada de funcao, ternario, spread: cobertura ILEGIVEL, nao ausente.
    return [{ kind: 'opaque', reason: 'matcher computado — nao e literal', file, line }]
  }

  const array = readBalanced(trimmed, 0, '[', ']')
  if (array === null) return [{ kind: 'opaque', reason: 'array do matcher nao fecha', file, line }]

  const rules: CoverageRule[] = []
  for (const element of splitTopLevel(array.body)) {
    const value = element.trim()
    const first = value[0]
    if (first !== undefined && QUOTES.has(first)) {
      const closing = value.indexOf(first, 1)
      if (closing === -1) rules.push({ kind: 'opaque', reason: 'string do matcher nao fecha', file, line })
      else rules.push({ kind: 'path-pattern', pattern: value.slice(1, closing), file, line })
      continue
    }
    if (first === '{') {
      if (/(^|[,{\s])(has|missing)\s*:/.test(value)) {
        rules.push({ kind: 'opaque', reason: 'matcher condicional (has/missing) nao e cobertura demonstravel', file, line })
        continue
      }
      const sourceProp = /(^|[,{\s])source\s*:\s*(['"`])([^'"`]*)\2/.exec(value)
      const pattern = sourceProp?.[3]
      if (pattern === undefined) rules.push({ kind: 'opaque', reason: 'entrada de matcher sem `source` literal', file, line })
      else rules.push({ kind: 'path-pattern', pattern, file, line })
      continue
    }
    rules.push({ kind: 'opaque', reason: 'entrada de matcher nao literal', file, line })
  }

  return rules
}

/** Separa elementos de array/objeto por virgula de topo, ignorando aninhamento e strings. */
function splitTopLevel(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (ch === undefined) break
    if (quote !== null) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (QUOTES.has(ch)) { quote = ch; continue }
    if (ch === '[' || ch === '{' || ch === '(') depth += 1
    else if (ch === ']' || ch === '}' || ch === ')') depth -= 1
    else if (ch === ',' && depth === 0) { parts.push(body.slice(start, i)); start = i + 1 }
  }
  const tail = body.slice(start)
  if (tail.trim().length > 0) parts.push(tail)
  return parts
}

/** Leitura do matcher — ainda o regex da fase-02, sem mudanca de comportamento. */
export function readNextjsCoverage(targetDir: string): CoverageMap {
  const absolute = join(targetDir, MIDDLEWARE_FILE)
  if (!existsSync(absolute)) {
    return { stack: 'nextjs', rules: [], sources: [], notes: [`${MIDDLEWARE_FILE} nao encontrado na raiz do projeto`] }
  }

  const text = readFileSync(absolute, 'utf8')
  const rules = parseMatcherConfig(text, MIDDLEWARE_FILE)
  const notes: string[] = []

  // G13: sem matcher, o middleware roda em tudo. E um PROXY de cobertura, nao prova de que a auth
  // foi checada — o corpo do middleware pode nao autenticar nada. Fica visivel no relatorio.
  if (!/matcher\s*:/.test(text)) {
    notes.push('middleware.ts sem config.matcher — o middleware roda em toda rota; cobertura assumida por proxy')
  }

  return { stack: 'nextjs', rules, sources: [MIDDLEWARE_FILE], notes }
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
