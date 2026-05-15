# Fase 02: harness-validate.ts — Migration Mode Extension

**Plano:** 04 — Manifest + Harness Validate: Fase 4
**Sizing:** 1.5h
**Depende de:** fase-01 (`manifest-writer.ts` — `readManifest` / `AntiVibeManifest` / `MigrationPlanEntry`)
**Visual:** false

---

## O que esta fase entrega

Extensão de `scripts/harness-validate.ts` para funcionar em dois modos dependendo do `initMode` no manifest:

- **Strict mode** (`fresh` | `completed` | sem manifest): comportamento atual — ausência dos 26 arquivos é `error`, falha o processo.
- **Migration mode** (`migration`): ausência dos 26 arquivos é `warning` (não para o pipeline), mas `checkMigrationConsistency` verifica que todo slot ausente tem um migration plan ativo correspondente — inconsistência é `error`.

Também adiciona `tests/harness-validate-migration.test.ts` com fixture de repo mock para validar o novo comportamento sem depender do estado real do repo.

**Regra central:** "Permissivo" não significa "sem cobertura". Em migration mode, a ausência de um slot é tolerada **se e somente se** há um plan ativo para ele. Slot ausente sem plan = error mesmo em migration mode.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `scripts/harness-validate.ts` | Modificar | Adicionar `readInitManifest`, `warnings[]`, `checkMigrationConsistency`, adaptar `checkRequiredFiles` |
| `tests/harness-validate-migration.test.ts` | Criar | Testes de integração com diretório temporário (migration mode vs strict mode) |

---

## Implementacao

### Passo 1: Escrever testes RED antes de modificar o validador

Criar `tests/harness-validate-migration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

// Testes chamam harness-validate como processo filho para validar exit code real.
// Não importam o módulo diretamente (standalone script — não tem exports testáveis).
// Exceção: checkAgentContracts e checkMigrationConsistency (exportadas para testabilidade).
import { checkMigrationConsistency } from '../scripts/harness-validate'

describe('harness-validate migration mode', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = path.join(tmpdir(), `harness-test-${randomUUID()}`)
    await fs.mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('checkMigrationConsistency emits no failures when all missing slots have active plans', async () => {
    // Simula: AGENTS.md ausente + plan ativo para AGENTS.md
    const activeDir = path.join(tmpDir, 'docs/exec-plans/active')
    await fs.mkdir(activeDir, { recursive: true })
    await fs.writeFile(
      path.join(activeDir, '2026-05-14-agents-md-migration.md'),
      '<!-- migration-slot: AGENTS.md -->\n## Goal\nMigrate `AGENTS.md`\n',
      'utf-8',
    )

    const failures: { rule: string; message: string }[] = []
    const manifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration' as const,
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [
        { id: '2026-05-14-agents-md-migration', slot: 'AGENTS.md', path: 'docs/exec-plans/active/2026-05-14-agents-md-migration.md', status: 'active' as const },
      ],
    }

    await checkMigrationConsistency(failures, manifest, tmpDir, ['AGENTS.md'])
    expect(failures).toHaveLength(0)
  })

  it('checkMigrationConsistency emits error when missing slot has no active plan', async () => {
    const failures: { rule: string; message: string }[] = []
    const manifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration' as const,
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [],  // sem plans
    }

    await checkMigrationConsistency(failures, manifest, tmpDir, ['AGENTS.md'])
    expect(failures.length).toBeGreaterThan(0)
    expect(failures[0]?.rule).toBe('migration-consistency')
  })
})
```

Rodar para confirmar RED (função não exportada): `bun run test -- --grep 'harness-validate migration'`

### Passo 2: Adicionar `readInitManifest` inline em `harness-validate.ts`

**Regra G1:** `readInitManifest` é uma cópia inline — não importa de `manifest-writer.ts`.
Adicionar logo após os imports existentes, antes de `type Failure`:

```typescript
// Inline — harness-validate é script standalone sem imports externos.
// CANONICAL: skills/init/lib/manifest-writer.ts readManifest @ ver manifest-writer.ts
// Manter em sync manual. Drift detectado por: diferença no shape do JSON retornado.
type InitMode = 'fresh' | 'migration' | 'completed'
type ManifestMigrationPlan = { id: string; slot: string; path: string; status: 'active' | 'completed' }
type InitManifest = {
  initMode?: InitMode
  migrationPlans?: ManifestMigrationPlan[]
}

async function readInitManifest(projectRoot: string): Promise<InitManifest | null> {
  try {
    const raw = await fs.readFile(path.join(projectRoot, '.claude', '.anti-vibe-manifest.json'), 'utf8')
    return JSON.parse(raw) as InitManifest
  } catch {
    return null
  }
}
```

