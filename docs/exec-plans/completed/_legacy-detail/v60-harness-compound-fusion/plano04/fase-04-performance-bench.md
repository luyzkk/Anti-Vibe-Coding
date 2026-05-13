<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: Performance bench (`<2s em 100 docs` — CA-26)

**Plano:** 04 — Validators Full
**Sizing:** 1h
**Depende de:** fase-02 (compound-check com frontmatter validation) + fase-03 (harness-validate full) — ambos validators completos
**Visual:** false

---

## O que esta fase entrega

Gerador deterministico de fixture `tests/fixtures/compound-100-docs/` (100 compound notes sinteticos + 20 planos ativos + 20 ADRs + estrutura completa de scaffold para `harness:validate` passar). Bench script `tests/perf/validators.bench.ts` que:

1. Mede `bun run scripts/harness-validate.ts` em fixture de 100 docs — alvo **<2s** (CA-26).
2. Mede `bun run scripts/compound-check.ts` na mesma fixture — alvo **<2s** (CA-26).
3. Faz **warmup** (1 run descartado) + **3 medicoes** + reporta mediana (Resposta a Ambiguity 04-A4).
4. Reporta total agregado (informativo, nao gating — Ambiguity 04-A3 resolvida per-validator).

Atende **CA-26** verbatim. Estabelece baseline para regressao em Plano 09 (release).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/tests/fixtures/generate-compound-fixture.ts` | Create | Script bun que gera 100 compound notes + 20 planos + 20 ADRs em path passado como argv |
| `anti-vibe-coding/tests/fixtures/compound-100-docs/.gitignore` | Create | Ignora conteudo gerado (script gera no checkout/CI). So versionar o `.gitignore` + sentinel |
| `anti-vibe-coding/tests/fixtures/compound-100-docs/.gitkeep` | Create | Marca diretorio como existente |
| `anti-vibe-coding/tests/perf/validators.bench.ts` | Create | Bench script: warmup + 3 runs + mediana. Stdout reporta tempo de cada validator |
| `anti-vibe-coding/tests/perf/validators.bench.test.ts` | Create | Test wrapper que invoca bench e falha se mediana >2000ms |

---

## Implementacao

### Passo 1: Gerador `tests/fixtures/generate-compound-fixture.ts`

```typescript
#!/usr/bin/env bun
// 2026-05-11 (Luiz/dev): gerador deterministico de fixture 100-docs — Plano 04 fase-04.
// Argv: `bun run generate-compound-fixture.ts <target-dir>` — cria estrutura completa.
// Idempotente: rm -rf target-dir + recria.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const COUNT_COMPOUND = 100
const COUNT_ACTIVE_PLANS = 20
const COUNT_ADRS = 20

const argv = process.argv.slice(2)
if (argv.length !== 1) {
  console.error('Usage: generate-compound-fixture.ts <target-dir>')
  process.exit(2)
}

const targetDir = path.resolve(argv[0])

async function main(): Promise<void> {
  await fs.rm(targetDir, { recursive: true, force: true })

  // Required files do harness-validate (Plano 04 fase-03)
  await writeRequiredFiles()

  // 100 compound notes validas
  for (let i = 0; i < COUNT_COMPOUND; i++) {
    await writeCompoundNote(i)
  }

  // 20 active plans (NAO orfaos — tem `- [ ]` pending)
  for (let i = 0; i < COUNT_ACTIVE_PLANS; i++) {
    await writeActivePlan(i)
  }

  // 20 ADRs (apenas headings — sao required files via design-docs)
  for (let i = 0; i < COUNT_ADRS; i++) {
    await writeAdr(i)
  }

  console.log(`Fixture generated at ${targetDir}: ${COUNT_COMPOUND} compound notes, ${COUNT_ACTIVE_PLANS} active plans, ${COUNT_ADRS} ADRs.`)
}

