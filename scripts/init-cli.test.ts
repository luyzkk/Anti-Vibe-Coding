// Smoke test do CLI wrapper init-cli.ts. Confirma que o entrypoint resolve runInit().
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

describe('scripts/init-cli.ts', () => {
  it('existe como arquivo executavel', async () => {
    const cliPath = path.join(import.meta.dir, 'init-cli.ts')
    const stat = await fs.stat(cliPath)
    expect(stat.isFile()).toBe(true)
  })

  it('importa runInit de skills/init/lib/run-init', async () => {
    const cliPath = path.join(import.meta.dir, 'init-cli.ts')
    const content = await fs.readFile(cliPath, 'utf8')
    expect(content).toContain('runInit')
    expect(content).toContain('skills/init/lib/run-init')
  })

  it('chama runInit com process.argv.slice(2) e process.cwd()', async () => {
    const cliPath = path.join(import.meta.dir, 'init-cli.ts')
    const content = await fs.readFile(cliPath, 'utf8')
    expect(content).toContain('process.argv.slice(2)')
    expect(content).toContain('process.cwd()')
  })

  it('faz process.exit(result.code) quando kind === aborted', async () => {
    const cliPath = path.join(import.meta.dir, 'init-cli.ts')
    const content = await fs.readFile(cliPath, 'utf8')
    expect(content).toMatch(/result\.kind\s*===\s*['"]aborted['"]/)
    expect(content).toContain('process.exit(result.code)')
  })
})
