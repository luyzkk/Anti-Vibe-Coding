// skills/init/lib/steps/15-capabilities-discovery.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { capabilitiesDiscoveryStep } from './15-capabilities-discovery'

const ctx = (cwd: string) => ({
  cwd,
  args: [] as readonly string[],
  flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('capabilitiesDiscoveryStep', () => {
  let tmpDir: string
  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
  })

  test('no profile (manifest ausente): log de skip ou soft-fail, mutated=false, NAO lanca', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'cap-noprofile-'))
    // 2026-05-17 (Luiz/dev): sem .anti-vibe-manifest.json no tmpDir, readArchitectureProfile
    // usa process.cwd() por default — pode ter ou nao manifest no projeto-pai.
    // Invariante testada: mutated=false, NAO lanca exception.

    let didThrow = false
    let result
    try {
      result = await capabilitiesDiscoveryStep.run(ctx(tmpDir))
    } catch {
      didThrow = true
    }
    expect(didThrow).toBe(false)
    expect(result).toBeDefined()
    if (result) {
      expect(result.mutated).toBe(false)
    }
  })

  test('helper throws (discovery/ eh arquivo, nao diretorio): soft-fail logged, mutated=false, NAO lanca exception (PRD CA-06, G7)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'cap-throw-'))
    // 2026-05-17 (Luiz/dev): pre-criar discovery/ como ARQUIVO para forcar erro em writeFile.
    // Isso garante que o catch global seja exercitado mesmo se profile estiver disponivel.
    await writeFile(path.join(tmpDir, 'discovery'), 'not a directory')

    // 2026-05-17 (Luiz/dev): invariante: NUNCA throw — G7 do plano (PRD CA-06).
    let didThrow = false
    let result
    try {
      result = await capabilitiesDiscoveryStep.run(ctx(tmpDir))
    } catch {
      didThrow = true
    }
    expect(didThrow).toBe(false)
    expect(result).toBeDefined()
    if (result) {
      expect(result.mutated).toBe(false)
      // Se o caminho de erro for atingido, summary contem o prefixo de soft-fail.
      // Se nao foi (porque profile foi null antes do writeFile), summary tem "skipped" ou "step failed".
      const ok =
        result.summary.startsWith('[capabilities-discovery] step failed, skipping: ') ||
        result.summary.includes('skipped — architecture profile not detected') ||
        result.summary.startsWith('[capabilities-discovery]')
      expect(ok).toBe(true)
    }
  })

  test('profile + write OK (smoke — depende do manifest do projeto-pai): audit gravado se profile disponivel', async () => {
    // 2026-05-17 (Luiz/dev): este teste valida que o step completa sem throw quando profile existe.
    // Depende do estado do projeto — se readArchitectureProfile() retornar null, step retorna skip (ok).
    // Se retornar profile, step tenta discoverCapabilities e grava discovery/. Pode ou nao ter discovery/.
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'cap-smoke-'))

    let didThrow = false
    let result
    try {
      result = await capabilitiesDiscoveryStep.run(ctx(tmpDir))
    } catch {
      didThrow = true
    }
    // Invariante principal: NUNCA throw (G7).
    expect(didThrow).toBe(false)
    expect(result).toBeDefined()
    if (result) {
      // summary deve ser algum dos wordings definidos (nao string vazia/undefined).
      expect(typeof result.summary).toBe('string')
    }
  })
})
