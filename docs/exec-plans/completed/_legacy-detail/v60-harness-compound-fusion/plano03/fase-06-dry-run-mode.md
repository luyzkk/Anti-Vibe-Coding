<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 06: `--dry-run` mode (renderer de diff + zero side effects)

**Plano:** 03 — Migration v5→v6
**Sizing:** 1.5h
**Depende de:** fase-02, fase-03, fase-04, fase-05 (envelopa os 4 helpers)
**Visual:** false

---

## O que esta fase entrega

Flag `--dry-run` no comando `/init migrate` que dispara TODAS as operações de migração em modo **virtual** — nada é escrito em disco, apenas um relatório consolidado (`MigrationDryRunReport`) renderizado em stdout no estilo `git diff --stat` mostra **o que seria feito**. Atende **CA-10** verbatim ("`--dry-run` mostra plano de migração sem mutação em disco") e mitiga **R2/R14** (usuário inspeciona antes de comprometer).

Esta fase **não cria helper novo de migração** — instrumenta os 4 helpers existentes (fase-02/03/04/05) com:
1. Wrapper `recordOrWrite(mode, path, body)` que substitui `fs.writeFile` direto.
2. `WriteRecorder` que acumula writes em memória durante dry-run.
3. `renderDryRunReport(report): string` que formata o resultado.

Cada helper já tem opção `dryRun?: boolean` desde sua fase de criação — esta fase amarra tudo em um orquestrador único.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/dry-run.ts` | Create | Type `DryRunMode`, `WriteRecorder` class, helpers |
| `anti-vibe-coding/skills/init/lib/dry-run.test.ts` | Create | Testes do recorder + renderer isolados |
| `anti-vibe-coding/skills/init/lib/migrate-orchestrator.ts` | Create | Orquestrador que chama os 4 helpers em sequência respeitando dry-run |
| `anti-vibe-coding/skills/init/lib/migrate-orchestrator.test.ts` | Create | E2E em fixture mínima (verifica zero side effects em dry-run) |
| `anti-vibe-coding/skills/init/lib/dry-run-renderer.ts` | Create | Formata `MigrationDryRunReport` em stdout (estilo `git diff --stat`) |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Adicionar bloco `## Step migrate.0: parse --dry-run flag` antes de `migrate.1` |

---

## Implementacao

### Passo 1: `lib/dry-run.ts` (recorder + types)

```typescript
// 2026-05-11 (Luiz/dev): infra de dry-run — CA-10, R14.
// WriteRecorder substitui fs.writeFile durante dry-run. Acumula em memoria.

export type DryRunMode = {
  dryRun: boolean
  recorder?: WriteRecorder
}

export type RecordedWrite = {
  path: string
  bodyPreview: string  // primeiros 200 chars + tamanho total
  bytes: number
}

export class WriteRecorder {
  private writes: RecordedWrite[] = []

  record(filePath: string, body: string): void {
    this.writes.push({
      path: filePath,
      bodyPreview: body.slice(0, 200),
      bytes: Buffer.byteLength(body, 'utf8'),
    })
  }

  list(): readonly RecordedWrite[] {
    return this.writes
  }

  count(): number {
    return this.writes.length
  }

  totalBytes(): number {
    return this.writes.reduce((sum, w) => sum + w.bytes, 0)
  }

  clear(): void {
    this.writes = []
  }
}

/**
 * Factory de writeFile compativel com fs.writeFile, mas redireciona em dry-run.
 * Cada helper de migracao recebe esta closure no campo `writeFile` das options.
 */
export function makeWriter(mode: DryRunMode): (filePath: string, body: string) => Promise<void> {
  if (mode.dryRun && mode.recorder) {
    const recorder = mode.recorder
    return async (filePath: string, body: string): Promise<void> => {
      recorder.record(filePath, body)
    }
  }
  // Real writer — importado dinamicamente para evitar custo em dry-run.
  return async (filePath: string, body: string): Promise<void> => {
    const { promises: fs } = await import('node:fs')
    const path = await import('node:path')
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, body, 'utf8')
  }
}
```

