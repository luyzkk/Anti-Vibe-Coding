<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 05: Migrate `decisions.md` → `docs/design-docs/ADR-NNNN-*.md`

**Plano:** 03 — Migration v5→v6
**Sizing:** 1.5h
**Depende de:** fase-02 (lê do backup). **Paralelizável com fase-03 e fase-04.**
**Visual:** false

---

## O que esta fase entrega

Helper `migrateDecisions(targetDir, options): Promise<DecisionsMigrationReport>` que parseia `decisions.md` (formato com `### [Nome]: [Opção Escolhida]` + `**Data:** YYYY-MM-DD` + `**Alternativas consideradas:**` + `**Justificativa:**` + `**Risco conhecido:**` + `**Reversibilidade:**`) e gera **um ADR por decisão** em `docs/design-docs/ADR-NNNN-{slug}.md`. Numeração `NNNN` é **monotônica por destino** (G7), com idempotência via detecção de ADRs pré-existentes.

Adicionalmente, se `senior-principles.md` existir no backup, copia para `docs/design-docs/core-beliefs.md` (G-A3).

Atende **D3** (migração), **D10** (`/decision-registry` interface preservada), **CA-15** (ADR pattern alinhado com Plano 05 fase-02).

Formato de saída (alinhado com Plano 05 fase-02 — CA-15):

```yaml
---
id: ADR-0001
title: <título da decisão>
status: accepted   # accepted | superseded
date: YYYY-MM-DD
tags: [list]
---

# ADR-0001: <título>

## Context
<motivo + alternativas>

## Decision
<opção escolhida>

## Consequences
<risco + reversibilidade>
```

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/migrate-decisions.ts` | Create | Helper principal + tipo `DecisionsMigrationReport` |
| `anti-vibe-coding/skills/init/lib/migrate-decisions.test.ts` | Create | Testes paramétricos: parsing, numbering, idempotência |
| `anti-vibe-coding/skills/init/lib/parse-decisions.ts` | Create | Parser extrai entries do markdown |
| `anti-vibe-coding/skills/init/lib/parse-decisions.test.ts` | Create | Testes do parser isolado |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Step `migrate.4` — chama `migrateDecisions` |

---

## Implementacao

### Passo 1: Parser `lib/parse-decisions.ts`

```typescript
// 2026-05-11 (Luiz/dev): parser de decisions.md → DecisionEntry[].
// Formato esperado:
//   ### [Nome]: [Opcao Escolhida]
//   **Data:** YYYY-MM-DD
//   **Alternativas consideradas:** ...
//   **Justificativa:** ...
//   **Risco conhecido:** ...
//   **Reversibilidade:** Reversivel | Irreversivel

export type DecisionEntry = {
  title: string
  chosen: string  // opcao escolhida (depois do colon no header)
  date: string
  alternatives: string
  justification: string
  risk: string
  reversibility: string
  /** Body completo do bloco para fallback. */
  rawBody: string
}

const RE_H3_DECISION = /^### \[([^\]]+)\]\s*:?\s*(.*)$/
const RE_H3_DECISION_SIMPLE = /^### (.+):\s*(.+)$/

export function parseDecisions(body: string): DecisionEntry[] {
  const lines = body.split(/\r?\n/)
  const entries: DecisionEntry[] = []
  let currentLines: string[] = []
  let currentTitle: string | null = null
  let currentChosen: string | null = null

  const flush = (): void => {
    if (currentTitle && currentLines.length > 0) {
      const raw = currentLines.join('\n')
      entries.push({
        title: currentTitle,
        chosen: currentChosen ?? '',
        date: extract(raw, /\*\*Data:?\*\*\s*([0-9-]+)/i),
        alternatives: extract(raw, /\*\*Alternativas[^:]*:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i),
        justification: extract(raw, /\*\*Justificativa:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i),
        risk: extract(raw, /\*\*Risco[^:]*:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i),
        reversibility: extract(raw, /\*\*Reversibilidade:?\*\*([\s\S]*?)(?=\n\n|$)/i),
        rawBody: raw.trim(),
      })
    }
    currentLines = []
    currentTitle = null
    currentChosen = null
  }

  for (const line of lines) {
    let m = RE_H3_DECISION.exec(line)
    if (m) {
      flush()
      currentTitle = m[1]!.trim()
      currentChosen = m[2]!.trim()
      continue
    }
    m = RE_H3_DECISION_SIMPLE.exec(line)
    if (m && currentTitle === null) {  // so se nao matchou bracket form
      flush()
      currentTitle = m[1]!.trim()
      currentChosen = m[2]!.trim()
      continue
    }
    if (currentTitle !== null) {
      currentLines.push(line)
    }
  }
  flush()

  return entries
}

