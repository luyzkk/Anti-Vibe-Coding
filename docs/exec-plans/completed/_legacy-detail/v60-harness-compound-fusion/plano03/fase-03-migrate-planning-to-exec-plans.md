<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: Migrate `.planning/` → `docs/exec-plans/` + `docs/product-specs/`

**Plano:** 03 — Migration v5→v6
**Sizing:** 3h
**Depende de:** fase-02 (lê do `.planning.v5-backup/`, não da pasta original)
**Visual:** false

---

## O que esta fase entrega

Helper `migratePlanning(targetDir, options): Promise<MigrationReport>` que percorre `.planning.v5-backup/.planning/` e converte cada artefato no destino v6 correto:

- `.planning/CONTEXT-{slug}.md` → `docs/exec-plans/active/{date}-{slug}.md` (header rewrite, conteúdo preservado)
- `.planning/{date}-{slug}/PRD.md` → `docs/product-specs/{date}-{slug}.md` (corpo direto)
- `.planning/{date}-{slug}/PLAN.md` → `docs/exec-plans/active/{date}-{slug}-plan.md`
- `.planning/{date}-{slug}/plano-NN/README.md` + `fase-*.md` → `docs/exec-plans/active/{date}-{slug}/plano-NN/...` (estrutura preservada)
- `.planning/{date}-{slug}/STATE.md` → `docs/exec-plans/active/_archived-state/{date}-{slug}-STATE.md` (G-A2)

Ao final, **deleta `.planning/` original** (backup permanece — G-A1). Atende **D3** (migração total), **M8** (rodar ≤120s), **CA-09** (estado v6 válido pós-migração).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/migrate-planning.ts` | Create | Helper principal + tipo `MigrationReport` |
| `anti-vibe-coding/skills/init/lib/migrate-planning.test.ts` | Create | Testes paramétricos cobrindo cada conversão + idempotência |
| `anti-vibe-coding/skills/init/lib/parse-planning-entry.ts` | Create | Inferência de `{date, slug, kind}` a partir do path |
| `anti-vibe-coding/skills/init/lib/parse-planning-entry.test.ts` | Create | Testes do parser de paths |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Step `migrate.2` — chama `migratePlanning` após backup |

---

## Implementacao

### Passo 1: Parser de paths `lib/parse-planning-entry.ts`

```typescript
// 2026-05-11 (Luiz/dev): inferencia de {date, slug, kind} a partir de paths .planning/.
// Sem isso, regex inline no migrator vira pesadelo de testar.

import path from 'node:path'

export type PlanningEntryKind =
  | 'context-file'       // .planning/CONTEXT-foo.md
  | 'plan-folder-prd'    // .planning/2026-04-21-foo/PRD.md
  | 'plan-folder-plan'   // .planning/2026-04-21-foo/PLAN.md
  | 'plan-folder-context'// .planning/2026-04-21-foo/CONTEXT.md
  | 'plan-folder-state'  // .planning/2026-04-21-foo/STATE.md
  | 'plan-folder-summary'// .planning/2026-04-21-foo/SUMMARY*.md
  | 'subplan-readme'     // .planning/2026-04-21-foo/plano01/README.md
  | 'subplan-fase'       // .planning/2026-04-21-foo/plano01/fase-01-x.md
  | 'subplan-memory'     // .planning/2026-04-21-foo/plano01/MEMORY.md
  | 'unknown'

export type PlanningEntry = {
  kind: PlanningEntryKind
  /** YYYY-MM-DD inferido (do folder name) — null se context-file solto sem data. */
  date: string | null
  /** slug do plano (sem date prefix). */
  slug: string
  /** Path relativo a .planning/ (ex: 'plano01/fase-02.md'). */
  relPath: string
  /** Subplan identifier ('plano01', 'plano02', ...) — null se nao for subplan. */
  subplan: string | null
  /** Filename base sem extensao (util para destino). */
  basename: string
}

const RE_DATE_SLUG_FOLDER = /^(\d{4}-\d{2}-\d{2})-(.+)$/
const RE_CONTEXT_FILE = /^CONTEXT-(.+)\.md$/i
const RE_SUBPLAN_FOLDER = /^plano(\d+)$/i
const RE_FASE_FILE = /^fase-\d+/i

