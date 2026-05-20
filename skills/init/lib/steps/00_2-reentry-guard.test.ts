import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { reentryGuardStep } from './00_2-reentry-guard'
import { AbortError } from './abort-error'

async function makeTmp(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'reentry-guard-'))
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ version: '6.5.0' }))
  return dir
}

async function writeManifest(cwd: string, pluginVersion: string | null): Promise<void> {
  const dir = path.join(cwd, '.claude')
  await fs.mkdir(dir, { recursive: true })
  const body =
    pluginVersion === null
      ? { initMode: 'fresh', installedAt: '2026-01-01T00:00:00Z', files: {} }
      : { pluginVersion, initMode: 'fresh', installedAt: '2026-01-01T00:00:00Z', files: {} }
  await fs.writeFile(path.join(dir, '.anti-vibe-manifest.json'), JSON.stringify(body))
}

describe('reentryGuardStep', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await makeTmp()
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('sets greenfield when manifest absent', async () => {
    const flags: Record<string, string | boolean> = {}
    const report = await reentryGuardStep.run({ cwd, args: [], flags })
    expect(flags['__reentryMode']).toBe('greenfield')
    expect(report.summary).toContain('greenfield')
  })

  it('aborts when manifest pluginVersion >= 6.6.0', async () => {
    await writeManifest(cwd, '6.6.0')
    const flags: Record<string, string | boolean> = {}
    let caught: unknown
    try {
      await reentryGuardStep.run({ cwd, args: [], flags })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(AbortError)
    expect((caught as AbortError).reason).toContain('/sync')
  })

  it('signals re-populate when manifest pluginVersion < 6.6.0', async () => {
    await writeManifest(cwd, '6.5.1')
    const flags: Record<string, string | boolean> = {}
    const report = await reentryGuardStep.run({ cwd, args: [], flags })
    expect(flags['__reentryMode']).toBe('re-populate')
    expect(report.summary).toContain('6.5.1')
  })

  it('signals re-populate when pluginVersion field is absent in manifest', async () => {
    await writeManifest(cwd, null)
    const flags: Record<string, string | boolean> = {}
    const report = await reentryGuardStep.run({ cwd, args: [], flags })
    expect(flags['__reentryMode']).toBe('re-populate')
    expect(report.summary).toContain('re-populate')
  })

  it('CA-09: two greenfield runs — second aborts as v6.6.0+ reentry', async () => {
    const flagsFirst: Record<string, string | boolean> = {}
    await reentryGuardStep.run({ cwd, args: [], flags: flagsFirst })
    expect(flagsFirst['__reentryMode']).toBe('greenfield')

    await writeManifest(cwd, '6.6.0')
    const flagsSecond: Record<string, string | boolean> = {}
    let caught: unknown
    try {
      await reentryGuardStep.run({ cwd, args: [], flags: flagsSecond })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(AbortError)
  })
})
