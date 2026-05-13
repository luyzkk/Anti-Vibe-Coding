<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: Migrate `lessons-learned.md` → `docs/compound/*.md` individuais

**Plano:** 03 — Migration v5→v6
**Sizing:** 2h
**Depende de:** fase-02 (lê do backup). **Paralelizável com fase-03 e fase-05.**
**Visual:** false

---

## O que esta fase entrega

Helper `migrateLessons(targetDir, options): Promise<LessonsMigrationReport>` que parseia o arquivo `lessons-learned.md` (formato heterogêneo — duas convenções coexistem no plugin atual) e gera **um arquivo por lição** em `docs/compound/YYYY-MM-DD-{slug}.md`, com **YAML frontmatter completo** validado por `compound:check` (Plano 04 fase-02 / CA-29). Atende **D3** (migração), **D10** (`/lessons-learned` interface preservada — só destino muda).

Frontmatter contract (CA-29 herdado, alinhado com Plano 05 fase-01):

```yaml
---
title: <inferido do H2 ou H3 header>
category: <Plugin Development | Bash | Subagentes | Armadilha | Arquitetura | etc.>
tags: [list, of, kebab-case]
created: YYYY-MM-DD
---
```

Corpo segue padrão **Problem / Solution / Prevention** (mapeado heuristicamente das seções do arquivo original).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/migrate-lessons.ts` | Create | Helper principal + tipo `LessonsMigrationReport` |
| `anti-vibe-coding/skills/init/lib/migrate-lessons.test.ts` | Create | Testes paramétricos cobrindo ambos formatos do plugin atual |
| `anti-vibe-coding/skills/init/lib/parse-lessons.ts` | Create | Parser que extrai entries do markdown heterogêneo |
| `anti-vibe-coding/skills/init/lib/parse-lessons.test.ts` | Create | Testes do parser isolado |
| `anti-vibe-coding/skills/init/lib/slugify.ts` | Create (se ausente) | Helper de slug shared para fase-04 e fase-05 |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Step `migrate.3` — chama `migrateLessons` após `migratePlanning` |

---

## Formato de entrada (perfil de `lessons-learned.md` do plugin atual)

Existem **dois formatos heterogêneos**:

**Formato A (verboso, anterior a v5.2):**
```markdown
## 2026-03-23: hooks.json overwrite bug (CORRIGIDO)

**Sintoma:** ...
**Causa Raiz:** ...
**Impacto:** ...
**Fix Aplicado:** ...
**Lição:** ...
**Prevenção:** ...
**Arquivos Afetados:** ...
```

**Formato B (compacto, v5.2+):**
```markdown
### [Armadilha] grep -c retorna exit 1 quando count é zero
**Regra:** ...
**Contexto:** ...
```

Parser detecta ambos. Heurística:
- H2 (`## `) com regex `^## (\d{4}-\d{2}-\d{2}):` → Formato A
- H3 (`### `) com regex `^### \[([^\]]+)\]` → Formato B, categoria do colchete

---

## Implementacao

### Passo 1: Slugify shared `lib/slugify.ts`

```typescript
// 2026-05-11 (Luiz/dev): slug helper compartilhado entre fase-04 (lessons) e fase-05 (ADRs).
// Decisao: criar aqui (fase-04) porque chega antes na ordem do plano; fase-05 reusa.

/**
 * Normaliza string em kebab-case sem acentos.
 * - Lowercase, sem espacos, separador '-'.
 * - Remove acentos (NFD + diacriticos).
 * - Limita a 50 chars (evita filenames absurdos no Windows MAX_PATH).
 */
export function slugify(input: string, maxLen: number = 50): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // diacriticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')      // qualquer nao-alfanum vira '-'
    .replace(/^-+|-+$/g, '')           // strip leading/trailing '-'
    .slice(0, maxLen)
    .replace(/-+$/, '')                // se cortou no meio de uma sequencia
}
```

### Passo 2: Parser `lib/parse-lessons.ts`