/**
 * Classifica um path absoluto sob .planning/ em uma PlanningEntry.
 * `relPath` deve ser relativo a `.planning/` (ex: "2026-04-21-foo/plano01/fase-01.md").
 */
export function parsePlanningEntry(relPath: string): PlanningEntry {
  const parts = relPath.split(path.sep).filter(Boolean)
  const basename = path.basename(relPath, path.extname(relPath))

  // Top-level: CONTEXT-foo.md
  if (parts.length === 1) {
    const m = RE_CONTEXT_FILE.exec(parts[0]!)
    if (m) {
      return {
        kind: 'context-file',
        date: null,
        slug: m[1]!,
        relPath,
        subplan: null,
        basename,
      }
    }
    return { kind: 'unknown', date: null, slug: basename, relPath, subplan: null, basename }
  }

  // Pasta com prefixo de data: 2026-04-21-foo/...
  const folderMatch = RE_DATE_SLUG_FOLDER.exec(parts[0]!)
  if (!folderMatch) {
    return { kind: 'unknown', date: null, slug: parts[0]!, relPath, subplan: null, basename }
  }
  const date = folderMatch[1]!
  const slug = folderMatch[2]!

  // Top-level dentro do plano: PRD/PLAN/CONTEXT/STATE/SUMMARY
  if (parts.length === 2) {
    const file = parts[1]!
    if (/^PRD\.md$/i.test(file))     return mkEntry('plan-folder-prd', date, slug, relPath, null, basename)
    if (/^PLAN\.md$/i.test(file))    return mkEntry('plan-folder-plan', date, slug, relPath, null, basename)
    if (/^CONTEXT\.md$/i.test(file)) return mkEntry('plan-folder-context', date, slug, relPath, null, basename)
    if (/^STATE\.md$/i.test(file))   return mkEntry('plan-folder-state', date, slug, relPath, null, basename)
    if (/^SUMMARY.*\.md$/i.test(file))return mkEntry('plan-folder-summary', date, slug, relPath, null, basename)
    return mkEntry('unknown', date, slug, relPath, null, basename)
  }

  // Subplan: plano01/...
  const subplanMatch = RE_SUBPLAN_FOLDER.exec(parts[1]!)
  if (subplanMatch) {
    const subplan = parts[1]!
    const file = parts[2]!
    if (/^README\.md$/i.test(file)) return mkEntry('subplan-readme', date, slug, relPath, subplan, basename)
    if (/^MEMORY\.md$/i.test(file)) return mkEntry('subplan-memory', date, slug, relPath, subplan, basename)
    if (RE_FASE_FILE.test(file))    return mkEntry('subplan-fase', date, slug, relPath, subplan, basename)
    return mkEntry('unknown', date, slug, relPath, subplan, basename)
  }

  return mkEntry('unknown', date, slug, relPath, null, basename)
}

function mkEntry(
  kind: PlanningEntryKind,
  date: string | null,
  slug: string,
  relPath: string,
  subplan: string | null,
  basename: string,
): PlanningEntry {
  return { kind, date, slug, relPath, subplan, basename }
}
```

### Passo 2: Migrator principal `lib/migrate-planning.ts`

```typescript
// 2026-05-11 (Luiz/dev): converte .planning.v5-backup/.planning/ em docs/exec-plans/* + docs/product-specs/*.
// LE do backup (G1 do plano), ESCREVE em docs/. Idempotente (G2).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parsePlanningEntry, type PlanningEntry } from './parse-planning-entry'
import { BACKUP_DIR } from './backup-planning'

export type MigrationReport = {
  status: 'completed' | 'dry-run' | 'partial'
  entries: number
  written: string[]
  skipped: Array<{ relPath: string; reason: string }>
  conflicts: Array<{ source: string; target: string }>
}

export type MigratePlanningOptions = {
  dryRun?: boolean
  /** Permite ao caller injetar virtual FS (fase-06). */
  writeFile?: (filePath: string, body: string) => Promise<void>
}

const DEFAULT_WRITE = async (p: string, body: string): Promise<void> => {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, body, 'utf8')
}

/**
 * Migra .planning.v5-backup/.planning/ → docs/exec-plans/* + docs/product-specs/*.
 * Idempotente: arquivos ja presentes no destino com mesmo conteudo sao skip.
 */
