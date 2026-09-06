// skills/security/lib/route-auth-python.ts
// 2026-09-06 (Luiz/dev): adaptador Python — PRD tabela "Rota vem de urls.py (Django) ou decorator
// (FastAPI, Flask); cobertura de middleware do settings, Depends, decorator" (RF-01, D1). FastAPI e
// primeira classe (a matriz do repo e FastAPI-native); Django so enumera nesta versao (DP-6, RF-04).
// Fontes: knowledge/python/atoms/architecture-and-di-fastapi.md, security-fastapi-owasp.md;
// FastAPI docs "Bigger Applications"; Flask docs Quickstart/Blueprints; Flask-Login; Django "URL dispatcher".
//
// PARTE A (Plano 04 fase-03, dividida por orcamento de saida): dialeto FastAPI completo. Flask e
// Django ficam DECLARADOS (tipo PyDialect, parametro de parsePythonFile) mas MINIMOS — DIALECTS so
// tem entrada 'fastapi' (Partial, nao Record total: ver DI abaixo); parseDjangoUrls e Flask ganham
// TDD proprio na Parte B. Nenhum ramo some em silencio: dialeto sem DialectSpec devolve PyFile vazio
// com nota; 'django' detectado soma uma nota de projeto.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { CoverageMap, CoverageRule, HttpMethod, Route, RouteAdapter } from './route-auth-matrix.types'
import { authNameNotes, isAuthName, lineOf, readBalanced, splitByAuthName, splitTopLevel } from './route-auth-heuristics'

// ---------------------------------------------------------------------------
// Dialetos
// ---------------------------------------------------------------------------

export type PyDialect = 'fastapi' | 'flask' | 'django'

const DIALECT_RE: Readonly<Record<PyDialect, RegExp>> = {
  fastapi: /^\s*(?:from\s+fastapi\b|import\s+fastapi\b)/m,
  flask: /^\s*(?:from\s+flask\b|import\s+flask\b)/m,
  django: /^\s*(?:from\s+django\b|import\s+django\b)|\bROOT_URLCONF\b/m,
}
const DIALECT_ORDER: readonly PyDialect[] = ['fastapi', 'flask', 'django']
const NON_DJANGO_DIALECTS: readonly Exclude<PyDialect, 'django'>[] = ['fastapi', 'flask']

/** Uniao dos dialetos detectados em QUALQUER arquivo do projeto (deteccao e por import, nao por arquivo). */
export function detectPythonDialects(sources: ReadonlyMap<string, string>): Set<PyDialect> {
  const found = new Set<PyDialect>()
  for (const src of sources.values()) {
    for (const dialect of DIALECT_ORDER) {
      if (DIALECT_RE[dialect].test(src)) found.add(dialect)
    }
  }
  return found
}

function toPosix(p: string): string {
  return p.split(sep).join('/')
}

function dirnamePosix(file: string): string {
  const idx = file.lastIndexOf('/')
  return idx === -1 ? '' : file.slice(0, idx)
}

function stripSrcPrefix(dir: string): string {
  if (dir === 'src') return ''
  return dir.startsWith('src/') ? dir.slice(4) : dir
}

/** `app/routers/admin.py` -> `app.routers.admin`; `app/__init__.py` -> `app`; `src/x.py` -> `x`. */
export function moduleOf(file: string): string {
  const noExt = file.endsWith('.py') ? file.slice(0, -3) : file
  const stripped = stripSrcPrefix(noExt)
  const parts = stripped.split('/').filter((p) => p.length > 0)
  if (parts[parts.length - 1] === '__init__') parts.pop()
  return parts.join('.')
}

/** Pacote (diretorio dotted) que contem `file` — base dos imports relativos (`.`/`..`). */
function packageOf(file: string): string[] {
  const stripped = stripSrcPrefix(dirnamePosix(file))
  return stripped.length === 0 ? [] : stripped.split('/')
}

// ---------------------------------------------------------------------------
// Maquina generica de decorator+def por dialeto (CLAUDE.md: hash map, nao switch)
// ---------------------------------------------------------------------------

type DialectSpec = {
  appCtor: RegExp
  groupCtor: RegExp
  groupPrefixKw: string
  verbs: ReadonlySet<string>
  includeCall: RegExp
  includePrefixKw: string
  authDecorators: boolean
  globalMiddleware: RegExp[]
}

