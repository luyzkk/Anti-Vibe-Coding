// 2026-05-12 (Luiz/dev): testes RED para state-md-generator — cobre 7 casos (M13/CA-45)
import { describe, it, expect } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import { regenerateStateMd } from './state-md-generator'

const FIXTURE = path.resolve(import.meta.dir, '..', '..', 'tests', 'fixtures', 'v6-state-fixture')

describe('regenerateStateMd', () => {
  it('writes docs/STATE.md with 3 expected sections', async () => {
    const out = await regenerateStateMd(FIXTURE)
    expect(fs.existsSync(out)).toBe(true)
    const content = fs.readFileSync(out, 'utf-8')
    expect(content).toContain('## Resources')
    expect(content).toContain('## Recent Activity')
    expect(content).toContain('## Pending')
  })

  it('counts compound notes excluding _archived/', async () => {
    await regenerateStateMd(FIXTURE)
    const content = fs.readFileSync(path.join(FIXTURE, 'docs', 'STATE.md'), 'utf-8')
    expect(content).toMatch(/\*\*Compound notes:\*\* 2/)
    expect(content).toMatch(/\*\*Compound archived:\*\* 1/)
  })

  it('counts ADRs by ADR- prefix', async () => {
    await regenerateStateMd(FIXTURE)
    const content = fs.readFileSync(path.join(FIXTURE, 'docs', 'STATE.md'), 'utf-8')
    expect(content).toMatch(/\*\*ADRs:\*\* 2/)
  })

  it('lists plans with pending-capture tag in Pending section', async () => {
    await regenerateStateMd(FIXTURE)
    const content = fs.readFileSync(path.join(FIXTURE, 'docs', 'STATE.md'), 'utf-8')
    expect(content).toContain('2026-05-13-feature-x')
    expect(content).toContain('pending-capture')
  })

  it('is idempotent — second call produces identical content except timestamp', async () => {
    await regenerateStateMd(FIXTURE)
    const first = fs.readFileSync(path.join(FIXTURE, 'docs', 'STATE.md'), 'utf-8')
    await regenerateStateMd(FIXTURE)
    const second = fs.readFileSync(path.join(FIXTURE, 'docs', 'STATE.md'), 'utf-8')
    const stripTs = (s: string) => s.replace(/Last regenerated:.*?-->/, '')
    expect(stripTs(first)).toBe(stripTs(second))
  })

  it('throws when projectRoot is not v6 layout', async () => {
    await expect(regenerateStateMd('/nonexistent/path')).rejects.toThrow()
  })

  it('counts TODO items by checkbox state', async () => {
    await regenerateStateMd(FIXTURE)
    const content = fs.readFileSync(path.join(FIXTURE, 'docs', 'STATE.md'), 'utf-8')
    expect(content).toMatch(/\*\*TODO items:\*\* 1 open \/ 1 done \/ 1 skipped/)
  })
})
