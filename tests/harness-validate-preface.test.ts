// 2026-05-15 (Luiz/dev): harness-validate-preface.test.ts — RF-SH-06 + CA-07 + CA-11.
// Plano 04 fase-03 RED. Espera que checkProfileAwarePreface seja exportado de scripts/harness-validate.ts
// e aceite (failures, projectRoot?) como assinatura. Fixtures em tmpdir isolados — sem process.chdir.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { checkProfileAwarePreface } from '../scripts/harness-validate'

type Failure = { rule: string; message: string }

const VALID_BLOCK = `
<!-- profile-aware-preface:start -->
\`\`\`typescript
import { readPrefaceContext } from '../lib/preface-context'
const ctx = readPrefaceContext()
\`\`\`
<!-- profile-aware-preface:end -->

# Title
`

const MISSING_END = `
<!-- profile-aware-preface:start -->
\`\`\`typescript
import { readPrefaceContext } from '../lib/preface-context'
\`\`\`
# Title
`

const MISSING_REF = `
<!-- profile-aware-preface:start -->
\`\`\`typescript
const x = 1 // sem readPrefaceContext
\`\`\`
<!-- profile-aware-preface:end -->
# Title
`

describe('harness-validate checkProfileAwarePreface', () => {
  let workdir: string

  beforeEach(async () => {
    workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-preface-'))
  })

  afterEach(async () => {
    await fs.rm(workdir, { recursive: true, force: true })
  })

  test('passes when SKILL.md has full preface block (start + end + readPrefaceContext)', async () => {
    const skillDir = path.join(workdir, 'skills', 'security')
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      `---\nname: security\n---` + VALID_BLOCK,
      'utf8',
    )

    const failures: Failure[] = []
    await checkProfileAwarePreface(failures, workdir)

    expect(failures).toHaveLength(0)
  })

  test('fails when start marker present but end marker missing', async () => {
    const skillDir = path.join(workdir, 'skills', 'security')
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      MISSING_END,
      'utf8',
    )

    const failures: Failure[] = []
    await checkProfileAwarePreface(failures, workdir)

    expect(failures.length).toBeGreaterThanOrEqual(1)
    expect(failures.some(f => f.message.includes('missing'))).toBe(true)
  })

  test('fails when block exists but readPrefaceContext not referenced', async () => {
    const skillDir = path.join(workdir, 'skills', 'security')
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      MISSING_REF,
      'utf8',
    )

    const failures: Failure[] = []
    await checkProfileAwarePreface(failures, workdir)

    expect(failures.some(f => f.message.includes('readPrefaceContext'))).toBe(true)
  })

  test('silently skips skills WITHOUT any preface marker (CA-02 — opt-in)', async () => {
    const skillDir = path.join(workdir, 'skills', 'plain-skill')
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      `---\nname: plain\n---\n# Plain Skill\n`,
      'utf8',
    )

    const failures: Failure[] = []
    await checkProfileAwarePreface(failures, workdir)

    expect(failures).toHaveLength(0)
  })
})
