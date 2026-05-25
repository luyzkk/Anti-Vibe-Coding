// 2026-05-24 (Luiz/dev): RED tests para patchNewPlanTpl — PRD SH-04/D8/D10 + RNF-02
// RED phase: patch-new-plan.ts ausente — modulo nao existe ainda

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — modulo nao existe em RED phase; erro esperado ate GREEN
import { patchNewPlanTpl } from './patch-new-plan'

describe('patchNewPlanTpl', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'patch-new-plan-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('idempotente: 2a invocacao nao modifica template (RNF-02 bytewise)', async () => {
    const scriptsDir = path.join(tmpDir, 'scripts')
    await fs.mkdir(scriptsDir, { recursive: true })
    const tplPath = path.join(scriptsDir, 'new-plan.ts.tpl')
    await fs.writeFile(
      tplPath,
      '# Plan\n\n## Purpose\n\n_(content)_\n\n## Exit Criteria\n\n- [ ] all done\n',
    )

    await patchNewPlanTpl(tmpDir) // 1a invocacao: patched
    const after1 = await fs.readFile(tplPath, 'utf-8')

    const r2 = await patchNewPlanTpl(tmpDir) // 2a invocacao: no-op
    const after2 = await fs.readFile(tplPath, 'utf-8')

    expect(r2.status).toBe('already-present')
    expect(after1).toBe(after2) // bytewise identical — RNF-02
  })

  it('ordem das 4 secoes: Review Checklist → Validation Log → Compound Opportunity → Lessons Captured', async () => {
    const scriptsDir = path.join(tmpDir, 'scripts')
    await fs.mkdir(scriptsDir, { recursive: true })
    const tplPath = path.join(scriptsDir, 'new-plan.ts.tpl')
    await fs.writeFile(
      tplPath,
      '# Plan\n\n## Purpose\n\n_(content)_\n\n## Exit Criteria\n\n- [ ] all done\n',
    )

    await patchNewPlanTpl(tmpDir)
    const content = await fs.readFile(tplPath, 'utf-8')

    const idxOpportunity = content.indexOf('## Compound Opportunity')
    const idxReview = content.indexOf('## Review Checklist')
    const idxValidation = content.indexOf('## Validation Log')
    const idxLessons = content.indexOf('## Lessons Captured')
    const idxExit = content.indexOf('## Exit Criteria')

    // todas as 4 secoes presentes
    expect(idxOpportunity).toBeGreaterThan(-1)
    expect(idxReview).toBeGreaterThan(-1)
    expect(idxValidation).toBeGreaterThan(-1)
    expect(idxLessons).toBeGreaterThan(-1)

    // ordem: Review < Validation < Opportunity < Lessons < Exit Criteria
    expect(idxReview).toBeLessThan(idxValidation)
    expect(idxValidation).toBeLessThan(idxOpportunity)
    expect(idxOpportunity).toBeLessThan(idxLessons)
    expect(idxLessons).toBeLessThan(idxExit)
  })

  it('sem template: skip gracioso (status already-present com mensagem no template)', async () => {
    // tmpDir sem scripts/new-plan.ts.tpl
    const r = await patchNewPlanTpl(tmpDir)

    expect(r.status).toBe('already-present')
    expect(r.message).toContain('No new-plan template found')
  })

  it('4 secoes ja presentes: status already-present (idempotencia semantica)', async () => {
    const scriptsDir = path.join(tmpDir, 'scripts')
    await fs.mkdir(scriptsDir, { recursive: true })
    const tplPath = path.join(scriptsDir, 'new-plan.ts.tpl')
    await fs.writeFile(
      tplPath,
      [
        '# Plan',
        '',
        '## Review Checklist',
        '',
        '_(content)_',
        '',
        '## Validation Log',
        '',
        '_(content)_',
        '',
        '## Compound Opportunity',
        '',
        '_(content)_',
        '',
        '## Lessons Captured',
        '',
        '_(content)_',
        '',
        '## Exit Criteria',
        '',
        '- [ ] all done',
        '',
      ].join('\n'),
    )

    const r = await patchNewPlanTpl(tmpDir)
    expect(r.status).toBe('already-present')
  })

  it('insere ANTES de ## Exit Criteria (D10)', async () => {
    const scriptsDir = path.join(tmpDir, 'scripts')
    await fs.mkdir(scriptsDir, { recursive: true })
    const tplPath = path.join(scriptsDir, 'new-plan.ts.tpl')
    const original = '# Plan\n\n## Purpose\n\n_(p)_\n\n## Exit Criteria\n\n- [ ] done\n'
    await fs.writeFile(tplPath, original)

    await patchNewPlanTpl(tmpDir)
    const content = await fs.readFile(tplPath, 'utf-8')

    const idxOpportunity = content.indexOf('## Compound Opportunity')
    const idxExit = content.indexOf('## Exit Criteria')

    // secoes aparecem ANTES de Exit Criteria
    expect(idxOpportunity).toBeGreaterThan(-1)
    expect(idxOpportunity).toBeLessThan(idxExit)
  })
})
