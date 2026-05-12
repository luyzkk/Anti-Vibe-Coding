// 2026-05-11 (Luiz/dev): valida classificador antes do migrator confiar nele.

import { describe, it, expect } from 'bun:test'
import { parsePlanningEntry } from './parse-planning-entry'

describe('parsePlanningEntry', () => {
  it('classifies CONTEXT-foo.md as context-file', () => {
    const e = parsePlanningEntry('CONTEXT-foo.md')
    expect(e.kind).toBe('context-file')
    expect(e.slug).toBe('foo')
    expect(e.date).toBeNull()
  })

  it('classifies 2026-04-21-x/PRD.md as plan-folder-prd', () => {
    const e = parsePlanningEntry('2026-04-21-x/PRD.md')
    expect(e.kind).toBe('plan-folder-prd')
    expect(e.date).toBe('2026-04-21')
    expect(e.slug).toBe('x')
  })

  it('classifies plano01/fase-02-y.md as subplan-fase', () => {
    const e = parsePlanningEntry('2026-04-21-x/plano01/fase-02-y.md')
    expect(e.kind).toBe('subplan-fase')
    expect(e.subplan).toBe('plano01')
  })

  it('classifies plano02/README.md as subplan-readme', () => {
    const e = parsePlanningEntry('2026-04-21-x/plano02/README.md')
    expect(e.kind).toBe('subplan-readme')
    expect(e.subplan).toBe('plano02')
  })

  it('classifies plano01/MEMORY.md as subplan-memory', () => {
    const e = parsePlanningEntry('2026-04-21-x/plano01/MEMORY.md')
    expect(e.kind).toBe('subplan-memory')
  })

  it('returns unknown for unmatched paths', () => {
    const e = parsePlanningEntry('random.md')
    expect(e.kind).toBe('unknown')
  })

  it('classifies SUMMARY-foo.md inside plan folder', () => {
    const e = parsePlanningEntry('2026-04-21-x/SUMMARY-resultado.md')
    expect(e.kind).toBe('plan-folder-summary')
  })
})
