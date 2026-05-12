// 2026-05-12 (Luiz/dev): test wrapper para bench CA-26 — Plano 04 fase-04.
// Invoca validators.bench.ts e falha se exit code != 0 (mediana >2s ou fixture invalida).
import { describe, it, expect } from 'bun:test'
import { spawn } from 'node:child_process'
import path from 'node:path'

const BENCH = path.resolve(import.meta.dir, 'validators.bench.ts')

describe('validator perf bench (CA-26)', () => {
  it('both validators run under 2s median on 100-docs fixture', async () => {
    const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      const proc = spawn('bun', ['run', BENCH], { stdio: 'pipe' })
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      proc.on('exit', (code) => resolve({ code: code ?? -1, stdout, stderr }))
    })

    if (result.code !== 0) {
      console.log('BENCH STDOUT:', result.stdout)
      console.log('BENCH STDERR:', result.stderr)
    }
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('harness-validate.ts median')
    expect(result.stdout).toContain('compound-check.ts median')
  }, 120_000) // bench pode levar 60-90s no Windows (warmup + 3+3 runs, G5 Defender warmup)
})
