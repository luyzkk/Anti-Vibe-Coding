// tests/e2e/__fixtures__/v7-populate-helpers.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — RED para o helper de copia de fixtures.

import { test, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { copyFixtureToTmp } from './v7-populate-helpers'

test('copyFixtureToTmp copies fixture to a temp directory', async () => {
  const dst = await copyFixtureToTmp('v7-populate-node')
  const entries = await fs.readdir(dst)
  // v7-populate-node tem package.json (sem .gitkeep no dst)
  expect(entries).toContain('package.json')
  expect(entries).not.toContain('.gitkeep')
  await fs.rm(dst, { recursive: true, force: true })
})

test('copyFixtureToTmp no-stack fixture produces empty temp dir', async () => {
  const dst = await copyFixtureToTmp('v7-populate-no-stack')
  const entries = await fs.readdir(dst)
  // v7-populate-no-stack so tem .gitkeep — deve ser ignorado
  expect(entries.length).toBe(0)
  await fs.rm(dst, { recursive: true, force: true })
})
