// skills/security/lib/route-auth-rails.ts
// 2026-09-06 (Luiz/dev): adaptador Rails — PRD tabela "Rota vem de config/routes.rb; cobertura de
// before_action incluindo herdado de ApplicationController" (RF-01, D1, Premissa 2). Regex/linha por
// desenho (nao ha parser Ruby no repo); fidelidade menor vira `unresolved`, nunca rota inventada
// (RF-09). Fontes: Rails Guides "Routing from the Outside In"; knowledge/rails/atoms/action-controller-and-routing.md.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { CoverageMap, CoverageRule, HttpMethod, Route, RouteAdapter } from './route-auth-matrix.types'
import { HTTP_METHODS } from './route-auth-matrix.types'
import { authNameNotes, isAuthName, splitByAuthName } from './route-auth-heuristics'

const ROUTES_FILE = 'config/routes.rb'
const CONTROLLERS_DIR = 'app/controllers'

function toPosix(p: string): string {
  return p.split(sep).join('/')
}

function camelize(segment: string): string {
  return segment
    .split('_')
    .map((part) => {
      const first = part[0]
      return first === undefined ? part : first.toUpperCase() + part.slice(1)
    })
    .join('')
}

/** Subset de pluralizacao: `+ 's'` quando nao termina em `s` (guia SS2.5: controller e sempre plural). */
function pluralize(name: string): string {
  return name.endsWith('s') ? name : `${name}s`
}

function singularize(name: string): string {
  return name.endsWith('s') ? name.slice(0, -1) : name
}

/** `users` -> `UsersController`; `admin/users` -> `Admin::UsersController`. Sem inflexao alem de camelize. */
export function controllerNameFor(pathLike: string, modulePrefix: string): string {
  const camelized = pathLike
    .split('/')
    .filter((s) => s.length > 0)
    .map(camelize)
    .join('::')
  return `${modulePrefix}${camelized}Controller`
}

/** `[:index, :show]` ou `:index` -> `['index','show']`. */
function symbols(list: string): string[] {
  const trimmed = list.trim()
  const inner = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^:/, ''))
    .filter((s) => s.length > 0)
}