function extract(body: string, re: RegExp): string {
  const m = re.exec(body)
  return m ? m[1]!.trim() : ''
}
```

### Passo 2: Migrator `lib/migrate-decisions.ts`

```typescript
// 2026-05-11 (Luiz/dev): converte decisions.md em N arquivos docs/design-docs/ADR-*.md.
// Numbering monotonico por destino (G7). Idempotente.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseDecisions, type DecisionEntry } from './parse-decisions'
import { slugify } from './slugify'
import { BACKUP_DIR } from './backup-planning'

export type DecisionsMigrationReport = {
  status: 'completed' | 'dry-run' | 'skipped'
  entries: number
  written: string[]
  skipped: Array<{ title: string; reason: string }>
  coreBeliefs?: 'created' | 'skipped'
}

export type MigrateDecisionsOptions = {
  dryRun?: boolean
  writeFile?: (filePath: string, body: string) => Promise<void>
}

const DEFAULT_WRITE = async (p: string, body: string): Promise<void> => {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, body, 'utf8')
}

const RE_ADR_FILE = /^ADR-(\d{4})-/

export async function migrateDecisions(
  targetDir: string,
  options: MigrateDecisionsOptions = {},
): Promise<DecisionsMigrationReport> {
  const write = options.writeFile ?? DEFAULT_WRITE
  const sourcePath = path.join(targetDir, BACKUP_DIR, 'decisions.md')

  const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false)
  if (!sourceExists) {
    return {
      status: 'skipped',
      entries: 0,
      written: [],
      skipped: [{ title: 'source-missing', reason: 'no decisions.md in backup' }],
      coreBeliefs: await handleCoreBeliefs(targetDir, options, write),
    }
  }

  const raw = await fs.readFile(sourcePath, 'utf8')
  const body = raw.replace(/^\uFEFF/, '')
  const entries = parseDecisions(body)

  // G7: numbering monotonico por destino.
  const designDocsDir = path.join(targetDir, 'docs', 'design-docs')
  let counter = await findHighestAdrNumber(designDocsDir)

  const written: string[] = []
  const skipped: DecisionsMigrationReport['skipped'] = []

  // Existing slugs (idempotencia por title slug, nao por numero).
  const existingSlugs = await readExistingAdrSlugs(designDocsDir)

  for (const entry of entries) {
    const slug = slugify(entry.title)
    if (!slug) {
      skipped.push({ title: entry.title, reason: 'slug empty after normalization' })
      continue
    }

    // Idempotencia: ja existe ADR com mesmo slug? skip.
    if (existingSlugs.has(slug)) {
      skipped.push({ title: entry.title, reason: 'already-migrated' })
      continue
    }

    counter += 1
    const adrId = `ADR-${String(counter).padStart(4, '0')}`
    const filename = `${adrId}-${slug}.md`
    const target = path.join(designDocsDir, filename)
    const content = renderAdr(adrId, entry)

    if (!options.dryRun) {
      await write(target, content)
    }
    written.push(target)
    existingSlugs.add(slug)
  }

  return {
    status: options.dryRun ? 'dry-run' : 'completed',
    entries: entries.length,
    written,
    skipped,
    coreBeliefs: await handleCoreBeliefs(targetDir, options, write),
  }
}

