import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
// 2026-05-16 (Luiz/dev): AST real via @typescript-eslint/parser substitui regex line-by-line.
// Cumpre RF-MH-01 do PRD v6.3.1 (CA-01 + CA-02). Enum CapabilitySource permanece 'ast' | 'llm'
// — D1 do PRD / D4 do ADR-0020 intacto. Auditores downstream confiam em source === 'ast'.
// 2026-09-05 (Luiz/dev): o import era ESTATICO e derrubava o modulo inteiro no load quando o
// parser nao resolve — o que acontece rodando do cache do plugin, que nao tem node_modules
// (@typescript-eslint/parser e devDependency). Nao era degradacao: era crash antes de qualquer
// catch. Agora e `await import()` com fallback VISIVEL. Ver ADR/PRD route-auth-matrix GT-fase04-1.
import type { TSESTree } from '@typescript-eslint/types'

export type CapabilitySource = 'ast' | 'llm'

export type Capability = {
  kind: 'route'
  method: string
  path: string
  handler: string
  owner_path: string
  confidence: number
  source: CapabilitySource
}

export type CapabilitiesOutput = {
  capabilities: Capability[]
  coverage_gaps: string[]
  generated_at: string
  profile_at_generation: string
  schema_version: '1.0'
}

async function findRouteFiles(appDir: string): Promise<string[]> {
  const results: string[] = []
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name === 'route.ts' || entry.name === 'route.tsx') results.push(full)
    }
  }
  await walk(appDir).catch(() => {})
  return results
}

const HTTP_VERBS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])

export type ParseFn = (code: string, options: Record<string, unknown>) => TSESTree.Program

/** Carrega o parser sob demanda. `null` = indisponivel — nunca lanca. */
export type ParserLoader = () => Promise<ParseFn | null>

function hasParse(mod: unknown): mod is { parse: ParseFn } {
  return typeof mod === 'object' && mod !== null && typeof (mod as { parse?: unknown }).parse === 'function'
}

/**
 * Loader default: `await import()` do `@typescript-eslint/parser`.
 *
 * Devolve `null` em vez de lancar quando o pacote nao resolve — e o caso real rodando do cache do
 * plugin, que tem `package.json` mas nao tem `node_modules`, e onde o peer `typescript` do parser
 * tambem nao resolve. Quem chama transforma `null` em `coverage_gaps`, nunca em silencio.
 */
export const defaultParserLoader: ParserLoader = async () => {
  try {
    const mod: unknown = await import('@typescript-eslint/parser')
    return hasParse(mod) ? mod.parse : null
  } catch {
    return null
  }
}

/** Resultado explicito: vazio por AUSENCIA de verbo e coisa diferente de vazio por falha de parse. */
type ExtractResult =
  | { ok: true; methods: Array<{ method: string; line: number }> }
  | { ok: false; reason: string }

function extractMethods(content: string, filePath: string, parse: ParseFn): ExtractResult {
  const found: Array<{ method: string; line: number }> = []
  const isJsx = filePath.endsWith('.tsx')
  let ast: TSESTree.Program
  try {
    ast = parse(content, {
      loc: true,
      range: true, // 2026-05-16 (Luiz/dev): scope-manager requires range:true in Bun — crashes with range:false (BUG-1)
      ecmaVersion: 2022,
      sourceType: 'module',
      jsx: isJsx,
    })
  } catch (error) {
    // 2026-09-05 (Luiz/dev): antes devolvia [] e o caller registrava "no HTTP method exports found"
    // — culpando o ARQUIVO por uma falha da FERRAMENTA. O motivo real agora sobe.
    return { ok: false, reason: `parse falhou: ${error instanceof Error ? error.message : String(error)}` }
  }

  for (const node of ast.body) {
    if (node.type !== 'ExportNamedDeclaration' || node.declaration === null) continue
    const decl = node.declaration

    // case: export function GET() {} | export async function GET() {}
    if (decl.type === 'FunctionDeclaration' && decl.id !== null) {
      const name = decl.id.name
      if (HTTP_VERBS.has(name)) {
        found.push({ method: name, line: decl.loc.start.line })
      }
      continue
    }

    // case: export const GET = async () => {} | export const GET = function () {}
    if (decl.type === 'VariableDeclaration') {
      for (const declarator of decl.declarations) {
        if (declarator.id.type !== 'Identifier') continue
        const name = (declarator.id as TSESTree.Identifier).name
        if (!HTTP_VERBS.has(name)) continue
        const init = declarator.init
        if (init === null || init === undefined) continue
        if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') continue
        found.push({ method: name, line: declarator.loc.start.line })
      }
    }
  }

  return { ok: true, methods: found }
}

function toApiPath(relPath: string): string {
  const noApp = relPath.replace(/^app\//, '')
  const noRoute = noApp.replace(/\/route\.tsx?$/, '')
  return '/' + noRoute
}

async function findMvcRouteFiles(routesDir: string): Promise<string[]> {
  const results: string[] = []
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) results.push(full)
    }
  }
  await walk(routesDir).catch(() => {})
  return results
}

