// tests/e2e/ca15-performance.test.ts
// 2026-05-18 (Luiz/dev): CA-15 do PRD refactor-init-harness-populate-merge.
// Detecta regressao no Step 07 (Glob recursivo whitelisted) em escala 500 .md.

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'

const TOTAL_FILES = 500
const PERF_BUDGET_MS = 120_000 // 120s — CA-15 do PRD

// 2026-05-21 (Luiz/dev): init-refactor-v7 D4 deletou modo --dry-run inteiramente.
// Side-channel `.anti-vibe ausente = dry-run OK` nao se aplica mais. Cobertura de
// performance vive em `init-v7-final-acceptance.test.ts` NFR (greenfield <30s).
describe.skip('CA-15 performance test — init --dry-run < 120s em 500 .md', () => {
  let tmp: string

  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ca15-perf-'))

    await fs.mkdir(path.join(tmp, 'docs'), { recursive: true })
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })

    const distribution: Array<{ dir: string; count: number }> = [
      { dir: tmp, count: 167 },
      { dir: path.join(tmp, 'docs'), count: 167 },
      { dir: path.join(tmp, '.claude'), count: 166 },
    ]

    // 2026-05-18 (Luiz/dev): batch generation — G5 do plano07 README.
    // Em Windows NTFS, 500 Promise.all paralelas saturam I/O. BATCH_SIZE=50 resolve.
    const tasks: Array<Promise<void>> = []
    let globalIndex = 0
    for (const { dir, count } of distribution) {
      for (let i = 0; i < count; i++) {
        const filePath = path.join(dir, `synthetic-${String(globalIndex).padStart(4, '0')}.md`)
        const content = `# Synthetic Doc ${globalIndex}\n\nContent placeholder para CA-15 performance test.\n`
        tasks.push(fs.writeFile(filePath, content))
        globalIndex++
      }
    }

    const BATCH_SIZE = 50
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      await Promise.all(tasks.slice(i, i + BATCH_SIZE))
    }

    const totalCreated = (await Promise.all(
      distribution.map(({ dir }) =>
        fs.readdir(dir).then((entries) => entries.filter((e) => e.endsWith('.md')).length),
      ),
    )).reduce((a, b) => a + b, 0)
    expect(totalCreated).toBe(TOTAL_FILES)
  }, 60_000)

  afterAll(async () => {
    try { await fs.rm(tmp, { recursive: true, force: true }) } catch { /* G12 — Windows handle leak */ }
  })

  it('runInit --dry-run em 500 .md completa em < 120s', async () => {
    // 2026-05-18 (Luiz/dev): CA-15 — performance.now() medindo dispatcher completo.
    // Fixture sem CLAUDE.md: Steps 09/10/11 sao no-ops; Step 07 escaneia os 500 .md.
    // Se CI lento causar flakiness >5%, considerar:
    //   test.skipIf(process.env.CI === 'true' && process.env.SLOW_FS === '1')
    // NAO aplicado preventivamente — apenas reativo.
    const t0 = performance.now()
    const result = await runInit(['--dry-run'], { cwd: tmp })
    const elapsed = performance.now() - t0

    expect(result).toBeDefined()
    expect(elapsed).toBeLessThan(PERF_BUDGET_MS)

    // Side-channel: confirma que --dry-run nao mutou o fixture
    const filesInTmp = await fs.readdir(tmp)
    expect(filesInTmp).not.toContain('.anti-vibe')
  }, PERF_BUDGET_MS + 30_000)
})
