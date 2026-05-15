<!--
Princípio universal #5 — Comment Provenance.
Cada decisão não óbvia neste arquivo tem autor, data e justificativa inline.
Não remova comentários de proveniência — eles são o contexto que previne regressões.
-->

# Fase 02: Fixtures Completas — 5 Repos-Mock

**Plano:** 05 — Polish: Idempotência + Fixtures + AGENTS.md
**Sizing:** 1.5h
**Depende de:** fase-01 (idempotency.ts — usado em testes de integração das fixtures)
**Visual:** false

---

## O que esta fase entrega

5 repos-mock em `skills/init/__fixtures__/` cobrindo os cenários extremos do pipeline de
migration mode: repo vazio (greenfield), repo com 1 arquivo design (single-design-file), repo
com ADRs espalhados (scattered-adrs), repo com doc densa >1000 linhas (dense-architecture) e
snapshot do próprio plugin Anti-Vibe-Coding (dogfood). Cada fixture tem `fixture-manifest.json`
descrevendo o cenário esperado, usado pelos testes de integração de `discovery.ts` e
`migrate-orchestrator.ts`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/__fixtures__/greenfield/fixture-manifest.json` | Criar | Cenário: repo vazio sem docs |
| `skills/init/__fixtures__/single-design-file/fixture-manifest.json` | Criar | Cenário: 1 arquivo ARCHITECTURE.md |
| `skills/init/__fixtures__/single-design-file/docs/ARCHITECTURE.md` | Criar | Doc sintética 400 linhas |
| `skills/init/__fixtures__/scattered-adrs/fixture-manifest.json` | Criar | Cenário: 3 docs scattered |
| `skills/init/__fixtures__/scattered-adrs/docs/design-docs/ADR-001.md` | Criar | ADR sintético |
| `skills/init/__fixtures__/scattered-adrs/docs/design-docs/ADR-002.md` | Criar | ADR sintético |
| `skills/init/__fixtures__/scattered-adrs/docs/notes-2024.md` | Criar | Doc de notas avulsas |
| `skills/init/__fixtures__/dense-architecture/fixture-manifest.json` | Criar | Cenário: doc densa >1000 linhas |
| `skills/init/__fixtures__/dense-architecture/docs/architecture-notes.md` | Criar | Doc sintética 1200+ linhas |
| `skills/init/__fixtures__/dogfood-anti-vibe-plugin/fixture-manifest.json` | Criar | Cenário: mirrors Anti-Vibe-Coding |
| `skills/init/__fixtures__/dogfood-anti-vibe-plugin/ARCHITECTURE.md` | Criar | Snapshot sintético |
| `skills/init/__fixtures__/dogfood-anti-vibe-plugin/docs/PIPELINE.md` | Criar | Snapshot sintético |
| `skills/init/__fixtures__/dogfood-anti-vibe-plugin/docs/MODEL_PROFILES.md` | Criar | Snapshot sintético |
| `skills/init/__fixtures__/dogfood-anti-vibe-plugin/docs/AGENTS_LIST.md` | Criar | Snapshot sintético |
| `skills/init/__fixtures__/dogfood-anti-vibe-plugin/docs/UPGRADE.md` | Criar | Snapshot sintético |
| `skills/init/__fixtures__/dogfood-anti-vibe-plugin/docs/design-docs/ADR-001.md` | Criar | Snapshot sintético |
| `skills/init/__fixtures__/dogfood-anti-vibe-plugin/docs/compound/2026-04-01-compound.md` | Criar | Snapshot sintético |

---

## Implementacao

### Passo 1: Estrutura do `fixture-manifest.json`

Cada fixture tem um `fixture-manifest.json` no seu diretório raiz. Schema:

```typescript
// Tipo de referência — não criar como arquivo separado; inline nos testes.
type FixtureManifest = {
  /** Identificador legível do cenário. */
  scenario: string
  /** Modo esperado após detectMigrationMode() rodar na fixture. */
  expected_mode: 'greenfield' | 'migration' | 'fresh'
  /**
   * Número de migration plans esperados após pipeline completo.
   * -1 = não verificado (fixture serve apenas para detecção de mode, não para plan count).
   */
  expected_plan_count: number
  /** Lista de doc files presentes na fixture (paths relativos à raiz da fixture). */
  doc_files: string[]
  /** Se true, o discovery deve detectar dense=true (arquivo com >1000 linhas). */
  has_dense_doc?: boolean
  /** Notas sobre o que esta fixture testa especificamente. */
  notes: string
}
```

### Passo 2: Fixture 1 — `greenfield/`

Diretório completamente vazio (nenhum arquivo de docs). Testa o branch greenfield do
`detectMigrationMode`: sem arquivos `.md` existentes → `mode: 'greenfield'`.

**`greenfield/fixture-manifest.json`:**
```json
{
  "scenario": "greenfield",
  "expected_mode": "greenfield",
  "expected_plan_count": 0,
  "doc_files": [],
  "notes": "Repo completamente vazio sem docs. detectMigrationMode deve retornar greenfield. Nenhum plano de migração gerado — scaffold completo direto."
}
```

Não criar nenhum outro arquivo neste diretório. A fixture é o diretório vazio (além do manifest).

### Passo 3: Fixture 2 — `single-design-file/`

Um único arquivo `docs/ARCHITECTURE.md` com 400 linhas sintéticas. Testa o branch migration mode
com mínimo de 1 arquivo elegível, sem densidade.

**`single-design-file/fixture-manifest.json`:**
```json
{
  "scenario": "single-design-file",
  "expected_mode": "migration",
  "expected_plan_count": 1,
  "doc_files": ["docs/ARCHITECTURE.md"],
  "has_dense_doc": false,
  "notes": "Repo com exatamente 1 arquivo de design existente. Trigger de migration mode. Deve gerar 1 migration plan para ARCHITECTURE.md. Testa batching com doc único."
}
```

**`single-design-file/docs/ARCHITECTURE.md`** (400 linhas sintéticas):

Criar com conteúdo sintético mas estruturalmente válido. Deve ter H1, seções H2/H3,
e referências a componentes fictícios para simular um doc real sem ser trivialmente pequeno.

```markdown
# Architecture

