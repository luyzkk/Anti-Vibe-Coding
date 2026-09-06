// skills/security/lib/route-auth-express.test.ts
// 2026-09-06 (Luiz/dev): adaptador Express — Plano 04 fase-02. Fontes: Express 4.x API reference
// (app.METHOD, app.use, express.Router, app.route, app.all) e Express 5 migration guide
// §"Path syntax changes" (G12: * -> /*splat, grupos regex e ?/+ removidos).
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { analyzeExpress, enumerateExpressRoutes, expressAdapter, hasExpress, parseExpressFile } from './route-auth-express'
import { evaluateRoute } from './route-auth-matrix'
import { isRoute } from './route-auth-matrix.types'
import type { Route, Verdict } from './route-auth-matrix.types'

const FIXTURE = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/express-minimal')
const NEXT = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/nextjs-minimal')
const files = (entries: Record<string, string>): ReadonlyMap<string, string> => new Map(Object.entries(entries))
const key = (r: Route): string => `${r.method} ${r.path} ${r.file}:${r.line}${r.unresolved === undefined ? '' : ' [unresolved]'}`

describe('parseExpressFile (Express 4.x API reference: app.METHOD, app.use, express.Router, app.route)', () => {
  // Sintaxe TS provada por texto inline (G2: fixture em .mjs nao pode ser .ts)
  it('reads app and router declarations, including TypeScript annotations and express.Router()', () => {
    const p = parseExpressFile("import express from 'express'\nconst app: express.Application = express()\nconst r = express.Router()\nconst s: Router = Router()", 'src/app.ts')
    expect(p.apps).toEqual(['app'])
    expect(p.routers).toEqual(['r', 's'])
  })
  it('reads verb routes with literal path, route-level middlewares, line, and expands all into seven', () => {
    const p = parseExpressFile("const app = express()\napp.get('/x', requireAuth, (req, res) => res.end())\napp.all('/y', h)", 'src/app.ts')
    expect(p.routes[0]).toMatchObject({ owner: 'app', method: 'GET', path: '/x', middlewares: ['requireAuth'], line: 2 })
    expect(p.routes.filter((r) => r.path === '/y').map((r) => r.method).sort()).toEqual(['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'])
  })
  it('reads app.use with and without path, and names middlewares by identifier, dotted access or factory call', () => {
    const p = parseExpressFile("const app = express()\napp.use(cors())\napp.use('/api', auth.requireUser)\napp.use(requireRole('admin'), logger)", 'src/app.ts')
    expect(p.uses.map((u) => ({ path: u.path, names: u.names, line: u.line }))).toEqual([
      { path: null, names: ['cors'], line: 2 }, { path: '/api', names: ['requireUser'], line: 3 }, { path: null, names: ['requireRole', 'logger'], line: 4 },
    ])
  })
  it('records default imports and require() of relative modules only', () => {
    const p = parseExpressFile("import express from 'express'\nimport adminRouter from './routes/admin.mjs'\nconst users = require('./routes/users')", 'src/app.mjs')
    expect([...p.imports.entries()]).toEqual([['adminRouter', './routes/admin.mjs'], ['users', './routes/users']])
  })
  it('reads app.route(path).get(h).post(h) as two routes on the same line', () => {
    const p = parseExpressFile("const app = express()\napp.route('/books').get(list).post(requireAuth, create)", 'src/app.ts')
    expect(p.routes.map((r) => `${r.method} ${r.path} ${r.middlewares.join(',')}`)).toEqual(['GET /books ', 'POST /books requireAuth'])
  })
  // 2026-09-06 (Luiz/dev): PRD CA-05 / AB-2 — rota montada via variavel NUNCA vira path inventado.
  it('CA-05: marks non-literal paths (template with ${}, variable, concatenation, array) as unresolved with the source text', () => {
    const p = parseExpressFile("const app = express()\napp.get(`${base}/x`, h)\napp.get(prefix, h)\napp.get('/a' + v, h)\napp.get(['/b', '/c'], h)", 'src/app.mjs')
    expect(p.routes.every((r) => r.unresolved !== undefined)).toBe(true)
    expect(p.routes[0]?.path).toBe('/${base}/x')
    expect(p.routes[0]?.unresolved).toContain('template literal')
    expect(p.routes[1]?.path).toBe('/prefix')
    expect(p.routes[3]?.unresolved).toContain('array')
  })
  // G12: Express 4 (path-to-regexp v0.1) e 5 (v8) divergem em `*`, grupos e modificadores — nao traduzir.
  it('marks wildcard, regex group, modifier and RegExp paths as unresolved (Express 4 vs 5 differ)', () => {
    const p = parseExpressFile("const app = express()\napp.get('/files/*', h)\napp.get('/u/:id(\\\\d+)', h)\napp.get('/a?b', h)\napp.get(/^\\/re/, h)", 'src/app.ts')
    expect(p.routes.map((r) => r.unresolved)).toEqual([
      expect.stringContaining('Express 4/5'), expect.stringContaining('Express 4/5'), expect.stringContaining('Express 4/5'), expect.stringContaining('RegExp'),
    ])
  })
})