async function writeRequiredFiles(): Promise<void> {
  const minimalAgents = `# Agent

This is the agent index.

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)
`
  const files: ReadonlyArray<readonly [string, string]> = [
    ['AGENTS.md', minimalAgents],
    ['ARCHITECTURE.md', '# Architecture\n'],
    ['CLAUDE.md', minimalAgents],
    ['README.md', '# Project\n'],
    ['package.json', JSON.stringify({ name: 'fixture-100', version: '0.0.1' }, null, 2) + '\n'],
    ['.github/pull_request_template.md', '# PR\n'],
    ['docs/DESIGN.md', '# Design\n'],
    ['docs/FRONTEND.md', '# Frontend\n'],
    ['docs/PLANS.md', '# Plans\n'],
    ['docs/PRODUCT_SENSE.md', '# Product Sense\n'],
    ['docs/QUALITY_SCORE.md', '# Quality Score\n'],
    ['docs/RELIABILITY.md', '# Reliability\n'],
    ['docs/SECURITY.md', '# Security\n'],
    ['docs/COMPOUND_ENGINEERING.md', '# Compound\n'],
    ['docs/STATE.md', '# State\n\n## Resources\n\n- detected_stack: unknown\n'],
    ['docs/design-docs/index.md', '# Design Docs\n'],
    ['docs/design-docs/core-beliefs.md', '# Core Beliefs\n'],
    ['docs/exec-plans/active/README.md', '# Active Plans\n'],
    ['docs/exec-plans/completed/README.md', '# Completed Plans\n'],
    ['docs/exec-plans/tech-debt-tracker.md', '# Tech Debt\n'],
    ['docs/generated/db-schema.md', '# DB Schema\n'],
    ['docs/product-specs/index.md', '# Product Specs\n'],
    ['docs/references/README.md', '# References\n'],
    ['docs/compound/README.md', '# Compound\n'],
  ]
  for (const [rel, body] of files) {
    const full = path.join(targetDir, rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, body, 'utf8')
  }
  // Scripts harness-validate.ts + compound-check.ts — copiar dos templates do plugin
  await fs.mkdir(path.join(targetDir, 'scripts'), { recursive: true })
  const pluginRoot = path.resolve(import.meta.dir, '../..')
  await fs.copyFile(
    path.join(pluginRoot, 'skills/init/assets/templates/scripts/harness-validate.ts.tpl'),
    path.join(targetDir, 'scripts/harness-validate.ts'),
  )
  await fs.copyFile(
    path.join(pluginRoot, 'skills/init/assets/templates/scripts/compound-check.ts.tpl'),
    path.join(targetDir, 'scripts/compound-check.ts'),
  )
}

async function writeCompoundNote(i: number): Promise<void> {
  const date = `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
  const slug = `synthetic-${String(i).padStart(3, '0')}`
  const body = `---
title: Synthetic compound note ${i}
category: bug
tags: [synthetic, perf-fixture, batch-${Math.floor(i / 10)}]
created: ${date}
---

# Synthetic compound note ${i}

## Problem
Synthetic problem description for note ${i}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Solution
Synthetic solution. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Prevention
Synthetic prevention. Ut enim ad minim veniam, quis nostrud exercitation.
`
  const file = path.join(targetDir, 'docs/compound', `${date}-${slug}.md`)
  await fs.writeFile(file, body, 'utf8')
}

async function writeActivePlan(i: number): Promise<void> {
  const date = `2026-05-${String((i % 28) + 1).padStart(2, '0')}`
  const slug = `synth-plan-${String(i).padStart(2, '0')}`
  // IMPORTANTE: plano com `- [ ]` pendente — NAO orfao (nao falha harness:validate)
  const body = `# Plan: Synthetic ${i}

## Goal
Synthetic plan ${i}.

## Execution Steps
- [ ] Step 1
- [ ] Step 2
`
  const file = path.join(targetDir, 'docs/exec-plans/active', `${date}-${slug}.md`)
  await fs.writeFile(file, body, 'utf8')
}

async function writeAdr(i: number): Promise<void> {
  const num = String(i + 1).padStart(4, '0')
  const file = path.join(targetDir, 'docs/design-docs', `ADR-${num}-synthetic.md`)
  await fs.writeFile(file, `# ADR-${num}: Synthetic decision ${i}\n\nStatus: accepted\n`, 'utf8')
}

await main()
```

### Passo 2: Bench `tests/perf/validators.bench.ts`

```typescript
#!/usr/bin/env bun
// 2026-05-11 (Luiz/dev): bench dos 2 validators — Plano 04 fase-04, CA-26.
// Estrategia: warmup + 3 runs, reporta mediana. Resposta a Ambiguity 04-A4.

import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const FIXTURE = path.resolve(import.meta.dir, '..', 'fixtures', 'compound-100-docs')
const GENERATOR = path.resolve(import.meta.dir, '..', 'fixtures', 'generate-compound-fixture.ts')

type Run = { validator: string; durationMs: number; exitCode: number }