### Passo 2: `lib/migrate-orchestrator.ts`

```typescript
// 2026-05-11 (Luiz/dev): orquestra fase-02 → fase-03 → fase-04 → fase-05.
// Em dry-run, todos os writers viram recorder.

import { detectV5Legacy, type LegacyState } from './detect-v5-legacy'
import { backupPlanning, type BackupResult } from './backup-planning'
import { migratePlanning, type MigrationReport as PlanningReport } from './migrate-planning'
import { migrateLessons, type LessonsMigrationReport } from './migrate-lessons'
import { migrateDecisions, type DecisionsMigrationReport } from './migrate-decisions'
import { type DryRunMode, WriteRecorder, makeWriter } from './dry-run'

export type MigrationDryRunReport = {
  dryRun: boolean
  state: LegacyState
  backup: BackupResult
  planning: PlanningReport
  lessons: LessonsMigrationReport
  decisions: DecisionsMigrationReport
  recordedWrites: number
  totalBytes: number
}

export async function orchestrateMigration(
  targetDir: string,
  options: { dryRun?: boolean } = {},
): Promise<MigrationDryRunReport> {
  const dryRun = options.dryRun ?? false
  const recorder = dryRun ? new WriteRecorder() : undefined
  const mode: DryRunMode = { dryRun, recorder }
  const writeFile = makeWriter(mode)

  // 1. detect (fase-01)
  const state = await detectV5Legacy(targetDir)

  // 2. backup (fase-02) — passa dryRun explicito
  const backup = await backupPlanning(targetDir, { state, dryRun })

  // 3..5. migracoes (paralelas — sao independentes)
  const [planning, lessons, decisions] = await Promise.all([
    migratePlanning(targetDir, { dryRun, writeFile }),
    migrateLessons(targetDir, { dryRun, writeFile }),
    migrateDecisions(targetDir, { dryRun, writeFile }),
  ])

  return {
    dryRun,
    state,
    backup,
    planning,
    lessons,
    decisions,
    recordedWrites: recorder?.count() ?? 0,
    totalBytes: recorder?.totalBytes() ?? 0,
  }
}
```

### Passo 3: `lib/dry-run-renderer.ts`

```typescript
// 2026-05-11 (Luiz/dev): formata MigrationDryRunReport em stdout legivel.
// Estilo git diff --stat: lista de paths + tamanho + total no rodape (G-A4).

import type { MigrationDryRunReport } from './migrate-orchestrator'

export function renderDryRunReport(report: MigrationDryRunReport): string {
  const lines: string[] = []
  lines.push('--- Migration Dry Run ---')
  lines.push('')
  lines.push(`Detected v5.x: ${report.state.isLegacy ? 'yes' : 'no'}`)
  lines.push(`Artifacts: ${report.state.artifacts.join(', ') || '(none)'}`)
  lines.push(`Already migrated: ${report.state.alreadyMigrated ? 'yes' : 'no'}`)
  lines.push('')
  lines.push(`Backup: ${report.backup.status} — ${report.backup.filesCopied} files`)
  lines.push('')

  lines.push(`Planning migration (.planning/ → docs/):`)
  lines.push(`  entries: ${report.planning.entries}`)
  lines.push(`  would write: ${report.planning.written.length}`)
  lines.push(`  skipped: ${report.planning.skipped.length}`)
  if (report.planning.conflicts.length > 0) {
    lines.push(`  CONFLICTS: ${report.planning.conflicts.length} (resolve manually)`)
  }
  for (const p of report.planning.written.slice(0, 10)) {
    lines.push(`    + ${p}`)
  }
  if (report.planning.written.length > 10) {
    lines.push(`    ... +${report.planning.written.length - 10} more`)
  }
  lines.push('')

  lines.push(`Lessons migration (lessons-learned.md → docs/compound/):`)
  lines.push(`  entries: ${report.lessons.entries}`)
  lines.push(`  would write: ${report.lessons.written.length}`)
  for (const p of report.lessons.written.slice(0, 10)) {
    lines.push(`    + ${p}`)
  }
  lines.push('')

  lines.push(`Decisions migration (decisions.md → docs/design-docs/ADR-*.md):`)
  lines.push(`  entries: ${report.decisions.entries}`)
  lines.push(`  would write: ${report.decisions.written.length}`)
  if (report.decisions.coreBeliefs === 'created') {
    lines.push(`  + core-beliefs.md (from senior-principles.md)`)
  }
  for (const p of report.decisions.written.slice(0, 10)) {
    lines.push(`    + ${p}`)
  }
  lines.push('')

  lines.push(`---`)
  lines.push(`Total files to write: ${report.recordedWrites}`)
  lines.push(`Total bytes: ${formatBytes(report.totalBytes)}`)
  lines.push(`Backup will go to: .planning.v5-backup/`)
  lines.push(`Original .planning/ will be deleted after success (backup preserves it).`)
  lines.push('')
  lines.push(report.dryRun
    ? 'This is a DRY RUN — no files were created. Re-run without --dry-run to apply.'
    : 'Migration applied successfully.',
  )

  return lines.join('\n')
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
```