## Overview

This document describes the system architecture of the Fictional E-Commerce Platform.
It establishes the module boundaries, data flow, and key design decisions.

## System Boundaries

The system has three main boundaries:
- **Frontend:** React SPA hosted on CDN
- **API Gateway:** Node.js BFF (Backend for Frontend)
- **Core Services:** Domain microservices (orders, inventory, payments)

## Module Map

### Frontend
...
[continuar com ~390 linhas de conteúdo sintético estruturado em seções H2/H3
cobrindo: Data Flow, Security Model, Deployment Architecture, ADR References,
Component Ownership, Monitoring, etc.]
```

O executor deve gerar as 400 linhas completas usando o padrão acima. O conteúdo exato
não é crítico — o que importa é que `wc -l` retorne ≥400 e o arquivo tenha estrutura
markdown válida (H1 presente, seções H2).

### Passo 4: Fixture 3 — `scattered-adrs/`

3 arquivos markdown em locais não-canônicos. Testa discovery walk em subdiretórios e
detecção de múltiplos docs para migração.

**`scattered-adrs/fixture-manifest.json`:**
```json
{
  "scenario": "scattered-adrs",
  "expected_mode": "migration",
  "expected_plan_count": 3,
  "doc_files": [
    "docs/design-docs/ADR-001.md",
    "docs/design-docs/ADR-002.md",
    "docs/notes-2024.md"
  ],
  "has_dense_doc": false,
  "notes": "3 documentos espalhados. Testa walk recursivo de docs/ e detecção de múltiplos arquivos elegíveis para migração. Cada ADR deve gerar 1 migration plan."
}
```

**`scattered-adrs/docs/design-docs/ADR-001.md`:**
```markdown
# ADR-001: Use PostgreSQL as Primary Database

**Status:** Accepted
**Date:** 2024-01-15
**Deciders:** Engineering Team

## Context

The team evaluated multiple database options: PostgreSQL, MySQL, MongoDB, and DynamoDB.

## Decision

We chose PostgreSQL for its ACID compliance, JSON support, and mature ecosystem.

## Consequences

- Strong consistency guarantees for financial transactions.
- Requires schema migrations for structural changes.
- Excellent tooling for backup and replication.
```

**`scattered-adrs/docs/design-docs/ADR-002.md`:**
```markdown
# ADR-002: Adopt TypeScript Across All Services

**Status:** Accepted
**Date:** 2024-02-01
**Deciders:** CTO, Engineering Leads

## Context

Codebase was split between JavaScript and TypeScript, causing inconsistent type safety.

## Decision

All new code and gradual migration of existing code to TypeScript strict mode.

## Consequences

- Improved IDE support and refactoring confidence.
- Requires TypeScript compiler setup in all packages.
- Learning curve for engineers unfamiliar with TS generics.
```

**`scattered-adrs/docs/notes-2024.md`:**
```markdown
# Engineering Notes 2024