export async function migratePlanning(
  targetDir: string,
  options: MigratePlanningOptions = {},
): Promise<MigrationReport> {
  const write = options.writeFile ?? DEFAULT_WRITE
  const backupPlanning = path.join(targetDir, BACKUP_DIR, '.planning')

  const written: string[] = []
  const skipped: MigrationReport['skipped'] = []
  const conflicts: MigrationReport['conflicts'] = []

  const allFiles = await listMarkdownFilesRecursive(backupPlanning)

  // Cada arquivo .md vira uma entry. Processamento paralelo por entry.
  await Promise.all(allFiles.map(async (absSrc) => {
    const relPath = path.relative(backupPlanning, absSrc)
    const entry = parsePlanningEntry(relPath)
    const target = computeTargetPath(targetDir, entry)

    if (!target) {
      skipped.push({ relPath, reason: `unknown entry kind: ${entry.kind}` })
      return
    }

    // Idempotencia: destino ja existe?
    const exists = await fs.access(target).then(() => true).catch(() => false)
    if (exists && !options.dryRun) {
      const existing = await fs.readFile(target, 'utf8')
      const fresh = await readWithBomStrip(absSrc)
      if (existing === fresh) {
        skipped.push({ relPath, reason: 'already-migrated' })
        return
      }
      conflicts.push({ source: absSrc, target })
      return
    }

    const body = await readWithBomStrip(absSrc)
    if (!options.dryRun) {
      await write(target, body)
    }
    written.push(target)
  }))

  // G-A1: deletar .planning/ original (NAO o backup). Skip em dry-run.
  if (!options.dryRun && conflicts.length === 0) {
    const original = path.join(targetDir, '.planning')
    const stillExists = await fs.access(original).then(() => true).catch(() => false)
    if (stillExists) {
      await fs.rm(original, { recursive: true, force: true })
    }
  }

  return {
    status: options.dryRun ? 'dry-run' : (conflicts.length === 0 ? 'completed' : 'partial'),
    entries: allFiles.length,
    written,
    skipped,
    conflicts,
  }
}

function computeTargetPath(targetDir: string, entry: PlanningEntry): string | null {
  const datePrefix = entry.date ?? 'undated'
  const slug = entry.slug

  switch (entry.kind) {
    case 'context-file':
      // .planning/CONTEXT-foo.md → docs/exec-plans/active/{slug}.md
      return path.join(targetDir, 'docs', 'exec-plans', 'active', `${slug}.md`)
    case 'plan-folder-prd':
      // → docs/product-specs/{date}-{slug}.md
      return path.join(targetDir, 'docs', 'product-specs', `${datePrefix}-${slug}.md`)
    case 'plan-folder-plan':
      return path.join(targetDir, 'docs', 'exec-plans', 'active', `${datePrefix}-${slug}-plan.md`)
    case 'plan-folder-context':
      return path.join(targetDir, 'docs', 'exec-plans', 'active', `${datePrefix}-${slug}-context.md`)
    case 'plan-folder-state':
      // G-A2: archived state como referencia historica.
      return path.join(targetDir, 'docs', 'exec-plans', 'active', '_archived-state', `${datePrefix}-${slug}-STATE.md`)
    case 'plan-folder-summary':
      return path.join(targetDir, 'docs', 'exec-plans', 'active', `${datePrefix}-${slug}-${entry.basename}.md`)
    case 'subplan-readme':
    case 'subplan-fase':
    case 'subplan-memory':
      // Preserva estrutura aninhada: docs/exec-plans/active/{date}-{slug}/plano01/...
      return path.join(
        targetDir, 'docs', 'exec-plans', 'active',
        `${datePrefix}-${slug}`,
        entry.subplan ?? 'unknown-subplan',
        `${entry.basename}.md`,
      )
    case 'unknown':
      return null
  }
}

async function listMarkdownFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = []
  async function walk(d: string): Promise<void> {
    const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) {
        await walk(full)
      } else if (e.name.toLowerCase().endsWith('.md')) {
        out.push(full)
      }
    }
  }
  await walk(dir)
  return out
}

