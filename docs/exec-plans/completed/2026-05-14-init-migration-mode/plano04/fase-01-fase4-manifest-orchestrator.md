# Fase 01: manifest-writer.ts + orchestrator-writer.ts

**Plano:** 04 — Manifest + Harness Validate: Fase 4
**Sizing:** 1.5h
**Depende de:** Plano 02 completo (`InventoryResult`, `AuditLogger`), Plano 03 completo (`MigrationPlannerResult`, plans em `active/`, `semantic-inventory.json`)
**Visual:** false

---

## O que esta fase entrega

Dois módulos TS determinísticos que encerram o pipeline de migration mode:

1. **`skills/init/lib/manifest-writer.ts`** — escreve `.claude/.anti-vibe-manifest.json` com `initMode: "migration"`, catalog de migration plans, checksums de artefatos criados e `run_id` correlacionado com o discovery.

2. **`skills/init/lib/orchestrator-writer.ts`** — escreve `docs/exec-plans/active/_INIT_ORCHESTRATOR.md` listando todos os migration plans em ordem topológica (design-docs → docs-layer → raiz → AGENTS.md last), com checkboxes e links relativos para facilitar execução sequencial pelo operador.

Estes módulos são chamados pelo `runMigrationMode()` em `SKILL.md` imediatamente após `runMigrationPlanner()` (Plano 03) retornar com sucesso.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/manifest-writer.ts` | Criar | Tipos + writeManifest + readManifest + buildMigrationPlanCatalog + computeChecksum |
| `skills/init/lib/manifest-writer.test.ts` | Criar | Stub RED + testes de writeManifest/readManifest/buildMigrationPlanCatalog |
| `skills/init/lib/orchestrator-writer.ts` | Criar | writeInitOrchestrator — gera _INIT_ORCHESTRATOR.md em ordem topológica |
| `skills/init/lib/orchestrator-writer.test.ts` | Criar | Stub RED + testes de ordenação topológica |

---

## Implementacao

### Passo 1: Escrever stubs RED antes de criar os módulos

Criar `skills/init/lib/manifest-writer.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test'
import { writeManifest, readManifest } from './manifest-writer'

describe('manifest-writer', () => {
  it('module exists and exports writeManifest and readManifest', () => {
    expect(typeof writeManifest).toBe('function')
    expect(typeof readManifest).toBe('function')
  })
})
```

Criar `skills/init/lib/orchestrator-writer.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test'
import { writeInitOrchestrator } from './orchestrator-writer'

describe('orchestrator-writer', () => {
  it('module exists and exports writeInitOrchestrator', () => {
    expect(typeof writeInitOrchestrator).toBe('function')
  })
})
```

Rodar para confirmar RED: `bun run test -- --grep 'manifest-writer|orchestrator-writer'`

### Passo 2: Tipos e contratos em `manifest-writer.ts`

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { TEMPLATE_MANIFEST } from './template-manifest'

export type InitMode = 'fresh' | 'migration' | 'completed'

export type MigrationPlanEntry = {
  /** UUID ou slug derivado do nome do arquivo. */
  id: string
  /**
   * Slot canônico que este plan cobre. Ex: 'docs/DESIGN.md'.
   * Usa os mesmos paths que TEMPLATE_MANIFEST[n].dst.
   * 'unknown' se a extração falhar (plan posicionado em Tier 4 do orchestrator).
   */
  slot: string
  /** Path relativo ao repo root do plan file. Ex: 'docs/exec-plans/active/2026-05-14-design-md-migration.md'. */
  path: string
  /** 'active' enquanto em docs/exec-plans/active/; 'completed' após mover para completed/. */
  status: 'active' | 'completed'
}

export type AntiVibeManifest = {
  pluginVersion: string
  initMode: InitMode
  /** ISO 8601 — momento da última escrita do manifest. */
  installedAt: string
  /**
   * Checksums SHA-256 de artefatos criados pelo pipeline.
   * Em 'fresh': checksums dos 26 arquivos scaffolded.
   * Em 'migration': checksums de migration plans + _INIT_ORCHESTRATOR.md + discovery/*.json.
   * @remarks Campo polimórfico por initMode — não comparar cross-mode.
   */
  files: Record<string, string>
  /** Catalog de migration plans. Presente apenas quando initMode é 'migration' ou 'completed'. */
  migrationPlans?: MigrationPlanEntry[]
}

const MANIFEST_PATH = '.claude/.anti-vibe-manifest.json'
```

### Passo 3: `computeChecksum` e helpers

