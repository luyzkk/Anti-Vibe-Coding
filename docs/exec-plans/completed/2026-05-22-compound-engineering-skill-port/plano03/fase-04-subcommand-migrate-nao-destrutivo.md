<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
-->

# Fase 04: Subcomando `migrate` (nao-destrutivo — README fix + relatorio)

**Plano:** 03 — Subcomandos + Patches
**Sizing:** 1.5h
**Depende de:** fase-01 (skill compound-engineering operacional; usa `getCompoundManifest()` indiretamente para detectar paths) + Plano 02 fase-02 (`compound-frontmatter.ts` e `compound-files-collector.ts` em `skills/compound-engineering/lib/`)
**Visual:** false

---

## O que esta fase entrega

Subcomando `compound-engineering migrate` operacional: detecta schema antigo (`date/author/decision`) em `docs/compound/README.md`, reescreve nao-destrutivamente (so o bloco frontmatter exemplar — preserva prosa fora do bloco — CA-13); escaneia notas em `docs/compound/*.md`, gera `docs/compound/migration-report.md` listando inconsistencias por tipo SEM reescrever notas (CA-14, RNF-04).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/compound-engineering/lib/migrate.ts` | Create | `runMigrate(targetRoot): Promise<MigrateResult>` — orquestra deteccao + reescrita README + scan notas + relatorio |
| `skills/compound-engineering/lib/migrate.test.ts` | Create | Testes cobrindo CA-13 (README fix) e CA-14 (relatorio sem reescrita) |
| `skills/compound-engineering/lib/readme-schema-detector.ts` | Create | `detectLegacySchema(readmeContent): boolean` — heuristica via regex co-ocorrencia `date` + `author` + `decision` |
| `skills/compound-engineering/lib/notes-inconsistency-scanner.ts` | Create | `scanNotesInconsistencies(targetRoot): Promise<NoteIssue[]>` — agrupa por tipo (missing-title, missing-category, unknown-field, etc) |
| `skills/compound-engineering/SKILL.md` | Modify | Adiciona case `migrate` no parser de args |

---

## Implementacao

### Passo 1: `readme-schema-detector.ts`

```typescript
// 2026-05-23 (Luiz/dev): detecta schema legacy via co-ocorrencia — PRD RF-07
// Heuristica: bloco de exemplo com 3 dos 4 campos legacy (date/author/decision/tags)
// dentro de um fence ```yaml ou bloco frontmatter ---

const LEGACY_FIELDS = ['date:', 'author:', 'decision:']

export function detectLegacySchema(readmeContent: string): boolean {
  // 2026-05-23 (Luiz/dev): escaneia blocos yaml/frontmatter no README
  const yamlBlocks = [...readmeContent.matchAll(/```yaml\s*\n([\s\S]*?)\n```/g)]
  const frontmatterBlocks = [...readmeContent.matchAll(/^---\s*\n([\s\S]*?)\n---/gm)]
  const allBlocks = [...yamlBlocks, ...frontmatterBlocks].map((m) => m[1])

  for (const block of allBlocks) {
    const matches = LEGACY_FIELDS.filter((field) => block.includes(field))
    if (matches.length >= 2) return true // co-ocorrencia >= 2 legacy fields = schema antigo
  }
  return false
}
```

### Passo 2: `notes-inconsistency-scanner.ts`

```typescript
// 2026-05-23 (Luiz/dev): scan notas brownfield — CA-14 + RNF-04 (NAO reescreve)
import { listCompoundFiles } from './compound-files-collector'
import { parseFrontmatter } from './compound-frontmatter'
import { promises as fs } from 'node:fs'

export type NoteIssueType =
  | 'missing-title'
  | 'missing-category'
  | 'missing-tags'
  | 'missing-created'
  | 'legacy-field-date'
  | 'legacy-field-author'
  | 'legacy-field-decision'
  | 'invalid-frontmatter'