## Q1 Notes

- Migrated authentication to JWT tokens.
- Removed legacy SOAP endpoints.
- Added Redis cache layer for session management.

## Q2 Notes

- Introduced feature flags via LaunchDarkly.
- Performance audit: reduced API p99 from 800ms to 120ms.
- Added distributed tracing with OpenTelemetry.

## Decisions Pending

- Evaluate GraphQL federation for API gateway.
- Consider replacing Redis with Memcached for cache tier.
```

### Passo 5: Fixture 4 — `dense-architecture/`

1 arquivo markdown com 1200+ linhas (dense=true). Testa o path de batching sequencial do
explorer: docs grandes exigem chunking, não processamento em lote paralelo.

**`dense-architecture/fixture-manifest.json`:**
```json
{
  "scenario": "dense-architecture",
  "expected_mode": "migration",
  "expected_plan_count": 1,
  "doc_files": ["docs/architecture-notes.md"],
  "has_dense_doc": true,
  "notes": "1 documento com 1200+ linhas. Testa detecção de dense=true em discovery.ts (linha count > threshold). Explorer deve processar em modo sequencial/chunked para evitar context overflow."
}
```

**`dense-architecture/docs/architecture-notes.md`** (1200+ linhas):

Criar como doc de arquitetura densa com múltiplos sistemas documentados. Estrutura:
- H1: "Architecture Notes — Fictional Platform"
- ~20 seções H2 cobrindo: API Design, Database Layer, Caching Strategy, Message Queue,
  Service Discovery, Security Architecture, Frontend Architecture, Deployment, Monitoring,
  Alerting, Incident Response, Data Pipeline, ML Platform, Auth/AuthZ, Multi-tenancy,
  Rate Limiting, Circuit Breakers, Feature Flags, Migration Strategy, Tech Debt
- Cada seção tem 3-5 subseções H3 com 8-12 linhas de texto
- Total: ~1200 linhas (verificar com `wc -l` após criar)

O executor deve preencher com conteúdo sintético estruturado. O critério de aceite é
`wc -l docs/architecture-notes.md` ≥ 1200.

### Passo 6: Fixture 5 — `dogfood-anti-vibe-plugin/`

Snapshot sintética da estrutura real do repo Anti-Vibe-Coding. Testa o pipeline no próprio
tipo de repo que o plugin gerencia. Conteúdo é sintético (não copia arquivos reais do repo)
para garantir determinismo nos testes.

**`dogfood-anti-vibe-plugin/fixture-manifest.json`:**
```json
{
  "scenario": "dogfood-anti-vibe-plugin",
  "expected_mode": "migration",
  "expected_plan_count": 7,
  "doc_files": [
    "ARCHITECTURE.md",
    "docs/PIPELINE.md",
    "docs/MODEL_PROFILES.md",
    "docs/AGENTS_LIST.md",
    "docs/UPGRADE.md",
    "docs/design-docs/ADR-001.md",
    "docs/compound/2026-04-01-compound.md"
  ],
  "has_dense_doc": false,
  "notes": "Mirrors estrutura do repo Anti-Vibe-Coding. Conteúdo sintético (não copia do repo real) para determinismo. Testa pipeline com mix de docs na raiz e em subdiretórios. expected_plan_count=7 (1 por doc_file)."
}
```

**`dogfood-anti-vibe-plugin/ARCHITECTURE.md`:**
```markdown
# Architecture

## Plugin Structure

This plugin enforces XP discipline for AI-assisted development.

### Core Skills
- `grill-me`: Pre-implementation interview
- `write-prd`: PRD generation
- `plan-feature`: Execution plan generation
- `execute-plan`: Hierarchical plan execution
- `verify-work`: Post-execution verification

### Pipeline Flow

```
grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate
```

## Module Boundaries

Skills are self-contained. They import from `skills/*/lib/` but not from each other.
```

**`dogfood-anti-vibe-plugin/docs/PIPELINE.md`:**
```markdown
# Pipeline

## Stages

1. **grill-me** — Resolves ambiguity before coding starts.
2. **write-prd** — Converts interview into a spec document.
3. **plan-feature** — Converts spec into an executable plan.
4. **execute-plan** — Executes plan phase by phase with subagents.
5. **verify-work** — Validates output against acceptance criteria.
6. **iterate** — Post-deploy loop with incident response.

## Model Profiles

Each stage uses a model profile: quality, balanced, or budget.
See docs/MODEL_PROFILES.md for configuration.
```

**`dogfood-anti-vibe-plugin/docs/MODEL_PROFILES.md`:**
```markdown
# Model Profiles