```typescript
/** SHA-256 hex do conteúdo do arquivo. Retorna '' se arquivo não existir. */
export async function computeChecksum(absPath: string): Promise<string> {
  let content: Buffer
  try {
    content = await fs.readFile(absPath)
  } catch {
    return ''
  }
  return createHash('sha256').update(content).digest('hex')
}

/** Resolve .claude/ no targetDir, criando se não existir. */
async function ensureClaudeDir(targetDir: string): Promise<string> {
  const claudeDir = path.join(targetDir, '.claude')
  await fs.mkdir(claudeDir, { recursive: true })
  return claudeDir
}
```

### Passo 4: `buildMigrationPlanCatalog`

```typescript
// Regex para extração de slot canônico nos plan files.
// Convention (Plano 03 fase-03): plans começam com `<!-- migration-slot: {slot} -->`.
const SLOT_COMMENT_RE = /<!--\s*migration-slot:\s*(.+?)\s*-->/

// Fallback: extrai path em backticks da linha após `## Goal`.
const GOAL_SLOT_RE = /`((?:docs|scripts|\.github)\/[^`]+\.(?:md|ts)|(?:AGENTS|ARCHITECTURE|CLAUDE|README)\.md)`/

/** Conjunto de todos os dst do TEMPLATE_MANIFEST para validação de slot. */
const VALID_SLOTS = new Set(TEMPLATE_MANIFEST.map((e) => e.dst))

async function inferSlotFromPlanFile(absPath: string): Promise<string> {
  let content: string
  try {
    content = await fs.readFile(absPath, 'utf-8')
  } catch {
    return 'unknown'
  }

  // Tenta comment convention primeiro.
  const commentMatch = content.match(SLOT_COMMENT_RE)
  if (commentMatch?.[1] && VALID_SLOTS.has(commentMatch[1])) {
    return commentMatch[1]
  }

  // Fallback: goal section.
  const goalMatch = content.match(GOAL_SLOT_RE)
  if (goalMatch?.[1] && VALID_SLOTS.has(goalMatch[1])) {
    return goalMatch[1]
  }

  return 'unknown'
}

/**
 * Escaneia `docs/exec-plans/active/` e `docs/exec-plans/completed/` para
 * catalogar todos os migration plans gerados pelo pipeline.
 */
export async function buildMigrationPlanCatalog(targetDir: string): Promise<MigrationPlanEntry[]> {
  const entries: MigrationPlanEntry[] = []

  for (const [status, dir] of [
    ['active', 'docs/exec-plans/active'],
    ['completed', 'docs/exec-plans/completed'],
  ] as const) {
    const absDir = path.join(targetDir, dir)
    let files: string[]
    try {
      files = await fs.readdir(absDir)
    } catch {
      continue
    }

    for (const file of files) {
      if (!file.endsWith('-migration.md')) continue
      const absPath = path.join(absDir, file)
      const relPath = `${dir}/${file}`
      const id = file.replace(/\.md$/, '')
      const slot = await inferSlotFromPlanFile(absPath)
      entries.push({ id, slot, path: relPath, status })
    }
  }

  return entries
}
```

### Passo 5: `writeManifest` e `readManifest`

```typescript
export async function writeManifest(
  targetDir: string,
  manifest: AntiVibeManifest,
): Promise<void> {
  await ensureClaudeDir(targetDir)
  const absPath = path.join(targetDir, MANIFEST_PATH)
  await fs.writeFile(absPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

export async function readManifest(targetDir: string): Promise<AntiVibeManifest | null> {
  const absPath = path.join(targetDir, MANIFEST_PATH)
  try {
    const raw = await fs.readFile(absPath, 'utf-8')
    return JSON.parse(raw) as AntiVibeManifest
  } catch {
    return null
  }
}
```

### Passo 6: `buildAndWritePhase4Manifest`

Função de orquestração chamada pelo SKILL.md após `runMigrationPlanner()`:

```typescript
import type { InventoryResult } from './discovery'

export type Phase4Input = {
  targetDir: string
  pluginVersion: string
  inventoryRunId: string
  planPaths: string[]  // Da MigrationPlannerResult do Plano 03
}

export async function buildAndWritePhase4Manifest(input: Phase4Input): Promise<AntiVibeManifest> {
  const { targetDir, pluginVersion, inventoryRunId, planPaths } = input

  const migrationPlans = await buildMigrationPlanCatalog(targetDir)

  // Checksums de artefatos criados nesta execução.
  const filesToChecksum = [
    'docs/exec-plans/active/_INIT_ORCHESTRATOR.md',
    'discovery/inventory.json',
    'discovery/semantic-inventory.json',
    ...planPaths.map((p) => path.relative(targetDir, p)),
  ]
  const files: Record<string, string> = {}
  await Promise.all(
    filesToChecksum.map(async (rel) => {
      const checksum = await computeChecksum(path.join(targetDir, rel))
      if (checksum) files[rel] = checksum
    }),
  )

  const manifest: AntiVibeManifest = {
    pluginVersion,
    initMode: 'migration',
    installedAt: new Date().toISOString(),
    files,
    migrationPlans,
  }

  await writeManifest(targetDir, manifest)
  return manifest
}
```

