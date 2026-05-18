import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { detectDrift } from './drift-detector'

let tmpDir: string
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drift-test-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex')
const shaBuffer = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex')

describe('detectDrift', () => {
  it('returns empty report when manifest missing', async () => {
    const report = await detectDrift({ manifestPath: path.join(tmpDir, 'missing.json'), cwd: tmpDir })
    expect(report.byFile).toEqual({})
    expect(report.summary).toEqual({ placeholder: 0, populated: 0, drift: 0 })
  })

  it('marks PLACEHOLDER when sha matches and content is template', async () => {
    const filePath = path.join(tmpDir, 'AGENTS.md')
    const trivialContent = '# AGENTS\n\n(placeholder)\n'
    await fs.writeFile(filePath, trivialContent, 'utf8')
    const manifestPath = path.join(tmpDir, 'manifest.json')
    const buf = await fs.readFile(filePath)
    await fs.writeFile(manifestPath, JSON.stringify({ files: [{ path: 'AGENTS.md', sha256: shaBuffer(buf) }] }), 'utf8')
    const report = await detectDrift({ manifestPath, cwd: tmpDir })
    expect(report.byFile['AGENTS.md']).toBe('PLACEHOLDER')
    expect(report.summary.placeholder).toBe(1)
  })

  it('marks POPULATED when sha differs and content has substance', async () => {
    const filePath = path.join(tmpDir, 'AGENTS.md')
    // 11 non-empty lines — exceeds TEMPLATE_LINE_LIMIT (10)
    const populatedContent = '# AGENTS\n\n## Mission\n\nThis project does X.\n\n## Stack\n\nReact + Bun.\n\n## Modules\n\n- src/auth — sessions\n- src/db — queries\n- src/api — routes\n\n## Conventions\n\nUse TanStack Query, never useEffect for data fetching.\n'
    await fs.writeFile(filePath, populatedContent, 'utf8')
    const manifestPath = path.join(tmpDir, 'manifest.json')
    // manifest had OLD sha (template); current is populated
    await fs.writeFile(manifestPath, JSON.stringify({ files: [{ path: 'AGENTS.md', sha256: sha('template original') }] }), 'utf8')
    const report = await detectDrift({ manifestPath, cwd: tmpDir })
    expect(report.byFile['AGENTS.md']).toBe('POPULATED')
    expect(report.summary.populated).toBe(1)
  })

  it('marks DRIFT when sha differs but content is trivial', async () => {
    const filePath = path.join(tmpDir, 'AGENTS.md')
    await fs.writeFile(filePath, '\n', 'utf8')
    const manifestPath = path.join(tmpDir, 'manifest.json')
    await fs.writeFile(manifestPath, JSON.stringify({ files: [{ path: 'AGENTS.md', sha256: sha('original placeholder content') }] }), 'utf8')
    const report = await detectDrift({ manifestPath, cwd: tmpDir })
    expect(report.byFile['AGENTS.md']).toBe('DRIFT')
    expect(report.summary.drift).toBe(1)
  })

  it('marks DRIFT when file deleted but manifest references it', async () => {
    const manifestPath = path.join(tmpDir, 'manifest.json')
    await fs.writeFile(manifestPath, JSON.stringify({ files: [{ path: 'GHOST.md', sha256: sha('gone') }] }), 'utf8')
    const report = await detectDrift({ manifestPath, cwd: tmpDir })
    expect(report.byFile['GHOST.md']).toBe('DRIFT')
    expect(report.summary.drift).toBe(1)
  })
})