async function main(): Promise<void> {
  await ensureFixture()

  // Warmup pass — descarta resultado (G5: Windows Defender warmup)
  await timeValidator('harness-validate.ts', 'warmup')
  await timeValidator('compound-check.ts', 'warmup')

  // 3 medicoes reais
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
  console.log(`harness-validate.ts median: ${harnessMedian.toFixed(0)}ms (runs: ${harnessRuns.map((r) => r.durationMs.toFixed(0)).join(', ')})`)
  console.log(`compound-check.ts median:   ${compoundMedian.toFixed(0)}ms (runs: ${compoundRuns.map((r) => r.durationMs.toFixed(0)).join(', ')})`)
  console.log(`Aggregate (informational):  ${(harnessMedian + compoundMedian).toFixed(0)}ms`)

  // Exit codes — todos devem ser 0 (fixture e valida)
  const allOk = [...harnessRuns, ...compoundRuns].every((r) => r.exitCode === 0)
  if (!allOk) {
    console.error('ERROR: validators did not all exit 0 on the synthetic fixture. Check fixture validity.')
    process.exit(2)
  }

  // Gating CA-26: cada validator < 2000ms
  const HARNESS_BUDGET_MS = 2000
  const COMPOUND_BUDGET_MS = 2000
  let failed = false
  if (harnessMedian > HARNESS_BUDGET_MS) {
    console.error(`FAIL: harness-validate.ts median ${harnessMedian.toFixed(0)}ms > ${HARNESS_BUDGET_MS}ms budget`)
    failed = true
  }
  if (compoundMedian > COMPOUND_BUDGET_MS) {
    console.error(`FAIL: compound-check.ts median ${compoundMedian.toFixed(0)}ms > ${COMPOUND_BUDGET_MS}ms budget`)
    failed = true
  }
  process.exit(failed ? 1 : 0)
}

async function ensureFixture(): Promise<void> {
  // Re-gera sempre — fixture e ephemera, nao versionada (.gitignore)
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
      stdio: 'pipe', // suprime saida para nao poluir bench
    })
    proc.on('exit', (code) => resolve(code ?? -1))
  })
  const durationMs = performance.now() - start
  return { validator: script, durationMs, exitCode }
}

function median(arr: ReadonlyArray<number>): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

await main()
```

### Passo 3: Test wrapper `tests/perf/validators.bench.test.ts`

```typescript
import { describe, it, expect } from 'bun:test'
import { spawn } from 'node:child_process'
import path from 'node:path'

const BENCH = path.resolve(import.meta.dir, 'validators.bench.ts')

describe('validator perf bench (CA-26)', () => {
  it('both validators run under 2s median on 100-docs fixture', async () => {
    const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      const proc = spawn('bun', ['run', BENCH], { stdio: 'pipe' })
      let stdout = ''; let stderr = ''
      proc.stdout.on('data', (d) => { stdout += d.toString() })
      proc.stderr.on('data', (d) => { stderr += d.toString() })
      proc.on('exit', (code) => resolve({ code: code ?? -1, stdout, stderr }))
    })

    if (result.code !== 0) {
      console.log('BENCH STDOUT:', result.stdout)
      console.log('BENCH STDERR:', result.stderr)
    }
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('harness-validate.ts median')
    expect(result.stdout).toContain('compound-check.ts median')
  }, 60_000) // bench pode levar 30-60s no total (warmup + 3+3 runs)
})
```

### Passo 4: Fixture `.gitignore`

```
# tests/fixtures/compound-100-docs/.gitignore
# Conteudo gerado por generate-compound-fixture.ts em CI/local. Nao versionar.
*
!.gitignore
!.gitkeep
```

E `tests/fixtures/compound-100-docs/.gitkeep` vazio.

### Passo 5: NPM script (atualiza fase-05)

Adicionar a `package.json` do plugin (entry "scripts"):

```json
"perf:validators": "bun run tests/perf/validators.bench.ts"
```

Fase-05 confirma essa entrada quando ajustar `package.json.tpl` do template do `/init`. Aqui adicionar **no plugin** (nao no template — fixture e do plugin, nao do projeto-alvo).

---

## Gotchas

- **G1 do plano (perf):** Como `Promise.all` ja esta nos validators (fase-02 + fase-03), bench mede o efeito. Se mediana >2s, primeiro suspeito eh loop sequencial deixado escapulir.
- **G5 do plano (Windows Defender warmup):** Warmup pass eh OBRIGATORIO. Sem ele, primeira leitura de cada `.md` recem-criado pode levar 8-15ms (AV scan); com warmup, cai para <0.5ms. Bench documenta isso na stdout (`runs: ...` mostra variancia).
- **Local — `performance.now()` retorna float ms:** Resolucao alta no bun (~microsegundo). Adequado para medir 100-2000ms.
- **Local — `stdio: 'pipe'` no spawn de validator:** Suprime stdout/stderr. Se quiser debug, mudar para `'inherit'` temporariamente. Bench so importa exit code + tempo.
- **Local — fixture nao versionada:** `.gitignore` ignora tudo exceto `.gitignore` e `.gitkeep`. Reduce noise de PRs e evita commit acidental de fixture multi-MB. Gerador roda no CI antes do bench (passo `bun run perf:validators`).
- **Local — Anti-virus pode injetar atraso em CI tambem:** GitHub Actions Ubuntu runner NAO tem AV em files — bench tipicamente eh ~50% do tempo do Windows local. Documentar isso na MEMORY se bench em CI parecer otimista demais para refletir laptop dev.
- **Local — `bun run` vs `node`:** Bench mede o spawn de `bun` + import + execucao. Cold start do bun e ~30-80ms; em runs subsequentes (warmup) cai para ~15-30ms. Isso EH parte do tempo CA-26 mede (usuario roda `bun run harness:validate` na CLI).
- **G6 do plano (orphan detector):** Fixture cria 20 planos com `- [ ]` pendente — garantido **nao orfaos**. Se inadvertidamente um for orfao, validator falha (exit 1) e bench reporta `validators did not all exit 0` com codigo 2. Pista para corrigir gerador.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test tests/perf/validators.bench.test.ts` falha — `generate-compound-fixture.ts` nao existe ou bench nao implementado.

