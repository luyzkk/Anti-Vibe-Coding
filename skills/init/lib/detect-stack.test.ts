// 2026-05-11 (Luiz/dev): testes parametricos de heuristica de stack.
// Plano 02 fase-06 — atende CA-07, CA-08, CA-21, G6.
// RED: escritos antes de detect-stack.ts existir.
// 2026-05-18 (Luiz/dev): D22 multi-stack contract — RF3 + CA-07 + CA-06 (fase-03)

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
    expect(result.primary).toBe('nextjs')
    expect(result.signalSource).toContain('package.json')
  })

  it('detects node-ts from devDependencies.typescript (no next)', async () => {
    await writeJson('package.json', { devDependencies: { typescript: '^5.4.0' } })
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBe('node-ts')
  })

  it('CA-08: detects rails from Gemfile', async () => {
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), 'source "https://rubygems.org"\ngem "rails", "~> 7.1"\n', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBe('rails')
  })

  it('detects laravel from composer.json (deferred)', async () => {
    await writeJson('composer.json', { require: { 'laravel/framework': '^11.0' } })
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBe('laravel')
  })

  it('detects python from pyproject.toml', async () => {
    await fs.writeFile(path.join(FIXTURE, 'pyproject.toml'), '[tool.poetry]\nname = "x"\n', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBe('python')
  })

  it('CA-21: returns primary=null when no signal present', async () => {
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBeNull()
    expect(result.signalSource).toBe('no signal')
  })

  it('G6: monorepo Next+Rails — primary=nextjs, secondary contains rails', async () => {
    await writeJson('package.json', { dependencies: { next: '14' } })
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), 'gem "rails"\n', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBe('nextjs') // documentado no JSDoc de PROBES
    expect(result.secondary).toContain('rails')
  })

  it('does not throw on corrupted package.json', async () => {
    await fs.writeFile(path.join(FIXTURE, 'package.json'), '{ not json', 'utf8')
    const result = await detectStack(FIXTURE)
    expect(result.primary).toBeNull() // engolido com graca
  })

  // 2026-05-18 (Luiz/dev): D22 multi-stack contract — RED antes de refactor (fase-03)
  it('CA-02 happy: Rails moderno retorna { primary: "rails", secondary: [], anchorFiles: ["Gemfile"] }', async () => {
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), "gem 'rails', '~> 8.0'\n", 'utf8')
    const r = await detectStack(FIXTURE)
    expect(r.primary).toBe('rails')
    expect(r.secondary).toEqual([])
    expect(r.anchorFiles).toContain('Gemfile')
  })

  it('CA-07 monorepo: Rails+Node sem typescript retorna { primary: "rails", secondary: [], anchorFiles includes Gemfile+package.json }', async () => {
    // Opcao C da fase: package.json MINIMO sem typescript — Rails vira primary, Node nao dispara
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), "gem 'rails', '~> 8.0'\n", 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'package.json'),
      JSON.stringify({ name: 'frontend', scripts: { build: 'echo ok' } }), 'utf8')
    const r = await detectStack(FIXTURE)
    expect(r.primary).toBe('rails')
    expect(r.anchorFiles).toEqual(expect.arrayContaining(['Gemfile', 'package.json']))
  })

  it('CA-03 fallback Sinatra: primary=null, anchorFiles=["Gemfile"] para visibilidade telemetria', async () => {
    await fs.writeFile(path.join(FIXTURE, 'Gemfile'), "gem 'sinatra'\n", 'utf8')
    const r = await detectStack(FIXTURE)
    expect(r.primary).toBeNull()
    expect(r.secondary).toEqual([])
    expect(r.anchorFiles).toContain('Gemfile')
  })

  it('CA-21 zero signal: primary=null, anchorFiles=[]', async () => {
    const r = await detectStack(FIXTURE)
    expect(r.primary).toBeNull()
    expect(r.anchorFiles).toEqual([])
  })
})