async function findHighestAdrNumber(designDocsDir: string): Promise<number> {
  const entries = await fs.readdir(designDocsDir).catch(() => [])
  let max = 0
  for (const e of entries) {
    const m = RE_ADR_FILE.exec(e)
    if (m) {
      const n = parseInt(m[1]!, 10)
      if (n > max) max = n
    }
  }
  return max
}

async function readExistingAdrSlugs(designDocsDir: string): Promise<Set<string>> {
  const entries = await fs.readdir(designDocsDir).catch(() => [])
  const slugs = new Set<string>()
  for (const e of entries) {
    const m = /^ADR-\d{4}-(.+)\.md$/.exec(e)
    if (m) slugs.add(m[1]!)
  }
  return slugs
}

async function handleCoreBeliefs(
  targetDir: string,
  options: MigrateDecisionsOptions,
  write: (p: string, body: string) => Promise<void>,
): Promise<'created' | 'skipped'> {
  // G-A3: senior-principles.md → docs/design-docs/core-beliefs.md
  const src = path.join(targetDir, BACKUP_DIR, 'senior-principles.md')
  const exists = await fs.access(src).then(() => true).catch(() => false)
  if (!exists) return 'skipped'

  const dst = path.join(targetDir, 'docs', 'design-docs', 'core-beliefs.md')
  const dstExists = await fs.access(dst).then(() => true).catch(() => false)
  if (dstExists) return 'skipped'  // idempotente

  if (!options.dryRun) {
    const body = await fs.readFile(src, 'utf8')
    await write(dst, body.replace(/^\uFEFF/, ''))
  }
  return 'created'
}

function renderAdr(id: string, entry: DecisionEntry): string {
  const tags = inferTags(entry)
  const tagsYaml = `[${tags.map(t => JSON.stringify(t)).join(', ')}]`
  const status = /irreversivel/i.test(entry.reversibility) ? 'accepted' : 'accepted'  // sempre accepted na migracao
  const date = entry.date || 'unknown'

  return `---
id: ${id}
title: ${JSON.stringify(entry.title)}
status: ${status}
date: ${date}
tags: ${tagsYaml}
---

# ${id}: ${entry.title}

## Context

${entry.alternatives || '(See original below.)'}

**Justification:** ${entry.justification || '(See original below.)'}

## Decision

${entry.chosen || '(Not extracted — see original.)'}

## Consequences

**Known risk:** ${entry.risk || '(none documented)'}

**Reversibility:** ${entry.reversibility || '(unspecified)'}

---

<!-- Source: anti-vibe-coding/decisions.md — migrated by /init Plano 03 fase-05. -->

## Original

${entry.rawBody}
`
}

function inferTags(entry: DecisionEntry): string[] {
  const tokens = new Set<string>()
  for (const word of entry.title.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length >= 4) tokens.add(word)
  }
  if (/reversivel|reversible/i.test(entry.reversibility)) tokens.add('reversible')
  if (/irreversivel|irreversible/i.test(entry.reversibility)) tokens.add('irreversible')
  return Array.from(tokens).slice(0, 6)
}
```

### Passo 3: Testes `parse-decisions.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): valida parser isolado.

import { describe, it, expect } from 'bun:test'
import { parseDecisions } from './parse-decisions'

