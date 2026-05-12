// 2026-05-12 (Luiz/dev): valida que package.json.tpl tem scripts dos 2 validators.
// Plano 04 fase-05. Atende D13 (bun), M5+M6 (scripts disponíveis localmente).

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const TPL_PATH = path.resolve(
  import.meta.dir,
  '..',
  'skills/init/assets/templates/package.json.tpl',
)

type PackageJsonTpl = {
  name: string
  version: string
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}

describe('package.json.tpl template', () => {
  it('parses as valid JSON (placeholders are inside string values)', async () => {
    const body = await fs.readFile(TPL_PATH, 'utf8')
    // {{PROJECT_NAME}} fica dentro de string — JSON.parse aceita normalmente
    expect(() => JSON.parse(body)).not.toThrow()
  })

  it('has harness:validate, compound:check and harness:all scripts', async () => {
    const body = await fs.readFile(TPL_PATH, 'utf8')
    const parsed = JSON.parse(body) as PackageJsonTpl
    expect(parsed.scripts['harness:validate']).toBe('bun run scripts/harness-validate.ts')
    expect(parsed.scripts['compound:check']).toBe('bun run scripts/compound-check.ts')
    expect(parsed.scripts['harness:all']).toBe('bun run harness:validate && bun run compound:check')
  })

  it('has placeholder for project name (replaced by /init)', async () => {
    const body = await fs.readFile(TPL_PATH, 'utf8')
    expect(body).toContain('{{PROJECT_NAME}}')
  })

  it('declares TypeScript and Node types as devDependencies', async () => {
    const body = await fs.readFile(TPL_PATH, 'utf8')
    const parsed = JSON.parse(body) as PackageJsonTpl
    expect(parsed.devDependencies['typescript']).toBeDefined()
    expect(parsed.devDependencies['@types/node']).toBeDefined()
  })
})
