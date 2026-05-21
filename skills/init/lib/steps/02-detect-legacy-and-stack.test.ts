// skills/init/lib/steps/02-detect-legacy-and-stack.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-02 — testes unitarios para o Step 2 read-only.
// RF-01: step nunca aborta mesmo com legacy detectado. Apenas popula ctx.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { detectLegacyAndStackStep } from './02-detect-legacy-and-stack'

describe('detectLegacyAndStackStep', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'init-v7-detect-'))
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  test('greenfield Node.js: stack=node-ts, legacy.isLegacy=false', async () => {
    await writeFile(
      path.join(cwd, 'package.json'),
      JSON.stringify({ name: 'demo', devDependencies: { typescript: '^5' } }),
    )
    const ctx = { cwd, args: [], flags: {} } as Record<string, unknown>
    const report = await detectLegacyAndStackStep.run(ctx as never)
    expect(report.mutated).toBe(false)
    expect((ctx['stack'] as { primary: string } | undefined)?.primary).toBe('node-ts')
    expect((ctx['legacy'] as { isLegacy: boolean } | undefined)?.isLegacy).toBe(false)
  })

  test('legacy v5.x detected does NOT abort (RF-01)', async () => {
    // 2026-05-21 (Luiz/dev): .claude/plans/ com conteudo simula artefato v5.x (claude-plans-dir probe).
    // A spec original usava .claude/planning/ mas esse diretorio nao e um probe em detect-v5-legacy.ts.
    // Corrigido para .claude/plans/ que eh o probe real (CLAUDE_DIR_PROBES linha 58).
    await mkdir(path.join(cwd, '.claude', 'plans'), { recursive: true })
    await writeFile(path.join(cwd, '.claude', 'plans', 'old.md'), '# legacy')
    const ctx = { cwd, args: [], flags: {} } as Record<string, unknown>
    const report = await detectLegacyAndStackStep.run(ctx as never)
    expect(report.mutated).toBe(false)
    expect((ctx['legacy'] as { isLegacy: boolean } | undefined)?.isLegacy).toBe(true)
    expect(report.summary).toContain('legacy v5.x')
  })

  test('no stack signal: stack.primary=null, no abort', async () => {
    const ctx = { cwd, args: [], flags: {} } as Record<string, unknown>
    const report = await detectLegacyAndStackStep.run(ctx as never)
    expect((ctx['stack'] as { primary: unknown } | undefined)?.primary).toBeNull()
    expect(report.summary).toContain('stack=unknown')
  })

  test('Rails detected via Gemfile (D12)', async () => {
    await writeFile(
      path.join(cwd, 'Gemfile'),
      'source "https://rubygems.org"\ngem "rails"',
    )
    const ctx = { cwd, args: [], flags: {} } as Record<string, unknown>
    await detectLegacyAndStackStep.run(ctx as never)
    expect((ctx['stack'] as { primary: string } | undefined)?.primary).toBe('rails')
  })
})