describe('parseDecisions', () => {
  it('parses bracket-form heading: ### [Nome]: Escolha', () => {
    const body = `### [Sistema de Versionamento]: Manifest com Checksums\n**Data:** 2026-03-23\n**Alternativas consideradas:** ...`
    const entries = parseDecisions(body)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.title).toBe('Sistema de Versionamento')
    expect(entries[0]!.chosen).toBe('Manifest com Checksums')
    expect(entries[0]!.date).toBe('2026-03-23')
  })

  it('extracts justification block', () => {
    const body = `### [X]: y\n**Justificativa:** ABC linha 1\nlinha 2\n\n**Risco conhecido:** DEF`
    const entries = parseDecisions(body)
    expect(entries[0]!.justification).toContain('ABC linha 1')
    expect(entries[0]!.risk).toBe('DEF')
  })

  it('extracts reversibility', () => {
    const body = `### [X]: y\n**Reversibilidade:** Reversível`
    const entries = parseDecisions(body)
    expect(entries[0]!.reversibility).toBe('Reversível')
  })

  it('parses multiple decisions in same file', () => {
    const body = `### [A]: 1\n**Data:** 2026-01-01\n\n### [B]: 2\n**Data:** 2026-02-02\n`
    const entries = parseDecisions(body)
    expect(entries).toHaveLength(2)
    expect(entries[0]!.title).toBe('A')
    expect(entries[1]!.title).toBe('B')
  })

  it('returns empty array for body without decisions', () => {
    expect(parseDecisions('# Just a header\nText.\n')).toHaveLength(0)
  })

  it('handles missing date gracefully', () => {
    const body = `### [X]: y\n**Justificativa:** abc`
    const entries = parseDecisions(body)
    expect(entries[0]!.date).toBe('')
  })
})
```

### Passo 4: Testes `migrate-decisions.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): cobre RED da fase-05 + numbering monotonico.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { migrateDecisions } from './migrate-decisions'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'migrate-decisions')

async function setupBackup(decisionsContent: string, seniorContent?: string): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  const backupDir = path.join(FIXTURE, '.planning.v5-backup')
  await fs.mkdir(backupDir, { recursive: true })
  await fs.writeFile(path.join(backupDir, 'decisions.md'), decisionsContent, 'utf8')
  if (seniorContent) {
    await fs.writeFile(path.join(backupDir, 'senior-principles.md'), seniorContent, 'utf8')
  }
}

