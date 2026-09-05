// 2026-09-04 (Luiz/dev): enumeracao do App Router — PRD RF-01 (fixture Next), CA-08 (parte Next).
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import {
  enumerateNextjsRoutes,
  toPublicPath,
  extractExportedMethods,
  matcherToRegExp,
  matchRouteAgainstPattern,
  parseMatcherConfig,
  probesFor,
  readNextjsCoverage,
} from './route-auth-nextjs'

const FIXTURE = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/nextjs-minimal')
const SRC_APP_FIXTURE = join(import.meta.dir, '../../../tests/fixtures/nextjs-app-router-fixture')

describe('toPublicPath', () => {
  it('drops route group segments from the public path', () => {
    expect(toPublicPath('(marketing)/pricing')).toBe('/pricing')
  })

  it('maps the app root to /', () => {
    expect(toPublicPath('')).toBe('/')
  })

  it('keeps dynamic and catch-all segments in Next dialect', () => {
    expect(toPublicPath('api/users/[id]')).toBe('/api/users/[id]')
    expect(toPublicPath('docs/[...slug]')).toBe('/docs/[...slug]')
    expect(toPublicPath('shop/[[...filters]]')).toBe('/shop/[[...filters]]')
  })
})

describe('extractExportedMethods', () => {
  it('finds function, async function and const exports of HTTP verbs with their line', () => {
    const src = [
      "import x from 'y'",
      'export function GET() {}',
      'export async function POST() {}',
      'export const PUT = async () => {}',
      'export const helper = 1',
      '',
    ].join('\n')
    expect(extractExportedMethods(src)).toEqual([
      { method: 'GET', line: 2 },
      { method: 'POST', line: 3 },
      { method: 'PUT', line: 4 },
    ])
  })

  // 2026-09-04 (Luiz/dev): G6 — re-export e default NAO sao capturados pelo regex desta fase.
  // Silencio aqui vira nota, nunca rota fantasma. A fase-04 avalia se o AST alcanca.
  it('does not capture re-exports or default exports', () => {
    expect(extractExportedMethods('export { GET, POST } from "./handlers"\n')).toEqual([])
    expect(extractExportedMethods('export default function handler() {}\n')).toEqual([])
  })
})

describe('enumerateNextjsRoutes (fixture nextjs-minimal)', () => {
  const { routes } = enumerateNextjsRoutes(FIXTURE)
  const sig = (r: { method: string; path: string }): string => `${r.method} ${r.path}`

  it('emits one Route per exported verb in route.ts', () => {
    expect(
      routes
        .filter((r) => r.path === '/api/users/[id]')
        .map(sig)
        .sort(),
    ).toEqual(['DELETE /api/users/[id]', 'GET /api/users/[id]'])
  })

  it('emits GET for page.tsx and strips the route group', () => {
    expect(routes.map(sig)).toContain('GET /pricing')
    expect(routes.some((r) => r.path.includes('(marketing)'))).toBe(false)
  })

  it('emits catch-all page in Next dialect', () => {
    expect(routes.map(sig)).toContain('GET /docs/[...slug]')
  })

  it('captures the const arrow export form', () => {
    expect(routes.map(sig)).toContain('GET /api/preferences')
  })

  it('records file as POSIX path relative to the project root, with the export line', () => {
    const admin = routes.find((r) => r.path === '/api/admin')
    expect(admin?.file).toBe('app/api/admin/route.ts')
    expect(admin?.line).toBe(2)
  })

  it('returns routes sorted by path then method', () => {
    const keys = routes.map((r) => `${r.path} ${r.method}`)
    expect(keys).toEqual([...keys].sort())
  })
})

// 2026-09-04 (Luiz/dev): G14 — `src/app` e variante valida do App Router.
describe('enumerateNextjsRoutes (src/app variant)', () => {
  it('finds routes under src/app when app/ is absent', () => {
    const { routes } = enumerateNextjsRoutes(SRC_APP_FIXTURE)
    expect(routes.map((r) => `${r.method} ${r.path}`)).toContain('GET /')
  })
})

describe('matcherToRegExp (subset path-to-regexp v6)', () => {
  it('matches zero or more segments for :path*', () => {
    const re = matcherToRegExp('/admin/:path*')
    expect(re?.test('/admin')).toBe(true)
    expect(re?.test('/admin/settings/x')).toBe(true)
    expect(re?.test('/api/admin')).toBe(false)
  })

  it('requires at least one segment for :path+', () => {
    const re = matcherToRegExp('/admin/:path+')
    expect(re?.test('/admin')).toBe(false)
    expect(re?.test('/admin/settings')).toBe(true)
  })

  it('matches exactly one segment for a bare :name', () => {
    const re = matcherToRegExp('/users/:id')
    expect(re?.test('/users/42')).toBe(true)
    expect(re?.test('/users')).toBe(false)
    expect(re?.test('/users/42/edit')).toBe(false)
  })

  it('passes negative-lookahead groups through', () => {
    const re = matcherToRegExp('/((?!_next/static|favicon.ico).*)')
    expect(re?.test('/api/admin')).toBe(true)
    expect(re?.test('/_next/static/x.js')).toBe(false)
  })

  it('returns null for tokens outside the supported subset', () => {
    expect(matcherToRegExp('/admin/{a,b}')).toBeNull()
  })

  // 2026-09-04 (Luiz/dev): regex do projeto auditado vai para new RegExp. SyntaxError vira null
  // (-> opaque -> indeterminada), nunca excecao que derruba a auditoria.
  it('returns null instead of throwing on an invalid regex group', () => {
    expect(matcherToRegExp('/((unbalanced')).toBeNull()
  })
})

