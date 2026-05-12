// 2026-05-11 (Luiz/dev): testes parametricos de heuristica de stack.
// Plano 02 fase-06 — atende CA-07, CA-08, CA-21, G6.
// RED: escritos antes de detect-stack.ts existir.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectStack } from './detect-stack'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'detect')

async function reset(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(FIXTURE, { recursive: true })
}

async function writeJson(rel: string, data: unknown): Promise<void> {
  await fs.writeFile(path.join(FIXTURE, rel), JSON.stringify(data, null, 2), 'utf8')
}

describe('detectStack', () => {
  beforeEach(reset)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('CA-07: detects nextjs from package.json#dependencies.next', async () => {
    await writeJson('package.json', { dependencies: { next: '^14.0.0' } })
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('nextjs')
    expect(result.signalSource).toContain('package.json')
  })

  it('detects node-ts from devDependencies.typescript (no next)', async () => {
    await writeJson('package.json', { devDependencies: { typescript: '^5.4.0' } })
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('node-ts')
  })

  it('CA-08: detects rails from Gemfile', async () => {
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), 'source "https://rubygems.org"\ngem "rails", "~> 7.1"\n', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('rails')
  })

  it('detects laravel from composer.json (deferred)', async () => {
    await writeJson('composer.json', { require: { 'laravel/framework': '^11.0' } })
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('laravel')
  })

  it('detects python from pyproject.toml', async () => {
    await fs.writeFile(path.join(FIXTURE, 'pyproject.toml'), '[tool.poetry]\nname = "x"\n', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('python')
  })

  it('CA-21: returns unknown when no signal present', async () => {
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('unknown')
    expect(result.signalSource).toBe('no signal')
  })

  it('G6: monorepo with both package.json{next} and Gemfile picks nextjs (first probe wins)', async () => {
    await writeJson('package.json', { dependencies: { next: '14' } })
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), 'gem "rails"\n', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('nextjs') // documentado no JSDoc de PROBES
  })

  it('does not throw on corrupted package.json', async () => {
    await fs.writeFile(path.join(FIXTURE, 'package.json'), '{ not json', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.id).toBe('unknown') // engolido com graca
  })
})