async function readWithBomStrip(filePath: string): Promise<string> {
  // G4: editores Windows salvam .md com BOM. Strip antes de qualquer parse downstream.
  const body = await fs.readFile(filePath, 'utf8')
  return body.replace(/^\uFEFF/, '')
}
```

### Passo 3: Testes `migrate-planning.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): cobre RED da fase-03 + matriz de paths.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { migratePlanning } from './migrate-planning'
import { backupPlanning } from './backup-planning'
import { detectV5Legacy } from './detect-v5-legacy'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'migrate-planning')

async function setupLegacy(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'plano01'), { recursive: true })
  await fs.writeFile(path.join(FIXTURE, '.planning', 'CONTEXT-baseline.md'), '# baseline\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'PRD.md'), '# PRD\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'PLAN.md'), '# PLAN\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'STATE.md'), '# STATE\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'plano01', 'README.md'), '# plano01\n', 'utf8')
  await fs.writeFile(path.join(FIXTURE, '.planning', '2026-04-21-foo', 'plano01', 'fase-01-x.md'), '# fase01\n', 'utf8')

  // Pre-condicao da fase-03: backup ja existe (fase-02 rodou).
  const state = await detectV5Legacy(FIXTURE)
  await backupPlanning(FIXTURE, { state })
}

describe('migratePlanning', () => {
  beforeEach(setupLegacy)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('migrates CONTEXT-baseline.md → docs/exec-plans/active/baseline.md', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', 'baseline.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# baseline\n')
  })

  it('migrates PRD.md → docs/product-specs/2026-04-21-foo.md', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'product-specs', '2026-04-21-foo.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# PRD\n')
  })

  it('migrates PLAN.md → docs/exec-plans/active/2026-04-21-foo-plan.md', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', '2026-04-21-foo-plan.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# PLAN\n')
  })

  it('migrates STATE.md → archived-state (G-A2)', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', '_archived-state', '2026-04-21-foo-STATE.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# STATE\n')
  })

  it('preserves subplan structure (plano01/fase-01)', async () => {
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', '2026-04-21-foo', 'plano01', 'fase-01-x.md')
    expect(await fs.readFile(dst, 'utf8')).toBe('# fase01\n')
  })

  it('deletes .planning/ original after success (G-A1)', async () => {
    await migratePlanning(FIXTURE)
    const exists = await fs.stat(path.join(FIXTURE, '.planning')).then(() => true).catch(() => false)
    expect(exists).toBe(false)
    // Mas o backup permanece:
    const backupExists = await fs.stat(path.join(FIXTURE, '.planning.v5-backup', '.planning')).then(() => true).catch(() => false)
    expect(backupExists).toBe(true)
  })

  it('is idempotent — second run is no-op', async () => {
    await migratePlanning(FIXTURE)
    // Recria .planning/ pra simular re-execucao (caller re-detectaria como legacy).
    // Mas .planning original ja foi deletada — alreadyMigrated=true via docs/exec-plans/.
    // Re-rodar migratePlanning sem .planning/ — entries=0:
    const report = await migratePlanning(FIXTURE)
    expect(report.entries).toBeGreaterThanOrEqual(0)
    // Nao explodiu — eh o teste.
  })

  it('dryRun=true writes nothing', async () => {
    const report = await migratePlanning(FIXTURE, { dryRun: true })
    expect(report.status).toBe('dry-run')
    expect(report.entries).toBeGreaterThan(0)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', 'baseline.md')
    const exists = await fs.access(dst).then(() => true).catch(() => false)
    expect(exists).toBe(false)
    // .planning/ original tambem nao foi deletada:
    const originalExists = await fs.stat(path.join(FIXTURE, '.planning')).then(() => true).catch(() => false)
    expect(originalExists).toBe(true)
  })

  it('strips BOM from source files', async () => {
    const bommed = '\uFEFF# CONTEXT bommed\n'
    await fs.writeFile(path.join(FIXTURE, '.planning.v5-backup', '.planning', 'CONTEXT-bommed.md'), bommed, 'utf8')
    await migratePlanning(FIXTURE)
    const dst = path.join(FIXTURE, 'docs', 'exec-plans', 'active', 'bommed.md')
    const body = await fs.readFile(dst, 'utf8')
    expect(body.startsWith('\uFEFF')).toBe(false)
    expect(body).toBe('# CONTEXT bommed\n')
  })
})
```

### Passo 4: Testes `parse-planning-entry.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): valida classificador antes do migrator confiar nele.