- [ ] **GREEN:** Bench roda, fixture e gerada, ambos validators <2s mediana.
  - Comando: `bun run test tests/perf/validators.bench.test.ts`
  - Esperado: `1 passed, 0 failed`. Output detalhado de tempos em stdout.

### Checklist

- [ ] `tests/fixtures/generate-compound-fixture.ts` gera idempotentemente 100 + 20 + 20 arquivos
- [ ] Fixture e auto-suficiente: todos os 25 required-files do harness-validate.ts presentes
- [ ] 100 compound notes geradas TODOS passam `compound-check.ts` (frontmatter completo + 3 secoes)
- [ ] 20 active plans tem `- [ ]` pending — NAO orfaos
- [ ] 20 ADRs em `docs/design-docs/` (apenas para volume — nao validados por checks especificos)
- [ ] Bench faz warmup + 3 medicoes + reporta mediana
- [ ] `harness-validate.ts` mediana <2000ms em laptop dev medio (CA-26)
- [ ] `compound-check.ts` mediana <2000ms (CA-26)
- [ ] Bench retorna exit 1 se mediana >2s (gating)
- [ ] Bench retorna exit 2 se validators falham no fixture (fixture invalida = bug no gerador)
- [ ] `.gitignore` em `tests/fixtures/compound-100-docs/` previne commit do fixture gerado
- [ ] `package.json` do plugin tem `perf:validators` script

---

## Criterio de Aceite

**Por maquina (CA-26 verbatim):**

```bash
cd anti-vibe-coding
bun run tests/fixtures/generate-compound-fixture.ts tests/fixtures/compound-100-docs
# Esperado: stdout "Fixture generated at .../compound-100-docs: 100 compound notes, 20 active plans, 20 ADRs."

bun run tests/perf/validators.bench.ts
# Esperado output:
#   harness-validate.ts median: 1234ms (runs: 1190, 1234, 1280)
#   compound-check.ts median:   456ms (runs: 410, 456, 490)
#   Aggregate (informational):  1690ms
# Exit code: 0 (ambos sob 2000ms)

# Verifica que bench falha se validator passar do budget (smoke):
# (manual — adicionar 10ms de delay em loop sequencial intencional, rodar bench, esperar exit 1)
```

**Por humano:**

- Output de bench eh acionavel: mediana + array de runs revela variancia. Se runs varios muito (ex: `[1200, 1800, 1100]`), suspeito de I/O concorrente fora do bench. Repetir.
- Em CI (GitHub Actions Ubuntu), bench tipicamente roda ~50% do tempo local Windows. Registrar na MEMORY do plano os tempos observados em ambos os ambientes para baseline.
- Apos primeira execucao com sucesso, anotar tempos em MEMORY ("metricas") para detectar regressao em runs futuras.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
