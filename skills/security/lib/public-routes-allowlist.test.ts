// skills/security/lib/public-routes-allowlist.test.ts
// 2026-09-05 (Luiz/dev): Plano 02 fase-01 — parser puro sobre texto (mesmo desenho de parseMatcherConfig,
// DI-fase04-fixtures-inline): teste de parser nao precisa de I/O; a fixture em disco cobre so readPublicRoutes.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { PUBLIC_ROUTES_FILE, diffAllowlist, isWideEntry, matchAllowlist, normalizePath, parsePublicRoutes, promoteWideCandidates, readPublicRoutes } from './public-routes-allowlist'
import type { AllowlistEntry, Route } from './route-auth-matrix.types'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')
const FILE = PUBLIC_ROUTES_FILE
const src = (routes: unknown): string => JSON.stringify({ routes }, null, 2)
const route = (over: Partial<Route>): Route => ({ method: 'GET', path: '/x', file: 'app/x/route.ts', line: 1, stack: 'nextjs', ...over })

describe('parsePublicRoutes (DP-1 — fail-closed)', () => {
  // JSON.stringify(..., 2) poe "path" na linha 4 — diferente da fixture (linha 3): prova que a linha
  // vem do TEXTO (DP-5), nao de posicao fixa.
  it('accepts an entry with path and reason and records the line of its path', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: 'probe do load balancer' }]), FILE)
    expect(result.entries).toEqual([{ path: '/api/health', reason: 'probe do load balancer', file: FILE, line: 4 }])
    expect(result.rejected).toEqual([])
  })

  it('CA-04b: rejects an entry without reason, keeps the others and points at its line', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: 'ok' }, { path: '/api/admin' }]), FILE)
    expect(result.entries.map((e) => e.path)).toEqual(['/api/health'])
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.path).toBe('/api/admin')
    expect(result.rejected[0]?.line).toBe(8)
    expect(result.rejected[0]?.reason).toContain('reason')
  })

  it('rejects a reason made only of whitespace', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: '   ' }]), FILE)
    expect(result.entries).toEqual([])
    expect(result.rejected[0]?.reason).toContain('reason')
  })

  it('rejects a path that is not a string or does not start with a slash', () => {
    const result = parsePublicRoutes(src([{ path: 42, reason: 'x' }, { path: 'api/x', reason: 'x' }]), FILE)
    expect(result.entries).toEqual([])
    expect(result.rejected.map((r) => r.path)).toEqual([undefined, 'api/x'])
  })

  it('accepts nothing when the JSON is invalid and says why', () => {
    const result = parsePublicRoutes('{ "routes": [', FILE)
    expect(result.entries).toEqual([])
    expect(result.notes.join(' ')).toContain('JSON invalido')
  })

  it('accepts nothing when the top level is an array or routes is missing or not an array', () => {
    for (const bad of ['[]', '{}', '{ "routes": {} }', '{ "public": [] }']) {
      const result = parsePublicRoutes(bad, FILE)
      expect(result.entries).toEqual([])
      expect(result.notes.join(' ')).toContain('routes')
    }
  })
})

describe('readPublicRoutes (raiz do projeto — PRD Decisao 7)', () => {
  it('reports present=false and zero entries when the file is absent — never "anything goes"', () => {
    const result = readPublicRoutes(join(FIXTURES, 'nextjs-minimal'))
    expect(result.present).toBe(false)
    expect(result.entries).toEqual([])
    expect(result.notes.join(' ')).toContain('nenhuma rota declarada publica')
  })

  it('reads the fixture allowlist and rejects its reason-less entry at line 5', () => {
    const result = readPublicRoutes(join(FIXTURES, 'nextjs-allowlist'))
    expect(result.present).toBe(true)
    expect(result.entries.map((e) => e.path)).toEqual(['/api/health', '/api/webhooks/stripe'])
    expect(result.rejected.map((r) => r.line)).toEqual([5])
  })
})

describe('matchAllowlist (DP-2 — igualdade exata, so barra final normalizada)', () => {
  const entries = parsePublicRoutes(src([{ path: '/api/health/', reason: 'lb' }, { path: '/api/users/[id]', reason: 'perfil publico' }]), FILE).entries

  it('matches the exact path for any method', () => {
    expect(matchAllowlist(route({ path: '/api/health' }), entries)?.path).toBe('/api/health/')
    expect(matchAllowlist(route({ method: 'POST', path: '/api/health' }), entries)).not.toBeNull()
  })

  it('does not match a prefix, a parent or a sibling path', () => {
    expect(matchAllowlist(route({ path: '/api' }), entries)).toBeNull()
    expect(matchAllowlist(route({ path: '/api/health/live' }), entries)).toBeNull()
  })

  // 2026-09-05 (Luiz/dev): `[id]` e o path como o Next o escreve (Route.path, fase-02 do Plano 01) —
  // literal valido, casa UMA rota do contrato. `:id` e outra historia (fase-02 deste plano, G13).
  it('treats a Next dynamic segment as a literal path', () => {
    expect(matchAllowlist(route({ path: '/api/users/[id]' }), entries)?.reason).toBe('perfil publico')
  })

  it('normalizes only the trailing slash', () => {
    expect(normalizePath('/api/health/')).toBe('/api/health')
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('/API/Health')).toBe('/API/Health')
  })
})

