// 2026-05-20 (Luiz/dev): D6 do PRD knowledge-path-cutover — bump minor 6.5.1 → 6.6.0.
// Garante que os 4 arquivos JSON principais estao sincronizados.
// Rodar: bun test tests/repo-structure/version-bump.test.ts

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..')
const EXPECTED_VERSION = '6.6.0'

async function readJson(relPath: string): Promise<Record<string, unknown>> {
  const content = await fs.readFile(path.join(REPO_ROOT, relPath), 'utf-8')
  return JSON.parse(content) as Record<string, unknown>
}

describe('version bump 6.6.0 (D6)', () => {
  it('package.json has version 6.6.0', async () => {
    const pkg = await readJson('package.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })

  it('.claude-plugin/plugin.json has version 6.6.0', async () => {
    const pkg = await readJson('.claude-plugin/plugin.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })

  it('.claude-plugin/marketplace.json has version 6.6.0', async () => {
    const pkg = await readJson('.claude-plugin/marketplace.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })

  it('plugin-manifest.json has version 6.6.0', async () => {
    const pkg = await readJson('plugin-manifest.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })
})