export type NoteIssue = {
  path: string // relative ao targetRoot
  type: NoteIssueType
  detail?: string
}

export async function scanNotesInconsistencies(targetRoot: string): Promise<NoteIssue[]> {
  const issues: NoteIssue[] = []
  const files = await listCompoundFiles(targetRoot)
  for (const file of files) {
    const body = await fs.readFile(file, 'utf-8')
    const fm = parseFrontmatter(body)
    if (!fm.ok) {
      issues.push({ path: file, type: 'invalid-frontmatter', detail: fm.error })
      continue
    }
    if (!fm.data.title) issues.push({ path: file, type: 'missing-title' })
    if (!fm.data.category) issues.push({ path: file, type: 'missing-category' })
    if (!fm.data.tags) issues.push({ path: file, type: 'missing-tags' })
    if (!fm.data.created) issues.push({ path: file, type: 'missing-created' })
    if ('date' in fm.data) issues.push({ path: file, type: 'legacy-field-date' })
    if ('author' in fm.data) issues.push({ path: file, type: 'legacy-field-author' })
    if ('decision' in fm.data) issues.push({ path: file, type: 'legacy-field-decision' })
  }
  return issues
}
```

### Passo 3: `migrate.ts` orquestrador

```typescript
// 2026-05-23 (Luiz/dev): migrate — PRD MH-06/RF-07 + D6 nao-destrutivo
import { detectLegacySchema } from './readme-schema-detector'
import { scanNotesInconsistencies, type NoteIssue } from './notes-inconsistency-scanner'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type MigrateResult = {
  readmeMigrated: boolean
  notesScanned: number
  notesWithIssues: number
  reportPath?: string
}

// 2026-05-23 (Luiz/dev): bloco canonico — PRD D3 literal Andre
const CANONICAL_FRONTMATTER_BLOCK = `\`\`\`yaml
---
title: Short imperative summary
category: debugging # debugging | pattern | review | operations | security | reliability
tags: [tag-one, tag-two]
created: 2026-05-23
---
\`\`\``

export async function runMigrate(targetRoot: string): Promise<MigrateResult> {
  const readmePath = path.join(targetRoot, 'docs', 'compound', 'README.md')
  const readme = await fs.readFile(readmePath, 'utf-8').catch(() => '')

  let readmeMigrated = false
  if (readme && detectLegacySchema(readme)) {
    // 2026-05-23 (Luiz/dev): substitui SO bloco frontmatter exemplar — preserva prosa (CA-13)
    const rewritten = replaceLegacyExampleBlock(readme, CANONICAL_FRONTMATTER_BLOCK)
    await fs.writeFile(readmePath, rewritten)
    readmeMigrated = true
  }

  // 2026-05-23 (Luiz/dev): scan notas — RNF-04 NAO reescreve
  const issues = await scanNotesInconsistencies(targetRoot)
  const reportPath = path.join(targetRoot, 'docs', 'compound', 'migration-report.md')
  if (issues.length > 0) {
    await fs.writeFile(reportPath, renderReport(issues))
  }

  const uniqueNotes = new Set(issues.map((i) => i.path))
  return {
    readmeMigrated,
    notesScanned: issues.length > 0 ? uniqueNotes.size : 0,
    notesWithIssues: uniqueNotes.size,
    reportPath: issues.length > 0 ? reportPath : undefined,
  }
}

function replaceLegacyExampleBlock(readme: string, canonical: string): string {
  // 2026-05-23 (Luiz/dev): substitui o PRIMEIRO bloco ```yaml com campos legacy
  return readme.replace(/```yaml\s*\n([\s\S]*?date:[\s\S]*?author:[\s\S]*?)\n```/, canonical)
}