### Passo 4: Testes `dry-run.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): valida recorder + writer factory.

import { describe, it, expect } from 'bun:test'
import { WriteRecorder, makeWriter } from './dry-run'

describe('WriteRecorder', () => {
  it('records writes in memory', async () => {
    const r = new WriteRecorder()
    const w = makeWriter({ dryRun: true, recorder: r })
    await w('/tmp/foo', 'hello')
    await w('/tmp/bar', 'world')
    expect(r.count()).toBe(2)
    expect(r.list()[0]!.path).toBe('/tmp/foo')
    expect(r.list()[0]!.bodyPreview).toBe('hello')
    expect(r.totalBytes()).toBeGreaterThan(0)
  })

  it('truncates bodyPreview to 200 chars', async () => {
    const r = new WriteRecorder()
    const w = makeWriter({ dryRun: true, recorder: r })
    const big = 'x'.repeat(500)
    await w('/tmp/big', big)
    expect(r.list()[0]!.bodyPreview.length).toBe(200)
    expect(r.list()[0]!.bytes).toBe(500)
  })

  it('clear() resets recorder', async () => {
    const r = new WriteRecorder()
    const w = makeWriter({ dryRun: true, recorder: r })
    await w('/tmp/a', 'x')
    r.clear()
    expect(r.count()).toBe(0)
  })
})

describe('makeWriter — real mode', () => {
  it('returns a real writer when dryRun=false', async () => {
    const w = makeWriter({ dryRun: false })
    // Nao chamamos w() aqui — caro. Testa que retornou function.
    expect(typeof w).toBe('function')
  })
})
```

### Passo 5: Testes `migrate-orchestrator.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): cobre RED da fase-06 + zero side effects em dry-run.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { orchestrateMigration } from './migrate-orchestrator'
import { renderDryRunReport } from './dry-run-renderer'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'orchestrator')

async function setupLegacy(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, '.planning'), { recursive: true })
  await fs.writeFile(path.join(FIXTURE, '.planning', 'CONTEXT-x.md'), '# X\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, 'lessons-learned.md'), '## 2026-03-23: bug\n**Fix:** f\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, 'decisions.md'), '### [V]: m\n**Data:** 2026-03-23\n', 'utf8')
}

