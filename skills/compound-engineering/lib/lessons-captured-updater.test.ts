// 2026-05-24 (Luiz/dev): testes RED para updateLessonsCaptured — PRD D10, CA-07/08
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// @ts-ignore — modulo nao existe em RED phase
import { updateLessonsCaptured } from './lessons-captured-updater'

describe('updateLessonsCaptured', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lessons-updater-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('atualiza secao Lessons Captured existente no PLAN.md (CA-07/08)', async () => {
    const planPath = path.join(tmpDir, 'PLAN.md')
    await fs.writeFile(
      planPath,
      '# My Plan\n\n## Lessons Captured\n\n_(none yet)_\n\n## Exit Criteria\n\n- done\n',
    )

    await updateLessonsCaptured(planPath, '- Lesson captured: docs/compound/my-note.md')

    const updated = await fs.readFile(planPath, 'utf-8')
    expect(updated).toContain('- Lesson captured: docs/compound/my-note.md')
    expect(updated).toContain('## Exit Criteria')
  })

  it('append no fim quando secao Lessons Captured ausente (degraded path)', async () => {
    const planPath = path.join(tmpDir, 'PLAN.md')
    await fs.writeFile(planPath, '# My Plan\n\n## Exit Criteria\n\n- done\n')

    await updateLessonsCaptured(planPath, 'no compound capture needed because: trivial fix')

    const updated = await fs.readFile(planPath, 'utf-8')
    expect(updated).toContain('## Lessons Captured')
    expect(updated).toContain('no compound capture needed because: trivial fix')
  })
})
