// skills/init/lib/steps/inject-harness-scripts.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { injectHarnessScriptsStep } from './inject-harness-scripts'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-v7-inject-harness-'))
}

const EXPECTED_SCRIPTS = {
  'harness:validate': 'bun run scripts/harness-validate.ts',
  'compound:check': 'bun run scripts/compound-check.ts',
  'harness:all': 'bun run harness:validate && bun run compound:check',
}

describe('injectHarnessScriptsStep', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel = inject-harness-scripts', () => {
    expect(injectHarnessScriptsStep.id).toBe('inject-harness-scripts')
  })

  test('skip quando package.json nao existe (scaffold criara via template)', async () => {
    const report = await injectHarnessScriptsStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/skipped/)
  })

  test('injeta 3 scripts quando package.json nao tem campo scripts', async () => {
    const pkgPath = path.join(tmp, 'package.json')
    await fs.writeFile(pkgPath, JSON.stringify({ name: 'test', version: '1.0.0' }), 'utf8')

    const report = await injectHarnessScriptsStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.mutated).toBe(true)
    expect(report.summary).toMatch(/scriptsAdded: 3/)

    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as Record<string, unknown>
    const scripts = pkg['scripts'] as Record<string, string>
    for (const [key, val] of Object.entries(EXPECTED_SCRIPTS)) {
      expect(scripts[key]).toBe(val)
    }
  })

  test('injeta apenas scripts faltantes (idempotente — nao duplica)', async () => {
    const pkgPath = path.join(tmp, 'package.json')
    await fs.writeFile(pkgPath, JSON.stringify({
      name: 'test',
      scripts: { 'harness:validate': 'bun run scripts/harness-validate.ts' },
    }), 'utf8')

    const report = await injectHarnessScriptsStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.mutated).toBe(true)
    expect(report.summary).toMatch(/scriptsAdded: 2/)

    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as Record<string, unknown>
    const scripts = pkg['scripts'] as Record<string, string>
    expect(scripts['harness:validate']).toBe('bun run scripts/harness-validate.ts')
    expect(scripts['compound:check']).toBe('bun run scripts/compound-check.ts')
    expect(scripts['harness:all']).toBe('bun run harness:validate && bun run compound:check')
  })

  test('nao sobrescreve scripts ja existentes com valores diferentes', async () => {
    const customValue = 'node scripts/custom-validate.js'
    const pkgPath = path.join(tmp, 'package.json')
    await fs.writeFile(pkgPath, JSON.stringify({
      name: 'test',
      scripts: { 'harness:validate': customValue },
    }), 'utf8')

    await injectHarnessScriptsStep.run({ cwd: tmp, args: [], flags: {} })

    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as Record<string, unknown>
    const scripts = pkg['scripts'] as Record<string, string>
    expect(scripts['harness:validate']).toBe(customValue)
  })

  test('re-run idempotente: mutated false quando todos scripts ja existem', async () => {
    const pkgPath = path.join(tmp, 'package.json')
    await fs.writeFile(pkgPath, JSON.stringify({ name: 'test', scripts: {} }), 'utf8')

    await injectHarnessScriptsStep.run({ cwd: tmp, args: [], flags: {} })
    const second = await injectHarnessScriptsStep.run({ cwd: tmp, args: [], flags: {} })

    expect(second.mutated).toBe(false)
    expect(second.summary).toMatch(/scriptsAdded: 0/)
  })
})
