#!/usr/bin/env bun
// 2026-05-11 (Luiz/dev): harness-validate minimal — fase-04 do plano01 v6.0.0
// Decisao: D13 (TS+bun). Versao completa (links, planos orfaos, frontmatter)
// fica para Plano 04. Aqui so o essencial para o tracer bullet.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const REQUIRED_FILES = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'CLAUDE.md',
] as const

const AGENTS_MAX_LINES = 40

type Failure = { rule: string; message: string }

async function main(): Promise<void> {
  const failures: Failure[] = []

  await checkRequiredFiles(failures)
  await checkAgentsLineCount(failures)
  await checkAgentsHeading(failures)

  if (failures.length > 0) {
    console.error('Harness validation failed:')
    for (const f of failures) {
      console.error(`  [${f.rule}] ${f.message}`)
    }
    process.exit(1)
  }

  console.log('Harness validation passed.')
  process.exit(0)
}

async function checkRequiredFiles(failures: Failure[]): Promise<void> {
  // Paralelizar — G3 do plano (perf): fs.stat em paralelo
  const checks = REQUIRED_FILES.map(async (rel) => {
    try {
      const stat = await fs.stat(path.join(root, rel))
      if (!stat.isFile() && !stat.isSymbolicLink()) {
        failures.push({ rule: 'required-files', message: `${rel} exists but is not a file or symlink` })
      }
    } catch {
      failures.push({ rule: 'required-files', message: `Missing required file: ${rel}` })
    }
  })
  await Promise.all(checks)
}

async function checkAgentsLineCount(failures: Failure[]): Promise<void> {
  const agentsPath = path.join(root, 'AGENTS.md')
  let content: string
  try {
    content = await fs.readFile(agentsPath, 'utf8')
  } catch {
    // ja registrado em checkRequiredFiles — nao duplicar
    return
  }

  const lineCount = content.split('\n').length
  if (lineCount > AGENTS_MAX_LINES) {
    failures.push({
      rule: 'agents-line-count',
      message: `AGENTS.md should stay short; keep it at ${AGENTS_MAX_LINES} lines or fewer (current: ${lineCount})`,
    })
  }
}

async function checkAgentsHeading(failures: Failure[]): Promise<void> {
  const agentsPath = path.join(root, 'AGENTS.md')
  try {
    const content = await fs.readFile(agentsPath, 'utf8')
    if (!content.startsWith('# ')) {
      failures.push({
        rule: 'agents-heading',
        message: 'AGENTS.md must start with an H1 heading (line 1 begins with "# ")',
      })
    }
  } catch {
    // ja registrado
  }
}

await main()