describe('migrateDecisions', () => {
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('creates ADR-0001 for first decision', async () => {
    await setupBackup(`### [Versionamento]: Manifest\n**Data:** 2026-03-23\n**Justificativa:** x\n`)
    const report = await migrateDecisions(FIXTURE)
    expect(report.status).toBe('completed')
    expect(report.written).toHaveLength(1)
    expect(report.written[0]).toMatch(/ADR-0001-versionamento\.md$/)
  })

  it('numbers monotonically across multiple decisions', async () => {
    await setupBackup(`### [A]: 1\n**Data:** 2026-01-01\n\n### [B]: 2\n**Data:** 2026-02-02\n\n### [C]: 3\n**Data:** 2026-03-03\n`)
    const report = await migrateDecisions(FIXTURE)
    expect(report.written).toHaveLength(3)
    expect(report.written[0]).toMatch(/ADR-0001-a\.md$/)
    expect(report.written[1]).toMatch(/ADR-0002-b\.md$/)
    expect(report.written[2]).toMatch(/ADR-0003-c\.md$/)
  })

  it('continues numbering from highest existing ADR (G7)', async () => {
    await setupBackup(`### [Z]: 9\n**Data:** 2026-04-04\n`)
    // Pre-existing ADR-0005 do destino (cenario de re-run parcial):
    await fs.mkdir(path.join(FIXTURE, 'docs', 'design-docs'), { recursive: true })
    await fs.writeFile(path.join(FIXTURE, 'docs', 'design-docs', 'ADR-0005-existing.md'), '---\n', 'utf8')
    const report = await migrateDecisions(FIXTURE)
    expect(report.written[0]).toMatch(/ADR-0006-z\.md$/)  // 5+1
  })

  it('writes complete frontmatter (CA-15 contract)', async () => {
    await setupBackup(`### [V]: m\n**Data:** 2026-03-23\n**Justificativa:** j\n**Risco conhecido:** r\n**Reversibilidade:** Reversível\n`)
    await migrateDecisions(FIXTURE)
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'design-docs'))
    const adr = files.find(f => f.endsWith('.md') && f.startsWith('ADR-'))!
    const body = await fs.readFile(path.join(FIXTURE, 'docs', 'design-docs', adr), 'utf8')
    expect(body).toMatch(/^id: ADR-\d{4}$/m)
    expect(body).toMatch(/^title: /m)
    expect(body).toMatch(/^status: accepted$/m)
    expect(body).toMatch(/^date: 2026-03-23$/m)
    expect(body).toMatch(/^tags: \[/m)
  })

  it('includes Context/Decision/Consequences sections', async () => {
    await setupBackup(`### [V]: m\n**Justificativa:** J\n**Risco conhecido:** R\n**Reversibilidade:** Reversível\n`)
    await migrateDecisions(FIXTURE)
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'design-docs'))
    const body = await fs.readFile(path.join(FIXTURE, 'docs', 'design-docs', files[0]!), 'utf8')
    expect(body).toContain('## Context')
    expect(body).toContain('## Decision')
    expect(body).toContain('## Consequences')
    expect(body).toContain('Reversível')
  })

  it('is idempotent — re-run skips by slug', async () => {
    await setupBackup(`### [V]: m\n**Data:** 2026-03-23\n`)
    await migrateDecisions(FIXTURE)
    const second = await migrateDecisions(FIXTURE)
    expect(second.skipped.some(s => s.reason === 'already-migrated')).toBe(true)
    expect(second.written).toHaveLength(0)
  })

  it('migrates senior-principles.md → core-beliefs.md (G-A3)', async () => {
    await setupBackup(`### [V]: m\n`, '# Senior Principles\n\nContent here.\n')
    const report = await migrateDecisions(FIXTURE)
    expect(report.coreBeliefs).toBe('created')
    const cb = await fs.readFile(path.join(FIXTURE, 'docs', 'design-docs', 'core-beliefs.md'), 'utf8')
    expect(cb).toContain('Senior Principles')
  })

  it('skips core-beliefs if senior-principles.md absent (G-A3)', async () => {
    await setupBackup(`### [V]: m\n`)
    const report = await migrateDecisions(FIXTURE)
    expect(report.coreBeliefs).toBe('skipped')
  })

  it('dryRun=true writes nothing', async () => {
    await setupBackup(`### [V]: m\n`)
    const report = await migrateDecisions(FIXTURE, { dryRun: true })
    expect(report.status).toBe('dry-run')
    const exists = await fs.access(path.join(FIXTURE, 'docs', 'design-docs')).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('returns skipped when decisions.md absent', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning.v5-backup'), { recursive: true })
    const report = await migrateDecisions(FIXTURE)
    expect(report.status).toBe('skipped')
  })
})
```

### Passo 5: Integração em `SKILL.md` do `/init`

```markdown
## Step migrate.4: Convert decisions.md → docs/design-docs/ADR-*.md (Plano 03 fase-05 — D3, M7)

\`\`\`bash
bun run -e "
import { migrateDecisions } from './lib/migrate-decisions.ts'
const r = await migrateDecisions(process.cwd())
console.log('Decisions:', r.status, '— wrote:', r.written.length)
if (r.coreBeliefs === 'created') console.log('core-beliefs.md created from senior-principles.md')
"
\`\`\`

ADRs vão para `docs/design-docs/` com numeração monotônica. Idempotente por slug.
```

---

## Gotchas

