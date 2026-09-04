// 2026-09-03 (Luiz/dev): tracer bullet do PRD route-auth-matrix-audit — CA-01 no shape ingenuo.
// 2026-09-04 (Luiz/dev): migrado para o contrato da fase-02 — o finding agora carrega `route`.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { auditRouteCoverage } from './route-auth-matrix'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')

describe('auditRouteCoverage (tracer bullet)', () => {
  const findings = auditRouteCoverage(join(FIXTURES, 'nextjs-minimal'))

  it('emits a DESCOBERTA finding for app/api/admin/route.ts outside the matcher', () => {
    const admin = findings.find((f) => f.route.path === '/api/admin')
    expect(admin).toBeDefined()
    expect(admin?.verdict).toBe('DESCOBERTA')
    expect(admin?.severity).toBe('critical')
    expect(admin?.route.file).toBe('app/api/admin/route.ts')
  })

  // 2026-09-04 (Luiz/dev): a fase-03 ampliou a fixture para 6 rotas e o matcher da fixture cobre
  // so /dashboard — logo, nenhuma delas esta coberta. Contagem fixa aqui e proposital: se uma rota
  // sumir da enumeracao, este teste cai junto com os do adaptador.
  it('reports every route in the fixture, since the matcher covers only /dashboard', () => {
    expect(findings).toHaveLength(6)
    expect(findings.map((f) => `${f.route.method} ${f.route.path}`).sort()).toEqual([
      'DELETE /api/users/[id]',
      'GET /api/admin',
      'GET /api/preferences',
      'GET /api/users/[id]',
      'GET /docs/[...slug]',
      'GET /pricing',
    ])
  })
})
