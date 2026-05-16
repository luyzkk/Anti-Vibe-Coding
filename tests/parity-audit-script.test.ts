// 2026-05-15 (Luiz/dev): RED→GREEN RF-MH-03 (CA-05 + CA-07 do PRD v6.3.1)
import { describe, expect, test } from 'bun:test'
import { audit } from '../scripts/parity-audit'
import { mkdtemp, mkdir, copyFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const FIXTURES_HAPPY = path.join(import.meta.dir, 'fixtures', 'parity-audit-happy')

async function setupHappyProject(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'avc-parity-'))
  await copyFile(
    path.join(FIXTURES_HAPPY, '.anti-vibe-manifest.json'),
    path.join(root, '.anti-vibe-manifest.json'),
  )
  await mkdir(path.join(root, 'agents'), { recursive: true })
  await copyFile(
    path.join(FIXTURES_HAPPY, 'agents', 'dummy.md'),
    path.join(root, 'agents', 'dummy.md'),
  )
  return root
}

async function setupPartialProject(): Promise<string> {
  // sem manifest, sem agents/
  const root = await mkdtemp(path.join(tmpdir(), 'avc-parity-partial-'))
  return root
}

describe('parity-audit script', () => {
  test('happy-path: manifest present + agents → exit 0 + parity-gaps.json escrito (CA-05)', async () => {
    const root = await setupHappyProject()
    const result = await audit(root, null)
    expect(result.code).toBe(0)
    const outPath = path.join(root, 'discovery', 'parity-gaps.json')
    const written = JSON.parse(await readFile(outPath, 'utf-8'))
    expect(written.tool_registry_snapshot.source).toBe('manifest')
    expect(written.tool_registry_snapshot.subagents.length).toBeGreaterThan(0)
  })

  test('partial: no manifest → exit 0 + tool_registry_snapshot.source: partial + warning (CA-07)', async () => {
    const root = await setupPartialProject()
    const result = await audit(root, null)
    expect(result.code).toBe(0)
    expect(result.stderr.some(l => l.includes('Tool registry incompleto'))).toBe(true)
    const outPath = path.join(root, 'discovery', 'parity-gaps.json')
    const written = JSON.parse(await readFile(outPath, 'utf-8'))
    expect(written.tool_registry_snapshot.source).toBe('partial')
  })

  test('rejects unsafe task_type (GT-4 hardening)', async () => {
    const root = await setupHappyProject()
    const result = await audit(root, '../etc/passwd')
    expect(result.code).toBe(1)
    expect(result.stderr.some(l => l.includes('Invalid task_type'))).toBe(true)
  })
})