// 2026-09-06 (Luiz/dev): DI-fase03A-partial-dialects — Parte A so popula 'fastapi'. `Partial`, nao
// `Record<Exclude<PyDialect,'django'>, DialectSpec>` como o doc de planejamento sugeria: 'flask' fica
// DECLARADO no tipo PyDialect e no parametro de parsePythonFile, mas sem DialectSpec — e o sinal que
// parsePythonFile honra (nota, nunca crash, nunca comportamento Flask inventado sem teste). Parte B
// adiciona DIALECTS.flask com TDD proprio (Passo 2 Flask do doc da fase).
const DIALECTS: Readonly<Partial<Record<Exclude<PyDialect, 'django'>, DialectSpec>>> = {
  fastapi: {
    appCtor: /([A-Za-z_]\w*)\s*(?::\s*[\w.]+)?\s*=\s*FastAPI\(/g,
    groupCtor: /([A-Za-z_]\w*)\s*(?::\s*[\w.]+)?\s*=\s*APIRouter\(/g,
    groupPrefixKw: 'prefix',
    verbs: new Set(['get', 'post', 'put', 'patch', 'delete', 'api_route']),
    includeCall: /\.include_router\(/g,
    includePrefixKw: 'prefix',
    authDecorators: false,
    globalMiddleware: [/\.add_middleware\(\s*([A-Za-z_]\w*)/g, /^\s*@([A-Za-z_]\w*)\.middleware\(/gm],
  },
}

// 2026-09-06 (Luiz/dev): DI-fase03A-line-anchor — `^\s*` (como o doc de planejamento escreve) deixa o
// `^` ancorar numa linha EM BRANCO anterior, porque `\s` casa `\n`: `\s*` engole a linha em branco
// inteira e o `\n` dela antes de parar no `@`, e `m.index` fica na linha errada (RF-05 exige a linha
// certa). `[ \t]*` restringe a indentacao a espacos/tabs da MESMA linha; `^`/`m` continuam ancorando
// por linha.
const DECORATOR_RE = /^[ \t]*@([A-Za-z_]\w*)\.([a-z_]+)\s*\(/gm
//   casa: `@router.get(`, `@app.api_route(`, `@bp.route(` | nao casa: `@login_required` (sem owner)
const DEF_RE = /^[ \t]*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/m
const PLAIN_DECORATOR_RE = /^[ \t]*@([A-Za-z_][\w.]*)\s*(?:\(|$)/
//   `@login_required`, `@jwt_required()`, `@auth.login_required` — decorator sem dono (nao e rota)
const DEP_RE = /\b(?:Depends|Security)\(\s*([A-Za-z_][\w.]*)\s*[,)]/g
const PATH_LITERAL_RE = /^(?:path\s*=\s*)?(['"])([^'"]*)\1$/
//   casa: `"/users"`, `path="/k"` | nao casa: `f"{P}/x"`, `ROUTE`
const METHODS_KW_RE = /\bmethods\s*=\s*\[([^\]]*)\]/
const IMPORT_FROM_RE = /^\s*from\s+([.\w]+)\s+import\s+(.+)$/gm
const IMPORT_AS_RE = /^\s*import\s+([\w.]+)(?:\s+as\s+([A-Za-z_]\w*))?\s*$/gm
const RELATIVE_IMPORT_RE = /^(\.+)(.*)$/
const IMPORT_ALIAS_RE = /^([A-Za-z_]\w*)\s+as\s+([A-Za-z_]\w*)$/

function unresolvedPath(text: string): string {
  const trimmed = text.trim()
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function lastSegment(dotted: string): string {
  const segs = dotted.split('.')
  const last = segs[segs.length - 1]
  return last === undefined ? dotted : last
}

function resolvePathArg(raw: string): { path: string; unresolved?: string } {
  const trimmed = raw.trim()
  const literal = PATH_LITERAL_RE.exec(trimmed)
  if (literal !== null) {
    const inner = literal[2] ?? ''
    return { path: inner.startsWith('/') ? inner : `/${inner}` }
  }
  if (/^f['"]/.test(trimmed)) {
    return { path: unresolvedPath(trimmed), unresolved: `path nao literal: f-string: ${trimmed}` }
  }
  return { path: unresolvedPath(trimmed), unresolved: `path nao literal: variavel: ${trimmed}` }
}

function extractKwarg(args: readonly string[], kw: string): string | undefined {
  const prefix = `${kw}=`
  for (const raw of args) {
    const trimmed = raw.trim()
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length).trim()
  }
  return undefined
}

function extractDeps(raw: string | undefined): { deps: string[]; opaqueDeps?: string } {
  if (raw === undefined) return { deps: [] }
  const trimmed = raw.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const deps: string[] = []
    for (const m of trimmed.matchAll(DEP_RE)) {
      const name = m[1]
      if (name !== undefined) deps.push(lastSegment(name))
    }
    return { deps }
  }
  return { deps: [], opaqueDeps: trimmed }
}

/** Varre a partir de `fromIndex` (fim da chamada do decorator de rota) ate achar `def`, pulando
 *  decorators simples (PLAIN_DECORATOR_RE) e classificando cada um por isAuthName. Linha inesperada
 *  (comentario, blank) e ignorada em vez de abortar — nao inventa rota, mas tambem nao a perde por um
 *  comentario entre o decorator e o def. */
function skipToDef(source: string, fromIndex: number): { func: string; defLine: number; sigOpenIndex: number; authDecorators: string[]; ignoredDecorators: string[] } | null {
  let pos = fromIndex
  const authDecorators: string[] = []
  const ignoredDecorators: string[] = []
  for (;;) {
    const nlIdx = source.indexOf('\n', pos)
    const lineStart = pos
    const lineEnd = nlIdx === -1 ? source.length : nlIdx
    const lineText = source.slice(lineStart, lineEnd)

    const defMatch = DEF_RE.exec(lineText)
    if (defMatch !== null) {
      const func = defMatch[1]
      if (func === undefined) return null
      const sigOpenIndex = lineStart + defMatch.index + defMatch[0].length - 1
      return { func, defLine: lineOf(source, lineStart), sigOpenIndex, authDecorators, ignoredDecorators }
    }

    if (lineText.trim().length > 0) {
      const plain = PLAIN_DECORATOR_RE.exec(lineText)
      if (plain !== null) {
        const name = plain[1]
        if (name !== undefined) {
          if (isAuthName(name)) authDecorators.push(name)
          else ignoredDecorators.push(name)
        }
      }
    }

    if (nlIdx === -1) return null
    pos = nlIdx + 1
  }
}

// ---------------------------------------------------------------------------
// parsePythonFile
// ---------------------------------------------------------------------------

export type PyGroup = { prefix: string; dependencies: string[]; opaqueDeps?: string; line: number }
export type PyInclude = { target: string; prefix: string; dependencies: string[]; opaqueDeps?: string; line: number; owner: string }
// 2026-09-06 (Luiz/dev): DI-fase03A-pyroutedecl-shape — `PyRouteDecl` e `Route &` os campos de decl,
// nao so os campos de decl como o doc de planejamento listava. O Passo 2 do doc chama o MESMO `key()`
// tipado para `Route` diretamente sobre `PyFile.routes` (teste "api_route(methods=...)"); sem
// `file`/`stack`/`handler` aqui esse teste nem compilaria sob checagem estrutural nem produziria o
// texto esperado (`'GET /r app.main.r'` exige handler). `defLine` tambem foi acrescentado — falta no
// doc mas e exigido pelo texto do `via` de cobertura por assinatura ("na assinatura (<file>:<defLine>)").
export type PyRouteDecl = Route & {
  owner: string
  func: string
  defLine: number
  deps: string[]
  signatureDeps: string[]
  authDecorators: string[]
  ignoredDecorators: string[]
  opaqueDeps?: string
}
export type PyFile = {
  file: string
  module: string
  dialect: Exclude<PyDialect, 'django'>
  apps: string[]
  groups: Map<string, PyGroup>
  routes: PyRouteDecl[]
  includes: PyInclude[]
  imports: Map<string, string>
  middlewares: Array<{ name: string; line: number }>
  notes: string[]
}

function emptyPyFile(file: string, dialect: Exclude<PyDialect, 'django'>, notes: string[]): PyFile {
  return { file, module: moduleOf(file), dialect, apps: [], groups: new Map(), routes: [], includes: [], imports: new Map(), middlewares: [], notes }
}

function parseImports(source: string, file: string): Map<string, string> {
  const pkgParts = packageOf(file)
  const hits: Array<{ index: number; name: string; fullPath: string }> = []

  for (const m of source.matchAll(IMPORT_FROM_RE)) {
    const modSpec = m[1]
    const namesRaw = m[2]
    if (modSpec === undefined || namesRaw === undefined || m.index === undefined) continue
    const baseParts = resolveModuleSpec(modSpec, pkgParts)
    for (const rawName of namesRaw.split(',')) {
      const trimmed = rawName.trim()
      if (trimmed.length === 0) continue
      const aliasMatch = IMPORT_ALIAS_RE.exec(trimmed)
      const importedName = aliasMatch?.[1] ?? trimmed
      const localName = aliasMatch?.[2] ?? trimmed
      hits.push({ index: m.index, name: localName, fullPath: [...baseParts, importedName].join('.') })
    }
  }

  for (const m of source.matchAll(IMPORT_AS_RE)) {
    const modPath = m[1]
    if (modPath === undefined || m.index === undefined) continue
    hits.push({ index: m.index, name: m[2] ?? modPath, fullPath: modPath })
  }

  hits.sort((a, b) => a.index - b.index)
  const imports = new Map<string, string>()
  for (const hit of hits) imports.set(hit.name, hit.fullPath)
  return imports
}

/** `.`=pacote atual, `..`=pai do pacote atual, etc; sem ponto = absoluto (ignora o pacote de origem). */
function resolveModuleSpec(spec: string, packageParts: readonly string[]): string[] {
  const dotsMatch = RELATIVE_IMPORT_RE.exec(spec)
  if (dotsMatch === null) return spec.split('.').filter((p) => p.length > 0)
  const dots = dotsMatch[1] ?? ''
  const rest = dotsMatch[2] ?? ''
  const levelsUp = dots.length - 1
  const base = packageParts.slice(0, Math.max(0, packageParts.length - levelsUp))
  const restParts = rest.split('.').filter((p) => p.length > 0)
  return [...base, ...restParts]
}

/** Puro. Ve Passo 3 do doc da fase para o desenho completo (decorator+def, dependencies=, imports). */
export function parsePythonFile(source: string, file: string, dialect: Exclude<PyDialect, 'django'>): PyFile {
  const spec = DIALECTS[dialect]
  const module = moduleOf(file)
  if (spec === undefined) {
    return emptyPyFile(file, dialect, [`dialeto ${dialect} ainda nao implementado nesta fase (Plano 04 fase-03 Parte B)`])
  }

  const apps: string[] = []
  for (const m of source.matchAll(spec.appCtor)) {
    const name = m[1]
    if (name !== undefined) apps.push(name)
  }

  const groups = new Map<string, PyGroup>()
  for (const m of source.matchAll(spec.groupCtor)) {
    const name = m[1]
    if (name === undefined || m.index === undefined) continue
    const openParen = m.index + m[0].length - 1
    const balanced = readBalanced(source, openParen, '(', ')')
    if (balanced === null) continue
    const args = splitTopLevel(balanced.body)
    const prefixRaw = extractKwarg(args, spec.groupPrefixKw)
    const prefixLiteral = prefixRaw === undefined ? null : PATH_LITERAL_RE.exec(prefixRaw)
    const prefix = prefixLiteral?.[2] ?? ''
    const { deps, opaqueDeps } = extractDeps(extractKwarg(args, 'dependencies'))
    groups.set(name, { prefix, dependencies: deps, ...(opaqueDeps !== undefined ? { opaqueDeps } : {}), line: lineOf(source, m.index) })
  }

  const owners = new Set([...apps, ...groups.keys()])
  const routes: PyRouteDecl[] = []
  const notes: string[] = []
  const notedUnknownOwners = new Set<string>()

  for (const m of source.matchAll(DECORATOR_RE)) {
    const owner = m[1]
    const verb = m[2]
    if (owner === undefined || verb === undefined || m.index === undefined) continue
    if (!spec.verbs.has(verb)) continue
    if (!owners.has(owner)) {
      if (!notedUnknownOwners.has(owner)) {
        notedUnknownOwners.add(owner)
        notes.push(`owner ${owner} nao reconhecido como app/router`)
      }
      continue
    }

    const openParen = m.index + m[0].length - 1
    const balanced = readBalanced(source, openParen, '(', ')')
    if (balanced === null) continue
    const args = splitTopLevel(balanced.body)
    const line = lineOf(source, m.index)
    const found = skipToDef(source, balanced.end)
    if (found === null) continue
    const { func, defLine, sigOpenIndex, authDecorators, ignoredDecorators } = found

    let signatureDeps: string[] = []
    const sigBalanced = readBalanced(source, sigOpenIndex, '(', ')')
    if (sigBalanced !== null) {
      const found2: string[] = []
      for (const dm of sigBalanced.body.matchAll(DEP_RE)) {
        const name = dm[1]
        if (name !== undefined) found2.push(lastSegment(name))
      }
      signatureDeps = found2
    }

    const { deps, opaqueDeps } = extractDeps(extractKwarg(args, 'dependencies'))

    const emit = (method: HttpMethod, pathArg: string): void => {
      const resolved = resolvePathArg(pathArg)
      const decl: PyRouteDecl = {
        method,
        path: resolved.path,
        file,
        line,
        stack: 'python',
        handler: `${module}.${func}`,
        owner,
        func,
        defLine,
        deps,
        signatureDeps,
        authDecorators,
        ignoredDecorators,
        ...(opaqueDeps !== undefined ? { opaqueDeps } : {}),
        ...(resolved.unresolved !== undefined ? { unresolved: resolved.unresolved } : {}),
      }
      routes.push(decl)
    }

    if (verb === 'api_route') {
      const first = args[0]
      const methodsMatch = METHODS_KW_RE.exec(balanced.body)
      if (first === undefined || methodsMatch === null || methodsMatch[1] === undefined) {
        notes.push(`${file}:${line}: api_route sem methods=[...] literal — fora do subset, rota nao emitida`)
        continue
      }
      const methodNames = methodsMatch[1]
        .split(',')
        .map((m2) => m2.trim().replace(/^['"]|['"]$/g, '').toUpperCase())
        .filter((m2) => m2.length > 0)
      for (const methodName of methodNames) {
        if (isHttpMethodLike(methodName)) emit(methodName, first)
      }
      continue
    }

    const first = args[0]
    if (first === undefined) continue
    const method = verb.toUpperCase()
    if (isHttpMethodLike(method)) emit(method, first)
  }

  // ---- includes (app.include_router / futura register_blueprint do Flask) ----
  const includes: PyInclude[] = []
  const includeRe = new RegExp(`([A-Za-z_]\\w*)${spec.includeCall.source}`, 'g')
  for (const m of source.matchAll(includeRe)) {
    const owner = m[1]
    if (owner === undefined || m.index === undefined) continue
    const openParen = m.index + m[0].length - 1
    const balanced = readBalanced(source, openParen, '(', ')')
    if (balanced === null) continue
    const args = splitTopLevel(balanced.body)
    const target = (args[0] ?? '').trim()
    if (target.length === 0) continue
    const rest = args.slice(1)
    const prefixRaw = extractKwarg(rest, spec.includePrefixKw)
    const prefixLiteral = prefixRaw === undefined ? null : PATH_LITERAL_RE.exec(prefixRaw)
    const prefix = prefixLiteral?.[2] ?? ''
    const { deps, opaqueDeps } = extractDeps(extractKwarg(rest, 'dependencies'))
    includes.push({ target, prefix, dependencies: deps, ...(opaqueDeps !== undefined ? { opaqueDeps } : {}), line: lineOf(source, m.index), owner })
  }

  // ---- middleware global ----
  const middlewares: Array<{ name: string; line: number }> = []
  for (const re of spec.globalMiddleware) {
    for (const m of source.matchAll(re)) {
      const name = m[1]
      if (name === undefined || m.index === undefined) continue
      middlewares.push({ name, line: lineOf(source, m.index) })
    }
  }

  return { file, module, dialect, apps, groups, routes, includes, imports: parseImports(source, file), middlewares, notes }
}

function isHttpMethodLike(value: string): value is HttpMethod {
  return HTTP_METHODS.some((m) => m === value)
}

const HTTP_METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

// ---------------------------------------------------------------------------
// parseDjangoUrls — Parte B (declarado, minimo)
// ---------------------------------------------------------------------------

// 2026-09-06 (Luiz/dev): DI-fase03A-django-stub — Django fica fora do escopo testado da Parte A (sem
// TDD que exija o parser real ainda nao existe risco de logica nao verificada). `analyzePython` so
// deixa uma nota de projeto quando 'django' e detectado; ninguem chama `parseDjangoUrls` nesta parte.
// Parte B substitui por implementacao real com o Passo 2 (Django) do doc da fase.
export function parseDjangoUrls(_source: string, _file: string, _module: string): { routes: Route[]; includes: Array<{ prefix: string; module: string; line: number }>; notes: string[] } {
  return { routes: [], includes: [], notes: ['Django: enumeracao ainda nao implementada nesta fase (Plano 04 fase-03 Parte B)'] }
}

// ---------------------------------------------------------------------------
// analyzePython — resolucao de modulos, prefixos, cadeia de deps, cobertura
// ---------------------------------------------------------------------------

export type PythonAnalysis = { routes: Route[]; coverage: CoverageMap; notes: string[] }

function joinPaths(...parts: readonly string[]): string {
  const combined = parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join('')
    .replace(/\/{2,}/g, '/')
  if (combined === '') return '/'
  return combined.startsWith('/') ? combined : `/${combined}`
}

function cleanRoute(decl: PyRouteDecl): Route {
  return {
    method: decl.method,
    path: decl.path,
    file: decl.file,
    line: decl.line,
    stack: decl.stack,
    ...(decl.handler !== undefined ? { handler: decl.handler } : {}),
    ...(decl.unresolved !== undefined ? { unresolved: decl.unresolved } : {}),
  }
}

function groupKey(file: string, varName: string): string {
  return `${file}::${varName}`
}

type ResolvedGroupRef = { file: string; varName: string; group: PyGroup }

/** target `admin.router` (dotted, alias de MODULO) | `router` local | `users_router` (alias de VAR importada). */
function resolveGroupRef(target: string, fromFile: string, parsed: ReadonlyMap<string, PyFile>, moduleIndex: ReadonlyMap<string, string>): ResolvedGroupRef | null {
  const pf = parsed.get(fromFile)
  if (pf === undefined) return null
  const dotIdx = target.lastIndexOf('.')

  if (dotIdx === -1) {
    const local = pf.groups.get(target)
    if (local !== undefined) return { file: fromFile, varName: target, group: local }
    const dotted = pf.imports.get(target)
    if (dotted === undefined) return null
    const lastDot = dotted.lastIndexOf('.')
    if (lastDot === -1) return null
    const modulePath = dotted.slice(0, lastDot)
    const varName = dotted.slice(lastDot + 1)
    const targetFile = moduleIndex.get(modulePath)
    if (targetFile === undefined) return null
    const group = parsed.get(targetFile)?.groups.get(varName)
    return group === undefined ? null : { file: targetFile, varName, group }
  }

  const alias = target.slice(0, dotIdx)
  const varName = target.slice(dotIdx + 1)
  const modulePath = pf.imports.get(alias)
  if (modulePath === undefined) return null
  const targetFile = moduleIndex.get(modulePath)
  if (targetFile === undefined) return null
  const group = parsed.get(targetFile)?.groups.get(varName)
  return group === undefined ? null : { file: targetFile, varName, group }
}

type Inclusion = { kind: 'app'; include: PyInclude; fromFile: string } | { kind: 'nested' }

// 2026-09-06 (Luiz/dev): 'dependencias' e feminino plural em portugues ('contadas'/'ignoradas'); o
// helper compartilhado `authNameNotes` fixa 'contados' (funciona para 'filtros'/'middlewares', que sao
// masculinos). Reusa isAuthName/splitByAuthName (a CLASSIFICACAO, nao reimplementada) — so o template
// de texto deste label e local, para casar com o teste CA-08 (`dependencias contadas como auth: ...`).
function dependencyNotes(split: { auth: string[]; other: string[] }): string[] {
  const notes: string[] = []
  if (split.auth.length > 0) notes.push(`dependencias contadas como auth: ${split.auth.join(', ')}`)
  if (split.other.length > 0) notes.push(`dependencias ignoradas por nome: ${split.other.join(', ')}`)
  if (notes.length > 0) notes.push('heuristica de nome de auth e proxy: nome que casa e contado sem ler o corpo; nome que nao casa nao conta')
  return notes
}

export function analyzePython(sources: ReadonlyMap<string, string>): PythonAnalysis {
  const dialects = detectPythonDialects(sources)
  if (dialects.size === 0) {
    const notes = ['nenhum import de fastapi/flask/django encontrado']
    return { routes: [], coverage: { stack: 'python', rules: [], sources: [], notes }, notes }
  }

  const notes: string[] = []
  const parsed = new Map<string, PyFile>()
  for (const dialect of NON_DJANGO_DIALECTS) {
    if (!dialects.has(dialect)) continue
    for (const [file, src] of sources) {
      const pf = parsePythonFile(src, file, dialect)
      parsed.set(file, pf)
      notes.push(...pf.notes)
    }
  }
  if (dialects.has('django')) {
    notes.push('django: enumeracao ainda nao implementada nesta fase (Plano 04 fase-03 Parte B)')
  }

  const moduleIndex = new Map<string, string>()
  for (const [file, pf] of parsed) moduleIndex.set(pf.module, file)

  const inclusionByGroup = new Map<string, Inclusion>()
  for (const [file, pf] of parsed) {
    for (const inc of pf.includes) {
      const ref = resolveGroupRef(inc.target, file, parsed, moduleIndex)
      if (ref === null) {
        notes.push(`${file}:${inc.line}: include_router/register_blueprint('${inc.target}') — alvo nao resolvido (nem local nem import conhecido)`)
        continue
      }
      const key = groupKey(ref.file, ref.varName)
      const callerIsApp = pf.apps.includes(inc.owner)
      if (!callerIsApp) {
        inclusionByGroup.set(key, { kind: 'nested' })
        continue
      }
      if (inclusionByGroup.get(key)?.kind !== 'app') inclusionByGroup.set(key, { kind: 'app', include: inc, fromFile: file })
    }
  }

  for (const [file, pf] of parsed) {
    for (const varName of pf.groups.keys()) {
      const inclusion = inclusionByGroup.get(groupKey(file, varName))
      if (inclusion === undefined) {
        notes.push(`${file}: APIRouter/Blueprint \`${varName}\` nao incluido por app.include_router()/register_blueprint() em arquivo escaneado`)
      } else if (inclusion.kind === 'nested') {
        notes.push(`${file}: APIRouter/Blueprint \`${varName}\` incluido por outro grupo (nao por um app) — inclusao aninhada (2 niveis) fora do subset`)
      }
    }
  }

  const routes: Route[] = []
  const rules: CoverageRule[] = []
  const depNames: string[] = []
  const decoratorNames: string[] = []
  const middlewareNames: string[] = []

  for (const [file, pf] of parsed) {
    for (const decl of pf.routes) {
      decoratorNames.push(...decl.authDecorators, ...decl.ignoredDecorators)

      if (decl.unresolved !== undefined) {
        routes.push(cleanRoute(decl))
        continue
      }

      const isAppRoute = pf.apps.includes(decl.owner)
      const group = isAppRoute ? undefined : pf.groups.get(decl.owner)

      if (!isAppRoute && group === undefined) {
        routes.push({ ...cleanRoute(decl), unresolved: `owner ${decl.owner} nao reconhecido como app/router` })
        continue
      }

      const inclusion = isAppRoute ? undefined : inclusionByGroup.get(groupKey(file, decl.owner))

      if (!isAppRoute && group !== undefined && inclusion === undefined) {
        routes.push({ ...cleanRoute(decl), unresolved: `APIRouter/Blueprint \`${decl.owner}\` em ${file} nao incluido por app.include_router()/register_blueprint() em arquivo escaneado — prefixo desconhecido` })
        continue
      }
      if (!isAppRoute && inclusion?.kind === 'nested') {
        routes.push({ ...cleanRoute(decl), unresolved: 'inclusao aninhada (2 niveis) fora do subset' })
        continue
      }

      const finalPath = isAppRoute || group === undefined ? decl.path : joinPaths(inclusion?.kind === 'app' ? inclusion.include.prefix : '', group.prefix, decl.path)
      const route = { ...cleanRoute(decl), path: finalPath }
      routes.push(route)

      const handler = decl.handler
      if (handler === undefined) continue

      depNames.push(...decl.deps, ...decl.signatureDeps)
      if (group !== undefined) depNames.push(...group.dependencies)
      if (inclusion?.kind === 'app') depNames.push(...inclusion.include.dependencies)

      const opaqueSource =
        decl.opaqueDeps !== undefined
          ? { expr: decl.opaqueDeps, file: decl.file, line: decl.line }
          : group?.opaqueDeps !== undefined
            ? { expr: group.opaqueDeps, file, line: group.line }
            : inclusion?.kind === 'app' && inclusion.include.opaqueDeps !== undefined
              ? { expr: inclusion.include.opaqueDeps, file: inclusion.fromFile, line: inclusion.include.line }
              : null

      if (opaqueSource !== null) {
        rules.push({ kind: 'opaque', handler, reason: `dependencies nao literal: ${opaqueSource.expr} em ${opaqueSource.file}:${opaqueSource.line}`, file: opaqueSource.file, line: opaqueSource.line })
        continue
      }

      const sigAuth = decl.signatureDeps.find(isAuthName)
      if (sigAuth !== undefined) {
        rules.push({ kind: 'handler-chain', handler, file: decl.file, line: decl.line, via: `Depends(${sigAuth}) na assinatura (${decl.file}:${decl.defLine})` })
        continue
      }
      const declAuth = decl.deps.find(isAuthName)
      if (declAuth !== undefined) {
        rules.push({ kind: 'handler-chain', handler, file: decl.file, line: decl.line, via: `Depends(${declAuth}) no decorator (${decl.file}:${decl.line})` })
        continue
      }
      const specForDialect = DIALECTS[pf.dialect]
      if (specForDialect?.authDecorators === true) {
        const decoratorAuth = decl.authDecorators.find(isAuthName)
        if (decoratorAuth !== undefined) {
          rules.push({ kind: 'handler-chain', handler, file: decl.file, line: decl.line, via: `@${decoratorAuth} entre a rota e a funcao (${decl.file}:${decl.line})` })
          continue
        }
      }
      if (group !== undefined) {
        const groupAuth = group.dependencies.find(isAuthName)
        if (groupAuth !== undefined) {
          rules.push({ kind: 'handler-chain', handler, file, line: decl.line, via: `Depends(${groupAuth}) em APIRouter(dependencies=) (${file}:${group.line})` })
          continue
        }
      }
      if (inclusion?.kind === 'app') {
        const incAuth = inclusion.include.dependencies.find(isAuthName)
        if (incAuth !== undefined) {
          rules.push({ kind: 'handler-chain', handler, file: decl.file, line: decl.line, via: `Depends(${incAuth}) em include_router(dependencies=) (${inclusion.fromFile}:${inclusion.include.line})` })
        }
      }
    }
  }

  for (const [file, pf] of parsed) {
    for (const mw of pf.middlewares) {
      middlewareNames.push(mw.name)
      if (isAuthName(mw.name)) {
        rules.push({ kind: 'path-pattern', pattern: '/:path*', file, line: mw.line })
        notes.push(`${file}:${mw.line}: middleware ${mw.name} com nome de auth roda em toda rota — cobertura por proxy, nao prova que autentica`)
      }
    }
  }

  notes.push(...dependencyNotes(splitByAuthName(depNames)))
  notes.push(...authNameNotes('decorators', splitByAuthName(decoratorNames)))
  notes.push(...authNameNotes('middlewares', splitByAuthName(middlewareNames)))

  const coverageSources = [...parsed.entries()]
    .filter(([, pf]) => pf.apps.length > 0 || pf.groups.size > 0)
    .map(([f]) => f)
    .sort()

  const coverage: CoverageMap = { stack: 'python', rules, sources: coverageSources, notes }
  return { routes, coverage, notes }
}

// ---------------------------------------------------------------------------
// Disco e o adaptador
// ---------------------------------------------------------------------------

const EXCLUDE_DIRS = new Set(['.venv', 'venv', 'site-packages', '__pycache__', 'migrations', 'tests', 'node_modules', '.git'])
const SKIP_FILE_RE = /(^|\/)test_[^/]*\.py$|_test\.py$/

function collectSources(targetDir: string): Map<string, string> {
  const result = new Map<string, string>()

  const walk = (dir: string): void => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) {
      if (EXCLUDE_DIRS.has(name)) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (!name.endsWith('.py')) continue
      const rel = toPosix(relative(targetDir, full))
      if (SKIP_FILE_RE.test(rel)) continue
      result.set(rel, readFileSync(full, 'utf8'))
    }
  }

  walk(targetDir)
  return new Map([...result.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

export function enumeratePythonRoutes(targetDir: string): PythonAnalysis {
  return analyzePython(collectSources(targetDir))
}
export function readPythonCoverage(targetDir: string): CoverageMap {
  return enumeratePythonRoutes(targetDir).coverage
}

export const pythonAdapter: RouteAdapter = {
  stack: 'python',
  enumerate: (targetDir) => enumeratePythonRoutes(targetDir).routes,
  readCoverage: readPythonCoverage,
  // DP-9: sem G2 nesta versao (deps.py / dependencies= que perdem auth nao sao detectados como perda).
}
