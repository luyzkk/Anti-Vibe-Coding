// skills/init/lib/steps/90-final-validation.test.ts
// 2026-05-17 (Luiz/dev): 2 cenarios — success (exit 0), failure (exit !=0 throws AbortError).
// TDD: RED first. PRD CA-09.
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { finalValidationStep } from './90-final-validation'
import { AbortError } from './abort-error'

const ctx = (cwd: string) => ({
  cwd,
  args: [] as readonly string[],
  flags: {} as Readonly<Record<string, boolean | string>>,
})

async function setupTmp(scriptBody: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'validate-test-'))
  await mkdir(path.join(dir, 'scripts'), { recursive: true })
  await writeFile(path.join(dir, 'scripts', 'harness-validate.ts'), scriptBody)
  return dir
}

describe('finalValidationStep', () => {
  let tmpDir: string
  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
  })

  test('success (exit 0): returns summary with commit suggestion', async () => {
    tmpDir = await setupTmp('process.exit(0)\n')
    const r = await finalValidationStep.run(ctx(tmpDir))
    expect(r.mutated).toBe(false)
    const lines = r.summary.split('\n')
    expect(lines[0]).toBe(
      "Migration validated. Suggested commit: git commit -m 'chore: migrate to anti-vibe-coding v6.0.0'",
    )
    expect(lines[1]).toBe('Add .planning.v5-backup/ to .gitignore (or delete after confirming all is well).')
  })

  test('failure (exit non-zero): throws AbortError with rollback reason', async () => {
    tmpDir = await setupTmp('process.exit(2)\n')
    try {
      await finalValidationStep.run(ctx(tmpDir))
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AbortError)
      if (e instanceof AbortError) {
        expect(e.code).toBe(2)
        const lines = e.reason.split('\n')
        expect(lines[0]).toBe('WARN: harness:validate failed after migration. Inspect output above.')
        expect(lines[1]).toBe(
          'Backup is at .planning.v5-backup/ — to roll back: git revert HEAD && cp -r .planning.v5-backup/.planning ./',
        )
      }
    }
  })
})
