import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, cp } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { detectStackAndRegisterStep } from './03-detect-stack-and-register'

// 2026-05-17 (Luiz/dev): DEV-1 — signalSource reais do helper:
// 'package.json#dependencies.next', 'package.json#devDependencies.typescript', 'no signal'.
// Plano usava regex [a-z-]+ que nao bate esses valores. Regex ajustada para \S+ (sem espaco).
// Confirmado em detect-stack.ts antes do RED.

const FIX = path.join(import.meta.dir, '__fixtures__')

const ctx = (cwd: string) => ({
  cwd,
  args: [] as readonly string[],
  flags: {} as Readonly<Record<string, boolean | string>>,
})

async function copyFixture(name: string): Promise<string> {
  const dst = await mkdtemp(path.join(os.tmpdir(), `stack-${name}-`))
  await cp(path.join(FIX, name), dst, { recursive: true })
  return dst
}

describe('detectStackAndRegisterStep', () => {
  let tmpDir: string
  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
  })

  test('nextjs: summary mentions nextjs id and signalSource', async () => {
    tmpDir = await copyFixture('stack-nextjs')
    const report = await detectStackAndRegisterStep.run(ctx(tmpDir))
    expect(report.mutated).toBe(true)
    const lines = report.summary.split('\n')
    expect(lines[0]).toMatch(/^Detected stack: nextjs \(via \S+\)$/)
    expect(lines[1]).toMatch(/^STATE\.md (created|updated): .+STATE\.md$/)
  })

  test('node-ts: summary mentions node-ts', async () => {
    tmpDir = await copyFixture('stack-node')
    const report = await detectStackAndRegisterStep.run(ctx(tmpDir))
    const lines = report.summary.split('\n')
    expect(lines[0]).toMatch(/^Detected stack: node-ts \(via \S+\)$/)
  })

  test('unknown: summary mentions unknown id', async () => {
    tmpDir = await copyFixture('stack-unknown')
    const report = await detectStackAndRegisterStep.run(ctx(tmpDir))
    const lines = report.summary.split('\n')
    // signalSource para unknown e 'no signal' (com espaco) — regex aceita qualquer coisa apos 'via '
    expect(lines[0]).toMatch(/^Detected stack: unknown \(via .+\)$/)
  })
})
