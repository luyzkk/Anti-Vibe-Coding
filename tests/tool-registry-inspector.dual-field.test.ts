// 2026-05-15 (Luiz/dev): RED→GREEN RF-MH-02 (CA-03 + CA-04 do PRD v6.3.1)
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { inspectToolRegistry } from '../skills/lib/tool-registry-inspector'
import { mkdtemp, mkdir, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

async function setupProject(fixtureFiles: string[]): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'avc-dual-'))
  const agentsDir = path.join(root, 'agents')
  await mkdir(agentsDir, { recursive: true })
  const fixturesRoot = path.join(import.meta.dir, 'fixtures', 'agents-dual-field')
  for (const f of fixtureFiles) {
    await copyFile(path.join(fixturesRoot, f), path.join(agentsDir, f))
  }
  return root
}

describe('tool-registry-inspector dual-field parser', () => {
  let stderrCaptured: string
  let origWrite: typeof process.stderr.write

  beforeEach(() => {
    stderrCaptured = ''
    origWrite = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderrCaptured += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
      return true
    }) as typeof process.stderr.write
  })

  afterEach(() => {
    process.stderr.write = origWrite
  })

  test('reads tools: canonical without warning (CA-03)', async () => {
    const root = await setupProject(['agent-canonical.md'])
    const snapshot = await inspectToolRegistry(root)
    const agent = snapshot.subagents.find(s => s.name === 'agent-canonical')
    expect(agent?.allowed_tools).toEqual(['Read', 'Grep'])
    expect(stderrCaptured).not.toContain('[deprecation]')
  })

  test('falls back to allowed-tools: with single deprecation warning (CA-04)', async () => {
    const root = await setupProject(['agent-legacy.md'])
    const snapshot = await inspectToolRegistry(root)
    const agent = snapshot.subagents.find(s => s.name === 'agent-legacy')
    expect(agent?.allowed_tools).toEqual(['Read'])
    const warningLines = stderrCaptured.split('\n').filter(l => l.includes('[deprecation]'))
    expect(warningLines.length).toBe(1)
    expect(warningLines[0]).toContain("agent-legacy uses 'allowed-tools'")
    expect(warningLines[0]).toContain("canonical is 'tools'")
  })
})