describe('orchestrateMigration --dry-run', () => {
  beforeEach(setupLegacy)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('dryRun=true creates ZERO files in destination', async () => {
    const report = await orchestrateMigration(FIXTURE, { dryRun: true })
    expect(report.dryRun).toBe(true)

    // CA-10 verbatim: nada em disco no destino.
    const docsExists = await fs.access(path.join(FIXTURE, 'docs')).then(() => true).catch(() => false)
    expect(docsExists).toBe(false)
    const backupExists = await fs.access(path.join(FIXTURE, '.planning.v5-backup')).then(() => true).catch(() => false)
    expect(backupExists).toBe(false)
    const originalExists = await fs.access(path.join(FIXTURE, '.planning')).then(() => true).catch(() => false)
    expect(originalExists).toBe(true)  // .planning/ original NAO foi tocada
  })

  it('dryRun=true reports what WOULD be written', async () => {
    const report = await orchestrateMigration(FIXTURE, { dryRun: true })
    expect(report.recordedWrites).toBeGreaterThan(0)
    expect(report.planning.written.length + report.lessons.written.length + report.decisions.written.length)
      .toBe(report.recordedWrites)
  })

  it('dryRun=false applies migration', async () => {
    const report = await orchestrateMigration(FIXTURE, { dryRun: false })
    expect(report.dryRun).toBe(false)
    const docsExists = await fs.access(path.join(FIXTURE, 'docs')).then(() => true).catch(() => false)
    expect(docsExists).toBe(true)
    const backupExists = await fs.access(path.join(FIXTURE, '.planning.v5-backup')).then(() => true).catch(() => false)
    expect(backupExists).toBe(true)
  })

  it('renderDryRunReport produces non-empty string', async () => {
    const report = await orchestrateMigration(FIXTURE, { dryRun: true })
    const rendered = renderDryRunReport(report)
    expect(rendered).toContain('Migration Dry Run')
    expect(rendered).toContain('Total files to write')
    expect(rendered).toContain('DRY RUN')
  })

  it('parallel migrations do not block each other', async () => {
    // Soft check: orchestrator usa Promise.all — duration nao deve crescer linearmente.
    // Em fixture pequena, nao da pra medir bem; teste so confirma que retornou.
    const start = Date.now()
    await orchestrateMigration(FIXTURE, { dryRun: true })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(5000)  // CA-implícito: bem dentro de M8 ≤120s
  })
})
```

### Passo 6: Integração em `SKILL.md` do `/init`

```markdown
## Step migrate.0: Parse --dry-run flag (Plano 03 fase-06 — CA-10, R14)

\`\`\`bash
DRY_RUN_FLAG=""
if [[ "$ARGUMENTS" == *"--dry-run"* ]]; then
  DRY_RUN_FLAG="--dry-run"
  echo "Dry-run mode: no files will be modified."
fi
\`\`\`

## Step migrate.all: Orchestrated migration (replaces .1/.2/.3/.4)

\`\`\`bash
bun run -e "
import { orchestrateMigration } from './lib/migrate-orchestrator.ts'
import { renderDryRunReport } from './lib/dry-run-renderer.ts'

const dryRun = process.argv.includes('--dry-run')
const report = await orchestrateMigration(process.cwd(), { dryRun })
console.log(renderDryRunReport(report))

if (dryRun) {
  console.log('\\nRe-run without --dry-run to apply.')
  process.exit(0)
}
" -- ${DRY_RUN_FLAG}
\`\`\`

In dry-run mode the user sees the full plan; they re-run without the flag to commit.
```

---

## Gotchas

