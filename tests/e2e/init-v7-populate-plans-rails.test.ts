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

  test('CA-04: FRONTEND.md fase plan contains app/views and app/assets in Wave 1', async () => {
    await runInit([], { cwd })

    // Nova hierarquia: fase-02-docs-frontend.md dentro da pasta populate-harness
    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const harnessDir = (await fs.readdir(activeDir)).find(d => d.includes('-populate-harness'))
    expect(harnessDir, 'populate-harness dir').toBeDefined()

    const frontendFase = (await fs.readdir(path.join(activeDir, harnessDir!))).find(f =>
      f.includes('docs-frontend'),
    )
    expect(frontendFase, 'frontend fase file').toBeDefined()
    const content = await fs.readFile(
      path.join(activeDir, harnessDir!, frontendFase!),
      'utf-8',
    )
    // Wave 1 Discovery deve usar paths Rails (app/views, app/assets)
    // Nota: detection signals listam ambos os stacks — verificar Wave 1 section especificamente
    const wave1Match = content.match(/### Wave 1 — Discovery([\s\S]*?)###/)
    const wave1 = wave1Match ? wave1Match[1] : ''
    expect(wave1).toContain('app/views')
    expect(wave1).toContain('app/assets')
    expect(wave1).not.toContain('src/components')
  })

  test('Rails SECURITY fase plan uses Gemfile and config/initializers (not Node paths)', async () => {
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const harnessDir = (await fs.readdir(activeDir)).find(d => d.includes('-populate-harness'))!
    const securityFase = (await fs.readdir(path.join(activeDir, harnessDir)))
      .find(f => f.includes('docs-security'))!
    const content = await fs.readFile(
      path.join(activeDir, harnessDir, securityFase),
      'utf-8',
    )
    expect(content).toContain('Gemfile')
    expect(content).not.toContain('package.json')
  })
})
