// 2026-05-16 (Luiz/dev): RED phase — Plano 01 fase-03, CA-02 setup.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeStackJson } from './write-stack-json'

describe('writeStackJson', () => {
  let target: string

  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), 'init-stack-'))
  })

  afterEach(() => {
    rmSync(target, { recursive: true, force: true })
  })

  it('writes .claude/stack.json with canonical matrix folder name (alias node-ts → nodejs-typescript)', async () => {
    await writeStackJson(target, { id: 'node-ts', signalSource: 'package.json#devDependencies.typescript' })
    const raw = readFileSync(join(target, '.claude', 'stack.json'), 'utf8')
    const parsed = JSON.parse(raw) as { primary: string; secondary: string[]; detected_at: string; anchor_files: string[] }
    expect(parsed.primary).toBe('nodejs-typescript')
    expect(parsed.secondary).toEqual([])
    expect(parsed.anchor_files).toContain('package.json')
    expect(new Date(parsed.detected_at).toString()).not.toBe('Invalid Date')
  })

  it('creates .claude/ folder if absent', async () => {
    await writeStackJson(target, { id: 'node-ts', signalSource: 'package.json#devDependencies.typescript' })
    expect(existsSync(join(target, '.claude'))).toBe(true)
  })
})
