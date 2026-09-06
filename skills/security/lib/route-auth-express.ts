// skills/security/lib/route-auth-express.ts
// 2026-09-06 (Luiz/dev): adaptador Express — PRD tabela "Rota vem de app.<verb>/router.<verb>;
// cobertura de app.use/router.use antes da rota na cadeia" (RF-01, D1, Premissa 3, CA-05).
// Regex/linha, parser proprio (DI-fase04-parser do Plano 01; GT-fase04-1: o AST nao resolve do cache).
// Fontes: Express 4.x API reference (app.METHOD, app.use, express.Router, app.route, app.all);
// Express 5 migration guide §"Path syntax changes" (G12).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { CoverageMap, CoverageRule, HttpMethod, Route, RouteAdapter } from './route-auth-matrix.types'
import { HTTP_METHODS, isRecord } from './route-auth-matrix.types'
import { authNameNotes, isAuthName, lineOf, readBalanced, splitByAuthName, splitTopLevel } from './route-auth-heuristics'

const ALL_METHODS: readonly HttpMethod[] = HTTP_METHODS // `all` = 7 (Express 4 API: "all HTTP request methods")

// Exemplos que casam / que NAO casam:
const APP_DECL_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[A-Za-z_$][\w$.<>]*)?\s*=\s*express\(\)/g
//   casa: `const app = express()`, `const app: express.Application = express()` | nao casa: `const app = createApp()`
const ROUTER_DECL_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[A-Za-z_$][\w$.<>]*)?\s*=\s*(?:express\.)?Router\(\)/g
//   casa: `const r = express.Router()`, `const s: Router = Router()` | nao casa: `const r = new Router()` (fora do subset)
const IMPORT_DEFAULT_RE = /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+(['"])(\.{1,2}\/[^'"]+)\2/gm
const REQUIRE_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*(['"])(\.{1,2}\/[^'"]+)\2\s*\)/g
//   so caminhos RELATIVOS: `import x from 'express'` nao entra no mapa
const CALL_RE = /\b([A-Za-z_$][\w$]*)\.(get|post|put|patch|delete|all|use|route)\s*\(/g
//   depois do match, `readBalanced(source, indiceDo'(', '(', ')')` le os argumentos; `splitTopLevel` separa
const CHAIN_RE = /^\s*\.(get|post|put|patch|delete|all)\s*\(/ // continuacao de app.route(...)
const LITERAL_RE = /^(['"])([^'"]*)\1$/
const TEMPLATE_RE = /^`([^`$]*)`$/ // template SEM ${} e literal
const NAME_RE = /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(?:\(|$)/ // identificador, dotted, ou chamada de fabrica
const OUT_OF_SUBSET_PATH_RE = /[*()?+]/ // G12
const REGEXP_LITERAL_RE = /^\/.*\/[gimsuy]*$/

const VERB_TO_METHOD: Readonly<Record<string, HttpMethod>> = { get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE' }

function methodsFor(verb: string): HttpMethod[] {
  if (verb === 'all') return [...ALL_METHODS]
  const method = VERB_TO_METHOD[verb]
  return method === undefined ? [] : [method]
}

export type RouteCall = { owner: string; method: HttpMethod; path: string; middlewares: string[]; inlineMiddlewares: number; line: number; unresolved?: string }
export type UseCall = { owner: string; path: string | null; names: string[]; inline: number; line: number }
export type ExpressFile = { file: string; apps: string[]; routers: string[]; imports: Map<string, string>; routes: RouteCall[]; uses: UseCall[]; notes: string[] }

function toPosix(p: string): string {
  return p.split(sep).join('/')
}

function unresolvedPath(text: string): string {
  const trimmed = text.trim()
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function namesFromArgs(args: string[]): { middlewares: string[]; inline: number } {
  const middlewares: string[] = []
  let inline = 0
  for (const raw of args) {
    const trimmed = raw.trim()
    if (trimmed.length === 0) continue
    const match = NAME_RE.exec(trimmed)
    const dotted = match?.[1]
    if (dotted === undefined) {
      inline += 1
      continue
    }
    const segments = dotted.split('.')
    const last = segments[segments.length - 1]
    middlewares.push(last === undefined ? dotted : last)
  }
  return { middlewares, inline }
}

// PRD CA-05 / G12 — path nao literal (variavel, concatenacao, template com ${}, array) ou fora do
// subset comum Express 4/5 (`*`, grupo regex, `?`, `+`) nunca vira path inventado: sai `unresolved`
// com o texto-fonte da expressao. Fonte: Express 5 migration guide §"Path syntax changes".
function resolvePathArg(raw: string): { path: string; unresolved?: string } {
  const trimmed = raw.trim()
  const first = trimmed[0]

  if (first === '[') {
    return { path: unresolvedPath(trimmed), unresolved: 'array de paths fora do subset comum Express 4/5' }
  }

  if (REGEXP_LITERAL_RE.test(trimmed)) {
    return { path: unresolvedPath(trimmed), unresolved: `path RegExp fora do subset comum Express 4/5: ${trimmed}` }
  }

  const literal = LITERAL_RE.exec(trimmed)
  if (literal !== null) {
    const inner = literal[2] ?? ''
    const path = inner.startsWith('/') ? inner : `/${inner}`
    if (OUT_OF_SUBSET_PATH_RE.test(inner)) {
      return { path, unresolved: `sintaxe de path fora do subset comum Express 4/5: ${inner}` }
    }
    return { path }
  }

  const template = TEMPLATE_RE.exec(trimmed)
  if (template !== null) {
    const inner = template[1] ?? ''
    const path = inner.startsWith('/') ? inner : `/${inner}`
    if (OUT_OF_SUBSET_PATH_RE.test(inner)) {
      return { path, unresolved: `sintaxe de path fora do subset comum Express 4/5: ${inner}` }
    }
    return { path }
  }

  if (trimmed.length >= 2 && trimmed.startsWith('`') && trimmed.endsWith('`')) {
    const inner = trimmed.slice(1, -1)
    const path = inner.startsWith('/') ? inner : `/${inner}`
    return { path, unresolved: 'path nao literal: template literal com ${}' }
  }

  return { path: unresolvedPath(trimmed), unresolved: `path nao literal: ${trimmed}` }
}

function parseUseCall(owner: string, args: string[], line: number): UseCall {
  const first = args[0]
  const firstTrimmed = first?.trim() ?? ''
  const literal = LITERAL_RE.exec(firstTrimmed)
  if (literal !== null && first !== undefined) {
    const inner = literal[2] ?? ''
    const path = inner.startsWith('/') ? inner : `/${inner}`
    const { middlewares, inline } = namesFromArgs(args.slice(1))
    return { owner, path, names: middlewares, inline, line }
  }
  const { middlewares, inline } = namesFromArgs(args)
  return { owner, path: null, names: middlewares, inline, line }
}

/** Puro. `file` POSIX relativo a raiz — vira `Route.file` e o `handler` `file:line`. */
export function parseExpressFile(source: string, file: string): ExpressFile {
  const apps: string[] = []
  for (const m of source.matchAll(APP_DECL_RE)) {
    const name = m[1]
    if (name !== undefined) apps.push(name)
  }
  const routers: string[] = []
  for (const m of source.matchAll(ROUTER_DECL_RE)) {
    const name = m[1]
    if (name !== undefined) routers.push(name)
  }

  const importMatches: Array<{ index: number; name: string; spec: string }> = []
  for (const m of source.matchAll(IMPORT_DEFAULT_RE)) {
    const name = m[1]
    const spec = m[3]
    if (name !== undefined && spec !== undefined && m.index !== undefined) importMatches.push({ index: m.index, name, spec })
  }
  for (const m of source.matchAll(REQUIRE_RE)) {
    const name = m[1]
    const spec = m[3]
    if (name !== undefined && spec !== undefined && m.index !== undefined) importMatches.push({ index: m.index, name, spec })
  }
  importMatches.sort((a, b) => a.index - b.index)
  const imports = new Map<string, string>()
  for (const entry of importMatches) imports.set(entry.name, entry.spec)

  const owners = new Set([...apps, ...routers])
  const routes: RouteCall[] = []
  const uses: UseCall[] = []
  const notes: string[] = []

  for (const match of source.matchAll(CALL_RE)) {
    const owner = match[1]
    const verb = match[2]
    if (owner === undefined || verb === undefined || match.index === undefined) continue
    if (!owners.has(owner)) continue

    const openParen = match.index + match[0].length - 1
    const balanced = readBalanced(source, openParen, '(', ')')
    if (balanced === null) continue
    const args = splitTopLevel(balanced.body)
    const line = lineOf(source, match.index)

    if (verb === 'use') {
      uses.push(parseUseCall(owner, args, line))
      continue
    }

    if (verb === 'route') {
      const first = args[0]
      if (first === undefined) continue
      const resolved = resolvePathArg(first)
      let pos = balanced.end
      for (;;) {
        const rest = source.slice(pos)
        const chainMatch = CHAIN_RE.exec(rest)
        if (chainMatch === null) break
        const chainVerb = chainMatch[1]
        if (chainVerb === undefined) break
        const openIdx = pos + chainMatch[0].length - 1
        const chainBalanced = readBalanced(source, openIdx, '(', ')')
        if (chainBalanced === null) break
        const chainArgs = splitTopLevel(chainBalanced.body)
        const { middlewares, inline } = namesFromArgs(chainArgs.slice(0, -1))
        for (const method of methodsFor(chainVerb)) {
          routes.push({
            owner,
            method,
            path: resolved.path,
            middlewares,
            inlineMiddlewares: inline,
            line,
            ...(resolved.unresolved !== undefined ? { unresolved: resolved.unresolved } : {}),
          })
        }
        pos = chainBalanced.end
      }
      continue
    }

    // verbo HTTP: get/post/put/patch/delete/all
    const first = args[0]
    if (first === undefined) continue
    const resolved = resolvePathArg(first)
    const { middlewares, inline } = namesFromArgs(args.slice(1, -1))
    for (const method of methodsFor(verb)) {
      routes.push({
        owner,
        method,
        path: resolved.path,
        middlewares,
        inlineMiddlewares: inline,
        line,
        ...(resolved.unresolved !== undefined ? { unresolved: resolved.unresolved } : {}),
      })
    }
  }

  return { file, apps, routers, imports, routes, uses, notes }
}

// ---------------------------------------------------------------------------
// analyzeExpress — montagem, ordem e cobertura
// ---------------------------------------------------------------------------

export type ExpressAnalysis = { routes: Route[]; coverage: CoverageMap; notes: string[] }

const RESOLVE_EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs'] as const

function dirnamePosix(file: string): string {
  const idx = file.lastIndexOf('/')
  return idx === -1 ? '' : file.slice(0, idx)
}

function posixJoin(baseDir: string, spec: string): string {
  const stack = baseDir === '' ? [] : baseDir.split('/')
  for (const part of spec.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      stack.pop()
      continue
    }
    stack.push(part)
  }
  return stack.join('/')
}

/** Resolucao de UM nivel (G13): `./routes/admin` → `.ts/.js/.mjs/.cjs`, `index.*`; `./routes/admin.mjs` direto. */
function resolveImport(fromFile: string, spec: string, known: ReadonlySet<string>): string | null {
  const base = posixJoin(dirnamePosix(fromFile), spec)
  if (known.has(base)) return base
  for (const ext of RESOLVE_EXTENSIONS) {
    if (known.has(base + ext)) return base + ext
  }
  for (const ext of RESOLVE_EXTENSIONS) {
    const indexed = `${base}/index${ext}`
    if (known.has(indexed)) return indexed
  }
  return null
}

function joinPaths(prefix: string, path: string): string {
  const combined = `${prefix}${path}`.replace(/\/{2,}/g, '/')
  if (combined === '') return '/'
  return combined.length > 1 && combined.endsWith('/') ? combined.slice(0, -1) : combined
}

type MountInfo = { targetFile: string; mountPath: string | null; mountLine: number; appFile: string; appOwner: string; nested: boolean }
type ResolvedCall = { call: RouteCall; file: string; path: string; unresolved?: string; mount?: MountInfo }

/**
 * Monta rotas (app direto + routers montados ate 1 nivel) e cobertura por ORDEM de linha (G13):
 * middleware de rota > `use` anterior na cadeia > `router.use` anterior > `use` antes da montagem.
 * `use` depois da rota nunca cobre — so vira nota (RF-05). DP-5a: so `handler-chain`, nunca `path-pattern`.
 */
export function analyzeExpress(sources: ReadonlyMap<string, string>): ExpressAnalysis {
  const parsed = new Map([...sources].map(([file, src]) => [file, parseExpressFile(src, file)] as const))
  const known = new Set(sources.keys())
  const notes: string[] = []

  const hasAnyApp = [...parsed.values()].some((pf) => pf.apps.length > 0)
  if (!hasAnyApp) notes.push('nenhum express() encontrado nos diretorios escaneados')

  const resolvedImports = new Map<string, Map<string, string | null>>()
  for (const [file, pf] of parsed) {
    const m = new Map<string, string | null>()
    for (const [varName, spec] of pf.imports) m.set(varName, resolveImport(file, spec, known))
    resolvedImports.set(file, m)
  }

  const isRouterFile = (file: string): boolean => (parsed.get(file)?.routers.length ?? 0) > 0
  const primaryRouterVar = (file: string): string | undefined => parsed.get(file)?.routers[0]

  function routerTargetFile(ownerFile: string, name: string): string | null {
    const pf = parsed.get(ownerFile)
    if (pf === undefined) return null
    if (pf.routers.includes(name)) return ownerFile
    const target = resolvedImports.get(ownerFile)?.get(name)
    if (target !== undefined && target !== null && isRouterFile(target)) return target
    return null
  }

  const mounts: MountInfo[] = []
  const mountUseKeys = new Set<string>()

  for (const [file, pf] of parsed) {
    for (const use of pf.uses) {
      if (use.names.length !== 1) continue
      const name = use.names[0]
      if (name === undefined) continue
      const targetFile = routerTargetFile(file, name)
      if (targetFile === null) continue
      mounts.push({ targetFile, mountPath: use.path, mountLine: use.line, appFile: file, appOwner: use.owner, nested: pf.routers.includes(use.owner) })
      mountUseKeys.add(`${file}:${use.line}`)
    }
  }

  const resolved: ResolvedCall[] = []

  for (const [file, pf] of parsed) {
    for (const call of pf.routes) {
      if (!pf.apps.includes(call.owner)) continue
      resolved.push({ call, file, path: call.path, ...(call.unresolved !== undefined ? { unresolved: call.unresolved } : {}) })
    }
  }

  const secondaryRouterNoted = new Set<string>()

  for (const [file, pf] of parsed) {
    const primary = primaryRouterVar(file)
    if (primary === undefined) continue
    const secondaryRouters = new Set(pf.routers.slice(1))
    const mount = mounts.find((m) => m.targetFile === file)
    for (const call of pf.routes) {
      // DP-2/RF-09: um segundo (ou terceiro...) Router() no mesmo arquivo nao tem como saber onde
      // foi montado — vira unresolved visivel em vez de sumir em silencio (defeito 1, fase-02 fix).
      if (secondaryRouters.has(call.owner)) {
        resolved.push({
          call,
          file,
          path: call.path,
          unresolved: `segundo Router() no mesmo modulo — nao da para saber onde \`${call.owner}\` foi montado`,
        })
        const noteKey = `${file}:${call.owner}`
        if (!secondaryRouterNoted.has(noteKey)) {
          secondaryRouterNoted.add(noteKey)
          notes.push(`${file}: router \`${call.owner}\` e o segundo Router() (ou posterior) do modulo — rotas dele ficam indeterminadas, ponto de montagem desconhecido`)
        }
        continue
      }
      if (call.owner !== primary) continue
      if (call.unresolved !== undefined) {
        resolved.push({ call, file, path: call.path, unresolved: call.unresolved })
        continue
      }
      if (mount === undefined) {
        resolved.push({ call, file, path: call.path, unresolved: `router \`${primary}\` em ${file} nao montado por app.use() em arquivo escaneado — prefixo desconhecido` })
        continue
      }
      if (mount.nested) {
        resolved.push({ call, file, path: call.path, unresolved: 'montagem aninhada de router (2 niveis) fora do subset' })
        continue
      }
      resolved.push({ call, file, path: joinPaths(mount.mountPath ?? '', call.path), mount })
    }
  }

  const routes: Route[] = resolved.map(({ call, file, path, unresolved }) => {
    const base: Route = { method: call.method, path, file, line: call.line, stack: 'node-ts', handler: `${file}:${call.line}` }
    return unresolved === undefined ? base : { ...base, unresolved }
  })

  const nonMountUses = (file: string): UseCall[] => (parsed.get(file)?.uses ?? []).filter((u) => !mountUseKeys.has(`${file}:${u.line}`))

  const rules: CoverageRule[] = []
  const usedNames: string[] = []

  for (const [file, pf] of parsed) {
    for (const call of pf.routes) usedNames.push(...call.middlewares)
    for (const use of pf.uses) {
      if (mountUseKeys.has(`${file}:${use.line}`)) continue
      usedNames.push(...use.names)
    }
  }

  const extraNotes: string[] = []

  for (const item of resolved) {
    if (item.unresolved !== undefined) continue
    const { call, file, path, mount } = item
    const handler = `${file}:${call.line}`

    // (a) middleware de rota com isAuthName — o mais especifico, checado primeiro.
    const routeAuth = call.middlewares.find(isAuthName)
    if (routeAuth !== undefined) {
      rules.push({ kind: 'handler-chain', handler, file, line: call.line, via: `middleware de rota ${routeAuth}` })
      continue
    }

    if (mount === undefined) {
      // (b) rota de app: use do mesmo owner, ANTES da rota, prefixo bate.
      const ownerUses = nonMountUses(file).filter((u) => u.owner === call.owner)
      const before = ownerUses.find((u) => u.line < call.line && (u.path === null || path.startsWith(u.path)) && u.names.some(isAuthName))
      const beforeName = before?.names.find(isAuthName)
      if (before !== undefined && beforeName !== undefined) {
        rules.push({ kind: 'handler-chain', handler, file, line: call.line, via: `app.use(${beforeName}) em ${file}:${before.line}, antes da rota` })
        continue
      }
      // (d) use DEPOIS da rota nao cobre — mas diz o que faltou (RF-05).
      const after = ownerUses.find((u) => u.line > call.line && u.names.some(isAuthName))
      const afterName = after?.names.find(isAuthName)
      if (after !== undefined && afterName !== undefined) {
        extraNotes.push(`app.use(${afterName}) em ${file}:${after.line} vem DEPOIS de ${call.method} ${path} (${file}:${call.line}) — nao cobre`)
      }
      continue
    }

    // (c) rota de router: router.use no arquivo do router ANTES da rota...
    const routerUses = nonMountUses(file).filter((u) => u.owner === call.owner)
    const beforeInRouter = routerUses.find((u) => u.line < call.line && u.names.some(isAuthName))
    const routerName = beforeInRouter?.names.find(isAuthName)
    if (beforeInRouter !== undefined && routerName !== undefined) {
      rules.push({ kind: 'handler-chain', handler, file, line: call.line, via: `router.use(${routerName}) em ${file}:${beforeInRouter.line}` })
      continue
    }
    // ...senao, app.use(auth) no arquivo do app ANTES da montagem do router, prefixo bate.
    const appUses = nonMountUses(mount.appFile).filter((u) => u.owner === mount.appOwner)
    const beforeMount = appUses.find(
      (u) => u.line < mount.mountLine && (u.path === null || (mount.mountPath ?? '').startsWith(u.path)) && u.names.some(isAuthName),
    )
    const mountName = beforeMount?.names.find(isAuthName)
    if (beforeMount !== undefined && mountName !== undefined) {
      rules.push({
        kind: 'handler-chain',
        handler,
        file,
        line: call.line,
        via: `app.use(${mountName}) em ${mount.appFile}:${beforeMount.line}, antes da montagem do router (${mount.appFile}:${mount.mountLine})`,
      })
    }
  }

  for (const [file, pf] of parsed) {
    for (const use of pf.uses) {
      if (mountUseKeys.has(`${file}:${use.line}`)) continue
      if (use.inline > 0) extraNotes.push(`${file}:${use.line}: app.use com middleware inline (nao nomeado) — fora do subset, nao conta`)
    }
  }

  notes.push(...extraNotes, ...authNameNotes('middlewares', splitByAuthName(usedNames)))

  const coverageSources = [...parsed.entries()]
    .filter(([, pf]) => pf.apps.length > 0 || pf.routers.length > 0)
    .map(([f]) => f)
    .sort()

  const coverage: CoverageMap = { stack: 'node-ts', rules, sources: coverageSources, notes }
  return { routes, coverage, notes }
}

