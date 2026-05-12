#!/usr/bin/env bun
// 2026-05-12 (Luiz/dev): bench dos 2 validators — Plano 04 fase-04, CA-26.
// Estrategia: warmup + 3 runs, reporta mediana. Resposta a Ambiguity 04-A4.
// DI-04-A3: per-validator <2s separadamente (nao soma). Soma eh informativa.
// DI-04-A4: 3 medicoes reais apos 1 warmup; gating na mediana das 3.
// G5: Windows Defender faz scan de arquivos novos — warmup absorve esse custo.

import { spawn } from 'node:child_process'
import path from 'node:path'

const FIXTURE = path.resolve(import.meta.dir, '..', 'fixtures', 'compound-100-docs')
const GENERATOR = path.resolve(import.meta.dir, '..', 'fixtures', 'generate-compound-fixture.ts')

type Run = { validator: string; durationMs: number; exitCode: number }

async function main(): Promise<void> {
  await ensureFixture()

  // Warmup pass — descarta resultado (G5: Windows Defender warmup de arquivos novos).
  console.log('Warming up validators (G5: Windows Defender scan on new files)...')
  await timeValidator('harness-validate.ts', 'warmup')
  await timeValidator('compound-check.ts', 'warmup')

  // 3 medicoes reais (DI-04-A4).
  const harnessRuns: Run[] = []
  const compoundRuns: Run[] = []
  for (let i = 0; i < 3; i++) {
    harnessRuns.push(await timeValidator('harness-validate.ts', `run-${i + 1}`))
    compoundRuns.push(await timeValidator('compound-check.ts', `run-${i + 1}`))
  }

  const harnessMedian = median(harnessRuns.map((r) => r.durationMs))
  const compoundMedian = median(compoundRuns.map((r) => r.durationMs))

  console.log('\n=== Validator Performance (CA-26) ===')
  console.log(`Fixture: ${FIXTURE}`)
  console.log(
    `harness-validate.ts median: ${harnessMedian.toFixed(0)}ms` +
    ` (runs: ${harnessRuns.map((r) => r.durationMs.toFixed(0)).join(', ')})`,
  )
  console.log(
    `compound-check.ts median:   ${compoundMedian.toFixed(0)}ms` +
    ` (runs: ${compoundRuns.map((r) => r.durationMs.toFixed(0)).join(', ')})`,
  )
  console.log(`Aggregate (informational):  ${(harnessMedian + compoundMedian).toFixed(0)}ms`)

  // Exit codes — todos devem ser 0 (fixture e valida).
  const allOk = [...harnessRuns, ...compoundRuns].every((r) => r.exitCode === 0)
  if (!allOk) {
    const failed = [...harnessRuns, ...compoundRuns].filter((r) => r.exitCode !== 0)
    console.error(
      `ERROR: ${failed.length} validator run(s) did not exit 0 on the synthetic fixture.` +
      ' Check fixture validity (frontmatter, required-files, orphan plans).',
    )
    process.exit(2)
  }

  // Gating CA-26 (DI-04-A3): per-validator <2000ms, nao soma.
  const BUDGET_MS = 2000
  let failed = false
  if (harnessMedian > BUDGET_MS) {
    console.error(`FAIL: harness-validate.ts median ${harnessMedian.toFixed(0)}ms > ${BUDGET_MS}ms budget`)
    failed = true
  }
  if (compoundMedian > BUDGET_MS) {
    console.error(`FAIL: compound-check.ts median ${compoundMedian.toFixed(0)}ms > ${BUDGET_MS}ms budget`)
    failed = true
  }

  if (!failed) {
    console.log(`\nCA-26 PASS: both validators under ${BUDGET_MS}ms median.`)
  }
  process.exit(failed ? 1 : 0)
}

async function ensureFixture(): Promise<void> {
  // Re-gera sempre — fixture e ephemera, nao versionada (.gitignore).
  console.log('Generating fixture (100 compound notes + 20 plans + 20 ADRs)...')
  const proc = spawn('bun', ['run', GENERATOR, FIXTURE], { stdio: 'inherit' })
  await new Promise<void>((resolve, reject) => {
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`generator exit ${code}`))))
  })
}

async function timeValidator(script: string, label: string): Promise<Run> {
  const start = performance.now()
  const exitCode = await new Promise<number>((resolve) => {
    const proc = spawn('bun', ['run', path.join(FIXTURE, 'scripts', script)], {
      cwd: FIXTURE,
      stdio: 'pipe', // suprime saida para nao poluir bench output
    })
    proc.on('exit', (code) => resolve(code ?? -1))
  })
  const durationMs = performance.now() - start
  if (label !== 'warmup') {
    process.stdout.write(`  ${script} ${label}: ${durationMs.toFixed(0)}ms (exit ${exitCode})\n`)
  }
  return { validator: script, durationMs, exitCode }
}

function median(arr: ReadonlyArray<number>): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0)
}

await main()
