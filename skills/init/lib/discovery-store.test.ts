import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  writeDiscoveryArtifact,
  readDiscoveryArtifact,
  discoveryArtifactPath,
} from './discovery-store'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'discovery-store-'))
}

describe('discovery-store', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('write+read roundtrip preserva dados', async () => {
    const data = { foo: 'bar', n: 42 }
    await writeDiscoveryArtifact(tmp, 'secrets-scan-result', data)
    const result = await readDiscoveryArtifact<typeof data>(tmp, 'secrets-scan-result')
    expect(result).toEqual(data)
  })

  test('noWrite=true nao cria arquivo', async () => {
    await writeDiscoveryArtifact(tmp, 'secrets-scan-result', { x: 1 }, { noWrite: true })
    const result = await readDiscoveryArtifact(tmp, 'secrets-scan-result')
    expect(result).toBeNull()
  })

  test('readDiscoveryArtifact retorna null quando arquivo nao existe', async () => {
    const result = await readDiscoveryArtifact(tmp, 'discovered-docs')
    expect(result).toBeNull()
  })

  test('discoveryArtifactPath usa caminho canonico Windows-safe', () => {
    const p = discoveryArtifactPath('/project', 'classification-result')
    expect(p.replace(/\\/g, '/')).toContain('/.anti-vibe/discovery/classification-result.json')
  })

  test('write cria diretorio pai automaticamente', async () => {
    await writeDiscoveryArtifact(tmp, 'discovered-docs', { list: [] })
    const filePath = discoveryArtifactPath(tmp, 'discovered-docs')
    const stat = await fs.stat(filePath)
    expect(stat.isFile()).toBe(true)
  })
})