describe('isWideEntry (DP-3 — AB-1)', () => {
  it('flags wildcard, named parameter and regex group as wide', () => {
    for (const wide of ['/api/*', '/api/:id', '/api/(v1|v2)/users', '/:path*', '/admin/:path+']) {
      expect(isWideEntry(wide)).toBe(true)
    }
  })

  // 2026-09-05 (Luiz/dev): `[id]` e literal no Next (Route.path no dialeto da stack) — casa UMA rota.
  it('does not flag a literal path or a Next dynamic segment', () => {
    for (const literal of ['/api/health', '/api/users/[id]', '/docs/[...slug]', '/']) {
      expect(isWideEntry(literal)).toBe(false)
    }
  })
})

describe('parsePublicRoutes — amplitude e duplicata', () => {
  // 2026-09-06 (Luiz/dev): Plano 04 DP-7 — a candidata ampla guarda a `reason` para o motor poder
  // promove-la a entrada literal contra a enumeracao (G13 resolvido). O parser continua so marcando.
  it('keeps the reason on a wide candidate so the engine can promote it', () => {
    const r = parsePublicRoutes(src([{ path: '/posts/:id', reason: 'post publico' }]), FILE)
    expect(r.wide[0]?.reason).toBe('post publico')
    expect(r.wide[0]?.severity).toBe('high') // parser continua marcando; a decisao e do motor
  })

  it('CA-04: refuses a wide entry and emits a high finding pointing at its line', () => {
    const result = parsePublicRoutes(src([{ path: '/api/*', reason: 'toda a API e publica' }]), FILE)
    expect(result.entries).toEqual([])
    expect(result.rejected).toEqual([])
    expect(result.wide).toHaveLength(1)
    expect(result.wide[0]?.severity).toBe('high')
    expect(result.wide[0]?.file).toBe(FILE)
    expect(result.wide[0]?.line).toBe(4)
    expect(result.wide[0]?.description).toContain('/api/*')
    expect(result.wide[0]?.description).toContain('individualmente')
  })

  // Amplitude e o sinal mais forte: `/api/*` sem reason e finding, nao uma recusa muda por falta de reason.
  it('flags a wide entry even when it has no reason', () => {
    const result = parsePublicRoutes(src([{ path: '/api/*' }]), FILE)
    expect(result.wide).toHaveLength(1)
    expect(result.rejected).toEqual([])
  })

  it('rejects the second occurrence of a duplicated path and points at its own line', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: 'a' }, { path: '/api/health', reason: 'b' }]), FILE)
    expect(result.entries.map((e) => e.line)).toEqual([4])
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.line).toBe(8)
    expect(result.rejected[0]?.reason).toContain('duplicad')
  })

  it('treats trailing-slash variants as the same path for duplicate detection', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: 'a' }, { path: '/api/health/', reason: 'b' }]), FILE)
    expect(result.entries).toHaveLength(1)
    expect(result.rejected).toHaveLength(1)
  })
})

// 2026-09-06 (Luiz/dev): Plano 04 DP-7 / G13 do Plano 01 — a amplitude e decidida CONTRA a
// enumeracao, nao pela sintaxe: `/posts/:id` que casa uma rota real vira declaracao literal dela.
describe('promoteWideCandidates (DP-7 — amplitude decidida contra a enumeracao)', () => {
  const routes = [
    route({ stack: 'rails', path: '/posts/:id', handler: 'PostsController#show' }),
    route({ stack: 'rails', path: '/posts' }),
  ]

  it('promotes a wide candidate that equals an enumerated route path to a literal entry', () => {
    const parsed = parsePublicRoutes(src([{ path: '/posts/:id', reason: 'post publico' }]), FILE)
    const out = promoteWideCandidates(parsed, routes)
    expect(out.entries.map((e) => e.path)).toEqual(['/posts/:id'])
    expect(out.wide).toEqual([])
    expect(out.notes.some((n) => n.includes('promovida'))).toBe(true)
  })

  it('rejects a promoted candidate without reason instead of accepting it (CA-04b still applies)', () => {
    const out = promoteWideCandidates(parsePublicRoutes(src([{ path: '/posts/:id' }]), FILE), routes)
    expect(out.entries).toEqual([])
    expect(out.rejected.map((r) => r.path)).toEqual(['/posts/:id'])
    expect(out.wide).toEqual([])
  })

  it('CA-04: keeps a candidate that matches no enumerated route as a high finding', () => {
    const out = promoteWideCandidates(parsePublicRoutes(src([{ path: '/api/*', reason: 'tudo' }]), FILE), routes)
    expect(out.wide.map((w) => w.severity)).toEqual(['high'])
    expect(out.wide[0]?.description).toContain('nao corresponde a nenhuma rota enumerada')
  })
})

describe('diffAllowlist (delta por path normalizado)', () => {
  const entry = (path: string, line: number): AllowlistEntry => ({ path, reason: 'r', file: FILE, line })
  it('returns added and removed entries keyed by path', () => {
    const { added, removed } = diffAllowlist([entry('/a', 3), entry('/b', 4)], [entry('/b', 3), entry('/c', 4)])
    expect(added.map((e) => e.path)).toEqual(['/c'])
    expect(removed.map((e) => e.path)).toEqual(['/a'])
    expect(removed[0]?.line).toBe(3) // linha da versao NA BASE
  })
  it('does not report a trailing-slash-only difference as a change', () => {
    const { added, removed } = diffAllowlist([entry('/a/', 3)], [entry('/a', 3)])
    expect(added).toEqual([])
    expect(removed).toEqual([])
  })
})