```typescript
// 2026-05-11 (Luiz/dev): parser do lessons-learned.md heterogeneo (formato A + B).
// Retorna LessonEntry[] estruturado para migrator gerar compound notes.

export type LessonEntry = {
  /** Titulo limpo, sem data ou [tag]. */
  title: string
  /** YYYY-MM-DD inferido (header H2) ou fallback do mtime. */
  date: string
  /** Categoria — H2 'CORRIGIDO' / tag [Armadilha] / H1 do bloco. */
  category: string
  /** Conteudo raw do bloco (para corpo do compound note). */
  body: string
  /** Tags inferidas (palavras-chave do title + categoria). */
  tags: string[]
  /** Linha do header (debug). */
  sourceLine: number
}

const RE_H2_DATE = /^## (\d{4}-\d{2}-\d{2}):\s*(.+?)(?:\s*\(.*\))?$/   // ## 2026-03-23: titulo
const RE_H2_SECTION = /^## (.+)$/                                       // ## Licoes — Anti-Vibe v5.2
const RE_H3_CATEGORY = /^### \[([^\]]+)\]\s*(.+)$/                      // ### [Armadilha] titulo
const RE_H3_PLAIN = /^### (.+)$/                                        // ### titulo plano

/**
 * Detecta entries em um lessons-learned.md heterogeneo.
 * - Bloco inicia em ## ou ### com pattern reconhecido.
 * - Corpo vai ate proximo H2/H3 do mesmo nivel.
 */
export function parseLessons(body: string, fallbackDate: string): LessonEntry[] {
  const lines = body.split(/\r?\n/)
  const entries: LessonEntry[] = []

  let current: LessonEntry | null = null
  let buffer: string[] = []

  const flush = (): void => {
    if (current) {
      current.body = buffer.join('\n').trim()
      entries.push(current)
    }
    current = null
    buffer = []
  }

  let inSectionLooseFormat = false  // dentro de "## Licoes — Anti-Vibe X" sem dates por entry

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // H2 com data → formato A
    let m = RE_H2_DATE.exec(line)
    if (m) {
      flush()
      const date = m[1]!
      const title = stripCorrigido(m[2]!.trim())
      const category = inferCategoryFromContent(title) ?? 'Plugin Development'
      current = mkEntry(title, date, category, [], i)
      inSectionLooseFormat = false
      continue
    }

    // H2 sem data → secao de agregacao (ex: "## Licoes — Anti-Vibe Coding v5.2")
    m = RE_H2_SECTION.exec(line)
    if (m && !RE_H2_DATE.test(line)) {
      flush()
      inSectionLooseFormat = true
      continue
    }

    // H3 com [Categoria] → formato B
    m = RE_H3_CATEGORY.exec(line)
    if (m) {
      flush()
      const category = m[1]!.trim()
      const title = m[2]!.trim()
      // Em formato B, date herda fallback (mtime ou today).
      current = mkEntry(title, fallbackDate, category, [], i)
      continue
    }

    // H3 plano dentro de secao loose
    m = RE_H3_PLAIN.exec(line)
    if (m && inSectionLooseFormat) {
      flush()
      const title = m[1]!.trim()
      current = mkEntry(title, fallbackDate, 'Plugin Development', [], i)
      continue
    }

    // Linha de corpo
    if (current) {
      buffer.push(line)
    }
  }
  flush()

  // Auto-tag a partir de title + category.
  for (const e of entries) {
    e.tags = inferTags(e)
  }

  return entries
}

function mkEntry(title: string, date: string, category: string, tags: string[], sourceLine: number): LessonEntry {
  return { title, date, category, tags, body: '', sourceLine }
}

function stripCorrigido(s: string): string {
  return s.replace(/\s*\((CORRIGIDO|FIXADO|RESOLVED)\)\s*$/i, '').trim()
}

function inferCategoryFromContent(title: string): string | null {
  // Heuristica: 'bug' no titulo → Bug; 'hook' → Plugin Development; etc.
  if (/bug|crash|falha/i.test(title)) return 'Bug'
  if (/hook|skill|plugin/i.test(title)) return 'Plugin Development'
  return null
}

function inferTags(entry: LessonEntry): string[] {
  const tokens = new Set<string>()
  // Categoria como tag.
  tokens.add(entry.category.toLowerCase().replace(/\s+/g, '-'))
  // Palavras de 4+ chars do titulo.
  for (const word of entry.title.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length >= 4 && !STOP.has(word)) tokens.add(word)
  }
  return Array.from(tokens).slice(0, 6)
}

const STOP = new Set([
  'para', 'quando', 'esta', 'sera', 'essa', 'esse', 'mais', 'sobre', 'pelos',
  'with', 'when', 'this', 'that', 'from', 'into', 'over',
])
```

