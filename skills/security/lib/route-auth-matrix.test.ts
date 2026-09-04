// 2026-09-03 (Luiz/dev): tracer bullet do PRD route-auth-matrix-audit — CA-01 no shape ingenuo.
// 2026-09-04 (Luiz/dev): migrado para o contrato da fase-02 — o finding agora carrega `route`.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { auditRouteCoverage } from './route-auth-matrix'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')

describe('auditRouteCoverage (tracer bullet)', () => {
  it('emits one DESCOBERTA finding for app/api/admin/route.ts outside the matcher', () => {
    const findings = auditRouteCoverage(join(FIXTURES, 'nextjs-minimal'))
    expect(findings).toHaveLength(1)
    const [finding] = findings
    expect(finding?.verdict).toBe('DESCOBERTA')
    expect(finding?.severity).toBe('critical')
    expect(finding?.route.path).toBe('/api/admin')
    expect(finding?.route.file).toBe('app/api/admin/route.ts')
  })
})
