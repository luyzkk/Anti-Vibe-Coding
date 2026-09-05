// 2026-09-03 (Luiz/dev): tracer bullet do PRD route-auth-matrix-audit — CA-01 no shape ingenuo.
// 2026-09-04 (Luiz/dev): reescrito na fase-05 — motor de veredito, regra de severidade e escopo G1.
// CA-02 e CA-06 sao testados contra `evaluateRoute` com CoverageMap inline, nao contra fixture em
// disco: o TDD gate bloqueia criar `middleware.ts` (GT-fase01-1) e funcao pura dispensa I/O.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { auditRouteCoverage, evaluateRoute, severityFor } from './route-auth-matrix'
import type { CoverageMap, Route } from './route-auth-matrix.types'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')
const MINIMAL = join(FIXTURES, 'nextjs-minimal')

const route = (over: Partial<Route>): Route => ({
  method: 'GET',
  path: '/x',
  file: 'app/x/route.ts',
  line: 1,
  stack: 'nextjs',
  ...over,
})

const coverage = (patterns: string[]): CoverageMap => ({
  stack: 'nextjs',
  rules: patterns.map((pattern) => ({ kind: 'path-pattern', pattern, file: 'middleware.ts', line: 9 })),
  sources: ['middleware.ts'],
  notes: [],
})

describe('severityFor (PRD D9 — regra fixa, nao julgamento)', () => {
  it('returns critical when the path has a privilege marker', () => {
    expect(severityFor(route({ path: '/api/admin' }))).toBe('critical')
    expect(severityFor(route({ path: '/billing-history' }))).toBe('critical')
    expect(severityFor(route({ path: '/internal/metrics' }))).toBe('critical')
  })

  it('returns critical when the method mutates state even without a marker', () => {
    expect(severityFor(route({ method: 'POST', path: '/api/preferences' }))).toBe('critical')
    expect(severityFor(route({ method: 'DELETE', path: '/api/notes/[id]' }))).toBe('critical')
  })

  it('returns high for GET without a privilege marker', () => {
    expect(severityFor(route({ path: '/api/preferences' }))).toBe('high')
  })

  // 2026-09-04 (Luiz/dev): marcador e PREFIXO DE SEGMENTO. Substring solta daria critical em
  // /api/badminton ("admin" dentro de "badminton") — falso positivo que corroi a confianca na regra.
  it('does not treat a marker buried inside a word as a privilege marker', () => {
    expect(severityFor(route({ path: '/api/badminton' }))).toBe('high')
  })
})

describe('evaluateRoute (motor de veredito)', () => {
  it('CA-02: yields coberta with evidence when a rule demonstrably matches', () => {
    const verdict = evaluateRoute(route({ path: '/api/admin' }), coverage(['/api/:path*']))
    expect(verdict.verdict).toBe('coberta')
    expect(verdict.evidence).toContain('middleware.ts:9')
  })

  // 2026-09-04 (Luiz/dev): AB-3 / CA-06. O texto '/api/protected/:path*' contem '/api', entao o
  // string-match diria coberta — e /api ficaria aberta reportada como protegida.
  it('CA-06: never yields coberta for a lookalike matcher', () => {
    const verdict = evaluateRoute(route({ path: '/api' }), coverage(['/api/protected/:path*']))
    expect(verdict.verdict).not.toBe('coberta')
    expect(verdict.verdict).toBe('DESCOBERTA')
  })

  it('yields indeterminada when a rule is opaque, never coberta', () => {
    const map: CoverageMap = {
      stack: 'nextjs',
      rules: [{ kind: 'opaque', reason: 'matcher computado — nao e literal', file: 'middleware.ts', line: 3 }],
      sources: ['middleware.ts'],
      notes: [],
    }
    const verdict = evaluateRoute(route({ path: '/api/admin' }), map)
    expect(verdict.verdict).toBe('indeterminada')
    expect(verdict.evidence).toContain('computado')
  })

  it('yields indeterminada when only some probes of a catch-all match', () => {
    const verdict = evaluateRoute(route({ path: '/docs/[...slug]' }), coverage(['/docs/:one']))
    expect(verdict.verdict).toBe('indeterminada')
  })

  // 2026-09-04 (Luiz/dev): o Plano 04 acrescenta variantes de CoverageRule. Kind desconhecido tem
  // de cair em indeterminada — jamais produzir coberta por acidente.
  it('treats an unknown rule kind as indeterminada, not as coverage', () => {
    const map: CoverageMap = {
      stack: 'rails',
      rules: [{ kind: 'controller-filter', pattern: 'x', file: 'a.rb', line: 1 } as never],
      sources: ['a.rb'],
      notes: [],
    }
    expect(evaluateRoute(route({ path: '/users' }), map).verdict).toBe('indeterminada')
  })

  it('yields DESCOBERTA when there is no rule at all', () => {
    const map: CoverageMap = { stack: 'nextjs', rules: [], sources: [], notes: [] }
    expect(evaluateRoute(route({ path: '/api/admin' }), map).verdict).toBe('DESCOBERTA')
  })
})

describe('auditRouteCoverage — escopo G1', () => {
  it('CA-01: emits a critical finding naming file and line for an uncovered admin route', () => {
    const { findings } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/admin/route.ts'] })
    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('critical')
    expect(findings[0]?.route.file).toBe('app/api/admin/route.ts')
    expect(findings[0]?.route.line).toBeGreaterThanOrEqual(1)
    expect(findings[0]?.missing).toContain('config.matcher')
  })

  it('CA-01b: emits high, not critical, for an uncovered GET without a marker', () => {
    const { findings } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/preferences/route.ts'] })
    expect(findings.map((f) => f.severity)).toEqual(['high'])
  })

  it('evaluates only routes whose files are in changedFiles', () => {
    const { summary } = auditRouteCoverage(MINIMAL, { changedFiles: ['app/api/admin/route.ts'] })
    expect(summary.enumerated).toBe(6)
    expect(summary.evaluated).toBe(1)
  })

  // G1 nao cai para full-surface: isso seria o RF-07 escondido, despejando findings de codigo que
  // a PR nao tocou. Escopo vazio e escopo vazio, com a razao visivel.
  it('evaluates nothing and says so when changedFiles is empty', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, { changedFiles: [] })
    expect(findings).toHaveLength(0)
    expect(summary.evaluated).toBe(0)
    expect(summary.notes.join(' ')).toContain('G1')
  })

  it('counts indeterminada in the summary without emitting a finding (emission is Plano 02)', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, {
      changedFiles: ['app/api/users/[id]/route.ts'],
      coverageOverride: {
        stack: 'nextjs',
        rules: [{ kind: 'opaque', reason: 'matcher computado', file: 'middleware.ts', line: 1 }],
        sources: ['middleware.ts'],
        notes: [],
      },
    })
    expect(summary.indeterminada).toBe(2)
    expect(findings).toHaveLength(0)
  })

  it('orders findings by severity so the worst one comes first', () => {
    const { findings } = auditRouteCoverage(MINIMAL, {
      changedFiles: ['app/api/preferences/route.ts', 'app/api/admin/route.ts'],
    })
    expect(findings.map((f) => f.severity)).toEqual(['critical', 'high'])
  })
})