- **G8 do plano (dry-run não escreve — CA-10):** Testado por **assertion explícita** (`docsExists === false`, `backupExists === false`). Esta é a salvaguarda principal de R14.
- **G2 (idempotência permanece):** Cada helper individual continua idempotente; orquestrador só compose. Re-run em modo real após dry-run = caminho normal.
- **G11 (perf ≤120s):** `Promise.all` nas 3 migrations independentes (fase-03/04/05). Em fixture média (~50 .md), todos os helpers terminam em <5s. Sequential seria ~3x mais lento.
- **Local — recorder pode crescer:** Em projeto com 1000 .md no `.planning/`, `WriteRecorder` segura tudo em memória (mas só `bodyPreview` truncado a 200 chars + path). Tamanho típico: ~200 KB para 1000 entries. Aceitável.
- **Local — wrapper assíncrono:** `makeWriter` retorna `async`. Helpers passam essa closure. **Atenção**: helpers de fase-02 chamam `fs.writeFile` direto em alguns lugares (lock file). Esses são intencionais (não devem ir para recorder porque são metadata operacional). Documentar em fase-02.
- **Local — `backupPlanning` em dry-run:** O backup em si é metadata (não migra dados v5). Em dry-run, fase-02 já retorna `'dry-run'` status sem escrever. Orquestrador respeita.
- **Local — paralelo + recorder:** 3 helpers escrevendo no MESMO recorder em paralelo. `WriteRecorder.record` faz push em array — em JS single-threaded é seguro (sem race). Bun honra mesmo modelo. Não precisa lock.
- **G-A4 (decisão assumida):** Formato do renderer é estilo `git diff --stat`. Plain text por default. Documentado em README.
- **G9 (provenance):** Headers em `dry-run.ts`, `migrate-orchestrator.ts`, `dry-run-renderer.ts`. Saída renderizada não tem provenance.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `dryRun=true creates ZERO files in destination` falha — algum helper esquece dryRun e escreve.
  - Comando: `bun run test skills/init/lib/migrate-orchestrator.test.ts`
  - Resultado esperado: assertion fail em `docsExists === false`.

- [ ] **GREEN:** Orchestrator + writer factory implementados — 5 (orchestrator) + 4 (dry-run) testes passam.
  - Comando: `bun run test skills/init/lib/migrate-orchestrator.test.ts skills/init/lib/dry-run.test.ts`
  - Resultado esperado: `9 passed, 0 failed`

### Checklist

- [ ] `dryRun=true` produz **zero side effects em disco** (verificar `docs/`, `.planning.v5-backup/`, `.planning/` inalterados)
- [ ] `dryRun=true` retorna `MigrationDryRunReport` com `recordedWrites > 0`
- [ ] `dryRun=false` aplica de fato (cria `docs/`, `.planning.v5-backup/`)
- [ ] `renderDryRunReport` produz output legível com lista de paths + total
- [ ] Helpers de fase-03/04/05 recebem `writeFile` closure (via `makeWriter`)
- [ ] Orquestrador roda fase-02/03/04/05 com Promise.all nas 3 migrations
- [ ] Lint limpo: `bun run lint skills/init/lib/dry-run*.ts skills/init/lib/migrate-orchestrator.ts`
- [ ] Testes passam: `bun run test`

---

## Criterio de Aceite

**Por máquina (CA-10 verbatim):**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/migrate-orchestrator.test.ts skills/init/lib/dry-run.test.ts
# Esperado: 9 passed, 0 failed em <2s

# CA-10: --dry-run não muta em fixture legacy:
cp -r tests/fixtures/legacy-v5 /tmp/legacy-v5-dryrun-test
bun run -e "
import { orchestrateMigration } from './skills/init/lib/migrate-orchestrator.ts'
import { renderDryRunReport } from './skills/init/lib/dry-run-renderer.ts'
const r = await orchestrateMigration('/tmp/legacy-v5-dryrun-test', { dryRun: true })
console.log(renderDryRunReport(r))
"
# Conferir que /tmp/legacy-v5-dryrun-test/docs/ NAO existe:
! test -d /tmp/legacy-v5-dryrun-test/docs && echo "dry-run OK (CA-10)"
! test -d /tmp/legacy-v5-dryrun-test/.planning.v5-backup && echo "no backup in dry-run OK"
# Limpar:
rm -rf /tmp/legacy-v5-dryrun-test
```

**Por humano:**

- Em terminal real, rodar `/init migrate --dry-run` em um projeto v5.x existente:
  - Skill renderiza relatório multi-seção (Detection / Backup / Planning / Lessons / Decisions)
  - Cada seção mostra "would write: N" com sample de paths
  - Rodapé mostra total + bytes
  - Após terminar, executar `ls docs/ 2>/dev/null && echo BUG` — deve NÃO imprimir "BUG"
  - Re-rodar sem `--dry-run` aplica de fato

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
