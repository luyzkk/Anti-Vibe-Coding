// scripts/grep-deleted-steps.test.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-05 — testes para CA-09 grep-gate.
// RED: testar que patterns deletados sao detectados e que o scan de skills/init/lib/ retorna vazio.

import { describe, test, expect } from 'bun:test'
import { $ } from 'bun'
import path from 'node:path'

const SCRIPT = path.join(import.meta.dir, 'grep-deleted-steps.ts')

describe('grep-deleted-steps (CA-09 grep-gate)', () => {
  test('exits 0 when no deleted patterns found in skills/init/lib/', async () => {
    const result = await $`bun ${SCRIPT}`.quiet().nothrow()
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain('OK')
  })
})