function extractMvcRoutes(content: string): Array<{ method: string; path: string }> {
  const found: Array<{ method: string; path: string }> = []
  const lines = content.split('\n')
  for (const line of lines) {
    if (line === undefined) continue
    const match = line.match(/router\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/)
    if (match?.[1] !== undefined && match[2] !== undefined) {
      found.push({ method: match[1].toUpperCase(), path: match[2] })
    }
  }
  return found
}

async function findRoutesDir(projectRoot: string): Promise<string | null> {
  const candidates = [
    path.join(projectRoot, 'routes'),
    path.join(projectRoot, 'src', 'routes'),
    path.join(projectRoot, 'app', 'routes'),
  ]
  for (const candidate of candidates) {
    const entries = await readdir(candidate).catch(() => null)
    if (entries !== null) return candidate
  }
  return null
}

export async function discoverMvcFlatCapabilities(
  projectRoot: string
): Promise<CapabilitiesOutput> {
  const routesDir = await findRoutesDir(projectRoot)

  if (routesDir === null) {
    return {
      capabilities: [],
      coverage_gaps: ['mvc-flat discovery skipped — no routes folder found'],
      generated_at: new Date().toISOString(),
      profile_at_generation: 'mvc-flat',
      schema_version: '1.0',
    }
  }

  const files = await findMvcRouteFiles(routesDir)
  const capabilities: Capability[] = []

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8').catch(() => null)
    if (content === null) continue
    const routes = extractMvcRoutes(content)
    const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/')
    const ownerPath = path.dirname(relPath).replace(/\\/g, '/') + '/'
    for (const { method, path: routePath } of routes) {
      capabilities.push({
        kind: 'route',
        method,
        path: routePath,
        handler: relPath,
        owner_path: ownerPath,
        confidence: 0.7,
        source: 'llm',
      })
    }
  }

  return {
    capabilities,
    coverage_gaps: [],
    generated_at: new Date().toISOString(),
    profile_at_generation: 'mvc-flat',
    schema_version: '1.0',
  }
}

export async function discoverCapabilities(
  projectRoot: string,
  profile: string,
  opts: { loadParser?: ParserLoader } = {}
): Promise<CapabilitiesOutput> {
  switch (profile) {
    case 'nextjs-app-router':
      return discoverNextjsAppRouterCapabilities(projectRoot, opts)
    case 'mvc-flat':
      return discoverMvcFlatCapabilities(projectRoot)
    default:
      return {
        capabilities: [],
        coverage_gaps: [`profile '${profile}' not supported — no discovery strategy available`],
        generated_at: new Date().toISOString(),
        profile_at_generation: profile,
        schema_version: '1.0',
      }
  }
}

export async function discoverNextjsAppRouterCapabilities(
  projectRoot: string,
  opts: { loadParser?: ParserLoader } = {}
): Promise<CapabilitiesOutput> {
  const appDir = path.join(projectRoot, 'app')
  const routeFiles = await findRouteFiles(appDir)

  if (routeFiles.length === 0) {
    return {
      capabilities: [],
      coverage_gaps: ['app/ folder not found or empty — no routes discovered'],
      generated_at: new Date().toISOString(),
      profile_at_generation: 'nextjs-app-router',
      schema_version: '1.0',
    }
  }

  const capabilities: Capability[] = []
  const coverage_gaps: string[] = []

  const parse = await (opts.loadParser ?? defaultParserLoader)()
  if (parse === null) {
    // Parser indisponivel: NAO da para afirmar `source: 'ast'`, e auditores downstream confiam
    // nesse rotulo. Entao nao devolvemos capability nenhuma — devolvemos a razao. Silencio aqui
    // viraria "projeto sem rotas", que e uma mentira sobre o projeto.
    return {
      capabilities: [],
      coverage_gaps: [
        `@typescript-eslint/parser indisponivel — nenhuma rota pode ser derivada por AST. ` +
          `${routeFiles.length} arquivo(s) de rota ficaram sem analise.`,
      ],
      generated_at: new Date().toISOString(),
      profile_at_generation: 'nextjs-app-router',
      schema_version: '1.0',
    }
  }

  for (const filePath of routeFiles) {
    const content = await readFile(filePath, 'utf-8').catch(() => null)
    if (content === null) {
      const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/')
      coverage_gaps.push(`${relPath} — read failed`)
      continue
    }
    const extracted = extractMethods(content, filePath, parse)
    const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/')
    if (!extracted.ok) {
      coverage_gaps.push(`${relPath} — ${extracted.reason}`)
      continue
    }
    const methods = extracted.methods
    if (methods.length === 0) {
      coverage_gaps.push(`${relPath} — no HTTP method exports found`)
      continue
    }
    const apiPath = toApiPath(relPath)
    const ownerPath = path.dirname(relPath).replace(/\\/g, '/') + '/'
    for (const { method, line } of methods) {
      capabilities.push({
        kind: 'route',
        method,
        path: apiPath,
        handler: `${relPath}:${line}`,
        owner_path: ownerPath,
        confidence: 1.0,
        source: 'ast',
      })
    }
  }

  return {
    capabilities,
    coverage_gaps,
    generated_at: new Date().toISOString(),
    profile_at_generation: 'nextjs-app-router',
    schema_version: '1.0',
  }
}