// ---------------------------------------------------------------------------
// Disco, hasExpress e o adaptador
// ---------------------------------------------------------------------------

const SCAN_DIRS = ['src', 'app', 'routes', 'lib'] as const // recursivo
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'tests', 'test', 'coverage', '.git'])
const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/
const SKIP_FILE_RE = /\.(test|spec)\.|\.d\.ts$/

/** Raiz: so o primeiro nivel; SCAN_DIRS: recursivo. Tudo POSIX relativo a targetDir. */
function collectSources(targetDir: string): Map<string, string> {
  const result = new Map<string, string>()

  const addFile = (full: string, rel: string): void => {
    if (!SOURCE_RE.test(rel) || SKIP_FILE_RE.test(rel)) return
    result.set(toPosix(rel), readFileSync(full, 'utf8'))
  }

  const walk = (dir: string): void => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) {
      if (EXCLUDE_DIRS.has(name)) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      addFile(full, relative(targetDir, full))
    }
  }

  if (existsSync(targetDir)) {
    for (const name of readdirSync(targetDir)) {
      if (EXCLUDE_DIRS.has(name)) continue
      const full = join(targetDir, name)
      if (!statSync(full).isDirectory()) addFile(full, relative(targetDir, full))
    }
  }

  for (const dir of SCAN_DIRS) walk(join(targetDir, dir))

  return result
}

/** DP-12: `express` em dependencies ou devDependencies do package.json da RAIZ. Sem package.json → false. */
export function hasExpress(targetDir: string): boolean {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf8'))
    if (!isRecord(parsed)) return false
    const deps = parsed['dependencies']
    const devDeps = parsed['devDependencies']
    return (isRecord(deps) && 'express' in deps) || (isRecord(devDeps) && 'express' in devDeps)
  } catch {
    return false
  }
}

export function enumerateExpressRoutes(targetDir: string): ExpressAnalysis {
  return analyzeExpress(collectSources(targetDir))
}
export function readExpressCoverage(targetDir: string): CoverageMap {
  return enumerateExpressRoutes(targetDir).coverage
}

export const expressAdapter: RouteAdapter = {
  stack: 'node-ts',
  enumerate: (targetDir) => enumerateExpressRoutes(targetDir).routes,
  readCoverage: readExpressCoverage,
  // DP-9: sem G2 nesta versao. Nota: no Express o arquivo de rota E o de cobertura — mover um
  // `app.use(auth)` para baixo toca o arquivo da rota, entao o G1 ja reavalia as rotas dele.
}
