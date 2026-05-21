// tests/e2e/init-v7-populate-plans-rails.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — CA-04 via fixture Rails.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { copyFixtureToTmp } from './__fixtures__/v7-populate-helpers'
import { runInit } from '../../skills/init/lib/run-init'

describe('e2e: init v7 generate-populate-plans (Rails)', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await copyFixtureToTmp('v7-populate-rails')
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('CA-04: FRONTEND.md plan contains app/views and app/assets in Wave 1', async () => {
    await runInit([], { cwd })

    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const frontendDir = (await fs.readdir(activeDir))
      .find(d => d.endsWith('populate-docs-frontend-md'))
    expect(frontendDir, 'FRONTEND.md populate dir').toBeDefined()

    const content = await fs.readFile(
      path.join(activeDir, frontendDir!, 'PLAN.md'),
      'utf-8',
    )
    expect(content).toContain('app/views')
    expect(content).toContain('app/assets')
    expect(content).not.toContain('src/components')
  })

  test('Rails SECURITY plan uses Gemfile and config/initializers (not Node paths)', async () => {
    await runInit([], { cwd })
    const securityDir = (await fs.readdir(path.join(cwd, 'docs/exec-plans/active')))
      .find(d => d.endsWith('populate-docs-security-md'))!
    const content = await fs.readFile(
      path.join(cwd, 'docs/exec-plans/active', securityDir, 'PLAN.md'),
      'utf-8',
    )
    expect(content).toContain('Gemfile')
    expect(content).not.toContain('package.json')
  })
})
