// 2026-05-20 (Luiz/dev): D6 do PRD knowledge-path-cutover — bump minor 6.5.1 → 6.6.0.
// 2026-05-20 (Luiz/dev): Patch 6.6.1 — alinhamento de boundary tests do reentry-guard (verify-work).
// 2026-05-20 (Luiz/dev): Minor 6.7.0 — populate-plan-andre-port + gate path drift fix + caveats cleanup.
// 2026-05-21 (Luiz/dev): Major 7.0.0 — init-refactor-v7. Pipeline 17 -> 10 steps, D4 dry-run removido,
//   DR-2 abort code=20 (greenfield stack=null), StepContext type changes. Breaking.
// 2026-06-05 (Luiz/dev): Minor 7.4.0 — skill-parity-refresh: agente code-reviewer (frota 13->14) +
//   ~81 grafts verificados em 19 skills/3 agents. Tambem realinha marketplace.json (estava em 7.0.0,
//   drift desde 7.0.0 enquanto package/plugin/manifest seguiram para 7.3.0) e este EXPECTED_VERSION.
// Garante que os 4 arquivos JSON principais estao sincronizados.
// Rodar: bun test tests/repo-structure/version-bump.test.ts

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..')
const EXPECTED_VERSION = '7.4.0'

async function readJson(relPath: string): Promise<Record<string, unknown>> {
  const content = await fs.readFile(path.join(REPO_ROOT, relPath), 'utf-8')
  return JSON.parse(content) as Record<string, unknown>
}

describe('version bump 7.4.0 (skill-parity-refresh — code-reviewer agent + grafts)', () => {
  it('package.json has version 7.4.0', async () => {
    const pkg = await readJson('package.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })

  it('.claude-plugin/plugin.json has version 7.4.0', async () => {
    const pkg = await readJson('.claude-plugin/plugin.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })

  it('.claude-plugin/marketplace.json has version 7.4.0', async () => {
    const pkg = await readJson('.claude-plugin/marketplace.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })

  it('plugin-manifest.json has version 7.4.0', async () => {
    const pkg = await readJson('plugin-manifest.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })
})