describe('analyzeExpress — ordem da cadeia (app.use antes/depois, por linha)', () => {
  // 2026-09-06 (Luiz/dev): teste de abuso — use DEPOIS da rota nao cobre. Escrito antes da defesa.
  it('covers a route only when app.use(auth) comes BEFORE it in the same file', () => {
    const src = "const app = express()\napp.get('/before', h)\napp.use(requireAuth)\napp.get('/after', h)"
    const { routes, coverage } = analyzeExpress(files({ 'src/app.ts': src }))
    const verdict = (path: string): Verdict => evaluateRoute(routes.find((r) => r.path === path)!, coverage).verdict
    expect(verdict('/after')).toBe('coberta')
    expect(verdict('/before')).toBe('DESCOBERTA')
    expect(coverage.notes).toContain('app.use(requireAuth) em src/app.ts:3 vem DEPOIS de GET /before (src/app.ts:2) — nao cobre')
    expect(coverage.rules.every((r) => r.kind === 'handler-chain')).toBe(true)   // DP-5a: nenhum path-pattern
  })
  it('scopes app.use(prefix, auth) to later routes under the prefix', () => {
    const src = "const app = express()\napp.use('/admin', requireAdmin)\napp.get('/admin/users', h)\napp.get('/public', h)"
    const { routes, coverage } = analyzeExpress(files({ 'src/app.ts': src }))
    expect(evaluateRoute(routes.find((r) => r.path === '/admin/users')!, coverage).verdict).toBe('coberta')
    expect(evaluateRoute(routes.find((r) => r.path === '/public')!, coverage).verdict).toBe('DESCOBERTA')
  })
  it('covers router routes by router.use before them, or by app.use before the mount — never by app.use after the mount', () => {
    const app = "import r from './r'\nconst app = express()\napp.use('/a', r)\napp.use(requireAuth)\nimport s from './s'\napp.use('/b', s)"
    const r = "const router = Router()\nrouter.get('/x', h)\nrouter.use(requireAuth)\nrouter.get('/y', h)\nexport default router"
    const s = "const router = Router()\nrouter.get('/z', h)\nexport default router"
    const { routes, coverage } = analyzeExpress(files({ 'src/app.ts': app, 'src/r.ts': r, 'src/s.ts': s }))
    const verdict = (path: string): Verdict => evaluateRoute(routes.find((r) => r.path === path)!, coverage).verdict
    expect(verdict('/a/x')).toBe('DESCOBERTA')      // montado ANTES do app.use(auth); router.use vem depois de /x
    expect(verdict('/a/y')).toBe('coberta')         // router.use antes de /y
    expect(verdict('/b/z')).toBe('coberta')         // app.use(auth) antes da montagem de s
    const rule = coverage.rules.find((c) => c.kind === 'handler-chain' && c.handler === 'src/s.ts:2')
    expect(rule?.kind === 'handler-chain' ? rule.via : '').toContain('antes da montagem do router (src/app.ts:6)')
  })
})