### Passo 3: Adicionar `warnings[]` em `main()` e ler manifest

Modificar a função `main()`. Localizar a declaração `const failures: Failure[] = []` e adicionar `warnings` logo abaixo, além de leitura do manifest:

```typescript
async function main(): Promise<void> {
  const failures: Failure[] = []
  const warnings: Failure[] = []        // ← novo

  const manifest = await readInitManifest(root)  // ← novo
  const isMigrationMode = manifest?.initMode === 'migration'  // ← novo

  // Checks paralelos que nao dependem de coleta de markdown.
  await Promise.all([
    checkRequiredFiles(failures, warnings, isMigrationMode),  // ← assinatura nova
    checkAgentsConstraints(failures),
    checkActivePlans(failures),
    checkQualityScoreFormat(failures),
    checkAgentContracts(failures),
  ])

  // Consistency check em migration mode: todo slot ausente deve ter plan ativo.
  if (isMigrationMode && manifest) {
    const missingSlotsInChecks = warnings
      .filter((w) => w.rule === 'required-files')
      .map((w) => {
        const match = w.message.match(/Missing required file: (.+)/)
        return match?.[1] ?? null
      })
      .filter((s): s is string => s !== null)

    await checkMigrationConsistency(failures, manifest, root, missingSlotsInChecks)
  }

  // Coleta de markdown.
  const mdFiles = await collectMarkdownFiles(root)
  await checkMarkdownFiles(mdFiles, failures)

  // Print warnings (não param o pipeline).
  if (warnings.length > 0) {
    console.warn(`Migration mode: ${warnings.length} warning(s) (slots sem arquivo — coverage by plans expected):`)
    for (const w of warnings) {
      console.warn(`  [${w.rule}] ${w.message}`)
    }
  }

  if (failures.length > 0) {
    console.error('Harness validation failed:')
    for (const f of failures) {
      console.error(`  [${f.rule}] ${f.message}`)
    }
    process.exit(1)
  }

  const modeLabel = isMigrationMode ? ' (migration mode — some checks relaxed)' : ''
  console.log(`Harness validation passed${modeLabel} (${REQUIRED_FILES.length} required files, ${mdFiles.length} markdown files checked).`)
  process.exit(0)
}
```

### Passo 4: Adaptar `checkRequiredFiles` para aceitar `warnings[]` e `isMigrationMode`

A função atual tem assinatura `checkRequiredFiles(failures: Failure[]): Promise<void>`.
Modificar para:

```typescript
async function checkRequiredFiles(
  failures: Failure[],
  warnings: Failure[],
  isMigrationMode: boolean,
): Promise<void> {
  await Promise.all(
    REQUIRED_FILES.map(async (rel) => {
      try {
        const stat = await fs.stat(path.join(root, rel))
        if (!stat.isFile() && !stat.isSymbolicLink()) {
          failures.push({ rule: 'required-files', message: `${rel} exists but is not a file or symlink` })
        }
      } catch {
        const msg = `Missing required file: ${rel}`
        if (isMigrationMode) {
          // Em migration mode: warning em vez de error. Consistency check posterior valida coverage.
          warnings.push({ rule: 'required-files', message: msg })
        } else {
          failures.push({ rule: 'required-files', message: msg })
        }
      }
    }),
  )
}
```

### Passo 5: Implementar `checkMigrationConsistency` (exportável para testes)

Adicionar antes de `main()`:

```typescript
/**
 * Em migration mode: verifica que todo slot ausente tem um plan ativo correspondente no manifest.
 * Slots sem plan ativo = error (mesmo em migration mode — "permissivo" != "sem cobertura").
 *
 * @param missingSlots - Paths relativos dos arquivos ausentes (ex: ['AGENTS.md', 'docs/DESIGN.md'])
 */
export async function checkMigrationConsistency(
  failures: Failure[],
  manifest: { migrationPlans?: Array<{ slot: string; status: string }> },
  projectRoot: string,
  missingSlots: string[],
): Promise<void> {
  if (missingSlots.length === 0) return

  const activePlanSlots = new Set(
    (manifest.migrationPlans ?? [])
      .filter((p) => p.status === 'active')
      .map((p) => p.slot),
  )

  for (const missingSlot of missingSlots) {
    if (!activePlanSlots.has(missingSlot)) {
      failures.push({
        rule: 'migration-consistency',
        message: `Migration mode: '${missingSlot}' is missing and has no active migration plan. Add a plan or create the file.`,
      })
    }
  }
}
```

