// 2026-05-12 (Luiz/dev): testes RED para path-resolver-v6 — cobre v6, v5 e cru (Plano 05 fase-01)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { resolvePaths } from './path-resolver-v6'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-path-resolver-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('resolvePaths', () => {
  it('detects v6 layout when docs/compound and docs/exec-plans both exist', async () => {
    // 2026-05-12 (Luiz/dev): G2 — heuristica conjunta, nao apenas um dos dois dirs
    await fs.mkdir(path.join(tmpDir, 'docs', 'compound'), { recursive: true })
    await fs.mkdir(path.join(tmpDir, 'docs', 'exec-plans'), { recursive: true })

    const result = await resolvePaths(tmpDir)

    expect(result.layout).toBe('v6')
    expect(result.compoundDir).toBe(path.join(tmpDir, 'docs', 'compound'))
    expect(result.execPlansActiveDir).toBe(path.join(tmpDir, 'docs', 'exec-plans', 'active'))
    expect(result.execPlansCompletedDir).toBe(path.join(tmpDir, 'docs', 'exec-plans', 'completed'))
  })

  it('detects v5 layout when only lessons-learned.md exists (no docs/compound)', async () => {
    // 2026-05-12 (Luiz/dev): D10 — projetos v5 retornam layout v5 sem criar novas pastas
    await fs.writeFile(path.join(tmpDir, 'lessons-learned.md'), '# Lessons\n', 'utf-8')

    const result = await resolvePaths(tmpDir)

    expect(result.layout).toBe('v5')
    expect(result.legacyLessonsFile).toBe(path.join(tmpDir, 'lessons-learned.md'))
  })

  it('detects cru layout when neither docs/compound nor lessons-learned.md exists', async () => {
    // 2026-05-12 (Luiz/dev): G2 — projeto virgem cai em cru (v5-default conforme Ambiguity 05-A2)
    const result = await resolvePaths(tmpDir)

    expect(result.layout).toBe('cru')
    expect(result.legacyLessonsFile).toBe(path.join(tmpDir, 'lessons-learned.md'))
  })

  it('does NOT detect v6 when only docs/compound exists (missing docs/exec-plans)', async () => {
    // 2026-05-12 (Luiz/dev): G2 do plano — AND obrigatorio, evita falso-positivo
    await fs.mkdir(path.join(tmpDir, 'docs', 'compound'), { recursive: true })

    const result = await resolvePaths(tmpDir)

    expect(result.layout).not.toBe('v6')
  })
})
