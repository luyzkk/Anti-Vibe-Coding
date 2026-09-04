// 2026-09-04 (Luiz/dev): enumeracao do App Router — PRD RF-01 (fixture Next), CA-08 (parte Next).
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { enumerateNextjsRoutes, toPublicPath, extractExportedMethods } from './route-auth-nextjs'

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