### Passo 3: Migrator `lib/migrate-lessons.ts`

```typescript
// 2026-05-11 (Luiz/dev): converte lessons-learned.md em N arquivos docs/compound/*.md.
// Frontmatter contract: title/category/tags/created (CA-29).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseLessons, type LessonEntry } from './parse-lessons'
import { slugify } from './slugify'
import { BACKUP_DIR } from './backup-planning'

export type LessonsMigrationReport = {
  status: 'completed' | 'dry-run' | 'skipped'
  entries: number
  written: string[]
  skipped: Array<{ title: string; reason: string }>
}

export type MigrateLessonsOptions = {
  dryRun?: boolean
  writeFile?: (filePath: string, body: string) => Promise<void>
  /** Fallback date para entries sem date inferida (default: today). */
  fallbackDate?: string
}

const DEFAULT_WRITE = async (p: string, body: string): Promise<void> => {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, body, 'utf8')
}

export async function migrateLessons(
  targetDir: string,
  options: MigrateLessonsOptions = {},
): Promise<LessonsMigrationReport> {
  const write = options.writeFile ?? DEFAULT_WRITE
  const sourcePath = path.join(targetDir, BACKUP_DIR, 'lessons-learned.md')

  const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false)
  if (!sourceExists) {
    return { status: 'skipped', entries: 0, written: [], skipped: [{ title: 'source-missing', reason: 'no lessons-learned.md in backup' }] }
  }

  const raw = await fs.readFile(sourcePath, 'utf8')
  const body = raw.replace(/^\uFEFF/, '')  // G4: strip BOM
  const fallback = options.fallbackDate ?? new Date().toISOString().slice(0, 10)
  const entries = parseLessons(body, fallback)

  const written: string[] = []
  const skipped: LessonsMigrationReport['skipped'] = []

  for (const entry of entries) {
    const slug = slugify(entry.title)
    if (!slug) {
      skipped.push({ title: entry.title, reason: 'slug empty after normalization' })
      continue
    }
    const filename = `${entry.date}-${slug}.md`
    const target = path.join(targetDir, 'docs', 'compound', filename)

    // Idempotencia: ja existe? skip.
    const exists = await fs.access(target).then(() => true).catch(() => false)
    if (exists) {
      skipped.push({ title: entry.title, reason: 'already-migrated' })
      continue
    }

    const content = renderCompoundNote(entry)
    if (!options.dryRun) {
      await write(target, content)
    }
    written.push(target)
  }

  return {
    status: options.dryRun ? 'dry-run' : 'completed',
    entries: entries.length,
    written,
    skipped,
  }
}

function renderCompoundNote(entry: LessonEntry): string {
  const tagsYaml = entry.tags.length > 0
    ? `[${entry.tags.map(t => JSON.stringify(t)).join(', ')}]`
    : '[]'

  // Heuristica: mapear o body do entry para secoes Problem/Solution/Prevention.
  // Se body tem cabecalhos **Sintoma**/**Fix**/**Prevencao** (formato A), usar mapping.
  // Se formato B (so **Regra** + **Contexto**), Solution = Regra, Problem = Contexto.
  const sections = mapBodyToSections(entry.body)

  return `---
title: ${JSON.stringify(entry.title)}
category: ${JSON.stringify(entry.category)}
tags: ${tagsYaml}
created: ${entry.date}
---

# ${entry.title}

## Problem

${sections.problem || '(See original content below.)'}

## Solution

${sections.solution || '(See original content below.)'}

## Prevention

${sections.prevention || '(Migrated from v5 lessons-learned.md — adjust as needed.)'}

---

<!-- Source: anti-vibe-coding/lessons-learned.md (line ${entry.sourceLine}) — migrated by /init Plano 03 fase-04. -->

## Original