### Passo 7: `orchestrator-writer.ts` — Ordenação Topológica

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MigrationPlanEntry } from './manifest-writer'

// Tiers de ordenação topológica conforme PRD Fase 4.
// Menor tier = executar primeiro.
const SLOT_TIERS: Record<string, number> = {
  // Tier 1: fundação de design
  'docs/design-docs/index.md': 1,
  'docs/design-docs/core-beliefs.md': 1,
  'ARCHITECTURE.md': 1,
  'CLAUDE.md': 1,
  // Tier 2: docs layer
  'docs/DESIGN.md': 2,
  'docs/FRONTEND.md': 2,
  'docs/PLANS.md': 2,
  'docs/PRODUCT_SENSE.md': 2,
  'docs/QUALITY_SCORE.md': 2,
  'docs/MERGE_GATES.md': 2,
  'docs/RELIABILITY.md': 2,
  'docs/SECURITY.md': 2,
  'docs/COMPOUND_ENGINEERING.md': 2,
  'docs/STATE.md': 2,
  // Tier 3: exec-plans, compound, review-checklists, smoke-flows, product-specs, references, generated
  'docs/exec-plans/active/README.md': 3,
  'docs/exec-plans/completed/README.md': 3,
  'docs/exec-plans/tech-debt-tracker.md': 3,
  'docs/compound/README.md': 3,
  'docs/review-checklists/README.md': 3,
  'docs/review-checklists/security.md': 3,
  'docs/review-checklists/reliability.md': 3,
  'docs/review-checklists/agent-api.md': 3,
  'docs/review-checklists/frontend-ui.md': 3,
  'docs/review-checklists/production-readiness.md': 3,
  'docs/smoke-flows/README.md': 3,
  'docs/product-specs/index.md': 3,
  'docs/references/README.md': 3,
  'docs/generated/db-schema.md': 3,
  // Tier 4: infra
  'README.md': 4,
  'TODO.md': 4,
  'scripts/compound-check.ts': 4,
  'scripts/new-plan.ts': 4,
  '.github/pull_request_template.md': 4,
  // Tier 5: router — sempre last
  'AGENTS.md': 5,
}

function tierOf(slot: string): number {
  return SLOT_TIERS[slot] ?? 4  // unknown → Tier 4 (infra)
}