- **G1 do plano:** Lê de `.planning.v5-backup/decisions.md` e `.planning.v5-backup/senior-principles.md`.
- **G2 (idempotência):** Detect existing slugs em `docs/design-docs/`. Re-run skip por slug, não por número.
- **G7 (numbering monotônico):** `findHighestAdrNumber` lê filenames `ADR-NNNN-*` e continua. Garante que adicionar ADR depois (manual ou via outra migration) não colide.
- **G4 (BOM):** Strip em ambos sources.
- **G5 (slug collision):** Dois decision titles diferentes → slugs diferentes. Improvável colidir. Se colidir, segundo é skip por idempotência (não overwrite).
- **G-A3 (decisão assumida):** `senior-principles.md` → `core-beliefs.md`. Conteúdo copiado intacto. Plano 08 (dog-food) pode refinar manualmente depois.
- **G10 (idioma):** Conteúdo em PT preservado. Frontmatter chaves em EN (`id`, `title`, `status`, `date`, `tags`).
- **G11 (perf):** Numero de decisões pequeno (~5 no plugin). Sequential loop OK.
- **Local — `status` sempre `accepted` na migração:** Conversão fresh nunca produz `superseded`. Quando user usar `/decision-registry --revoke` em v6 (Plano 06 fase-06), ADR antigo vira `superseded-by: ADR-NNNN`. Migration não tem informação para inferir relações.
- **Local — `**Reversibilidade:** Reversível` sem newline final causa regex extract retornar trim correto:** Regex `(?=\n\n|$)` captura até dupla newline OU EOF. Funciona para última seção do documento.
- **Local — alternativas com lista numerada:** Conteúdo de `**Alternativas consideradas:**` pode incluir lista `1. ... 2. ... 3. ✓ (escolhida)`. Preservado verbatim em `## Context`. Validação manual em CA-15.
- **G9 (provenance):** Headers em `migrate-decisions.ts`, `parse-decisions.ts`. ADRs gerados não levam provenance.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `creates ADR-0001 for first decision` falha — módulo ausente.
  - Comando: `bun run test skills/init/lib/migrate-decisions.test.ts`
  - Resultado esperado: assertion fail / module missing.

- [ ] **GREEN:** Parser + migrator implementados — 9 (migrator) + 6 (parser) testes passam.
  - Comando: `bun run test skills/init/lib/migrate-decisions.test.ts skills/init/lib/parse-decisions.test.ts`
  - Resultado esperado: `15 passed, 0 failed`

### Checklist

- [ ] N decisões no source → N arquivos `ADR-NNNN-{slug}.md`
- [ ] Numeração monotônica (`ADR-0001`, `ADR-0002`, ...)
- [ ] Continua do maior ADR pré-existente (G7)
- [ ] Frontmatter completo: `id, title, status, date, tags`
- [ ] Seções `## Context`, `## Decision`, `## Consequences`
- [ ] `senior-principles.md` → `core-beliefs.md` se existir (G-A3)
- [ ] Idempotente (skip por slug)
- [ ] dryRun: zero writes
- [ ] Source missing → status `skipped`
- [ ] BOM stripped
- [ ] Lint limpo: `bun run lint skills/init/lib/migrate-decisions.ts skills/init/lib/parse-decisions.ts`
- [ ] Testes passam: `bun run test`

---

## Criterio de Aceite

**Por máquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/migrate-decisions.test.ts skills/init/lib/parse-decisions.test.ts
# Esperado: 15 passed, 0 failed em <2s

# Em fixture legacy-v5:
bun run -e "
import { migrateDecisions } from './skills/init/lib/migrate-decisions.ts'
const r = await migrateDecisions('tests/fixtures/legacy-v5')
console.log(r.status, r.written.length, 'coreBeliefs:', r.coreBeliefs)
"

# Conferir numeração:
ls tests/fixtures/legacy-v5/docs/design-docs/ADR-*.md | sort
# Esperado: ADR-0001-*.md, ADR-0002-*.md, ... (monotônica)

# Conferir frontmatter:
for f in tests/fixtures/legacy-v5/docs/design-docs/ADR-*.md; do
  head -7 "$f" | grep -q "^id: ADR-" || echo "MISSING id in $f"
  head -7 "$f" | grep -q "^title: " || echo "MISSING title in $f"
  head -7 "$f" | grep -q "^status: " || echo "MISSING status in $f"
done
# Esperado: nenhum output

# Core beliefs (se houver senior-principles.md no backup):
test -f tests/fixtures/legacy-v5/docs/design-docs/core-beliefs.md && echo "core-beliefs OK"
```

**Por humano:**

- Abrir um ADR gerado e validar:
  - `id: ADR-NNNN` no frontmatter bate com filename
  - Seções `## Context` (alternativas + justification), `## Decision` (opção escolhida), `## Consequences` (risco + reversibility)
  - Conteúdo original preservado em `## Original` ao final
  - Filename: `ADR-NNNN-titulo-em-kebab.md`

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