function renderReport(issues: NoteIssue[]): string {
  const grouped = new Map<string, NoteIssue[]>()
  for (const i of issues) {
    const arr = grouped.get(i.type) ?? []
    arr.push(i)
    grouped.set(i.type, arr)
  }
  const sections: string[] = ['# Migration Report\n\n_Generated by `compound-engineering migrate`. Notes are NOT modified._\n']
  for (const [type, items] of grouped) {
    sections.push(`## ${type} (${items.length})\n`)
    for (const item of items) {
      sections.push(`- \`${item.path}\`${item.detail ? `: ${item.detail}` : ''}`)
    }
    sections.push('')
  }
  return sections.join('\n')
}
```

### Passo 4: Plugar no SKILL.md

Caso `migrate` no parser de args:

```markdown
### Subcomando: migrate

Quando `args` comeca com `migrate`:

1. Invoca `runMigrate(targetRoot)`.
2. Renderiza output:
   - Se `readmeMigrated`: `Fixed schema in docs/compound/README.md.`
   - Se `notesWithIssues > 0`: `Inconsistencies report saved to docs/compound/migration-report.md ({N} notes need manual review).`
   - Se ambos zero: `No legacy schema detected. No migration needed.`
```

---

## Gotchas

- **Local — RNF-04 nao-destrutivo:** `migrate` NUNCA escreve em `docs/compound/*.md` (notas). So escreve em `docs/compound/README.md` e `docs/compound/migration-report.md`. Validar via grep `fs.writeFile` no codigo — apenas 2 destinos permitidos.
- **Local — preservar prosa:** `replaceLegacyExampleBlock` substitui APENAS o bloco yaml com co-ocorrencia de campos legacy. Texto prosa fora do bloco intacto. Teste deve usar fixture com README real do Carreirarte v3.
- **Local — idempotencia:** re-rodar `migrate` em projeto ja migrado: `detectLegacySchema` retorna false (campos legacy ausentes) → README nao reescrito. Relatorio: pode ser re-gerado (sobrescreve `migration-report.md` — tudo bem, e relatorio).
- **Local — `compound-frontmatter.parseFrontmatter`:** assinatura assumida `parseFrontmatter(body): { ok: true, data: {...} } | { ok: false, error: string }`. Validar API real em Plano 02 fase-02 — se difere, ajustar tipos no scanner.

---

## Verificacao

### TDD

- [ ] **RED:** `migrate.test.ts` falha antes da implementacao
  - Comando: `bun test skills/compound-engineering/lib/migrate.test.ts --grep 'CA-13 reescreve README'`
  - Resultado esperado: `Expected readmeMigrated === true`, recebido `false` (assertion failure)

- [ ] **GREEN:** `migrate.ts` + libs implementadas, testes passam
  - Comando: `bun test skills/compound-engineering/lib/migrate.test.ts`
  - Resultado esperado: `2+ passed, 0 failed` (CA-13, CA-14, + idempotencia)

### Checklist

- [ ] CA-13: fixture com README documentando `date/author/decision` → `readmeMigrated === true` + bloco canonico no output + prosa fora do bloco preservada
- [ ] CA-14: fixture com 5 notas com frontmatter inconsistente → notas NAO modificadas + `migration-report.md` lista as 5 agrupadas por tipo
- [ ] Idempotencia: 2a invocacao em projeto ja migrado → `readmeMigrated === false`
- [ ] `migrate.ts` zero `fs.writeFile` apontando para `docs/compound/*.md` exceto README.md e migration-report.md
- [ ] Testes passam: `bun test skills/compound-engineering/lib/migrate.test.ts`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/compound-engineering/lib/migrate.test.ts` retorna 3+ passed (CA-13/14 + idempotencia)
- Em fixture pos-migrate, hash MD5 das notas brownfield == hash pre-migrate (RNF-04 — nao reescritas)
- `docs/compound/migration-report.md` contem 5 entries quando fixture tem 5 notas inconsistentes

**Por humano:**
- Rodar em fixture Carreirarte v3 (real): observar README schema corrigido, prosa preservada, relatorio gerado, notas intactas

---

<!-- Gerado por /plan-feature em 2026-05-23 -->