${entry.body}
`
}

function mapBodyToSections(body: string): { problem: string; solution: string; prevention: string } {
  const sintoma = extract(body, /\*\*Sintoma:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const causa = extract(body, /\*\*Causa[^:]*:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const fix = extract(body, /\*\*Fix[^:]*:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const licao = extract(body, /\*\*Li[çc][ãa]o:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const prevencao = extract(body, /\*\*Preven[çc][ãa]o:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const regra = extract(body, /\*\*Regra:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)
  const contexto = extract(body, /\*\*Contexto:?\*\*([\s\S]*?)(?=\*\*[A-Z][a-zA-Z]+:?\*\*|$)/i)

  return {
    problem: sintoma || causa || contexto || '',
    solution: fix || licao || regra || '',
    prevention: prevencao || '',
  }
}

function extract(body: string, re: RegExp): string {
  const m = re.exec(body)
  return m ? m[1]!.trim() : ''
}
```

### Passo 4: Testes `parse-lessons.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): valida parser de ambos formatos isoladamente.

import { describe, it, expect } from 'bun:test'
import { parseLessons } from './parse-lessons'

describe('parseLessons', () => {
  it('parses format A (## YYYY-MM-DD: title)', () => {
    const body = `## 2026-03-23: hooks.json overwrite bug (CORRIGIDO)\n\n**Sintoma:** XYZ\n**Fix:** ABC\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.date).toBe('2026-03-23')
    expect(entries[0]!.title).toBe('hooks.json overwrite bug')
    expect(entries[0]!.body).toContain('Sintoma')
  })

  it('parses format B (### [Categoria] title)', () => {
    const body = `### [Armadilha] grep -c retorna exit 1\n**Regra:** XYZ\n**Contexto:** ABC\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries).toHaveLength(1)
    expect(entries[0]!.category).toBe('Armadilha')
    expect(entries[0]!.title).toBe('grep -c retorna exit 1')
  })

  it('parses both formats in same file', () => {
    const body = `## 2026-03-23: bug A\n**Fix:** x\n\n## Licoes — v5.2 (2026-04-21)\n\n### [Armadilha] bug B\n**Regra:** y\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries).toHaveLength(2)
    expect(entries[0]!.date).toBe('2026-03-23')
    expect(entries[1]!.date).toBe('2026-05-11') // fallback
  })

  it('strips (CORRIGIDO) suffix from title', () => {
    const body = `## 2026-03-23: bug X (CORRIGIDO)\n**Fix:** x\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries[0]!.title).toBe('bug X')
  })

  it('returns empty array for body without lessons', () => {
    expect(parseLessons('# Just a title\nSome text.\n', '2026-05-11')).toHaveLength(0)
  })

  it('auto-tags from title words and category', () => {
    const body = `### [Armadilha] grep counter bug\n**Regra:** x\n`
    const entries = parseLessons(body, '2026-05-11')
    expect(entries[0]!.tags).toContain('armadilha')
    expect(entries[0]!.tags).toContain('grep')
  })
})
```

### Passo 5: Testes `migrate-lessons.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): cobre RED da fase-04 + frontmatter contract.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { migrateLessons } from './migrate-lessons'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'migrate-lessons')

async function setupBackup(content: string): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  const backupDir = path.join(FIXTURE, '.planning.v5-backup')
  await fs.mkdir(backupDir, { recursive: true })
  await fs.writeFile(path.join(backupDir, 'lessons-learned.md'), content, 'utf8')
}