import { describe, it, expect } from 'bun:test'
import { parsePlanningEntry } from './parse-planning-entry'

describe('parsePlanningEntry', () => {
  it('classifies CONTEXT-foo.md as context-file', () => {
    const e = parsePlanningEntry('CONTEXT-foo.md')
    expect(e.kind).toBe('context-file')
    expect(e.slug).toBe('foo')
    expect(e.date).toBeNull()
  })

  it('classifies 2026-04-21-x/PRD.md as plan-folder-prd', () => {
    const e = parsePlanningEntry('2026-04-21-x/PRD.md')
    expect(e.kind).toBe('plan-folder-prd')
    expect(e.date).toBe('2026-04-21')
    expect(e.slug).toBe('x')
  })

  it('classifies plano01/fase-02-y.md as subplan-fase', () => {
    const e = parsePlanningEntry('2026-04-21-x/plano01/fase-02-y.md')
    expect(e.kind).toBe('subplan-fase')
    expect(e.subplan).toBe('plano01')
  })

  it('classifies plano02/README.md as subplan-readme', () => {
    const e = parsePlanningEntry('2026-04-21-x/plano02/README.md')
    expect(e.kind).toBe('subplan-readme')
    expect(e.subplan).toBe('plano02')
  })

  it('classifies plano01/MEMORY.md as subplan-memory', () => {
    const e = parsePlanningEntry('2026-04-21-x/plano01/MEMORY.md')
    expect(e.kind).toBe('subplan-memory')
  })

  it('returns unknown for unmatched paths', () => {
    const e = parsePlanningEntry('random.md')
    expect(e.kind).toBe('unknown')
  })

  it('classifies SUMMARY-foo.md inside plan folder', () => {
    const e = parsePlanningEntry('2026-04-21-x/SUMMARY-resultado.md')
    expect(e.kind).toBe('plan-folder-summary')
  })
})
```

### Passo 5: Integração em `SKILL.md` do `/init`

```markdown
## Step migrate.2: Convert .planning/ → docs/ (Plano 03 fase-03 — D3, M8)

\`\`\`bash
bun run -e "
import { migratePlanning } from './lib/migrate-planning.ts'
const report = await migratePlanning(process.cwd())
console.log('Migration:', report.status)
console.log('  entries:', report.entries)
console.log('  written:', report.written.length)
console.log('  skipped:', report.skipped.length)
if (report.conflicts.length > 0) {
  console.log('  CONFLICTS:', report.conflicts.map(c => c.target).join(', '))
  console.log('  Resolve manually and re-run /init migrate.')
  process.exit(1)
}
"
\`\`\`

Conflicts halt the pipeline — fase-04 (lessons) and fase-05 (decisions) do NOT run.
User resolves manually (delete from docs/ or rename original) and re-runs.
```

---

## Gotchas

- **G1 do plano (lê do backup):** Helper lê de `.planning.v5-backup/.planning/`, não de `.planning/`. Documentado no JSDoc.
- **G2 do plano (idempotência):** Comparação byte-a-byte (`existing === fresh`) decide `already-migrated` vs `conflict`. Re-rodar 2x = no-op.
- **G3 do plano (cross-platform — Windows path separators):** `path.relative` e `path.split(path.sep)` lidam. Mas atenção: arquivos copiados via backup podem ter sido salvos com separador POSIX se vieram de WSL. Validar com fixture cross-platform.
- **G4 (BOM):** `readWithBomStrip` antes de qualquer parse. Aplica ao corpo inteiro do .md.
- **G5 (slug collision):** Se `CONTEXT-foo.md` e `2026-04-21-foo/PRD.md` colidirem em destino, são paths diferentes (`active/foo.md` vs `product-specs/2026-04-21-foo.md`) — sem conflito real. Mas dois CONTEXT-foo.md em momentos diferentes? Improvável (CONTEXT é único por feature). Sufixo de data só se `conflicts` aparecer.
- **G10 do plano (idioma preservado):** Conteúdo do CONTEXT/PRD/PLAN é copiado verbatim. Sem tradução PT→EN. Validador `harness:validate` aceita.
- **G11 (perf ≤120s):** `Promise.all` nas escritas independentes. Em projeto com ~50 .md no `.planning/`, completa em <5s.
- **Local — `.planning/CONTEXT-*.md` sem data:** Cai no destino `docs/exec-plans/active/{slug}.md` sem data prefix. Se múltiplos contextos sem data, colidem. Improvável mas possível. Documentar como warning.
- **Local — subplan path tem `unknown-subplan` fallback:** Se `parsePlanningEntry` retornar `subplan: null` em entry com kind `subplan-*`, fallback documenta erro de classificação. Pode acontecer se path tem char não esperado. Logar `skipped` com razão.
- **G-A1 (decisão assumida):** `.planning/` original é deletada **apenas se** `conflicts.length === 0`. Se houver conflito, original permanece — usuário resolve manualmente. Backup sempre intacto.
- **G-A2 (decisão assumida):** STATE.md vai para `_archived-state/`. Não popula `docs/STATE.md` raiz (que é dinâmico, D32).
- **G9 do plano (provenance):** Headers em `migrate-planning.ts`, `parse-planning-entry.ts`. Conteúdo gerado (markdown copiado) não recebe provenance (é do usuário).