function unresolvedPath(text: string): string {
  const trimmed = text.trim().slice(0, 80)
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

// ---------------------------------------------------------------------------
// Regex do subset da DSL (Rails Guides "Routing from the Outside In")
// ---------------------------------------------------------------------------

// casa: `resources :posts, only: [:index, :show]`   |   nao casa: `resources "posts"` (string, fora do subset)
const RESOURCES_RE = /^\s*(resources|resource)\s+:([a-z0-9_]+)\s*(?:,\s*(.*?))?\s*(do)?\s*$/
// casa: `get "health", to: "health#show"`           |   nao casa: `get :preview` (forma de member/collection)
const VERB_RE = /^\s*(get|post|put|patch|delete|match)\s+(['"])([^'"]+)\2\s*(.*)$/
// casa: `post :publish` (dentro de member/collection ou com `on:`)
const SYMBOL_VERB_RE = /^\s*(get|post|put|patch|delete)\s+:([a-z0-9_]+)\s*(.*)$/
// casa: `to: "admin/users#index"` e `=> 'health#show'` | nao casa: `controller: 'x', action: 'y'` (-> unresolved)
const TO_RE = /(?:\bto:\s*|=>\s*)(['"])([a-z0-9_/]+)#([a-z0-9_]+)\1/
const ROOT_RE = /^\s*root\s+(?:to:\s*)?(['"])([a-z0-9_/]+)#([a-z0-9_]+)\1/
const NAMESPACE_RE = /^\s*namespace\s+:([a-z0-9_]+)\s+do\s*$/
const SCOPE_RE = /^\s*scope\s+(.+?)\s+do\s*$/
const BLOCK_RE = /^\s*(member|collection)\s+do\s*$/
const ONLY_RE = /\bonly:\s*(\[[^\]]*]|:[a-z0-9_]+)/
const EXCEPT_RE = /\bexcept:\s*(\[[^\]]*]|:[a-z0-9_]+)/
const VIA_RE = /\bvia:\s*(\[[^\]]*]|:[a-z]+)/
const ON_RE = /\bon:\s*:(member|collection)/
const OUT_OF_SUBSET_RE = /^\s*(mount|constraints|draw|concern|concerns|direct|resolve|redirect|devise_for|devise_scope|shallow)\b/
const END_RE = /^\s*end\s*$/
const DRAW_RE = /routes\.draw\s+do\s*$/

// Guia SS2.2 — as 7 acoes REST, 8 rotas (update = PATCH + PUT, G10). Hash map, nao switch.
const RESOURCE_ACTIONS: Readonly<Record<string, ReadonlyArray<{ method: HttpMethod; suffix: string }>>> = {
  index: [{ method: 'GET', suffix: '' }],
  new: [{ method: 'GET', suffix: '/new' }],
  create: [{ method: 'POST', suffix: '' }],
  show: [{ method: 'GET', suffix: '/:id' }],
  edit: [{ method: 'GET', suffix: '/:id/edit' }],
  update: [
    { method: 'PATCH', suffix: '/:id' },
    { method: 'PUT', suffix: '/:id' },
  ],
  destroy: [{ method: 'DELETE', suffix: '/:id' }],
}
// SS2.5 singular: sem `:id` (uma unica instancia por resource).
const SINGULAR_ACTIONS: Readonly<Record<string, ReadonlyArray<{ method: HttpMethod; suffix: string }>>> = {
  new: [{ method: 'GET', suffix: '/new' }],
  create: [{ method: 'POST', suffix: '' }],
  show: [{ method: 'GET', suffix: '' }],
  edit: [{ method: 'GET', suffix: '/edit' }],
  update: [
    { method: 'PATCH', suffix: '' },
    { method: 'PUT', suffix: '' },
  ],
  destroy: [{ method: 'DELETE', suffix: '' }],
}
const RESOURCE_ORDER = ['index', 'new', 'create', 'show', 'edit', 'update', 'destroy'] as const
const SINGULAR_SKIP = new Set(['index'])

type Frame =
  | { kind: 'draw'; path: string; module: string }
  | { kind: 'namespace' | 'scope'; path: string; module: string }
  | { kind: 'resources'; path: string; module: string; controller: string; idParam: string; line: number }
  | { kind: 'member' | 'collection'; path: string; module: string }
  | { kind: 'unresolved'; reason: string; path: string; module: string }

function top(stack: Frame[]): { path: string; module: string } {
  const frame = stack[stack.length - 1]
  return frame === undefined ? { path: '', module: '' } : { path: frame.path, module: frame.module }
}

function nearestResourcesController(stack: Frame[]): string | undefined {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const frame = stack[i]
    if (frame !== undefined && frame.kind === 'resources') return frame.controller
  }
  return undefined
}

function resourceActionsFor(optionsStr: string | undefined, singular: boolean): readonly string[] {
  const full = RESOURCE_ORDER.filter((a) => !(singular && SINGULAR_SKIP.has(a)))
  if (optionsStr === undefined) return full
  const onlyMatch = ONLY_RE.exec(optionsStr)
  if (onlyMatch !== null) {
    const val = onlyMatch[1]
    return val === undefined ? full : symbols(val)
  }
  const exceptMatch = EXCEPT_RE.exec(optionsStr)
  if (exceptMatch !== null) {
    const val = exceptMatch[1]
    const excluded = new Set(val === undefined ? [] : symbols(val))
    return full.filter((a) => !excluded.has(a))
  }
  return full
}

function emitResourceRoutes(
  actions: readonly string[],
  base: string,
  mod: string,
  name: string,
  singular: boolean,
  file: string,
  line: number,
): Route[] {
  const controller = controllerNameFor(pluralize(name), mod)
  const table = singular ? SINGULAR_ACTIONS : RESOURCE_ACTIONS
  const routes: Route[] = []
  for (const action of actions) {
    const entries = table[action]
    if (entries === undefined) continue
    for (const entry of entries) {
      routes.push({ method: entry.method, path: `${base}/${name}${entry.suffix}`, file, line, stack: 'rails', handler: `${controller}#${action}` })
    }
  }
  return routes
}

/** `path:`/`module:` ou string solta; qualquer outra chave -> `null` (bloco inteiro vira unresolved, G23). */
function parseScopeOptions(raw: string): { path: string; module: string } | null {
  let rest = raw
  let path = ''
  let mod = ''
  const pathMatch = /\bpath:\s*(['"])([^'"]*)\1/.exec(rest)
  if (pathMatch !== null) {
    const val = pathMatch[2]
    if (val !== undefined) path = val.startsWith('/') ? val : `/${val}`
    rest = rest.replace(pathMatch[0], '')
  }
  const moduleMatch = /\bmodule:\s*(['"])([^'"]*)\1/.exec(rest)
  if (moduleMatch !== null) {
    const val = moduleMatch[2]
    if (val !== undefined) mod = `${camelize(val)}::`
    rest = rest.replace(moduleMatch[0], '')
  }
  if (path === '' && mod === '') {
    const bareCandidate = rest.trim().replace(/^,|,$/g, '').trim()
    const bare = /^(['"])([^'"]*)\1$/.exec(bareCandidate)
    if (bare !== null) {
      const val = bare[2]
      if (val !== undefined) {
        path = val.startsWith('/') ? val : `/${val}`
        rest = ''
      }
    }
  }
  const leftover = rest.replace(/[,\s]/g, '')
  return leftover.length > 0 ? null : { path, module: mod }
}

export function parseRailsRoutes(source: string, file: string): { routes: Route[]; notes: string[] } {
  const routes: Route[] = []
  const notes: string[] = []
  const stack: Frame[] = []
  const lines = source.split('\n')

  for (let idx = 0; idx < lines.length; idx += 1) {
    const raw = lines[idx]
    if (raw === undefined) continue
    const lineNo = idx + 1
    const line = raw.trim()

    if (line.length === 0 || line.startsWith('#')) continue

    if (END_RE.test(line)) {
      stack.pop()
      continue
    }

    const currentTop = stack[stack.length - 1]
    if (currentTop !== undefined && currentTop.kind === 'unresolved') {
      // 2026-09-06 (Luiz/dev): G23 — bloco inteiro ja e UM unresolved (emitido ao entrar no frame);
      // conteudo interno e swallowed. So balanceamos `do`/`end` para nao perder a contagem de profundidade.
      if (/\bdo\s*$/.test(line)) stack.push({ kind: 'unresolved', reason: currentTop.reason, path: currentTop.path, module: currentTop.module })
      continue
    }

    if (DRAW_RE.test(line)) {
      stack.push({ kind: 'draw', path: '', module: '' })
      continue
    }

    const namespaceMatch = NAMESPACE_RE.exec(line)
    if (namespaceMatch !== null) {
      const name = namespaceMatch[1]
      if (name !== undefined) {
        const base = top(stack)
        stack.push({ kind: 'namespace', path: `${base.path}/${name}`, module: `${base.module}${camelize(name)}::` })
      }
      continue
    }

    const scopeMatch = SCOPE_RE.exec(line)
    if (scopeMatch !== null) {
      const optionsStr = scopeMatch[1]
      const parsed = optionsStr === undefined ? null : parseScopeOptions(optionsStr)
      if (parsed === null) {
        const base = top(stack)
        routes.push({ method: 'GET', path: unresolvedPath(line), file, line: lineNo, stack: 'rails', unresolved: `scope com chave fora do subset (path:/module:) — bloco inteiro vira unresolved: ${line}` })
        stack.push({ kind: 'unresolved', reason: 'scope fora do subset', path: base.path, module: base.module })
        continue
      }
      const base = top(stack)
      stack.push({ kind: 'scope', path: `${base.path}${parsed.path}`, module: `${base.module}${parsed.module}` })
      continue
    }

    const blockMatch = BLOCK_RE.exec(line)
    if (blockMatch !== null) {
      const kind = blockMatch[1]
      const resFrame = stack[stack.length - 1]
      const resPath = resFrame !== undefined && resFrame.kind === 'resources' ? resFrame.path : top(stack).path
      const mod = resFrame !== undefined ? resFrame.module : top(stack).module
      if (kind === 'member') stack.push({ kind: 'member', path: `${resPath}/:id`, module: mod })
      else stack.push({ kind: 'collection', path: resPath, module: mod })
      continue
    }

    const resourcesMatch = RESOURCES_RE.exec(line)
    if (resourcesMatch !== null) {
      const kindWord = resourcesMatch[1]
      const name = resourcesMatch[2]
      const optionsStr = resourcesMatch[3]
      const hasDo = resourcesMatch[4] === 'do'
      if (name !== undefined && kindWord !== undefined) {
        const singular = kindWord === 'resource'
        const parentTop = stack[stack.length - 1]
        const base = parentTop !== undefined && parentTop.kind === 'resources' ? `${parentTop.path}/:${parentTop.idParam}_id` : top(stack).path
        const mod = top(stack).module
        const actions = resourceActionsFor(optionsStr, singular)
        routes.push(...emitResourceRoutes(actions, base, mod, name, singular, file, lineNo))
        if (hasDo) {
          stack.push({
            kind: 'resources',
            path: `${base}/${name}`,
            module: mod,
            controller: controllerNameFor(pluralize(name), mod),
            idParam: singularize(name),
            line: lineNo,
          })
        }
      }
      continue
    }

    const rootMatch = ROOT_RE.exec(line)
    if (rootMatch !== null) {
      const ctrl = rootMatch[2]
      const action = rootMatch[3]
      if (ctrl !== undefined && action !== undefined) {
        const base = top(stack)
        const path = base.path === '' ? '/' : `${base.path}/`
        routes.push({ method: 'GET', path, file, line: lineNo, stack: 'rails', handler: `${controllerNameFor(ctrl, base.module)}#${action}` })
      }
      continue
    }

    const verbMatch = VERB_RE.exec(line)
    if (verbMatch !== null) {
      const verb = verbMatch[1]
      const literalPath = verbMatch[3]
      if (verb !== undefined && literalPath !== undefined) {
        if (verb === 'match') {
          const viaMatch = VIA_RE.exec(line)
          const toMatch = TO_RE.exec(line)
          if (viaMatch === null) {
            routes.push({ method: 'GET', path: unresolvedPath(literalPath), file, line: lineNo, stack: 'rails', unresolved: 'match sem via: — aceita todos os verbos (anti-pattern, atom action-controller-and-routing)' })
          } else if (toMatch === null || toMatch[2] === undefined || toMatch[3] === undefined) {
            routes.push({ method: 'GET', path: unresolvedPath(literalPath), file, line: lineNo, stack: 'rails', unresolved: 'match com via: mas sem to: literal' })
          } else {
            const base = top(stack)
            const viaVal = viaMatch[1]
            const methods = viaVal !== undefined && /:all/.test(viaVal) ? [...HTTP_METHODS] : (viaVal === undefined ? [] : symbols(viaVal).map((m) => m.toUpperCase()))
            const handler = `${controllerNameFor(toMatch[2], base.module)}#${toMatch[3]}`
            for (const m of methods) {
              if (isHttpMethodLike(m)) routes.push({ method: m, path: `${base.path}/${literalPath}`, file, line: lineNo, stack: 'rails', handler })
            }
          }
          continue
        }
        const method = verb.toUpperCase()
        const toMatch = TO_RE.exec(line)
        const base = top(stack)
        // G5/sem `as`: VERB_RE so casa get/post/put/patch/delete/match (ja tratado acima) — o guard
        // confirma o que a regex ja garante em vez de forcar o tipo.
        if (!isHttpMethodLike(method)) { continue }
        if (toMatch !== null && toMatch[2] !== undefined && toMatch[3] !== undefined) {
          routes.push({ method, path: `${base.path}/${literalPath}`, file, line: lineNo, stack: 'rails', handler: `${controllerNameFor(toMatch[2], base.module)}#${toMatch[3]}` })
        } else {
          const segments = literalPath.split('/').filter((s) => s.length > 0)
          const [ctrl, action] = segments
          if (segments.length === 2 && ctrl !== undefined && action !== undefined) {
            routes.push({ method, path: `${base.path}/${literalPath}`, file, line: lineNo, stack: 'rails', handler: `${controllerNameFor(ctrl, base.module)}#${action}` })
          } else {
            routes.push({ method: 'GET', path: unresolvedPath(literalPath), file, line: lineNo, stack: 'rails', unresolved: 'verbo sem to:' })
          }
        }
        continue
      }
    }

    const symbolVerbMatch = SYMBOL_VERB_RE.exec(line)
    if (symbolVerbMatch !== null) {
      const verbWord = symbolVerbMatch[1]
      const name = symbolVerbMatch[2]
      if (verbWord !== undefined && name !== undefined) {
        const method = verbWord.toUpperCase()
        const onMatch = ON_RE.exec(line)
        const parentTop = stack[stack.length - 1]
        let base: string
        if (onMatch !== null) {
          const resFrame = parentTop !== undefined && parentTop.kind === 'resources' ? parentTop : undefined
          const resPath = resFrame !== undefined ? resFrame.path : top(stack).path
          base = onMatch[1] === 'member' ? `${resPath}/:id` : resPath
        } else {
          // dentro de `member`/`collection` (BLOCK_RE ja empilhou o path certo) — G5: sem outro caso valido testado.
          base = top(stack).path
        }
        const controller = nearestResourcesController(stack)
        if (controller !== undefined && isHttpMethodLike(method)) {
          routes.push({ method, path: `${base}/${name}`, file, line: lineNo, stack: 'rails', handler: `${controller}#${name}` })
        }
      }
      continue
    }

    const outOfSubsetMatch = OUT_OF_SUBSET_RE.exec(line)
    if (outOfSubsetMatch !== null) {
      routes.push({ method: 'GET', path: unresolvedPath(line), file, line: lineNo, stack: 'rails', unresolved: `linha fora do subset da DSL: ${line}` })
      if (/\bdo\s*$/.test(line)) stack.push({ kind: 'unresolved', reason: 'fora do subset', path: top(stack).path, module: top(stack).module })
      continue
    }

    routes.push({ method: 'GET', path: unresolvedPath(line), file, line: lineNo, stack: 'rails', unresolved: `linha fora do subset da DSL: ${line}` })
  }

  // 2026-09-06 (Luiz/dev): DI-fase01-rails-1 — SEM sort por path aqui (diferente do Next). A ordem de
  // declaracao (== ordem de linha, pela varredura unica top-a-baixo) e o que o teste de `unresolved`
  // exige (match/mount/scope/devise_for na ordem em que aparecem no arquivo); quem precisa de ordem
  // por path/metodo (golden da fase-05) ordena na ponta de consumo, como os outros testes ja fazem.
  return { routes, notes }
}

function isHttpMethodLike(value: string): value is HttpMethod {
  return HTTP_METHODS.some((m) => m === value)
}

export function enumerateRailsRoutes(targetDir: string): { routes: Route[]; notes: string[] } {
  const absolute = join(targetDir, ROUTES_FILE)
  if (!existsSync(absolute)) return { routes: [], notes: [`${ROUTES_FILE} ausente — nenhuma rota Rails enumerada`] }
  return parseRailsRoutes(readFileSync(absolute, 'utf8'), ROUTES_FILE)
}

// ---------------------------------------------------------------------------
// Controllers — before_action com heranca (atom action-controller-and-routing)
// ---------------------------------------------------------------------------

export type FilterDecl = { kind: 'before' | 'skip'; names: string[]; only?: string[]; except?: string[]; conditional: boolean; line: number }
export type ControllerInfo = { name: string; parent: string; file: string; line: number; filters: FilterDecl[] }

const MODULE_RE = /^\s*module\s+([A-Z][A-Za-z0-9_]*)\s*$/
const CLASS_RE = /^\s*class\s+([A-Z][A-Za-z0-9_:]*)\s*<\s*(?:::)?([A-Z][A-Za-z0-9_:]*)/
// casa: `before_action :authenticate_user!, only: [:index]` e `before_action :a, :b`
const FILTER_RE = /^\s*(before_action|prepend_before_action|append_before_action|skip_before_action)\s+((?::[a-zA-Z0-9_!?]+\s*,?\s*)+)(.*)$/
const CONDITIONAL_RE = /\b(if|unless):|\bdo\b|\{|->|\blambda\b|\bproc\b/

function filterNames(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith(':'))
    .map((s) => s.slice(1))
}

/** `null` quando o arquivo nao declara `class X < Y`. Modulos aninhados antes da classe compoem o nome. */
export function parseRailsController(source: string, file: string): ControllerInfo | null {
  const lines = source.split('\n')
  const modules: string[] = []
  let name: string | null = null
  let parent: string | null = null
  let classLine = 0
  const filters: FilterDecl[] = []

  for (let idx = 0; idx < lines.length; idx += 1) {
    const raw = lines[idx]
    if (raw === undefined) continue
    const lineNo = idx + 1
    const line = raw.trim()
    if (line.length === 0 || line.startsWith('#')) continue

    if (name === null) {
      const moduleMatch = MODULE_RE.exec(line)
      if (moduleMatch !== null) {
        const modName = moduleMatch[1]
        if (modName !== undefined) modules.push(modName)
        continue
      }
      const classMatch = CLASS_RE.exec(line)
      if (classMatch !== null) {
        const declaredName = classMatch[1]
        const declaredParent = classMatch[2]
        if (declaredName !== undefined && declaredParent !== undefined) {
          // `class Admin::UsersController` ja vem qualificado; modulos abertos antes prefixam o resto.
          name = declaredName.includes('::') ? declaredName : [...modules, declaredName].join('::')
          parent = declaredParent
          classLine = lineNo
        }
        continue
      }
      continue
    }

    const filterMatch = FILTER_RE.exec(line)
    if (filterMatch !== null) {
      const kindWord = filterMatch[1]
      const namesRaw = filterMatch[2]
      const rest = filterMatch[3] ?? ''
      if (kindWord !== undefined && namesRaw !== undefined) {
        const kind = kindWord === 'skip_before_action' ? 'skip' : 'before'
        const onlyMatch = ONLY_RE.exec(rest)
        const exceptMatch = EXCEPT_RE.exec(rest)
        const only = onlyMatch?.[1] === undefined ? undefined : symbols(onlyMatch[1])
        const except = exceptMatch?.[1] === undefined ? undefined : symbols(exceptMatch[1])
        const conditional = CONDITIONAL_RE.test(rest)
        filters.push({
          kind,
          names: filterNames(namesRaw),
          ...(only !== undefined ? { only } : {}),
          ...(except !== undefined ? { except } : {}),
          conditional,
          line: lineNo,
        })
      }
    }
  }

  if (name === null || parent === null) return null
  return { name, parent, file, line: classLine, filters }
}

export type EffectiveFilter = { name: string; only?: string[]; except?: string[]; skippedFor: string[]; conditional: boolean; owner: string; file: string; line: number }
export type ChainResult =
  | { kind: 'resolved'; filters: EffectiveFilter[] }
  | { kind: 'missing'; name: string }
  | { kind: 'unknown-parent'; name: string; parent: string }

const BASE_CLASSES = new Set(['ActionController::Base', 'ActionController::API'])
const MAX_CHAIN_DEPTH = 10

/**
 * Semantica do ActiveSupport::Callbacks (guia "Action Controller Overview" SSFilters): pai primeiro;
 * `before_action` com o MESMO nome no filho REMOVE e re-adiciona com as novas opcoes (G22);
 * `skip_before_action` sem opcoes remove; com `only:` restringe (`skippedFor`); com `except:` -> conditional
 * (fora do subset — nao inventar a intersecao). Ciclo ou profundidade > 10 -> unknown-parent.
 */
export function resolveFilterChain(name: string, controllers: ReadonlyMap<string, ControllerInfo>, seen: Set<string> = new Set()): ChainResult {
  const info = controllers.get(name)
  if (info === undefined) return { kind: 'missing', name }
  if (seen.has(name)) return { kind: 'unknown-parent', name, parent: info.parent }
  if (seen.size >= MAX_CHAIN_DEPTH) return { kind: 'unknown-parent', name, parent: info.parent }
  const nextSeen = new Set(seen)
  nextSeen.add(name)

  let inherited: EffectiveFilter[] = []
  if (!BASE_CLASSES.has(info.parent)) {
    const parentResult = resolveFilterChain(info.parent, controllers, nextSeen)
    if (parentResult.kind !== 'resolved') return parentResult
    inherited = parentResult.filters
  }

  let filters = inherited
  for (const decl of info.filters) {
    if (decl.kind === 'skip') {
      if (decl.except !== undefined || decl.conditional) {
        // except: em skip nao e intersecao calculavel no subset — vira conditional (opaco), conservador.
        filters = filters.map((f) => (decl.names.includes(f.name) ? { ...f, conditional: true } : f))
        continue
      }
      if (decl.only !== undefined) {
        // `skip_before_action :x, only: [:show]` — pula SO para `show`; as demais acoes mantem o filtro.
        const only = decl.only
        filters = filters.map((f) => (decl.names.includes(f.name) ? { ...f, skippedFor: [...f.skippedFor, ...only] } : f))
        continue
      }
      filters = filters.filter((f) => !decl.names.includes(f.name))
      continue
    }
    // before/prepend/append: redeclaracao do MESMO nome SUBSTITUI a herdada (CallbackChain, G22).
    for (const declName of decl.names) {
      filters = filters.filter((f) => f.name !== declName)
      filters = [
        ...filters,
        {
          name: declName,
          ...(decl.only !== undefined ? { only: decl.only } : {}),
          ...(decl.except !== undefined ? { except: decl.except } : {}),
          skippedFor: [],
          conditional: decl.conditional,
          owner: name,
          file: info.file,
          line: decl.line,
        },
      ]
    }
  }

  return { kind: 'resolved', filters }
}

export function appliesTo(filter: EffectiveFilter, action: string): boolean {
  return (filter.only === undefined || filter.only.includes(action)) && !(filter.except?.includes(action) ?? false) && !filter.skippedFor.includes(action)
}

/** G26: mapa por SCAN de app/controllers/**\/*.rb, nao por inflexao do nome. */
function scanControllers(targetDir: string): { byName: Map<string, ControllerInfo>; files: string[] } {
  const root = join(targetDir, CONTROLLERS_DIR)
  const byName = new Map<string, ControllerInfo>()
  const files: string[] = []
  if (!existsSync(root)) return { byName, files }

  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (!name.endsWith('.rb')) continue
      const relFile = toPosix(relative(targetDir, full))
      files.push(relFile)
      const info = parseRailsController(readFileSync(full, 'utf8'), relFile)
      if (info !== null) byName.set(info.name, info)
    }
  }
  walk(root)
  files.sort()
  return { byName, files }
}

function describeScope(filter: EffectiveFilter): string {
  if (filter.only !== undefined) return `, only: [${filter.only.map((a) => `:${a}`).join(', ')}]`
  if (filter.except !== undefined) return `, except: [${filter.except.map((a) => `:${a}`).join(', ')}]`
  return ''
}

export function readRailsCoverage(targetDir: string): CoverageMap {
  const { routes } = enumerateRailsRoutes(targetDir)
  const { byName, files } = scanControllers(targetDir)
  const rules: CoverageRule[] = []
  const filterNamesSeen: string[] = []
  const notes: string[] = []

  // 2026-09-06 (Luiz/dev): DI-fase01-rails-2 — processa por HANDLER UNICO em ordem alfabetica, nao na
  // ordem de declaracao das rotas. `parseRailsRoutes` nao ordena por path (ver DI-fase01-rails-1); sem
  // este passo, `cov.rules` dependeria da ordem em que o adaptador ENCONTROU as rotas no arquivo, o
  // que nao e contrato nenhum. Alfabetico e deterministico e nao exige conhecer a ordem de arquivos.
  const byHandler = new Map<string, Route>()
  for (const route of routes) {
    if (route.unresolved !== undefined || route.handler === undefined) continue
    if (!byHandler.has(route.handler)) byHandler.set(route.handler, route)
  }

  for (const handler of [...byHandler.keys()].sort()) {
    const route = byHandler.get(handler)
    if (route === undefined) continue
    const [ctrl, action] = handler.split('#')
    if (ctrl === undefined || action === undefined) continue
    const chain = resolveFilterChain(ctrl, byName)
    if (chain.kind === 'missing') {
      rules.push({ kind: 'opaque', handler, reason: `controller ${chain.name} nao encontrado em ${CONTROLLERS_DIR}/`, file: route.file, line: route.line })
      continue
    }
    if (chain.kind === 'unknown-parent') {
      rules.push({ kind: 'opaque', handler, reason: `${chain.name} herda de ${chain.parent}, que nao foi encontrado — cadeia de filtros incompleta`, file: route.file, line: route.line })
      continue
    }
    const applicable = chain.filters.filter((f) => appliesTo(f, action))
    filterNamesSeen.push(...applicable.map((f) => f.name))
    const auth = applicable.filter((f) => isAuthName(f.name))
    const conditional = auth.find((f) => f.conditional)
    if (conditional !== undefined) {
      rules.push({ kind: 'opaque', handler, reason: `before_action :${conditional.name} condicional (if:/unless:/bloco) em ${conditional.file}:${conditional.line}`, file: conditional.file, line: conditional.line })
      continue
    }
    const first = auth[0]
    if (first === undefined) continue // DESCOBERTA: o motor decide; nada a emitir
    const inherited = first.owner !== ctrl ? ` (herdado de ${first.owner})` : ''
    rules.push({ kind: 'handler-chain', handler, file: first.file, line: first.line, via: `before_action :${first.name}${describeScope(first)}${inherited}` })
  }

  notes.push(...authNameNotes('filtros', splitByAuthName(filterNamesSeen)))
  return { stack: 'rails', rules, sources: [ROUTES_FILE, ...files], notes }
}

export const railsAdapter: RouteAdapter = {
  stack: 'rails',
  enumerate: (targetDir) => enumerateRailsRoutes(targetDir).routes,
  readCoverage: readRailsCoverage,
  // DP-9: sem isCoverageFile/readCoverageAtBase nesta versao — G2 sai not-applicable com nota.
}