describe('migrateLessons', () => {
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('creates 1 compound note per lesson (3 lessons → 3 files)', async () => {
    await setupBackup(`
## 2026-03-23: bug A (CORRIGIDO)
**Sintoma:** s
**Fix:** f
**Prevencao:** p

### [Armadilha] grep -c quirk
**Regra:** r
**Contexto:** c

### [Arquitetura] hooks loading
**Regra:** r2
**Contexto:** c2
`)
    const report = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    expect(report.status).toBe('completed')
    expect(report.written).toHaveLength(3)
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'compound'))
    expect(files.filter(f => f.endsWith('.md'))).toHaveLength(3)
  })

  it('writes complete YAML frontmatter (CA-29)', async () => {
    await setupBackup(`### [Armadilha] grep quirk\n**Regra:** r\n`)
    await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'compound'))
    const body = await fs.readFile(path.join(FIXTURE, 'docs', 'compound', files[0]!), 'utf8')
    expect(body).toMatch(/^---\ntitle: /m)
    expect(body).toMatch(/^category: /m)
    expect(body).toMatch(/^tags: \[/m)
    expect(body).toMatch(/^created: 2026-04-21$/m)
    expect(body).toMatch(/\n---\n/)
  })

  it('includes Problem/Solution/Prevention sections', async () => {
    await setupBackup(`## 2026-03-23: bug X\n**Sintoma:** PROB\n**Fix:** SOL\n**Prevencao:** PREV\n`)
    await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'compound'))
    const body = await fs.readFile(path.join(FIXTURE, 'docs', 'compound', files[0]!), 'utf8')
    expect(body).toContain('## Problem')
    expect(body).toContain('## Solution')
    expect(body).toContain('## Prevention')
    expect(body).toContain('PROB')
    expect(body).toContain('SOL')
    expect(body).toContain('PREV')
  })

  it('uses date from H2 header as filename prefix', async () => {
    await setupBackup(`## 2026-03-23: hooks bug\n**Fix:** x\n`)
    await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    const files = await fs.readdir(path.join(FIXTURE, 'docs', 'compound'))
    expect(files[0]).toMatch(/^2026-03-23-hooks-bug\.md$/)
  })

  it('is idempotent — re-run skips existing files', async () => {
    await setupBackup(`## 2026-03-23: bug A\n**Fix:** f\n`)
    await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    const second = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    expect(second.skipped.some(s => s.reason === 'already-migrated')).toBe(true)
    expect(second.written).toHaveLength(0)
  })

  it('dryRun=true does not write files', async () => {
    await setupBackup(`## 2026-03-23: bug\n**Fix:** f\n`)
    const report = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21', dryRun: true })
    expect(report.status).toBe('dry-run')
    const exists = await fs.access(path.join(FIXTURE, 'docs', 'compound')).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('returns skipped when no lessons-learned.md in backup', async () => {
    await fs.mkdir(path.join(FIXTURE, '.planning.v5-backup'), { recursive: true })
    const report = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    expect(report.status).toBe('skipped')
    expect(report.entries).toBe(0)
  })

  it('strips BOM from source', async () => {
    await setupBackup('\uFEFF## 2026-03-23: bommed\n**Fix:** f\n')
    const report = await migrateLessons(FIXTURE, { fallbackDate: '2026-04-21' })
    expect(report.written).toHaveLength(1)
  })
})
```

### Passo 6: Integração em `SKILL.md` do `/init`

```markdown
## Step migrate.3: Convert lessons-learned.md → docs/compound/*.md (Plano 03 fase-04 — D3, M7)

\`\`\`bash
bun run -e "
import { migrateLessons } from './lib/migrate-lessons.ts'
const report = await migrateLessons(process.cwd())
console.log('Lessons:', report.status, '— wrote:', report.written.length, 'skipped:', report.skipped.length)
"
\`\`\`

Compound notes vão para `docs/compound/YYYY-MM-DD-{slug}.md` com frontmatter validado por
`bun run compound:check` (Plano 04). Idempotente.
```

---

## Gotchas

