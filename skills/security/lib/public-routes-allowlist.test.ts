// skills/security/lib/public-routes-allowlist.test.ts
// 2026-09-05 (Luiz/dev): Plano 02 fase-01 — parser puro sobre texto (mesmo desenho de parseMatcherConfig,
// DI-fase04-fixtures-inline): teste de parser nao precisa de I/O; a fixture em disco cobre so readPublicRoutes.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { PUBLIC_ROUTES_FILE, matchAllowlist, normalizePath, parsePublicRoutes, readPublicRoutes } from './public-routes-allowlist'
import type { Route } from './route-auth-matrix.types'

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
