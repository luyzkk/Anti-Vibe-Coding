// 2026-05-25 (Luiz/dev): RED first — Step 11 writeAntiVibeManifestStep.
// Cobre: (a) grava manifest com pluginVersion atual, (b) backup v5.x, (c) idempotencia.
// Bug raiz: registry v7 nunca escrevia .anti-vibe-manifest.json — apos /init,
// /sync seguia reportando "desatualizado" porque o arquivo nao era atualizado.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { writeAntiVibeManifestStep } from './11-write-anti-vibe-manifest'
import type { StepContext } from './types'

function makeCtx(cwd: string): StepContext {
  return { cwd, args: [], flags: {} }
}

describe('writeAntiVibeManifestStep', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(tmpdir(), 'step11-'))
  })

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('writes .anti-vibe-manifest.json with current pluginVersion and initMode fresh', async () => {
    const report = await writeAntiVibeManifestStep.run(makeCtx(tmp))

    const manifestPath = path.join(tmp, '.claude', '.anti-vibe-manifest.json')
    const raw = await fs.readFile(manifestPath, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>

    expect(parsed['pluginVersion']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(parsed['pluginVersion']).not.toBe('6.7.0') // nao fallback
    expect(parsed['initMode']).toBe('fresh')
    expect(typeof parsed['installedAt']).toBe('string')
    expect(new Date(parsed['installedAt'] as string).toString()).not.toBe('Invalid Date')
    expect(parsed['files']).toEqual({})
    expect(report.mutated).toBe(true)
  })

  it('backs up pre-existing v5.x manifest before overwriting', async () => {
    const claudeDir = path.join(tmp, '.claude')
    await fs.mkdir(claudeDir, { recursive: true })
    const oldManifest = {
      pluginVersion: '5.3.0',
      installedAt: '2026-03-23T00:00:00.000Z',
      initMode: 'fresh',
      files: { 'docs/STATE.md': 'abc123' },
    }
    const manifestPath = path.join(claudeDir, '.anti-vibe-manifest.json')
    await fs.writeFile(manifestPath, JSON.stringify(oldManifest, null, 2))

    await writeAntiVibeManifestStep.run(makeCtx(tmp))

    // Backup existe com timestamp no nome
    const entries = await fs.readdir(claudeDir)
    const backup = entries.find((e) => e.startsWith('.anti-vibe-manifest.json.backup-v5.'))
    expect(backup).toBeDefined()

    // Backup preserva conteudo original
    const backupRaw = await fs.readFile(path.join(claudeDir, backup as string), 'utf-8')
    expect(JSON.parse(backupRaw)).toEqual(oldManifest)

    // Manifest novo tem versao atual (nao 5.3.0)
    const newRaw = await fs.readFile(manifestPath, 'utf-8')
    const newParsed = JSON.parse(newRaw) as Record<string, unknown>
    expect(newParsed['pluginVersion']).not.toBe('5.3.0')
  })

  it('does not backup when existing manifest is v6.x or v7.x (only sobrescreve)', async () => {
    const claudeDir = path.join(tmp, '.claude')
    await fs.mkdir(claudeDir, { recursive: true })
    const oldManifest = {
      pluginVersion: '7.2.0',
      installedAt: '2026-05-20T00:00:00.000Z',
      initMode: 'fresh',
      files: {},
    }
    const manifestPath = path.join(claudeDir, '.anti-vibe-manifest.json')
    await fs.writeFile(manifestPath, JSON.stringify(oldManifest, null, 2))

    await writeAntiVibeManifestStep.run(makeCtx(tmp))

    const entries = await fs.readdir(claudeDir)
    const backup = entries.find((e) => e.startsWith('.anti-vibe-manifest.json.backup-v5.'))
    expect(backup).toBeUndefined()

    // Manifest novo tem versao atual (mais recente)
    const newRaw = await fs.readFile(manifestPath, 'utf-8')
    const newParsed = JSON.parse(newRaw) as Record<string, unknown>
    expect(newParsed['pluginVersion']).not.toBe('7.2.0')
  })
})