## Profiles

| Profile | Model | Use Case |
|---------|-------|----------|
| quality | claude-opus-4 | Architectural decisions, security review |
| balanced | claude-sonnet-4-5 | Implementation, plan execution |
| budget | claude-haiku-3-5 | Linting, formatting, trivial transforms |

## Configuration

Set profile in `SKILL.md` frontmatter: `model_profile: quality`.
```

**`dogfood-anti-vibe-plugin/docs/AGENTS_LIST.md`:**
```markdown
# Agents List

## Available Subagent Auditors

- **Security Auditor** — Reviews auth, input validation, secrets handling.
- **Architecture Auditor** — Reviews module boundaries and layering.
- **Test Coverage Auditor** — Reviews TDD compliance and coverage gaps.
- **Performance Auditor** — Reviews N+1 queries and hot paths.

## Usage

Auditors are invoked by `verify-work` skill automatically after execution.
```

**`dogfood-anti-vibe-plugin/docs/UPGRADE.md`:**
```markdown
# Upgrade Guide

## Versioning

This plugin uses semantic versioning. Breaking changes increment MAJOR.

## Migration from v5 to v6

1. Move `.planning/` contents to `docs/exec-plans/`.
2. Update `CLAUDE.md` with new pipeline references.
3. Run `bun run harness:validate` to confirm structure.

## Checksums

Each release includes a manifest checksum for integrity verification.
```

**`dogfood-anti-vibe-plugin/docs/design-docs/ADR-001.md`:**
```markdown
# ADR-001: Subagent Contract v1

**Status:** Accepted
**Date:** 2026-05-01

## Context

Subagents needed a typed contract for structured output to prevent hallucination drift.

## Decision

All subagents emit a JSON envelope with `contract_version`, `kind`, `status`, `reasoning`,
and `payload` fields. The orchestrator validates the envelope before consuming payload.

## Consequences

- Structured output reduces hallucination risk.
- Adds parsing overhead (~5ms per response).
- Contract version allows backward-compatible evolution.
```

**`dogfood-anti-vibe-plugin/docs/compound/2026-04-01-compound.md`:**
```markdown
---
date: 2026-04-01
title: "TDD Enforcement in Subagent Orchestration"
tags: [tdd, subagents, orchestration]
---

# TDD Enforcement in Subagent Orchestration

## What Happened

Subagent Explorer was generating migration plans without running tests first,
causing plans that passed linting but failed at runtime.

## Root Cause

The orchestrator was not enforcing RED→GREEN cycle before accepting plan output.

## Fix Applied

Added `contract_version` check: plans with `status: "complete"` must include
`test_evidence` in payload. Orchestrator rejects plans missing this field.

## Prevention

Compound rule added: all subagent contracts requiring code generation must include
`test_evidence` in payload schema.
```

### Passo 7: Teste de integração das fixtures

Criar `skills/init/__fixtures__/fixtures.test.ts` (ou adicionar ao suite existente):

```typescript
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const FIXTURES_DIR = path.join(import.meta.dir)

const FIXTURE_NAMES = [
  'greenfield',
  'single-design-file',
  'scattered-adrs',
  'dense-architecture',
  'dogfood-anti-vibe-plugin',
] as const

type FixtureManifest = {
  scenario: string
  expected_mode: 'greenfield' | 'migration' | 'fresh'
  expected_plan_count: number
  doc_files: string[]
  has_dense_doc?: boolean
  notes: string
}