describe('probesFor', () => {
  it('returns the path itself when there is no dynamic segment', () => {
    expect(probesFor('/api/admin')).toEqual(['/api/admin'])
  })

  it('probes one concrete value for [id]', () => {
    expect(probesFor('/users/[id]')).toEqual(['/users/__dyn__'])
  })

  it('probes one and many segments for a catch-all', () => {
    expect(probesFor('/docs/[...slug]')).toEqual(['/docs/__dyn__', '/docs/__dyn__/__dyn__'])
  })

  it('probes the empty case too for an optional catch-all', () => {
    expect(probesFor('/shop/[[...f]]')).toEqual(['/shop', '/shop/__dyn__', '/shop/__dyn__/__dyn__'])
  })
})

describe('parseMatcherConfig (parser proprio — DI-fase04-parser)', () => {
  const middleware = (config: string): string =>
    `export function middleware(_r: Request) { return new Response(null, { status: 401 }) }\nexport const config = ${config}\n`

  it('reads literal string entries as path-pattern rules', () => {
    const rules = parseMatcherConfig(middleware(`{ matcher: ['/dashboard/:path*', '/admin'] }`), 'middleware.ts')
    expect(rules.map((r) => (r.kind === 'path-pattern' ? r.pattern : r.kind))).toEqual([
      '/dashboard/:path*',
      '/admin',
    ])
  })

  it('reads a bare string matcher', () => {
    const rules = parseMatcherConfig(middleware(`{ matcher: '/admin/:path*' }`), 'middleware.ts')
    expect(rules).toHaveLength(1)
    expect(rules[0]?.kind).toBe('path-pattern')
  })

  // 2026-09-04 (Luiz/dev): Premissa 1 do PRD — matcher computado e indeterminada, NUNCA coberta.
  it('marks a computed matcher as opaque, never as a path-pattern', () => {
    const source = `function build() { return ['/api/:path*'] }\nexport const config = { matcher: build() }\n`
    const rules = parseMatcherConfig(source, 'middleware.ts')
    expect(rules).toHaveLength(1)
    expect(rules[0]?.kind).toBe('opaque')
  })

  it('marks a conditional has/missing entry as opaque', () => {
    const rules = parseMatcherConfig(
      middleware(`{ matcher: [{ source: '/admin/:path*', has: [{ type: 'header', key: 'x' }] }] }`),
      'middleware.ts',
    )
    expect(rules[0]?.kind).toBe('opaque')
  })

  // G13 do plano: sem matcher, o Next roda o middleware em TODA rota. O proxy do PRD e tratar
  // como cobertura total, com a limitacao anotada.
  it('treats an absent matcher as full coverage', () => {
    const source = `export function middleware(_r: Request) { return new Response(null) }\n`
    const rules = parseMatcherConfig(source, 'middleware.ts')
    expect(rules).toEqual([{ kind: 'path-pattern', pattern: '/:path*', file: 'middleware.ts', line: 1 }])
  })
})

describe('readNextjsCoverage', () => {
  it('reads literal matcher entries from the fixture with their line', () => {
    const map = readNextjsCoverage(FIXTURE)
    expect(map.rules).toHaveLength(1)
    const [rule] = map.rules
    expect(rule?.kind).toBe('path-pattern')
    expect(rule?.kind === 'path-pattern' ? rule.pattern : null).toBe('/dashboard/:path*')
    expect(rule?.line).toBeGreaterThan(1)
  })
})

// 2026-09-04 (Luiz/dev): teste de abuso do PRD (AB-3 / CA-06). O texto do matcher CONTEM "/admin",
// entao o string-match herdado diria "coberta" — e um endpoint admin ficaria aberto em silencio.
describe('AB-3 / CA-06 — lookalike matcher', () => {
  // 2026-09-04 (Luiz/dev): ESTE e o falso "coberta" perigoso do string-match herdado. O texto
  // '/api/protected/:path*' CONTEM '/api', entao `pattern.includes(path)` diz coberta — mas o
  // matcher so protege /api/protected/*. A rota /api ficaria aberta e reportada como protegida.
  it('never reports /api as covered when the matcher only protects /api/protected', () => {
    expect(matchRouteAgainstPattern('/api', '/api/protected/:path*')).toBe('no-match')
  })

  // Contrapartida: o prefixo textual tambem engana na outra direcao quando o token exige segmento.
  it('never reports /admin as covered when the matcher requires at least one segment', () => {
    expect(matchRouteAgainstPattern('/admin', '/admin/:path+')).toBe('no-match')
  })

  it('never reports /api/admin as covered when the matcher is /admin/:path*', () => {
    expect(matchRouteAgainstPattern('/api/admin', '/admin/:path*')).toBe('no-match')
  })

  it('reports partial when only some probes of a catch-all match', () => {
    expect(matchRouteAgainstPattern('/docs/[...slug]', '/docs/:one')).toBe('partial')
  })

  it('reports partial when the pattern falls outside the supported subset', () => {
    expect(matchRouteAgainstPattern('/api/admin', '/admin/{a,b}')).toBe('partial')
  })

  it('reports matches when every probe is covered', () => {
    expect(matchRouteAgainstPattern('/docs/[...slug]', '/docs/:path*')).toBe('matches')
  })
})