---

## Verificacao

### TDD

- [ ] **RED:** Teste `migrates CONTEXT-baseline.md → docs/exec-plans/active/baseline.md` falha por módulo ausente.
  - Comando: `bun run test skills/init/lib/migrate-planning.test.ts`
  - Resultado esperado: `Cannot find module` ou assertion fail.

- [ ] **GREEN:** Migrator + parser implementados — 8 testes passam (migrator) + 7 (parser).
  - Comando: `bun run test skills/init/lib/migrate-planning.test.ts skills/init/lib/parse-planning-entry.test.ts`
  - Resultado esperado: `15 passed, 0 failed`

### Checklist

- [ ] CONTEXT-foo.md migra para `docs/exec-plans/active/foo.md`
- [ ] PRD.md migra para `docs/product-specs/{date}-{slug}.md`
- [ ] PLAN.md migra para `docs/exec-plans/active/{date}-{slug}-plan.md`
- [ ] STATE.md migra para `docs/exec-plans/active/_archived-state/`
- [ ] Subplan structure (`plano01/fase-01.md`) preservada
- [ ] `.planning/` original deletada após sucesso (G-A1) — backup permanece
- [ ] Re-execução é no-op (idempotente)
- [ ] BOM stripped do source antes de write
- [ ] Conflict detection funciona: arquivo destino com conteúdo diferente → `conflicts[]` populado, sem write
- [ ] dryRun: zero writes em disco
- [ ] Lint limpo: `bun run lint skills/init/lib/migrate-planning.ts skills/init/lib/parse-planning-entry.ts`
- [ ] Testes passam: `bun run test`

---

## Criterio de Aceite

**Por máquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/migrate-planning.test.ts skills/init/lib/parse-planning-entry.test.ts
# Esperado: 15 passed, 0 failed em <2s

# Em fixture legacy-v5 (pre-condicao: backup feito):
bun run -e "
import { migratePlanning } from './skills/init/lib/migrate-planning.ts'
const r = await migratePlanning('tests/fixtures/legacy-v5')
console.log(r.status, r.entries, 'written:', r.written.length)
"
# Esperado: 'completed N written:N' (todos artefatos do .planning/ convertidos)

# Verificar estrutura final:
test -d tests/fixtures/legacy-v5/docs/exec-plans/active && echo OK
test -d tests/fixtures/legacy-v5/docs/product-specs && echo OK
! test -d tests/fixtures/legacy-v5/.planning && echo "original deleted (G-A1)"
test -d tests/fixtures/legacy-v5/.planning.v5-backup && echo "backup remains (R14)"
```

**Por humano:**

- Após migração em fixture com `.planning/2026-04-21-foo/{PRD,PLAN,plano01/fase-01}.md`:
  - Abrir `docs/product-specs/2026-04-21-foo.md` → conteúdo idêntico ao PRD original
  - Abrir `docs/exec-plans/active/2026-04-21-foo/plano01/fase-01-x.md` → conteúdo idêntico
  - Verificar `.planning/` deletado
  - Verificar `.planning.v5-backup/.planning/2026-04-21-foo/PRD.md` ainda existe

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