export async function writeInitOrchestrator(
  targetDir: string,
  plans: MigrationPlanEntry[],
): Promise<void> {
  const sorted = [...plans].sort((a, b) => {
    const ta = tierOf(a.slot)
    const tb = tierOf(b.slot)
    if (ta !== tb) return ta - tb
    return a.slot.localeCompare(b.slot)  // alphabetical dentro do tier
  })

  const lines: string[] = [
    '# _INIT_ORCHESTRATOR — Migration Execution Order',
    '',
    '> Execute plans nesta ordem. Design-docs primeiro; AGENTS.md por último (referencia tudo).',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Plans:** ${sorted.length}`,
    '',
    '---',
    '',
  ]

  let currentTier = 0
  const tierLabels: Record<number, string> = {
    1: '## Tier 1 — Design Foundation',
    2: '## Tier 2 — Docs Layer',
    3: '## Tier 3 — Exec-Plans, Compound, Review-Checklists',
    4: '## Tier 4 — Infra + Unknown',
    5: '## Tier 5 — Router (execute last)',
  }

  for (const plan of sorted) {
    const tier = tierOf(plan.slot)
    if (tier !== currentTier) {
      if (currentTier > 0) lines.push('')
      lines.push(tierLabels[tier] ?? `## Tier ${tier}`)
      lines.push('')
      currentTier = tier
    }
    const statusBadge = plan.status === 'completed' ? '[x]' : '[ ]'
    const relLink = `../../${plan.path}`  // relativo a docs/exec-plans/active/
    const slotDisplay = plan.slot === 'unknown' ? `*(slot unknown — ${plan.id})*` : `\`${plan.slot}\``
    lines.push(`- [${statusBadge}] [${plan.id}](${relLink}) — ${slotDisplay}`)
  }

  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('*Gerado por /init migration mode Fase 4. Não edite manualmente — regenerado em cada /init re-run.*')

  const destPath = path.join(targetDir, 'docs/exec-plans/active/_INIT_ORCHESTRATOR.md')
  await fs.writeFile(destPath, lines.join('\n'), 'utf-8')
}
```

---

## Gotchas

**G1 — `slug` de plan vs `id` de plan:** O `id` no `MigrationPlanEntry` é o nome do arquivo sem `.md` (ex: `2026-05-14-design-md-migration`). Não confundir com `slot`. O `slug` para lookup topológico vem de `slot`, não de `id`.

**G2 — `_INIT_ORCHESTRATOR.md` é sobrescrito em re-run:** DT-02 (full re-run regenera `discovery/*`) também se aplica ao orchestrator: Plano 05 fase-01 (idempotência) testa que re-run recria `_INIT_ORCHESTRATOR.md` sem erros. O `writeInitOrchestrator` usa `fs.writeFile` (sobrescreve), não `appendFile`.

**G3 — `buildMigrationPlanCatalog` escana AMBAS `active/` e `completed/`:** Para re-runs após alguns plans já completados, o catalog reflete o status real. Isso é crítico para `autoFlipIfComplete()` (Fase 03) que conta plans com `status: 'active'`.

**G4 — `planPaths` vs catalog por scan:** `buildAndWritePhase4Manifest` recebe `planPaths` da `MigrationPlannerResult` (Plano 03) para incluir nos checksums. Mas o catalog de `migrationPlans` vem de `buildMigrationPlanCatalog()` que escaneia disco — não de `planPaths`. Isso garante que plans pré-existentes de re-runs anteriores também sejam catalogados.

**G5 — Rellink no orchestrator é relativo a sua localização:** `_INIT_ORCHESTRATOR.md` vive em `docs/exec-plans/active/`. Um plan em `docs/exec-plans/active/2026-05-14-foo-migration.md` tem rellink `./2026-05-14-foo-migration.md` (mesmo diretório). Mas plans em `completed/` teriam `../../docs/exec-plans/completed/...` — cuidado ao calcular o path relativo.

**G6 — `MANIFEST_PATH = '.claude/.anti-vibe-manifest.json'`:** `.claude/` pode não existir em repos sem histórico de Claude Code. `ensureClaudeDir` usa `fs.mkdir({ recursive: true })` — idempotente. Não assumir que `.claude/` pré-existe.

---

## Verificacao

### TDD
- [ ] RED: `manifest-writer.ts` não existe, teste falha com ModuleNotFoundError
  - Comando: `bun run test -- --grep 'manifest-writer'`
- [ ] GREEN: módulo criado, stub test passa
  - Comando: `bun run test -- --grep 'manifest-writer'`
- [ ] RED: `orchestrator-writer.ts` não existe, teste falha com ModuleNotFoundError
  - Comando: `bun run test -- --grep 'orchestrator-writer'`
- [ ] GREEN: módulo criado, stub test passa
  - Comando: `bun run test -- --grep 'orchestrator-writer'`

### Checklist

- [ ] `writeManifest(targetDir, manifest)` escreve `.claude/.anti-vibe-manifest.json`
- [ ] `readManifest(targetDir)` retorna `AntiVibeManifest | null`
- [ ] `computeChecksum(absPath)` retorna SHA-256 hex; retorna `''` para arquivo inexistente
- [ ] `buildMigrationPlanCatalog(targetDir)` escaneia `active/` + `completed/` para `*-migration.md`
- [ ] Cada entry tem `id`, `slot`, `path`, `status` corretamente populados
- [ ] `inferSlotFromPlanFile` tenta `<!-- migration-slot: -->` primeiro; fallback regex `## Goal`
- [ ] `buildAndWritePhase4Manifest` popula `files` com checksums (planos + orchestrator + discovery)
- [ ] `writeInitOrchestrator` escreve `_INIT_ORCHESTRATOR.md` em ordem topológica (Tier 1→5)
- [ ] AGENTS.md sempre aparece no Tier 5 (last)
- [ ] Plans com `slot: 'unknown'` aparecem no Tier 4
- [ ] `bun run tsc --noEmit` passa sem erros
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'manifest-writer|orchestrator-writer'` retorna ≥2 testes PASS, 0 FAIL
- `bun run tsc --noEmit` retorna exit code 0
- `readManifest(tmpDir)` retorna `null` quando manifest não existe
- `writeManifest` + `readManifest` round-trip: manifest lido é idêntico ao escrito (deep equal)
- `_INIT_ORCHESTRATOR.md` gerado contém `## Tier 5` com `AGENTS.md` plan como último item

<!-- Gerado por /plan-feature em 2026-05-14 -->
