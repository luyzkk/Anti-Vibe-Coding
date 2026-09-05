// 2026-09-05 (Luiz/dev): regressao do carregamento do parser.
//
// O import de `@typescript-eslint/parser` era ESTATICO. O pacote e devDependency, e o cache do
// plugin (`~/.claude/plugins/cache/local-plugins/anti-vibe-coding/<versao>/`) tem `package.json`
// mas NAO tem `node_modules` — rodando de la, o modulo inteiro falhava no load, antes de qualquer
// catch. O comentario dizia "degrada silenciosamente"; era crash.
//
// Estes testes travam as duas garantias: o modulo carrega sem o parser, e a ausencia dele vira
// razao VISIVEL em coverage_gaps — nunca "projeto sem rotas".
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  discoverNextjsAppRouterCapabilities,
  discoverCapabilities,
  defaultParserLoader,
} from '../capabilities-writer'

let projectRoot = ''

beforeAll(async () => {
  projectRoot = await mkdtemp(path.join(tmpdir(), 'caps-parser-'))
  const routeDir = path.join(projectRoot, 'app', 'api', 'orders')
  await mkdir(routeDir, { recursive: true })
  await writeFile(
    path.join(routeDir, 'route.ts'),
    'export async function GET() { return Response.json({}) }\nexport async function POST() { return Response.json({}) }\n',
    'utf-8',
  )
})

afterAll(async () => {
  if (projectRoot !== '') await rm(projectRoot, { recursive: true, force: true })
})

/** Simula o cache do plugin: o pacote nao resolve. */
const unavailable = async (): Promise<null> => null

describe('carregamento do parser', () => {
  it('reports the parser as the reason when it cannot be loaded, instead of claiming no routes', async () => {
    const out = await discoverNextjsAppRouterCapabilities(projectRoot, { loadParser: unavailable })

    expect(out.capabilities).toHaveLength(0)
    expect(out.coverage_gaps.join(' ')).toContain('@typescript-eslint/parser indisponivel')
    // A mentira que este teste existe para impedir: culpar o projeto por uma falha da ferramenta.
    expect(out.coverage_gaps.join(' ')).not.toContain('no HTTP method exports found')
    expect(out.coverage_gaps.join(' ')).not.toContain('app/ folder not found')
  })

  it('never labels a capability as source ast when the parser is unavailable', async () => {
    const out = await discoverNextjsAppRouterCapabilities(projectRoot, { loadParser: unavailable })
    // Auditores downstream confiam em `source === 'ast'` (linha 5 do modulo). Sem parser, nao ha
    // afirmacao a fazer — e melhor nenhuma capability que uma rotulada como AST sem AST.
    expect(out.capabilities.every((c) => c.source !== 'ast')).toBe(true)
  })

  it('says how many route files went unanalysed, so the gap is measurable', async () => {
    const out = await discoverNextjsAppRouterCapabilities(projectRoot, { loadParser: unavailable })
    expect(out.coverage_gaps.join(' ')).toMatch(/1 arquivo\(s\) de rota/)
  })

  it('surfaces a parse failure as a parse failure, not as a missing export', async () => {
    const brokenParser = () => {
      throw new SyntaxError('unexpected token')
    }
    const out = await discoverNextjsAppRouterCapabilities(projectRoot, {
      loadParser: async () => brokenParser,
    })
    expect(out.coverage_gaps.join(' ')).toContain('parse falhou')
    expect(out.coverage_gaps.join(' ')).not.toContain('no HTTP method exports found')
  })

  it('still discovers routes normally when the parser loads', async () => {
    const out = await discoverNextjsAppRouterCapabilities(projectRoot)
    expect(out.capabilities.map((c) => c.method).sort()).toEqual(['GET', 'POST'])
    expect(out.capabilities.every((c) => c.source === 'ast')).toBe(true)
  })

  it('passes the loader through the dispatcher', async () => {
    const out = await discoverCapabilities(projectRoot, 'nextjs-app-router', { loadParser: unavailable })
    expect(out.coverage_gaps.join(' ')).toContain('@typescript-eslint/parser indisponivel')
  })

  // Este e o teste que falha se alguem voltar ao import estatico: o loader default TEM de resolver
  // sem lancar, devolvendo `null` quando o pacote nao existe.
  it('default loader resolves to a function here, and never throws', async () => {
    const parse = await defaultParserLoader()
    expect(typeof parse).toBe('function')
  })
})
