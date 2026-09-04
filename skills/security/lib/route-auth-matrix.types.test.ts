// 2026-09-04 (Luiz/dev): o contrato precisa de teste proprio — o Plano 04 escreve tres adaptadores
// confiando nele sem reler a lib. PRD route-auth-matrix-audit RF-01, Plano 01 fase-02.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { isRoute, isVerdict, isHttpMethod } from './route-auth-matrix.types'
import { nextjsAdapter } from './route-auth-matrix'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')

describe('route-auth-matrix contract guards', () => {
  it('accepts a well-formed Route', () => {
    expect(
      isRoute({ method: 'GET', path: '/api/admin', file: 'app/api/admin/route.ts', line: 1, stack: 'nextjs' }),
    ).toBe(true)
  })

  it('rejects a path without leading slash', () => {
    expect(
      isRoute({ method: 'GET', path: 'api/admin', file: 'app/api/admin/route.ts', line: 1, stack: 'nextjs' }),
    ).toBe(false)
  })

  // 2026-09-04 (Luiz/dev): G8 do plano — este e o teste que pega adaptador que esqueceu toPosix().
  // Path com barra invertida vaza do Windows e quebra comparacao de path a jusante. Manter.
  it('rejects a file path containing a backslash', () => {
    expect(
      isRoute({ method: 'GET', path: '/api/admin', file: 'app\\api\\admin\\route.ts', line: 1, stack: 'nextjs' }),
    ).toBe(false)
  })

  // 2026-09-04 (Luiz/dev): o schema v2 exige "line": { "type": "integer", "minimum": 1 }.
  // Adaptador que nao sabe a linha devolve 1, nunca 0.
  it('rejects a line number below one', () => {
    expect(
      isRoute({ method: 'GET', path: '/api/admin', file: 'app/api/admin/route.ts', line: 0, stack: 'nextjs' }),
    ).toBe(false)
  })

  // 2026-09-04 (Luiz/dev): `handler` liga rota a controller/view no Rails e no Django, onde a
  // declaracao e a implementacao vivem em arquivos diferentes. Next omite — o arquivo E o handler.
  it('accepts a Route carrying a handler, and one omitting it', () => {
    const base = { method: 'GET', path: '/users/1', file: 'config/routes.rb', line: 4, stack: 'rails' }
    expect(isRoute({ ...base, handler: 'UsersController#show' })).toBe(true)
    expect(isRoute(base)).toBe(true)
  })

  it('rejects a handler that is present but empty or not a string', () => {
    const base = { method: 'GET', path: '/users/1', file: 'config/routes.rb', line: 4, stack: 'rails' }
    expect(isRoute({ ...base, handler: '' })).toBe(false)
    expect(isRoute({ ...base, handler: 42 })).toBe(false)
  })

  it('rejects unknown verdicts', () => {
    expect(isVerdict('covered')).toBe(false)
    expect(isVerdict('DESCOBERTA')).toBe(true)
  })

  it('rejects unknown http methods', () => {
    expect(isHttpMethod('FETCH')).toBe(false)
    expect(isHttpMethod('GET')).toBe(true)
  })
})

describe('nextjsAdapter honours the contract', () => {
  it('enumerates the nextjs-minimal fixture as valid Route objects', () => {
    const routes = nextjsAdapter.enumerate(join(FIXTURES, 'nextjs-minimal'))
    expect(routes.length).toBeGreaterThan(0)
    expect(routes.every(isRoute)).toBe(true)
  })

  it('reads config.matcher as path-pattern rules citing the source file', () => {
    const coverage = nextjsAdapter.readCoverage(join(FIXTURES, 'nextjs-minimal'))
    expect(coverage.stack).toBe('nextjs')
    expect(coverage.sources).toContain('middleware.ts')
    expect(coverage.rules).toHaveLength(1)
    const [rule] = coverage.rules
    expect(rule?.kind).toBe('path-pattern')
    expect(rule?.kind === 'path-pattern' ? rule.pattern : null).toBe('/dashboard/:path*')
  })

  // 2026-09-04 (Luiz/dev): cobertura ILEGIVEL nao pode virar "coberta" (PRD CA-06). Um diretorio
  // sem middleware.ts nao produz regra alguma, e o motor da fase-05 tratara isso como descoberto —
  // nunca como coberto por ausencia de evidencia.
  it('returns no rules and a note when middleware.ts is absent', () => {
    const coverage = nextjsAdapter.readCoverage(join(FIXTURES, 'nextjs-minimal', 'app'))
    expect(coverage.rules).toHaveLength(0)
    expect(coverage.notes.join(' ')).toContain('middleware.ts')
  })
})