describe('analyzeExpress — montagem de router importado (um nivel)', () => {
  it('prefixes routes of an imported router (default import or require) with the mount path; nested mounts are unresolved', () => {
    const app = "import admin from './routes/admin'\nconst users = require('./routes/users.mjs')\nconst app = express()\napp.use('/admin', admin)\napp.use('/users', users)"
    const admin = "const router = Router()\nrouter.get('/', h)\nrouter.get('/list', h)\nimport nested from './nested'\nrouter.use('/deep', nested)\nexport default router"
    const users = "const router = Router()\nrouter.get('/:id', h)\nmodule.exports = router"
    const nested = "const router = Router()\nrouter.get('/leaf', h)\nexport default router"
    const { routes } = analyzeExpress(files({ 'src/app.ts': app, 'src/routes/admin/index.ts': admin, 'src/routes/users.mjs': users, 'src/routes/admin/nested.ts': nested }))
    expect(routes.filter((r) => r.unresolved === undefined).map(key).sort()).toEqual(['GET /admin src/routes/admin/index.ts:2', 'GET /admin/list src/routes/admin/index.ts:3', 'GET /users/:id src/routes/users.mjs:2'])
    expect(routes.find((r) => r.file === 'src/routes/admin/nested.ts')?.unresolved).toContain('aninhad')
  })
  it('marks routes of a router that no app mounts as unresolved (prefix unknown), and reports zero routes without express()', () => {
    const { routes, notes } = analyzeExpress(files({ 'src/orphan.ts': "const router = Router()\nrouter.get('/x', h)\nexport default router" }))
    expect(routes[0]?.unresolved).toContain('nao montado')
    expect(analyzeExpress(files({ 'src/lib.ts': 'export const x = 1' })).routes).toEqual([])
    expect(notes.some((n) => n.includes('express()'))).toBe(true)
  })
})

describe('expressAdapter (fixture express-minimal)', () => {
  it('CA-08 (Express): enumerates the six routes of the fixture with file:line handlers', () => {
    const routes = expressAdapter.enumerate(FIXTURE)
    expect(routes.every(isRoute)).toBe(true)
    expect(routes.map(key).sort()).toEqual([
      'DELETE /admin/users/:id src/routes/admin.mjs:7', 'GET /${base}/reports src/app.mjs:16 [unresolved]', 'GET /admin/users src/routes/admin.mjs:6',
      'GET /api/preferences src/app.mjs:12', 'GET /health src/app.mjs:8', 'POST /api/preferences src/app.mjs:13',
    ])
    expect(routes.find((r) => r.path === '/health')?.handler).toBe('src/app.mjs:8')
  })
  it('CA-05 + Premissa 3: health is DESCOBERTA, preferences and admin are coberta, the template route is indeterminada, and the rate is under the cut', () => {
    const routes = expressAdapter.enumerate(FIXTURE)
    const cov = expressAdapter.readCoverage(FIXTURE)
    const verdicts = routes.map((r) => ({ path: r.path, method: r.method, verdict: evaluateRoute(r, cov).verdict }))
    expect(verdicts.find((v) => v.path === '/health')?.verdict).toBe('DESCOBERTA')
    expect(verdicts.find((v) => v.path === '/${base}/reports')?.verdict).toBe('indeterminada')
    expect(verdicts.filter((v) => v.path.startsWith('/api') || v.path.startsWith('/admin')).every((v) => v.verdict === 'coberta')).toBe(true)
    expect(verdicts.filter((v) => v.verdict === 'indeterminada').length / verdicts.length).toBeLessThanOrEqual(0.25)
    expect(cov.notes).toContain('middlewares contados como auth: requireAuth, requireAdmin')
    expect(hasExpress(FIXTURE)).toBe(true)
    expect(hasExpress(NEXT)).toBe(false)
  })
})
