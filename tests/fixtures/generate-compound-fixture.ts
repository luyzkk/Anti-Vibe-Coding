#!/usr/bin/env bun
// 2026-05-12 (Luiz/dev): gerador deterministico de fixture 100-docs — Plano 04 fase-04.
// Argv: `bun run generate-compound-fixture.ts <target-dir>` — cria estrutura completa.
// Idempotente: rm -rf target-dir + recria.
// G3: fs.rm com {recursive:true, force:true} + fallback retry-once para Windows Defender lock.

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

const targetDir = path.resolve(argv[0]!)

async function main(): Promise<void> {
  // G3: rm com retry-once em Windows (Defender pode manter handle aberto brevemente).
  try {
    await fs.rm(targetDir, { recursive: true, force: true })
  } catch {
    // Retry once — Windows Defender pode segurar handle por ~100ms.
    await new Promise<void>((r) => setTimeout(r, 150))
    await fs.rm(targetDir, { recursive: true, force: true })
  }

  // 25 required-files do harness-validate (DI-03-02 — lista canonica do Plano 04 fase-03).
  await writeRequiredFiles()

  // 100 compound notes com frontmatter valido + 3 secoes obrigatorias (CA-29).
  for (let i = 0; i < COUNT_COMPOUND; i++) {
    await writeCompoundNote(i)
  }

  // 20 active plans com `- [ ]` pending — NAO orfaos (G6 do plano).
  for (let i = 0; i < COUNT_ACTIVE_PLANS; i++) {
    await writeActivePlan(i)
  }

  // 20 ADRs em docs/design-docs/ (volume apenas — nao validados por checks especificos).
  for (let i = 0; i < COUNT_ADRS; i++) {
    await writeAdr(i)
  }

  console.log(
    `Fixture generated at ${targetDir}: ${COUNT_COMPOUND} compound notes, ${COUNT_ACTIVE_PLANS} active plans, ${COUNT_ADRS} ADRs.`,
  )
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true })
}

async function writeFixtureFile(rel: string, body: string): Promise<void> {
  const full = path.join(targetDir, rel)
  await ensureDir(path.dirname(full))
  await fs.writeFile(full, body, 'utf8')
}

async function writeRequiredFiles(): Promise<void> {
  // AGENTS.md deve ter H1, <=40 linhas, e 3 required links (harness-validate checks CA-27).
  const agentsMd = `# Agent

This is the agent index.

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)
`

  // docs/STATE.md precisa de conteudo que nao quebre link-checker.
  const stateMd = `# State

## Resources

- detected_stack: unknown
`

  const files: ReadonlyArray<readonly [string, string]> = [
    ['AGENTS.md', agentsMd],
    ['ARCHITECTURE.md', '# Architecture\n'],
    ['CLAUDE.md', agentsMd],
    ['README.md', '# Project\n'],
    ['package.json', JSON.stringify({ name: 'fixture-100', version: '0.0.1' }, null, 2) + '\n'],
    ['.github/pull_request_template.md', '# PR Template\n'],
    ['docs/DESIGN.md', '# Design\n'],
    ['docs/FRONTEND.md', '# Frontend\n'],
    ['docs/PLANS.md', '# Plans\n'],
    ['docs/PRODUCT_SENSE.md', '# Product Sense\n'],
    ['docs/QUALITY_SCORE.md', '# Quality Score\n'],
    ['docs/RELIABILITY.md', '# Reliability\n'],
    ['docs/SECURITY.md', '# Security\n'],
    ['docs/COMPOUND_ENGINEERING.md', '# Compound Engineering\n'],
    ['docs/STATE.md', stateMd],
    ['docs/design-docs/index.md', '# Design Docs\n'],
    ['docs/design-docs/core-beliefs.md', '# Core Beliefs\n'],
    ['docs/exec-plans/active/README.md', '# Active Plans\n'],
    ['docs/exec-plans/completed/README.md', '# Completed Plans\n'],
    ['docs/exec-plans/tech-debt-tracker.md', '# Tech Debt\n'],
    ['docs/generated/db-schema.md', '# DB Schema\n'],
    ['docs/product-specs/index.md', '# Product Specs\n'],
    ['docs/references/README.md', '# References\n'],
    ['docs/compound/README.md', '# Compound Notes\n'],
  ]

  for (const [rel, body] of files) {
    await writeFixtureFile(rel, body)
  }

  // Copiar harness-validate.ts e compound-check.ts do template do plugin.
  // Fixture deve ser auto-suficiente: scripts devem existir em scripts/ (required-files check).
  const pluginRoot = path.resolve(import.meta.dir, '../..')
  const templatesDir = path.join(pluginRoot, 'skills/init/assets/templates/scripts')

  await ensureDir(path.join(targetDir, 'scripts'))
  await fs.copyFile(
    path.join(templatesDir, 'harness-validate.ts.tpl'),
    path.join(targetDir, 'scripts/harness-validate.ts'),
  )
  await fs.copyFile(
    path.join(templatesDir, 'compound-check.ts.tpl'),
    path.join(targetDir, 'scripts/compound-check.ts'),
  )
}

async function writeCompoundNote(i: number): Promise<void> {
  // Data ciclica para variar caminhos: meses 01-12, dias 01-28.
  const month = String((i % 12) + 1).padStart(2, '0')
  const day = String((i % 28) + 1).padStart(2, '0')
  const date = `2026-${month}-${day}`
  const slug = `synthetic-${String(i).padStart(3, '0')}`

  // Frontmatter valido — todos os 4 campos obrigatorios (DI-02-A1, DI-02-A2, CA-29).
  // tags: array inline com pelo menos 1 elemento nao-vazio.
  const body = `---
title: Synthetic compound note ${i}
category: bug
tags: [synthetic, perf-fixture, batch-${Math.floor(i / 10)}]
created: ${date}
---

# Synthetic compound note ${i}

## Problem

Synthetic problem description for note ${i}. Lorem ipsum dolor sit amet.

## Solution

Synthetic solution. Sed do eiusmod tempor incididunt ut labore.

## Prevention

Synthetic prevention. Ut enim ad minim veniam.
`
  await writeFixtureFile(`docs/compound/${date}-${slug}.md`, body)
}

async function writeActivePlan(i: number): Promise<void> {
  const day = String((i % 28) + 1).padStart(2, '0')
  const date = `2026-05-${day}`
  const slug = `synth-plan-${String(i).padStart(2, '0')}`

  // `- [ ]` pendente garante que looksCompleteInline() retorna false — NAO orfao (G6).
  const body = `# Plan: Synthetic ${i}

## Goal

Synthetic plan ${i}.

## Execution Steps

- [ ] Step 1
- [ ] Step 2
`
  await writeFixtureFile(`docs/exec-plans/active/${date}-${slug}.md`, body)
}

async function writeAdr(i: number): Promise<void> {
  const num = String(i + 1).padStart(4, '0')
  await writeFixtureFile(
    `docs/design-docs/ADR-${num}-synthetic.md`,
    `# ADR-${num}: Synthetic decision ${i}\n\nStatus: accepted\n`,
  )
}

await main()
