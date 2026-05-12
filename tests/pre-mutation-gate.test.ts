// 2026-05-12 (Luiz/dev): Testes TDD para heuristica D26 + hook pre-mutation-gate.cjs (CA-23, CA-24)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

// Caminho absoluto para o helper — resolvido em runtime para Windows/Unix
const HEURISTIC_PATH = path.join(import.meta.dir, '..', 'hooks', 'lib', 'heuristic-mutation.cjs')
const HOOK_PATH = path.join(import.meta.dir, '..', 'hooks', 'pre-mutation-gate.cjs')
const LOCK_PATH = path.join(os.homedir(), '.claude', 'cache', 'last-hook-fire.json')

// Importa modulo CJS via require dinamico (Bun suporta require em contexto ESM via createRequire)
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

// --- helpers ---

function spawnHook(
  payload: { prompt: string; cwd: string },
  lockOverride?: { timestamp: number; hook: string },
): Promise<{ stdout: string; stderr: string; code: number; durationMs: number }> {
  return new Promise((resolve) => {
    const start = Date.now()
    const proc = spawn('node', [HOOK_PATH], { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += String(d) })
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('exit', (code) => {
      resolve({ stdout, stderr, code: code ?? -1, durationMs: Date.now() - start })
    })
    // Escreve payload no stdin e fecha
    if (lockOverride) {
      // O lock precisa ser escrito antes do spawn — feito pelo caller
    }
    proc.stdin.write(JSON.stringify(payload))
    proc.stdin.end()
  })
}

async function writeLock(overrideMs?: number): Promise<void> {
  const ts = overrideMs !== undefined ? overrideMs : Date.now()
  await fs.mkdir(path.dirname(LOCK_PATH), { recursive: true })
  await fs.writeFile(LOCK_PATH, JSON.stringify({ timestamp: ts, hook: 'test-lock' }))
}

async function removeLock(): Promise<void> {
  try { await fs.unlink(LOCK_PATH) } catch { /* ignorar se nao existe */ }
}

// --- UNIT: heuristica D26 ---

describe('shouldSuggestPlan — heuristica D26', () => {
  // biome-ignore lint/suspicious/noExplicitAny: CJS module retornado como any
  let mod: any

  beforeEach(() => {
    // biome-ignore lint/suspicious/noExplicitAny: CJS module retornado como any
    mod = require(HEURISTIC_PATH) as any
  })

  it('retorna suggest:true para prompt com verbo e path (PT)', () => {
    const result = mod.shouldSuggestPlan('implementar feature em src/api')
    expect(result.suggest).toBe(true)
    expect(result.why).toContain('verb-match')
    expect(result.why).toContain('path-match')
  })

  it('retorna suggest:false com why negative-list-match para pergunta educacional', () => {
    const result = mod.shouldSuggestPlan('o que e useEffect?')
    expect(result.suggest).toBe(false)
    expect(result.why).toEqual(['negative-list-match'])
  })

  it('retorna suggest:false com why too-short para prompt curto', () => {
    const result = mod.shouldSuggestPlan('oi')
    expect(result.suggest).toBe(false)
    expect(result.why).toEqual(['too-short'])
  })

  it('retorna suggest:true para variante inglesa com path', () => {
    const result = mod.shouldSuggestPlan('create new feature in src/services/notifications.ts')
    expect(result.suggest).toBe(true)
    expect(result.why).toContain('verb-match')
  })
})

// --- INTEGRATION: hook stdin/stdout via spawn ---

describe('pre-mutation-gate hook — integration', () => {
  let tmpDir: string

  beforeEach(async () => {
    await removeLock()
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pmg-test-'))
  })

  afterEach(async () => {
    await removeLock()
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('emite inject:true e block:false para prompt substancial sem plano ativo', async () => {
    const result = await spawnHook({
      prompt: 'implementar sistema de notificacoes em src/',
      cwd: tmpDir,
    })
    expect(result.code).toBe(0)

    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.inject).toBe(true)
    // CA-23 critico: NUNCA block:true
    expect(parsed.block).not.toBe(true)
    expect(parsed.message).toMatch(/Trabalho substancial/)
  })

  it('hook NUNCA emite block:true (CA-23) — valida via regex no stdout bruto', async () => {
    const result = await spawnHook({
      prompt: 'implementar autenticacao em src/auth',
      cwd: tmpDir,
    })
    // Garantia dupla: parsed e regex no raw string
    expect(/"block"\s*:\s*true/.test(result.stdout)).toBe(false)
  })

  it('respeita lock: se last-hook-fire.json recente, emite inject:false', async () => {
    await writeLock() // timestamp agora = recente (TTL 5s)
    const result = await spawnHook({
      prompt: 'implementar feature em src/api',
      cwd: tmpDir,
    })
    expect(result.code).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.inject).toBe(false)
  })

  it('respeita CA-24: com plano ativo em docs/exec-plans/active/, nao injeta', async () => {
    // Cria estrutura de plano ativo
    const activeDir = path.join(tmpDir, 'docs', 'exec-plans', 'active')
    await fs.mkdir(activeDir, { recursive: true })
    await fs.writeFile(path.join(activeDir, '2026-05-12-foo.md'), '# Plano ativo\n')
    // README.md nao conta — adiciona para testar exclusao
    await fs.writeFile(path.join(activeDir, 'README.md'), '# index\n')

    const result = await spawnHook({
      prompt: 'implementar feature substancial em src/api',
      cwd: tmpDir,
    })
    expect(result.code).toBe(0)
    const parsed = JSON.parse(result.stdout.trim())
    expect(parsed.inject).toBe(false)
  })
})
