import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { scaffoldTemplates } from './scaffold-templates'

const FIXTURE_DIR = path.join(import.meta.dir, '__fixtures__', 'empty')
const TEMPLATES_DIR = path.join(import.meta.dir, '..', 'assets', 'templates')

describe('scaffoldTemplates', () => {
  beforeEach(async () => {
    await fs.mkdir(FIXTURE_DIR, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true })
  })

  it('writes AGENTS.md and ARCHITECTURE.md with placeholders substituted', async () => {
    const result = await scaffoldTemplates({
      targetDir: FIXTURE_DIR,
      templatesDir: TEMPLATES_DIR,
      projectName: 'my-app',
      stack: 'Next.js',
    })

    expect(result.filesWritten).toHaveLength(4)

    const agents = await fs.readFile(path.join(FIXTURE_DIR, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('my-app')
    expect(agents).toContain('Next.js')
    expect(agents).not.toContain('{{PROJECT_NAME}}')
    expect(agents).not.toContain('{{STACK}}')
  })

  // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — bug 2 (overwrite destrutivo).
  // package.json/AGENTS.md/ARCHITECTURE.md pre-existentes devem ser preservados (skip silencioso).
  it('preserves preexisting files instead of overwriting (no-overwrite guard)', async () => {
    const sentinel = '{"name":"user-customized","version":"9.9.9"}'
    await fs.writeFile(path.join(FIXTURE_DIR, 'package.json'), sentinel, 'utf8')

    const result = await scaffoldTemplates({
      targetDir: FIXTURE_DIR,
      templatesDir: TEMPLATES_DIR,
      projectName: 'my-app',
      stack: 'Next.js',
    })

    const preserved = await fs.readFile(path.join(FIXTURE_DIR, 'package.json'), 'utf8')
    expect(preserved).toBe(sentinel)
    expect(result.filesSkipped).toContain(path.join(FIXTURE_DIR, 'package.json'))
    expect(result.filesWritten).not.toContain(path.join(FIXTURE_DIR, 'package.json'))
  })
})