- **G1 do plano (lê do backup):** Source é `.planning.v5-backup/lessons-learned.md`, não a raiz.
- **G2 do plano (idempotência):** Comparação por filename (não por hash). Se usuário editar um compound note depois de migrar, segunda run **não** sobrescreve (skip por `already-migrated`).
- **G4 (BOM):** Strip antes de parsear.
- **G5 (slug collision):** Dois títulos diferentes em datas diferentes → filenames diferentes (`{date}-{slug}.md`). Mesmo título mesma data: colidem. Improvável — se acontecer, sufixar com `-1`, `-2`. Documentar como TODO no parser se ficar relevante.
- **G6 (frontmatter contract — CA-29):** Validado por `compound:check` (Plano 04 fase-02). Testes desta fase asseguram presença das 4 chaves obrigatórias.
- **G10 (idioma):** Mantém PT do origin. Frontmatter `title` preserva acentos no JSON string mas `slug` os remove (NFD + diacritics strip).
- **G11 (perf):** Loop sequencial — N lições do plugin atual: ~10. Tempo desprezível. Se crescer >100, paralelizar `Promise.all` no map.
- **Local — formato heterogêneo:** Dois formatos no mesmo arquivo. Parser detecta. Teste explícito (`parses both formats in same file`).
- **Local — heading `## Licoes — Anti-Vibe v5.2 (2026-04-21)` é seção de agregação, não entry:** Parser distingue via `RE_H2_DATE` vs `RE_H2_SECTION`. Date matcher é mais específico (testado primeiro).
- **Local — `(CORRIGIDO)` suffix:** Stripped do title. Outras marcações futuras (`(FIXADO)`, `(RESOLVED)`) também.
- **G-A3 (decisão assumida):** `senior-principles.md` **não** é processado aqui (fase-04 é só lessons). Vai para fase-05 (decisions + senior-principles) ou fase-08 do plano 08 (dog-food).
- **G9 (provenance):** Headers em `migrate-lessons.ts`, `parse-lessons.ts`, `slugify.ts`. Compound notes gerados **não** levam provenance (são para usuário final).

---

## Verificacao

### TDD

- [ ] **RED:** Teste `creates 1 compound note per lesson (3 lessons → 3 files)` falha — módulo ausente ou só cria 1.
  - Comando: `bun run test skills/init/lib/migrate-lessons.test.ts`
  - Resultado esperado: assertion fail.

- [ ] **GREEN:** Parser + migrator implementados — 8 (migrator) + 6 (parser) testes passam.
  - Comando: `bun run test skills/init/lib/migrate-lessons.test.ts skills/init/lib/parse-lessons.test.ts`
  - Resultado esperado: `14 passed, 0 failed`

### Checklist

- [ ] N lições no source → N arquivos em `docs/compound/`
- [ ] Cada arquivo tem frontmatter `title/category/tags/created` (CA-29)
- [ ] Cada arquivo tem seções `## Problem`, `## Solution`, `## Prevention`
- [ ] Date prefix do filename vem do H2 (formato A) ou fallback (formato B)
- [ ] Re-execução é no-op (idempotente — skip por `already-migrated`)
- [ ] dryRun: zero writes em disco
- [ ] Source missing → status `skipped`, sem erro
- [ ] BOM stripped do source
- [ ] Slug não tem acentos (NFD + strip diacritics)
- [ ] Conteúdo original preservado em seção `## Original` (rastreabilidade)
- [ ] Lint limpo: `bun run lint skills/init/lib/migrate-lessons.ts skills/init/lib/parse-lessons.ts skills/init/lib/slugify.ts`
- [ ] Testes passam: `bun run test`

---

## Criterio de Aceite

**Por máquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/migrate-lessons.test.ts skills/init/lib/parse-lessons.test.ts
# Esperado: 14 passed, 0 failed em <2s

# Em fixture legacy-v5 (pre-condicao: fase-02 backup feito):
bun run -e "
import { migrateLessons } from './skills/init/lib/migrate-lessons.ts'
const r = await migrateLessons('tests/fixtures/legacy-v5')
console.log(r.status, r.entries, 'written:', r.written.length)
"

# Conferir frontmatter completo:
for f in tests/fixtures/legacy-v5/docs/compound/*.md; do
  head -6 "$f" | grep -q '^title: ' || echo "MISSING title in $f"
  head -6 "$f" | grep -q '^category: ' || echo "MISSING category in $f"
  head -6 "$f" | grep -q '^tags: ' || echo "MISSING tags in $f"
  head -6 "$f" | grep -q '^created: ' || echo "MISSING created in $f"
done
# Esperado: nenhum output (todos completos — CA-29 ready)
```

**Por humano:**

- Abrir um compound note gerado e validar:
  - Frontmatter no topo, fechado com `---`
  - Seções `## Problem`, `## Solution`, `## Prevention` com conteúdo (mesmo que parcial)
  - Seção `## Original` no final com o bloco verbatim da fonte
  - Filename: `YYYY-MM-DD-titulo-em-kebab.md`

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
