// 2026-05-12 (Luiz/dev): valida estrutura do workflow YAML do GH Actions.
// Plano 04 fase-05. Atende D14 (GH Actions instalado), M5+M6 (validators em CI).

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// Workflow vive em assets/static (copiado verbatim por installGhFiles — Plano 02 fase-04)
const WORKFLOW_PATH = path.resolve(
  import.meta.dir,
  '..',
  'skills/init/assets/static/.github/workflows/harness.yml',
)

describe('harness.yml workflow', () => {
  it('exists and is non-empty', async () => {
    const stat = await fs.stat(WORKFLOW_PATH)
    expect(stat.isFile()).toBe(true)
    expect(stat.size).toBeGreaterThan(0)
  })

  it('contains both validators as steps', async () => {
    const body = await fs.readFile(WORKFLOW_PATH, 'utf8')
    expect(body).toContain('bun run harness:validate')
    expect(body).toContain('bun run compound:check')
  })

  it('uses oven-sh/setup-bun action', async () => {
    const body = await fs.readFile(WORKFLOW_PATH, 'utf8')
    expect(body).toContain('oven-sh/setup-bun')
  })

  it('triggers on pull_request and push to main', async () => {
    const body = await fs.readFile(WORKFLOW_PATH, 'utf8')
    expect(body).toContain('pull_request:')
    expect(body).toContain('push:')
    expect(body).toContain('main')
  })

  it('is syntactically valid YAML: no tabs, has name/on/jobs', async () => {
    const body = await fs.readFile(WORKFLOW_PATH, 'utf8')
    expect(body).not.toContain('\t')
    expect(body).toMatch(/^name:\s/m)
    expect(body).toMatch(/^on:\s*$/m)
    expect(body).toMatch(/^jobs:\s*$/m)
  })
})
