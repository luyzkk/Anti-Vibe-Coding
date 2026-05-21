// 2026-05-21 (Luiz/dev): Plano 05 fase-04 — RF-12 4 docs extras AVC.
// Tests that harness-validate detects missing docs/CODE_STYLE.md and .claude/CLAUDE.md.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { $ } from 'bun'

const harnessPath = path.resolve(import.meta.dir, 'harness-validate.ts')

describe('harness-validate RF-12 — 4 docs extras AVC', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-harness-rf12-'))
    await fs.mkdir(path.join(cwd, 'docs'), { recursive: true })
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('RED: missing docs/CODE_STYLE.md causes harness to fail with clear message', async () => {
    // Minimal fixture — no files created. Harness should fail reporting CODE_STYLE.md missing.
    const result = await $`cd ${cwd} && bun ${harnessPath}`.quiet().nothrow()
    expect(result.exitCode).not.toBe(0)
    const stderr = result.stderr.toString()
    expect(stderr).toContain('Missing required file: docs/CODE_STYLE.md')
  })

  test('RED: missing .claude/CLAUDE.md causes harness to fail with clear message', async () => {
    const result = await $`cd ${cwd} && bun ${harnessPath}`.quiet().nothrow()
    expect(result.exitCode).not.toBe(0)
    const stderr = result.stderr.toString()
    expect(stderr).toContain('Missing required file: .claude/CLAUDE.md')
  })
})
