// 2026-05-24 (Luiz/dev): RED tests para patchAgentsMd — PRD CA-11/CA-12/D23
// RED phase: patch-agents.ts ausente — modulo nao existe ainda

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — modulo nao existe em RED phase; erro esperado ate GREEN
import { patchAgentsMd } from './patch-agents'

describe('patchAgentsMd', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'patch-agents-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('CA-11 idempotente: 2a invocacao e no-op bytewise identical', async () => {
    // AGENTS.md sem link compound
    const agentsPath = path.join(tmpDir, 'AGENTS.md')
    await fs.writeFile(
      agentsPath,
      '# AGENTS\n\n## Read Before Major Changes\n\nSome content here.\n',
    )

    await patchAgentsMd(tmpDir) // 1a vez: patched
    const after1 = await fs.readFile(agentsPath, 'utf-8')

    const r2 = await patchAgentsMd(tmpDir) // 2a vez: no-op
    const after2 = await fs.readFile(agentsPath, 'utf-8')

    expect(r2.status).toBe('already-present')
    expect(after1).toBe(after2) // bytewise identical — RNF-02
  })

  it('CA-12 detecta link com path relativo (./docs/...)', async () => {
    const agentsPath = path.join(tmpDir, 'AGENTS.md')
    await fs.writeFile(
      agentsPath,
      '# AGENTS\n\n- [Compound](./docs/COMPOUND_ENGINEERING.md)\n',
    )

    const r = await patchAgentsMd(tmpDir)
    expect(r.status).toBe('already-present')
  })

  it('CA-12 detecta link com path relativo (../docs/...)', async () => {
    const agentsPath = path.join(tmpDir, 'AGENTS.md')
    await fs.writeFile(
      agentsPath,
      '# AGENTS\n\n- [Compound](../docs/COMPOUND_ENGINEERING.md)\n',
    )

    const r = await patchAgentsMd(tmpDir)
    expect(r.status).toBe('already-present')
  })

  it('CA-12 detecta link sem prefixo (docs/...)', async () => {
    const agentsPath = path.join(tmpDir, 'AGENTS.md')
    await fs.writeFile(
      agentsPath,
      '# AGENTS\n\n- [Compound](docs/COMPOUND_ENGINEERING.md)\n',
    )

    const r = await patchAgentsMd(tmpDir)
    expect(r.status).toBe('already-present')
  })

  it('AGENTS.md ausente: cria arquivo com link (status created)', async () => {
    const r = await patchAgentsMd(tmpDir)

    expect(r.status).toBe('created')
    const content = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf-8')
    expect(content).toContain('COMPOUND_ENGINEERING.md')
  })

  it('secao ausente em AGENTS.md: append degraded (status appended)', async () => {
    const agentsPath = path.join(tmpDir, 'AGENTS.md')
    await fs.writeFile(agentsPath, '# AGENTS\n\nSome content without the section.\n')

    const r = await patchAgentsMd(tmpDir)

    expect(r.status).toBe('appended')
    const content = await fs.readFile(agentsPath, 'utf-8')
    expect(content).toContain('COMPOUND_ENGINEERING.md')
  })

  it('secao presente: insere link abaixo da secao (status patched)', async () => {
    const agentsPath = path.join(tmpDir, 'AGENTS.md')
    await fs.writeFile(
      agentsPath,
      '# AGENTS\n\n## Read Before Major Changes\n\nExisting item.\n',
    )

    const r = await patchAgentsMd(tmpDir)

    expect(r.status).toBe('patched')
    const content = await fs.readFile(agentsPath, 'utf-8')
    expect(content).toContain('COMPOUND_ENGINEERING.md')
    expect(content).toContain('## Read Before Major Changes')
  })
})