describe('fixtures', () => {
  for (const fixtureName of FIXTURE_NAMES) {
    it(`${fixtureName}: fixture-manifest.json exists and is valid`, async () => {
      const manifestPath = path.join(FIXTURES_DIR, fixtureName, 'fixture-manifest.json')
      const raw = await fs.readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(raw) as FixtureManifest

      expect(manifest.scenario).toBe(fixtureName)
      expect(['greenfield', 'migration', 'fresh']).toContain(manifest.expected_mode)
      expect(typeof manifest.expected_plan_count).toBe('number')
      expect(Array.isArray(manifest.doc_files)).toBe(true)
      expect(typeof manifest.notes).toBe('string')
    })

    it(`${fixtureName}: all doc_files listed in fixture-manifest.json exist`, async () => {
      const manifestPath = path.join(FIXTURES_DIR, fixtureName, 'fixture-manifest.json')
      const raw = await fs.readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(raw) as FixtureManifest

      for (const docFile of manifest.doc_files) {
        const absPath = path.join(FIXTURES_DIR, fixtureName, docFile)
        const stat = await fs.stat(absPath)
        expect(stat.isFile()).toBe(true)
      }
    })
  }

  it('dense-architecture: architecture-notes.md has ≥1200 lines', async () => {
    const filePath = path.join(FIXTURES_DIR, 'dense-architecture', 'docs', 'architecture-notes.md')
    const content = await fs.readFile(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount).toBeGreaterThanOrEqual(1200)
  })

  it('single-design-file: ARCHITECTURE.md has ≥400 lines', async () => {
    const filePath = path.join(FIXTURES_DIR, 'single-design-file', 'docs', 'ARCHITECTURE.md')
    const content = await fs.readFile(filePath, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount).toBeGreaterThanOrEqual(400)
  })

  it('greenfield: no doc files in fixture directory (besides fixture-manifest.json)', async () => {
    const fixtureDir = path.join(FIXTURES_DIR, 'greenfield')
    const entries = await fs.readdir(fixtureDir)
    const mdFiles = entries.filter((e) => e.endsWith('.md'))
    expect(mdFiles).toHaveLength(0)
  })
})
```

---

## Gotchas

**G1 — Fixture `__fixtures__/` já está no `SKIP_DIRS` do harness-validate:** O harness
não valida links dentro de `__fixtures__/`. Isso é intencional (BUG-08-01 área). Os
arquivos das fixtures podem ter links relativos inválidos — não são links reais.

**G2 — Fixture `dogfood` usa conteúdo sintético, não copia o repo real:** Nunca usar
`fs.copyFile` do repo atual para criar a fixture. O conteúdo deve ser estático e
versionado. Mudanças no repo real não devem quebrar a fixture.

**G3 — `dense-architecture/docs/architecture-notes.md` precisa de ≥1200 linhas reais:**
O executor deve contar as linhas após criar. Um arquivo com 50 seções repetidas (cut-and-paste)
não é adequado — deve ter variação de conteúdo para simular um doc denso real. Mínimo:
10 seções H2 com 5 subseções H3 cada, com 10-15 linhas por subseção.

**G4 — Fixture `greenfield` deve ser um diretório com apenas `fixture-manifest.json`:**
Não criar `.gitkeep` nem outros arquivos. O teste `no doc files` verifica que não existem
arquivos `.md` além do manifest.

**G5 — `expected_plan_count` para `dogfood` é 7 (uma por `doc_file`):** Este é o esperado
APÓS o pipeline completo (Plano 03). Durante o desenvolvimento dos Planos 01-02, os testes
usam apenas `expected_mode: 'migration'` e `doc_files` para validar discovery. O `expected_plan_count`
é validado pelos testes do Plano 03.

---

## Verificacao

### TDD
- [ ] RED: fixtures não existem, `fixtures.test.ts` falha com ENOENT
  - Comando: `bun run test -- --grep 'fixtures'`
- [ ] GREEN: todas as fixtures criadas, todos os testes passam
  - Comando: `bun run test -- --grep 'fixtures'`

### Checklist
- [ ] 5 diretórios de fixture existem em `skills/init/__fixtures__/`
- [ ] Cada fixture tem `fixture-manifest.json` com schema correto
- [ ] `greenfield/` contém apenas `fixture-manifest.json` (sem arquivos .md)
- [ ] `single-design-file/docs/ARCHITECTURE.md` tem ≥400 linhas (`wc -l` verifica)
- [ ] `scattered-adrs/` tem 3 arquivos .md nos paths descritos
- [ ] `dense-architecture/docs/architecture-notes.md` tem ≥1200 linhas (`wc -l` verifica)
- [ ] `dogfood-anti-vibe-plugin/` tem 7 arquivos .md nos paths descritos
- [ ] Cada `doc_files[]` listado existe como arquivo real na fixture
- [ ] `bun run test -- --grep 'fixtures'` passa sem erros
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'fixtures'` retorna ≥12 testes PASS, 0 FAIL
- `dense-architecture/docs/architecture-notes.md` line count ≥ 1200
- `single-design-file/docs/ARCHITECTURE.md` line count ≥ 400
- `greenfield/` contém exatamente 1 arquivo (fixture-manifest.json)

**Por humano (RF-SH-06 do PRD):**
5 repos-mock em `skills/init/__fixtures__/`: greenfield, single-design-file, scattered-adrs,
dense-architecture, dogfood-anti-vibe-plugin — cada um com `fixture-manifest.json` válido
e doc_files que existem no filesystem.

<!-- Gerado por /plan-feature em 2026-05-14 -->
