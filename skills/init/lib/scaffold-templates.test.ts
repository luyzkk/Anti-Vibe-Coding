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

    expect(result.filesWritten).toHaveLength(2)

    const agents = await fs.readFile(path.join(FIXTURE_DIR, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('my-app')
    expect(agents).toContain('Next.js')
    expect(agents).not.toContain('{{PROJECT_NAME}}')
    expect(agents).not.toContain('{{STACK}}')
  })
})