**Nota:** exportar `checkMigrationConsistency` como `export async function` (requer ajuste no `if (import.meta.main)` guard que já existe no script para permitir imports em testes).

### Passo 6: Verificar que `checkAgentContracts` já é export (sem mudança)

`checkAgentContracts` já é exportada conforme comment `2026-05-14` no harness-validate.ts. Confirmar que `import.meta.main` guard está presente e funcional — ele permite que os testes importem as funções sem disparar `main()`.

---

## Gotchas

**G1 — Assinatura de `checkRequiredFiles` quebra os testes existentes:** A assinatura mudou de `(failures)` para `(failures, warnings, isMigrationMode)`. Buscar todos os call sites antes de modificar. Em testes, os call sites são indiretos (via `main()`). Verificar `tests/` e `skills/init/lib/` por imports diretos de `harness-validate`.

**G2 — `missingSlots` deriva de `warnings[]`, não de failures[]:** O consistency check recebe slots que foram para `warnings` (migration mode), não falhas. A extração usa regex na mensagem — frágil mas intencional (script standalone, sem parse estruturado de Failure). Se a mensagem de `checkRequiredFiles` mudar, atualizar o regex aqui.

**G3 — `export async function checkMigrationConsistency` em script standalone:** O `export` funciona em Bun com `import.meta.main` guard. Porém `process.exit()` em `main()` impede que a execução continue após importação se `main()` for chamada. O guard `if (import.meta.main)` (já existente) garante que `main()` só roda quando executado como script — não quando importado por testes.

**G4 — Migration mode não dispensa o check de `AGENTS.md` line-count:** `checkAgentsConstraints` (que checa `≤40 linhas`) só roda se `AGENTS.md` existe. Se não existe (migration mode), ele retorna early sem erro (já tem tratamento). Não há conflito.

**G5 — `warnings` não afetam exit code:** O pipeline só falha por `failures.length > 0`. Warnings são informativos. Documentar isso no output (`console.warn`) para o operador entender o estado.

---

## Verificacao

### TDD
- [ ] RED: `checkMigrationConsistency` não existe no script, teste falha com ImportError
  - Comando: `bun run test -- --grep 'harness-validate migration'`
- [ ] GREEN: função exportada e implementada, testes passam
  - Comando: `bun run test -- --grep 'harness-validate migration'`

### Checklist

- [ ] `readInitManifest` adicionada inline em `harness-validate.ts` (não via import externo)
- [ ] `main()` lê manifest e detecta `isMigrationMode` antes de iniciar checks
- [ ] `checkRequiredFiles` aceita `(failures, warnings, isMigrationMode)` e direciona corretamente
- [ ] Em migration mode, arquivo ausente → `warnings[]`, não `failures[]`
- [ ] `checkMigrationConsistency` emite error para slot ausente sem plan ativo
- [ ] `checkMigrationConsistency` emite nada para slot ausente com plan ativo
- [ ] `export async function checkMigrationConsistency` (testável via import)
- [ ] Output de `console.warn` lista warnings com label "Migration mode"
- [ ] Exit code 0 quando todos failures são 0 (mesmo com warnings presentes)
- [ ] Exit code 1 quando há falha de consistency (slot sem plan)
- [ ] Comportamento strict mode preservado: sem manifest → `isMigrationMode = false` → comportamento atual
- [ ] `bun run tsc --noEmit` passa sem erros
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] `bun run harness:validate` passa no repo do plugin (que tem migration plans ativos)

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'harness-validate migration'` retorna ≥2 testes PASS, 0 FAIL
- `bun run harness:validate` no repo do plugin (com `initMode: "migration"` no manifest) retorna exit code 0
- `bun run harness:validate` em repo sem manifest retorna o comportamento atual (strict mode, sem regressão)
- `checkMigrationConsistency` com `missingSlots: ['AGENTS.md']` e `migrationPlans: []` → 1 failure com `rule: 'migration-consistency'`
- `checkMigrationConsistency` com `missingSlots: ['AGENTS.md']` e plan ativo para `AGENTS.md` → 0 failures

<!-- Gerado por /plan-feature em 2026-05-14 -->
