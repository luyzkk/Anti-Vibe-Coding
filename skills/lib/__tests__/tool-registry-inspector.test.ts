// 2026-05-15 (Luiz/dev): RED phase — Plano 03 fase-01. Tests specify inspectToolRegistry.
// Implementation does not exist yet. All tests must fail on import.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { inspectToolRegistry } from '../tool-registry-inspector'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'tri-test-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('inspectToolRegistry', () => {
  it("returns empty registry with source 'partial' when manifest missing", async () => {
    // tmpDir is empty — no manifest, no agents/
    const snapshot = await inspectToolRegistry(tmpDir)

    expect(snapshot.mcps).toEqual([])
    expect(snapshot.builtin_tools).toEqual([])
    expect(snapshot.subagents).toEqual([])
    expect(snapshot.source).toBe('partial')
    expect(!isNaN(Date.parse(snapshot.generated_at))).toBe(true)
  })

  it('reads MCPs and builtin tools from manifest', async () => {
    await writeFile(
      path.join(tmpDir, '.anti-vibe-manifest.json'),
      JSON.stringify({
        mcps: [{ name: 'plugin_playwright_playwright', tools: ['browser_click', 'browser_navigate'] }],
        builtin_tools: ['Read', 'Glob', 'Grep'],
      })
    )
    // no agents/ folder

    const snapshot = await inspectToolRegistry(tmpDir)

    expect(snapshot.mcps.length).toBe(1)
    expect(snapshot.mcps[0]?.name).toBe('plugin_playwright_playwright')
    expect(snapshot.mcps[0]?.tools).toEqual(['browser_click', 'browser_navigate'])
    expect(snapshot.builtin_tools.map(t => t.name)).toEqual(['Read', 'Glob', 'Grep'])
    expect(snapshot.source).toBe('partial') // agents/ does not exist
  })

  it('graceful fail when agents/ folder is missing', async () => {
    await writeFile(
      path.join(tmpDir, '.anti-vibe-manifest.json'),
      JSON.stringify({
        mcps: [{ name: 'plugin_playwright_playwright', tools: ['browser_click', 'browser_navigate'] }],
        builtin_tools: ['Read', 'Glob', 'Grep'],
      })
    )
    // no agents/ folder

    const snapshot = await inspectToolRegistry(tmpDir)

    expect(snapshot.subagents).toEqual([])
    expect(snapshot.source).toBe('partial')
    // function must not throw — verified by reaching this line
  })

  it('parses 2 subagents from agents/ folder with full manifest', async () => {
    await writeFile(
      path.join(tmpDir, '.anti-vibe-manifest.json'),
      JSON.stringify({
        mcps: [{ name: 'plugin_playwright_playwright', tools: ['browser_click', 'browser_navigate'] }],
        builtin_tools: ['Read', 'Glob', 'Grep'],
      })
    )

    await mkdir(path.join(tmpDir, 'agents'), { recursive: true })

    await writeFile(
      path.join(tmpDir, 'agents', 'verify-work-auditor.md'),
      [
        '---',
        'name: verify-work-auditor',
        'description: Audits work for correctness and quality.',
        'allowed-tools: Read, Glob, Grep',
        '---',
        'Body irrelevante.',
      ].join('\n')
    )

    await writeFile(
      path.join(tmpDir, 'agents', 'security-auditor.md'),
      [
        '---',
        'name: security-auditor',
        'description: Reviews code for OWASP Top 10.',
        'allowed-tools: Read, Grep',
        '---',
        'Body.',
      ].join('\n')
    )

    const snapshot = await inspectToolRegistry(tmpDir)

    expect(snapshot.subagents.length).toBe(2)

    const verifyAuditor = snapshot.subagents.find(s => s.name === 'verify-work-auditor')
    const securityAuditor = snapshot.subagents.find(s => s.name === 'security-auditor')

    expect(verifyAuditor).toBeDefined()
    expect(securityAuditor).toBeDefined()

    expect(verifyAuditor!.allowed_tools).toEqual(['Read', 'Glob', 'Grep'])
    expect(securityAuditor!.allowed_tools).toEqual(['Read', 'Grep'])

    expect(snapshot.source).toBe('manifest') // both manifest + agents/ found
  })
})
