// 2026-05-11 (Luiz/dev): valida que GH files instalam com adaptacoes bun.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { installGhFiles } from './install-gh-files'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'gh')

describe('installGhFiles', () => {
  beforeEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
    await fs.mkdir(FIXTURE, { recursive: true })
  })
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('writes both .github files', async () => {
    const result = await installGhFiles(FIXTURE)
    expect(result.filesWritten).toHaveLength(2)
    await fs.access(path.join(FIXTURE, '.github/workflows/harness.yml'))
    await fs.access(path.join(FIXTURE, '.github/pull_request_template.md'))
  })

  it('CA-12: harness.yml references bun run harness:validate', async () => {
    await installGhFiles(FIXTURE)
    const yml = await fs.readFile(path.join(FIXTURE, '.github/workflows/harness.yml'), 'utf8')
    expect(yml).toContain('bun run harness:validate')
    expect(yml).not.toContain('npm run harness:validate') // D13 — bun, nao npm
    // 2026-09-04 (Luiz/dev): era `toContain('oven-sh/setup-bun@v2')`, que exigia a tag FLUTUANTE e
    // por isso proibia o pin. A intencao (setup-bun v2, nao v1, nao npm) esta preservada e ficou
    // mais forte: agora exige SHA de 40 chars com a versao no comentario.
    expect(yml).toMatch(/oven-sh\/setup-bun@[0-9a-f]{40} # v2/)
  })

  // 2026-09-04 (Luiz/dev): o CI do proprio plugin fixa actions por SHA com o comentario
  // "supply-chain hardening", mas o template shipado usava tags moveis — o plugin se aplicava um
  // padrao que nao entregava. Este teste trava o alinhamento.
  it('ships every third-party action pinned to a commit SHA', async () => {
    await installGhFiles(FIXTURE)
    const yml = await fs.readFile(path.join(FIXTURE, '.github/workflows/harness.yml'), 'utf8')
    const uses = yml.match(/^\s*-?\s*uses:.*$/gm) ?? []
    expect(uses.length).toBeGreaterThan(0)
    for (const line of uses) {
      expect(line).toMatch(/@[0-9a-f]{40} # v\d+/)
    }
  })

  it('ships a least-privilege permissions block and a timeout', async () => {
    await installGhFiles(FIXTURE)
    const yml = await fs.readFile(path.join(FIXTURE, '.github/workflows/harness.yml'), 'utf8')
    // Sem `permissions`, o job herda o default do repo — `contents: write` em repos antigos.
    expect(yml).toMatch(/permissions:\s*\n\s*contents:\s*read/)
    expect(yml).toMatch(/timeout-minutes:\s*\d+/)
  })

  it('PR template uses bun in checklist (no npm leftovers)', async () => {
    await installGhFiles(FIXTURE)
    const pr = await fs.readFile(path.join(FIXTURE, '.github/pull_request_template.md'), 'utf8')
    expect(pr).toContain('`bun run harness:validate`')
    expect(pr).not.toContain('`npm run')
  })

  it('YAML is valid: starts with `name:` and has no tabs', async () => {
    await installGhFiles(FIXTURE)
    const yml = await fs.readFile(path.join(FIXTURE, '.github/workflows/harness.yml'), 'utf8')
    expect(yml.startsWith('# ')).toBe(true) // header de provenance
    expect(yml).toContain('name: Harness Guardrails')
    expect(yml).not.toContain('\t') // YAML rejeita tabs
  })
})
